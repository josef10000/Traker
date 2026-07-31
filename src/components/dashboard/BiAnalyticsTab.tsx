import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { Agreement, AttendanceRecord, UserProfile, Team, DashboardStats } from '../../types';
import { formatCurrency } from '../../utils/masks';
import { Fire, CurrencyDollar, Lightning, ShieldWarning, Tag, TrendUp as TrendingUp, FileCsv as FileSpreadsheet, ChartPie, ChartBar } from '@phosphor-icons/react';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomMonthYearPicker } from '../ui/CustomMonthYearPicker';
import { AdvancedInsights } from './AdvancedInsights';
import { ApexChartWrapper } from '../ui/ApexChartWrapper';
import { exportAgreementsToExcel } from '../../utils/excelExport';
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

  // Estados dos Filtros
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [heatmapMetric, setHeatmapMetric] = useState<'total' | 'success' | 'paid_value' | 'real_conversion' | 'specific_reason'>('total');
  const [heatmapSelectedReason, setHeatmapSelectedReason] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Solicita permissão de notificação nativa ao carregar o BI
  useEffect(() => {
    requestNotificationPermission().then((granted) => {
      if (granted) {
        sendDesktopNotification('Analytics & BI Conectado', {
          body: 'Notificações de metas e performance nativas ativas no desktop.'
        });
      }
    });
  }, []);

  // Carrega registros de tabulação/atendimento conforme o sandbox ou firestore
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const stored = localStorage.getItem(`sandbox_attendances_${profile.organizationId}`);
      if (stored) {
        setRecords(JSON.parse(stored));
      }
      return;
    }

    try {
      const q = query(
        collection(db, 'attendanceRecords'),
        where('organizationId', '==', profile.organizationId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: AttendanceRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord));

        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecords(fetched);
      }, (err) => {
        console.error('Erro ao ouvir registros de atendimento no BI:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Erro no snapshot do BI:', e);
    }
  }, [profile.organizationId]);

  // Filtragem dos Registros por Equipe
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedTeamFilter !== 'all') {
        const matchTeam = r.teamId === selectedTeamFilter;
        if (!matchTeam) return false;
      }
      return true;
    });
  }, [records, selectedTeamFilter]);

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
        const ag = agreements.find(a => a.id === r.agreementId);
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
  }, [filteredRecords, agreements]);

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
      const ag = agreements.find(a => a.id === r.agreementId);
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
  }, [filteredRecords, agreements]);

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

  // ApexChart 1: Heatmap de Horários Nobres
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
              const ag = agreements.find(a => a.id === r.agreementId);
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
  }, [filteredRecords, agreements, heatmapMetric]);

  const apexHeatmapOptions = useMemo(() => ({
    chart: {
      type: 'heatmap',
      toolbar: { show: true, tools: { download: true } },
      background: 'transparent'
    },
    theme: { mode: 'dark' },
    colors: ['#0284c7'],
    dataLabels: { enabled: true, style: { fontSize: '10px', colors: ['#ffffff'] } },
    xaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
    yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
    plotOptions: {
      heatmap: {
        radius: 6,
        enableShades: true,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: '#0f172a', name: 'Sem movimento' },
            { from: 1, to: 10, color: '#0284c7', name: 'Baixo' },
            { from: 11, to: 30, color: '#f59e0b', name: 'Médio' },
            { from: 31, to: 1000000, color: '#10b981', name: 'Horário Nobre 🔥' }
          ]
        }
      }
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val: number) => heatmapMetric === 'paid_value' ? formatCurrency(val) : `${val} ocorrências`
      }
    }
  }), [heatmapMetric]);

  // ApexChart 2: Projeção de Recuperação Financeira (Area Chart com Gradiente)
  const apexAreaSeries = useMemo(() => {
    const daysMap: Record<number, number> = {};
    for (let i = 1; i <= 31; i++) daysMap[i] = 0;

    agreements.forEach(ag => {
      if (!ag.createdAt) return;
      const date = new Date(ag.createdAt);
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) {
        const day = date.getDate();
        daysMap[day] = (daysMap[day] || 0) + (ag.updatedValue || ag.originalValue || 0);
      }
    });

    const categories = Object.keys(daysMap).map(d => `Dia ${d}`);
    const data = Object.values(daysMap);

    return [{ name: 'Volume Acumulado R$', data }];
  }, [agreements, selectedMonth, selectedYear]);

  const apexAreaOptions = useMemo(() => ({
    chart: {
      type: 'area',
      height: 300,
      toolbar: { show: true },
      background: 'transparent'
    },
    theme: { mode: 'dark' },
    colors: ['#10b981'],
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
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

  // ApexChart 3: Pareto Donut Chart de Motivos
  const apexDonutSeries = useMemo(() => {
    return reasonBreakdown.slice(0, 6).map(r => r.count);
  }, [reasonBreakdown]);

  const apexDonutOptions = useMemo(() => ({
    chart: { type: 'donut', background: 'transparent' },
    theme: { mode: 'dark' },
    labels: reasonBreakdown.slice(0, 6).map(r => r.title),
    colors: REASON_COLORS,
    legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Motivos',
              color: '#38bdf8',
              formatter: () => `${filteredRecords.length}`
            }
          }
        }
      }
    }
  }), [reasonBreakdown, filteredRecords.length]);

  // Função para exportar relatório Excel formatado
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportAgreementsToExcel(agreements, `Relatorio_BI_Acordos_${selectedMonth + 1}_${selectedYear}.xlsx`);
      showToast('Relatório Excel de alta qualidade gerado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao gerar planilha Excel.', 'error');
    } finally {
      setIsExporting(false);
    }
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

          {/* Botão de Exportação ExcelJS Formata */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-lg shadow-emerald-500/5 cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={18} />
            <span>{isExporting ? 'Exportando...' : 'Exportar Excel Formatado'}</span>
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
          stats={stats}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
};
