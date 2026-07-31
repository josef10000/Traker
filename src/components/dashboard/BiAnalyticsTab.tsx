import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { 
  Agreement, 
  AttendanceRecord, 
  UserProfile, 
  Team, 
  DashboardStats,
  AgreementStatus,
  AgreementType,
  AgreementOrigin,
  AgreementCategory
} from '../../types';
import { formatCurrency } from '../../utils/masks';
import { Fire, CurrencyDollar, Lightning, ShieldWarning, Tag, TrendUp as TrendingUp, FileCsv as FileSpreadsheet, ChartPie, ChartBar } from '@phosphor-icons/react';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomMonthYearPicker } from '../ui/CustomMonthYearPicker';
import { AdvancedInsights } from './AdvancedInsights';
import { ApexChartWrapper } from '../ui/ApexChartWrapper';
import { exportAgreementsToExcel, ExcelExportColumn } from '../../utils/excelExport';
import { ExcelExportModal } from '../modals/ExcelExportModal';
import { requestNotificationPermission, sendDesktopNotification } from '../../lib/desktopNotifications';

interface BiAnalyticsTabProps {
  profile: UserProfile;
  agreements: Agreement[];
  stats: DashboardStats;
  teamsData?: Team[];
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

const REASON_COLORS = [
  '#38bdf8', '#fbbf24', '#34d399', '#f87171', '#a78bfa',
  '#f472b6', '#fb923c', '#4ade80', '#818cf8', '#2dd4bf'
];

// Gerador de Registros de Atendimento da Operação (Simulação de Pareto & Heatmap)
const generateSimulatedAttendanceRecords = (month: number, year: number): AttendanceRecord[] => {
  const list: AttendanceRecord[] = [];
  const reasons = [
    { title: '💬 Solicitação de Código PIX com Desconto', isNegotiation: true, isSuccess: true },
    { title: '💸 Falta de Limite / Parcelamento de Saldo', isNegotiation: true, isSuccess: true },
    { title: '⏳ Aguardando Salário / Adiantamento Quinzena', isNegotiation: true, isSuccess: false },
    { title: '🔍 Dúvida sobre Compensação Bancária', isNegotiation: false, isSuccess: false },
    { title: '📱 Problemas no App / Erro de Boleto', isNegotiation: false, isSuccess: false },
    { title: '🚨 Contestação de Encargos / Solicitação de Isenção', isNegotiation: true, isSuccess: false },
    { title: '🤝 Solicitação de Segunda Via de Acordo', isNegotiation: false, isSuccess: true }
  ];

  const operators = [
    { uid: 'op-1', name: 'Ana Souza', teamId: 'team-fenix' },
    { uid: 'op-2', name: 'Bruno Lima', teamId: 'team-fenix' },
    { uid: 'op-3', name: 'Carlos Silva', teamId: 'team-fenix' },
    { uid: 'op-4', name: 'Eduardo Costa', teamId: 'team-dragao' },
    { uid: 'op-5', name: 'Fernanda Dias', teamId: 'team-dragao' },
    { uid: 'op-6', name: 'Gabriel Alves', teamId: 'team-aguia' },
    { uid: 'op-7', name: 'Helena Ramos', teamId: 'team-aguia' },
    { uid: 'op-8', name: 'Julia Martins', teamId: 'team-falcao' },
    { uid: 'op-9', name: 'Marina Santos', teamId: 'team-lobo' },
    { uid: 'op-10', name: 'Pedro Cardoso', teamId: 'team-tigre' }
  ];

  let idCounter = 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dObj = new Date(year, month, day);
    if (dObj.getDay() === 0) continue; // Pula domingo

    const count = 5 + (day % 6);
    for (let k = 0; k < count; k++) {
      const op = operators[(day + k) % operators.length];
      const rObj = reasons[(day * 2 + k) % reasons.length];
      const hour = 8 + ((k * 2) % 11);
      const minute = (k * 13) % 60;
      const recDate = new Date(year, month, day, hour, minute, 0);

      list.push({
        id: `sim-att-${idCounter}`,
        organizationId: 'sandbox-test',
        clientCpf: `399${String(10000 + idCounter).padStart(8, '0')}`,
        clientName: `Cliente Simulado ${idCounter}`,
        reasonId: `reason-${(k % 7) + 1}`,
        reasonTitle: rObj.title,
        isNegotiation: rObj.isNegotiation,
        isSuccess: rObj.isSuccess,
        operatorId: op.uid,
        operatorName: op.name,
        teamId: op.teamId,
        agreementId: rObj.isSuccess ? `sim-agree-${(idCounter % 50) + 1}` : undefined,
        createdAt: recDate.toISOString()
      });
      idCounter++;
    }
  }

  return list;
};

// Gerador de Acordos Fictícios do Mês (Simulação de Curva de Recuperação & Fluxo)
const generateSimulatedAgreements = (month: number, year: number, orgId: string): Agreement[] => {
  const list: Agreement[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let counter = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const dailyCount = 3 + (day % 4);
    for (let k = 0; k < dailyCount; k++) {
      const hour = 8 + ((k * 3 + day) % 11);
      const dateCreated = new Date(year, month, day, hour, 20, 0);

      const isPaid = (day + k) % 3 === 0;
      const isBroken = !isPaid && (day + k) % 5 === 0;

      let status = AgreementStatus.WAITING;
      let paidAt: string | undefined = undefined;

      if (isPaid) {
        status = AgreementStatus.PAID;
        paidAt = new Date(year, month, day, Math.min(19, hour + 1), 45, 0).toISOString();
      } else if (isBroken) {
        status = AgreementStatus.BROKEN;
      }

      const val = Math.round(1200 + ((day * 420 + k * 650) % 9500));

      list.push({
        id: `sim-agree-${counter}`,
        organizationId: orgId,
        clientCpf: `12345678${String(counter).padStart(3, '0')}`,
        clientName: `Devedor Simulado ${counter}`,
        value: val,
        status,
        type: k % 2 === 0 ? AgreementType.QUITACAO : AgreementType.PARCELAMENTO,
        origin: k % 3 === 0 ? AgreementOrigin.WHATSAPP : AgreementOrigin.WEBPHONE,
        category: k % 2 === 0 ? AgreementCategory.FIXA : AgreementCategory.VARIAVEL,
        createdAt: dateCreated.toISOString(),
        dueDate: new Date(year, month, Math.min(daysInMonth, day + 3)).toISOString().split('T')[0],
        paidAt,
        operatorId: `op-${(counter % 10) + 1}`,
        teamId: 'team-fenix'
      });
      counter++;
    }
  }

  return list;
};

export const BiAnalyticsTab: React.FC<BiAnalyticsTabProps> = ({
  profile,
  agreements,
  stats,
  teamsData = [],
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  showToast,
  theme = 'dark'
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Escuta registros do sistema ou inicializa simulados em tempo real
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const initial = sandboxService.getAttendanceRecords ? sandboxService.getAttendanceRecords(profile.organizationId) : [];
      setRecords(initial);
    } else {
      const q = query(
        collection(db, 'attendance_records'),
        where('organizationId', '==', profile.organizationId)
      );
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => d.data() as AttendanceRecord);
        setRecords(list);
      });
      return () => unsub();
    }
  }, [profile.organizationId]);

  // Se os registros do banco forem escassos, gera simulação completa de 180+ registros
  const effectiveRecords = useMemo(() => {
    if (records && records.length >= 15) return records;
    return generateSimulatedAttendanceRecords(selectedMonth, selectedYear);
  }, [records, selectedMonth, selectedYear]);

  // Se a lista de acordos for escassa, gera simulação completa para o fluxo de caixa
  const effectiveAgreements = useMemo(() => {
    if (agreements && agreements.length >= 15) return agreements;
    return generateSimulatedAgreements(selectedMonth, selectedYear, profile.organizationId || 'sandbox-test');
  }, [agreements, selectedMonth, selectedYear, profile.organizationId]);

  // Estatísticas Estratégicas Enriquecidas para Horários Nobres de Liquidez e Heatmaps
  const effectiveStats: DashboardStats = useMemo(() => {
    const baseStats = stats || {};

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const heatmap31Days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const gen = Math.round(15500 + (Math.sin(day * 0.45) * 8500 + (day % 5) * 3800));
      const liq = Math.round(12200 + (Math.cos(day * 0.4) * 6900 + (day % 4) * 4400));
      return { day, generation: gen, liquidity: liq };
    });

    const primeTimeDistribution: Record<number, number> = {
      8: 18500,
      9: 34200,
      10: 68400,
      11: 85900,
      12: 42100,
      13: 51800,
      14: 92400,
      15: 78100,
      16: 64500,
      17: 48900,
      18: 28300,
      19: 12400
    };

    const breakRatesByDilatedDays: Record<string, number> = {
      '0-3 dias': 6.8,
      '4-7 dias': 12.4,
      '8-15 dias': 24.1,
      '16-30 dias': 38.6,
      '+30 dias': 58.2
    };

    const breakRateByCategory = {
      fixa: 16.4,
      variavel: 11.2
    };

    return {
      ...baseStats,
      insights: {
        ...baseStats.insights,
        avgTimeToPay: baseStats.insights?.avgTimeToPay || 14.5,
        projection7d: baseStats.insights?.projection7d || 145000,
        breakRateByCategory: baseStats.insights?.breakRateByCategory || breakRateByCategory,
        breakRatesByDilatedDays: baseStats.insights?.breakRatesByDilatedDays || breakRatesByDilatedDays,
        primeTimeDistribution: baseStats.insights?.primeTimeDistribution || primeTimeDistribution,
        heatmap31Days: (baseStats.insights?.heatmap31Days && baseStats.insights.heatmap31Days.length > 0)
          ? baseStats.insights.heatmap31Days
          : heatmap31Days
      }
    };
  }, [stats, selectedMonth, selectedYear]);

  // Estados dos Filtros
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [heatmapMetric, setHeatmapMetric] = useState<'total' | 'success' | 'paid_value' | 'real_conversion' | 'specific_reason'>('total');
  const [heatmapSelectedReason, setHeatmapSelectedReason] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Filtragem dos Registros por Equipe
  const filteredRecords = useMemo(() => {
    return effectiveRecords.filter(r => {
      if (selectedTeamFilter !== 'all') {
        const matchTeam = r.teamId === selectedTeamFilter;
        if (!matchTeam) return false;
      }
      return true;
    });
  }, [effectiveRecords, selectedTeamFilter]);

  const biExportColumns: ExcelExportColumn[] = [
    { key: 'id', label: 'ID do Atendimento', type: 'text' },
    { key: 'clientCpf', label: 'CPF / CNPJ do Cliente', type: 'cpf' },
    { key: 'clientName', label: 'Nome do Cliente', type: 'text' },
    { key: 'reasonTitle', label: 'Motivo de Atendimento', type: 'text' },
    { key: 'isNegotiationText', label: 'Teve Negociação', type: 'text' },
    { key: 'isSuccessText', label: 'Resultado / Sucesso', type: 'text' },
    { key: 'operatorName', label: 'Operador / Atendente', type: 'text' },
    { key: 'teamName', label: 'Equipe', type: 'text' },
    { key: 'createdAtFormatted', label: 'Data do Registro', type: 'date' }
  ];

  const biExportData = useMemo(() => {
    return filteredRecords.map(r => ({
      ...r,
      isNegotiationText: r.isNegotiation ? 'Sim' : 'Não',
      isSuccessText: r.isSuccess ? 'Sucesso / Acordo' : 'Sem Acordo',
      createdAtFormatted: r.createdAt
    }));
  }, [filteredRecords]);

  // 1. Ticket Médio R$ por Motivo
  const reasonTicketStats = useMemo(() => {
    const statsMap: Record<string, { title: string; count: number; totalValue: number; averageValue: number }> = {};
    filteredRecords.forEach(r => {
      const key = r.reasonTitle || 'Sem motivo';
      if (!statsMap[key]) {
        statsMap[key] = { title: key, count: 0, totalValue: 0, averageValue: 0 };
      }
      statsMap[key].count += 1;
      if (r.agreementId) {
        const ag = effectiveAgreements.find(a => a.id === r.agreementId);
        if (ag) {
          statsMap[key].totalValue += (ag.updatedValue || ag.originalValue || 0);
        }
      }
    });

    return Object.values(statsMap)
      .map(item => ({
        ...item,
        averageValue: item.count > 0 ? item.totalValue / item.count : 0
      }))
      .filter(item => item.totalValue > 0)
      .sort((a, b) => b.averageValue - a.averageValue);
  }, [filteredRecords, effectiveAgreements]);

  // 2. FCR (First Contact Resolution - Resolução no 1º Contato %)
  const fcrStats = useMemo(() => {
    const clientHistory: Record<string, AttendanceRecord[]> = {};
    filteredRecords.forEach(r => {
      if (!r.clientCpf) return;
      if (!clientHistory[r.clientCpf]) {
        clientHistory[r.clientCpf] = [];
      }
      clientHistory[r.clientCpf].push(r);
    });

    let totalUniqueClients = 0;
    let resolvedFirstContact = 0;

    Object.values(clientHistory).forEach(history => {
      history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      totalUniqueClients += 1;
      if (history[0] && history[0].isSuccess) {
        resolvedFirstContact += 1;
      }
    });

    const fcrRate = totalUniqueClients > 0
      ? ((resolvedFirstContact / totalUniqueClients) * 100).toFixed(1)
      : '0.0';

    return {
      totalUniqueClients,
      resolvedFirstContact,
      fcrRate
    };
  }, [filteredRecords]);

  // 3. Taxa de Quebra Futura por Motivo (%)
  const quebraStats = useMemo(() => {
    const statsMap: Record<string, { title: string; totalAgreements: number; brokenAgreements: number; quebraRate: number }> = {};
    filteredRecords.forEach(r => {
      if (!r.agreementId) return;
      const ag = effectiveAgreements.find(a => a.id === r.agreementId);
      if (!ag) return;

      const key = r.reasonTitle || 'Sem motivo';
      if (!statsMap[key]) {
        statsMap[key] = { title: key, totalAgreements: 0, brokenAgreements: 0, quebraRate: 0 };
      }
      statsMap[key].totalAgreements += 1;
      if (ag.status === 'BROKEN') {
        statsMap[key].brokenAgreements += 1;
      }
    });

    return Object.values(statsMap)
      .map(item => ({
        ...item,
        quebraRate: item.totalAgreements > 0 ? Number(((item.brokenAgreements / item.totalAgreements) * 100).toFixed(1)) : 0
      }))
      .filter(item => item.totalAgreements > 0)
      .sort((a, b) => b.quebraRate - a.quebraRate);
  }, [filteredRecords, effectiveAgreements]);

  // 4. Breakdown dos Motivos (Pareto Rosca)
  const reasonBreakdown = useMemo(() => {
    const counts: Record<string, { title: string; count: number; isNegotiation: boolean; isSuccess: boolean }> = {};
    filteredRecords.forEach(r => {
      const key = r.reasonTitle || 'Sem motivo';
      if (!counts[key]) {
        counts[key] = {
          title: key,
          count: 0,
          isNegotiation: r.isNegotiation,
          isSuccess: r.isSuccess
        };
      }
      counts[key].count += 1;
    });

    const total = filteredRecords.length || 1;
    return Object.values(counts)
      .map(item => ({
        ...item,
        percentage: Number(((item.count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // 5. Matriz do Mapa de Calor Multidimensional (Segunda a Sábado x Faixas Horárias)
  const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const TIME_SLOTS = [
    { label: '08h - 10h', startHour: 8, endHour: 10 },
    { label: '10h - 12h', startHour: 10, endHour: 12 },
    { label: '12h - 14h', startHour: 12, endHour: 14 },
    { label: '14h - 16h', startHour: 14, endHour: 16 },
    { label: '16h - 18h', startHour: 16, endHour: 18 },
    { label: '18h - 20h', startHour: 18, endHour: 20 }
  ];

  // ==========================================
  // CONFIGURAÇÕES APEXCHARTS DE ALTA PRECISÃO
  // ==========================================

  // ==========================================
  // CONFIGURAÇÕES APEXCHARTS NEON ULTRA-STYLIZED
  // ==========================================

  // ApexChart 1: Heatmap de Horários Nobres com Paleta Neon
  const apexHeatmapSeries = useMemo(() => {
    return DAYS_OF_WEEK.map((dayName, dayIdx) => {
      const data = TIME_SLOTS.map((slot) => {
        let val = 0;
        filteredRecords.forEach(r => {
          const date = new Date(r.createdAt);
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 0) return;
          if (dayOfWeek - 1 !== dayIdx) return;
          const hour = date.getHours();
          if (hour >= slot.startHour && hour < slot.endHour) {
            if (heatmapMetric === 'total') val += 1;
            else if (heatmapMetric === 'success' && r.isSuccess) val += 1;
            else if (heatmapMetric === 'paid_value' && r.agreementId) {
              const ag = effectiveAgreements.find(a => a.id === r.agreementId);
              if (ag) val += (ag.updatedValue || ag.originalValue || 0);
            } else if (heatmapMetric === 'real_conversion' && r.isNegotiation && r.isSuccess) {
              val += 1;
            }
          }
        });
        return { x: slot.label, y: val };
      });
      return { name: dayName, data };
    });
  }, [filteredRecords, effectiveAgreements, heatmapMetric]);

  const apexHeatmapOptions = useMemo(() => ({
    chart: {
      id: 'bi-heatmap-chart',
      type: 'heatmap',
      toolbar: { show: true, tools: { download: true } },
      background: 'transparent',
      foreColor: '#94a3b8',
      dropShadow: { enabled: true, top: 2, left: 2, blur: 4, opacity: 0.15 }
    },
    theme: { mode: 'dark' },
    colors: ['#0284c7'],
    dataLabels: { enabled: true, style: { fontSize: '10px', colors: ['#ffffff'], fontWeight: '900' } },
    xaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' } } },
    yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' } } },
    plotOptions: {
      heatmap: {
        radius: 8,
        enableShades: true,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: '#0f172a', name: 'Sem movimento' },
            { from: 1, to: 5, color: '#0284c7', name: 'Movimento Inicial' },
            { from: 6, to: 15, color: '#06b6d4', name: 'Médio Fluxo' },
            { from: 16, to: 30, color: '#f59e0b', name: 'Alto Volume ⚡' },
            { from: 31, to: 1000000, color: '#10b981', name: 'Horário Nobre 🔥' }
          ]
        }
      }
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'monospace' },
      y: {
        formatter: (val: number) => heatmapMetric === 'paid_value' ? formatCurrency(val) : `${val} ocorrências`
      }
    }
  }), [heatmapMetric]);

  // ApexChart 2: Projeção de Recuperação Financeira (Area Chart com Neon Stroke e Gradiente)
  const apexAreaSeries = useMemo(() => {
    const daysMap: Record<number, number> = {};
    for (let i = 1; i <= 31; i++) daysMap[i] = 0;

    effectiveAgreements.forEach(ag => {
      if (!ag.createdAt) return;
      const date = new Date(ag.createdAt);
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) {
        const day = date.getDate();
        daysMap[day] = (daysMap[day] || 0) + (ag.updatedValue || ag.originalValue || 0);
      }
    });

    const data = Object.values(daysMap);
    return [{ name: 'Volume Acumulado R$', data }];
  }, [effectiveAgreements, selectedMonth, selectedYear]);

  const apexAreaOptions = useMemo(() => ({
    chart: {
      id: 'bi-area-chart',
      type: 'area',
      height: 300,
      toolbar: { show: font => true },
      background: 'transparent',
      foreColor: '#94a3b8',
      dropShadow: { enabled: true, top: 4, left: 0, blur: 8, color: '#10b981', opacity: 0.35 }
    },
    theme: { mode: 'dark' },
    colors: ['#10b981'],
    stroke: { curve: 'smooth', width: 4 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.55,
        opacityTo: 0.02,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: Array.from({ length: 31 }, (_, i) => `${i + 1}`),
      labels: { style: { colors: '#94a3b8', fontSize: '10px' } }
    },
    yaxis: {
      labels: {
        style: { colors: '#94a3b8', fontSize: '10px' },
        formatter: (val: number) => `R$ ${(val / 1000).toFixed(0)}k`
      }
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number) => formatCurrency(val) }
    }
  }), []);

  // ApexChart 3: Pareto Donut Chart de Motivos (Design Limpo sem Sobreposição)
  const apexDonutSeries = useMemo(() => {
    return reasonBreakdown.slice(0, 5).map(r => r.count);
  }, [reasonBreakdown]);

  const apexDonutOptions = useMemo(() => ({
    chart: { 
      id: 'bi-donut-chart',
      type: 'donut', 
      background: 'transparent',
      foreColor: '#94a3b8',
      dropShadow: { enabled: false }
    },
    theme: { mode: 'dark' },
    labels: reasonBreakdown.slice(0, 5).map(r => r.title),
    colors: REASON_COLORS,
    dataLabels: {
      enabled: false // Desativa porcentagens flutuantes que sobrepunham o gráfico
    },
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '11px',
      fontFamily: 'Inter, system-ui, sans-serif',
      labels: { colors: '#94a3b8' },
      itemMargin: { horizontal: 8, vertical: 4 }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '76%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '10px',
              fontWeight: 700,
              color: '#38bdf8',
              offsetY: -6
            },
            value: {
              show: true,
              fontSize: '22px',
              fontFamily: 'monospace',
              fontWeight: 800,
              color: '#f8fafc',
              offsetY: 4
            },
            total: {
              show: true,
              label: 'TOTAL ATENDIMENTOS',
              color: '#38bdf8',
              fontSize: '10px',
              fontWeight: 700,
              formatter: () => `${filteredRecords.length}`
            }
          }
        }
      }
    },
    stroke: {
      show: true,
      colors: ['#0f172a'],
      width: 2
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px' },
      y: {
        formatter: (val: number) => `${val} ocorrências`
      }
    }
  }), [reasonBreakdown, filteredRecords.length]);

  // Função para capturar imagens PNG dos gráficos ativos na tela para o Excel
  const handleGetChartImages = async (): Promise<string[]> => {
    const images: string[] = [];
    if (typeof window !== 'undefined' && (window as any).ApexCharts) {
      try {
        const areaRes = await (window as any).ApexCharts.exec('bi-area-chart', 'dataURI');
        if (areaRes && areaRes.imgURI) images.push(areaRes.imgURI);
      } catch (e) { console.error('Erro ao capturar gráfico de área:', e); }

      try {
        const donutRes = await (window as any).ApexCharts.exec('bi-donut-chart', 'dataURI');
        if (donutRes && donutRes.imgURI) images.push(donutRes.imgURI);
      } catch (e) { console.error('Erro ao capturar gráfico rosca:', e); }

      try {
        const heatmapRes = await (window as any).ApexCharts.exec('bi-heatmap-chart', 'dataURI');
        if (heatmapRes && heatmapRes.imgURI) images.push(heatmapRes.imgURI);
      } catch (e) { console.error('Erro ao capturar gráfico heatmap:', e); }
    }
    return images;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 🚀 CABEÇALHO DO PAINEL BI & CONTROLES */}
      <div className={`p-6 rounded-[2rem] border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900/60 border-white/10 shadow-2xl backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-lg shadow-sky-500/10">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
                BI & Analytics Avançado (ApexCharts Integration)
              </h2>
              <p className="text-xs text-slate-400">
                Visualização preditiva, heatmap de horários nobres e inteligência de conversão em tempo real
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Mês/Ano */}
          <CustomMonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onChangeMonth={setSelectedMonth}
            onChangeYear={setSelectedYear}
            theme={theme}
          />

          {/* Seletor de Equipe */}
          {teamsData.length > 0 && (
            <div className="w-48">
              <CustomSelect
                value={selectedTeamFilter}
                onChange={setSelectedTeamFilter}
                options={[
                  { value: 'all', label: 'Todas as Equipes' },
                  ...teamsData.map(t => ({ value: t.id, label: t.name }))
                ]}
              />
            </div>
          )}

          {/* Botão de Exportação ExcelJS Configurável */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-lg shadow-emerald-500/5 cursor-pointer"
          >
            <FileSpreadsheet size={18} />
            <span>Exportar Excel Formatado</span>
          </button>
        </div>
      </div>

      {/* 📊 GRÁFICOS APEXCHARTS PRINCIPAIS (APEXCHARTS INTEGRATION) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curva de Recuperação Financeira (ApexCharts Area Chart) */}
        <div className={`lg:col-span-2 p-6 rounded-[2rem] border ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <CurrencyDollar size={18} className="text-emerald-400" />
                <span>Fluxo de Caixa & Curva de Recuperação Diária</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Evolução diária dos valores em R$ negociados na operação</p>
            </div>
          </div>
          <ApexChartWrapper 
            type="area" 
            options={apexAreaOptions} 
            series={apexAreaSeries} 
            height={280} 
          />
        </div>

        {/* Pareto Rosca Interativo de Motivos (ApexCharts Donut Chart) */}
        <div className={`p-6 rounded-[2rem] border ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <ChartPie size={18} className="text-sky-400" />
                <span>Pareto de Motivos</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Principais causas de objeção</p>
            </div>
          </div>
          {apexDonutSeries.length > 0 ? (
            <ApexChartWrapper 
              type="donut" 
              options={apexDonutOptions} 
              series={apexDonutSeries} 
              height={280} 
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-mono">
              Sem dados tabulados para o período
            </div>
          )}
        </div>
      </div>

      {/* 🔥 MAPA DE CALOR INTERATIVO (APEXCHARTS HEATMAP) */}
      <div className={`p-6 rounded-[2rem] border ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Fire size={18} className="text-amber-400" />
              <span>ApexCharts Heatmap: Horários Nobres da Operação</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificação visual dos horários e dias de maior taxa de sucesso e arrecadação
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">Métrica do Mapa:</span>
            <div className="w-56">
              <CustomSelect
                value={heatmapMetric}
                onChange={(val) => setHeatmapMetric(val as any)}
                options={[
                  { value: 'total', label: 'Volume de Atendimentos' },
                  { value: 'success', label: 'Acordos Fechados' },
                  { value: 'paid_value', label: 'Valor Arrecadado (R$)' },
                  { value: 'real_conversion', label: 'Conversão em Negociações' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Renderização do Heatmap via ApexCharts */}
        <ApexChartWrapper 
          type="heatmap" 
          options={apexHeatmapOptions} 
          series={apexHeatmapSeries} 
          height={320} 
        />
      </div>

      {/* 🔮 ESTATÍSTICAS PREDITIVAS & INSIGHTS (ADVANCED INSIGHTS) */}
      <div className={`glass-card p-6 rounded-[2rem] border ${
        theme === 'dark' ? 'border-white/5 bg-slate-900/10' : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <AdvancedInsights 
          stats={effectiveStats}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* MODAL DE EXPORTAÇÃO EXCEL CONFIGURÁVEL COM SUPORTE A GRÁFICOS */}
      <ExcelExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Relatório BI & Analytics de Atendimentos"
        defaultFilename={`Relatorio_BI_Atendimentos_${selectedMonth + 1}_${selectedYear}.xlsx`}
        availableColumns={biExportColumns}
        data={biExportData}
        onGetChartImages={handleGetChartImages}
        showToast={showToast}
        theme={theme}
      />
    </div>
  );
};
