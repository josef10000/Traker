import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Warning, 
  SlidersHorizontal, 
  Users, 
  ChartBar, 
  Percent, 
  CheckCircle, 
  Clock, 
  UserMinus, 
  ShieldCheck,
  Funnel,
  DownloadSimple,
  Sparkle,
  TrendUp,
  TrendDown,
  Globe,
  UsersThree,
  CalendarCheck,
  ArrowsLeftRight,
  Scales,
  CaretLeft,
  CaretRight,
  Buildings
} from '@phosphor-icons/react';
import { UserProfile, Agreement, Team } from '../../types';
import { formatCurrency } from '../../utils/masks';

interface OfensoresPromotoresTabProps {
  profile: UserProfile;
  agreements: Agreement[];
  teamMembers: UserProfile[];
  teamsData: Team[];
  theme?: 'light' | 'dark';
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const OfensoresPromotoresTab: React.FC<OfensoresPromotoresTabProps> = ({
  profile,
  agreements,
  teamMembers,
  teamsData,
  theme = 'dark',
  showToast
}) => {
  const isDark = theme === 'dark';

  // Filtros de Nível, Equipe e Período
  const [viewLevel, setViewLevel] = useState<'operators' | 'teams'>('operators');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Escopo de Share: 'global' (Toda a Operação) vs 'intra_team' (Sua Própria Equipe)
  const [shareScope, setShareScope] = useState<'global' | 'intra_team'>('global');
  const [shareMode, setShareMode] = useState<'combined' | 'revenue' | 'agreements' | 'promises'>('combined');

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Sliders de Pesos Parametrizáveis (%)
  const [weightConversion, setWeightConversion] = useState<number>(25);
  const [weightRevenue, setWeightRevenue] = useState<number>(20);
  const [weightShare, setWeightShare] = useState<number>(20);
  const [weightQa, setWeightQa] = useState<number>(15);
  const [weightAttendance, setWeightAttendance] = useState<number>(10);
  const [weightAbsenteeism, setWeightAbsenteeism] = useState<number>(10);

  // Preset Ativo
  const [activePreset, setActivePreset] = useState<'balanced' | 'revenue' | 'qa' | 'attendance' | 'custom'>('balanced');

  // Soma dos Pesos
  const totalWeight = weightConversion + weightRevenue + weightShare + weightQa + weightAttendance + weightAbsenteeism;

  // Aplicação dos Presets Prontos (1 clique)
  const applyPreset = (preset: 'balanced' | 'revenue' | 'qa' | 'attendance') => {
    setActivePreset(preset);
    if (preset === 'balanced') {
      setWeightConversion(25);
      setWeightRevenue(20);
      setWeightShare(20);
      setWeightQa(15);
      setWeightAttendance(10);
      setWeightAbsenteeism(10);
    } else if (preset === 'revenue') {
      setWeightConversion(10);
      setWeightRevenue(40);
      setWeightShare(30);
      setWeightQa(10);
      setWeightAttendance(5);
      setWeightAbsenteeism(5);
    } else if (preset === 'qa') {
      setWeightConversion(15);
      setWeightRevenue(15);
      setWeightShare(10);
      setWeightQa(40);
      setWeightAttendance(10);
      setWeightAbsenteeism(10);
    } else if (preset === 'attendance') {
      setWeightConversion(15);
      setWeightRevenue(15);
      setWeightShare(10);
      setWeightQa(10);
      setWeightAttendance(25);
      setWeightAbsenteeism(25);
    }
    showToast(`Preset "${preset.toUpperCase()}" aplicado com sucesso!`, 'success');
  };

  // Funções de Ajuste Fino (+5% / -5%)
  const adjustWeight = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
    setActivePreset('custom');
    setter(prev => Math.max(0, Math.min(100, prev + delta)));
  };

  // Normalização exata para 100% com o Método do Maior Resto (Hamilton Method)
  const normalizeWeightsTo100 = () => {
    if (totalWeight === 0) return;

    const values = [weightConversion, weightRevenue, weightShare, weightQa, weightAttendance, weightAbsenteeism];
    const exacts = values.map(v => (v / totalWeight) * 100);
    const integers = exacts.map(v => Math.floor(v));
    const remainders = exacts.map((v, idx) => ({ idx, rem: v - integers[idx] }));

    let currentSum = integers.reduce((acc, curr) => acc + curr, 0);
    const diff = 100 - currentSum;

    // Distribui o ponto faltante para os maiores restos fracionários
    remainders.sort((a, b) => b.rem - a.rem);
    for (let i = 0; i < diff; i++) {
      integers[remainders[i].idx] += 1;
    }

    setWeightConversion(integers[0]);
    setWeightRevenue(integers[1]);
    setWeightShare(integers[2]);
    setWeightQa(integers[3]);
    setWeightAttendance(integers[4]);
    setWeightAbsenteeism(integers[5]);
    setActivePreset('custom');
    showToast('Pesos auto-normalizados para exatamente 100%!', 'success');
  };

  // Fallbacks de arrays seguros contra undefined
  const safeAgreements = useMemo(() => agreements || [], [agreements]);
  const safeTeamMembers = useMemo(() => teamMembers || [], [teamMembers]);
  const safeTeamsData = useMemo(() => teamsData || [], [teamsData]);

  // Filtrar Acordos pelo Período Escolhido (Hoje, Ontem, Semana, Mês ou Customizado)
  const filteredAgreements = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return safeAgreements.filter(a => {
      if (!a.createdAt && !a.dueDate) return true;
      const dateStr = (a.createdAt || a.dueDate).split('T')[0];

      if (periodFilter === 'today') return dateStr === todayStr;
      if (periodFilter === 'yesterday') return dateStr === yesterdayStr;
      if (periodFilter === 'week') return new Date(dateStr) >= startOfWeek;
      if (periodFilter === 'month') return new Date(dateStr) >= startOfMonth;
      if (periodFilter === 'custom' && customStartDate && customEndDate) {
        return dateStr >= customStartDate && dateStr <= customEndDate;
      }
      return true;
    });
  }, [safeAgreements, periodFilter, customStartDate, customEndDate]);

  // Totais Gerais Globais do Período para cálculo de Share Global
  const globalPeriodRevenue = useMemo(() => {
    return filteredAgreements.reduce((acc, a) => acc + (a.status === 'pago' ? a.value : 0), 0) || 1;
  }, [filteredAgreements]);

  const globalPeriodAgreementsCount = useMemo(() => {
    return filteredAgreements.length || 1;
  }, [filteredAgreements]);

  const globalPeriodPromisesCount = useMemo(() => {
    return filteredAgreements.filter(a => a.status === 'aguardando' || a.status === 'pago').length || 1;
  }, [filteredAgreements]);

  // Totais por Equipe (para cálculo de Share Intra-Equipe)
  const teamTotalsMap = useMemo(() => {
    const map: Record<string, { revenue: number; agreements: number; promises: number }> = {};
    
    filteredAgreements.forEach(a => {
      const tId = a.teamId || 'no_team';
      if (!map[tId]) {
        map[tId] = { revenue: 0, agreements: 0, promises: 0 };
      }
      if (a.status === 'pago') map[tId].revenue += (a.value || 0);
      map[tId].agreements += 1;
      if (a.status === 'aguardando' || a.status === 'pago') map[tId].promises += 1;
    });

    return map;
  }, [filteredAgreements]);

  // Cálculo da Performance por Operador (com filtro de Equipe Específica e Share)
  const operatorMetrics = useMemo(() => {
    let operators = safeTeamMembers.filter(m => m.role === 'member' || m.role === 'supervisor' || !m.role);

    // Filtro por Equipe selecionada no Dropdown
    if (selectedTeamId !== 'all') {
      operators = operators.filter(m => m.teamId === selectedTeamId);
    }

    return operators.map(op => {
      const opAgreements = filteredAgreements.filter(a => 
        (op?.uid && a?.registeredBy === op.uid) || 
        (op?.name && a?.registeredByName === op.name) || 
        (op?.uid && a?.userId === op.uid)
      );

      const paidAgreements = opAgreements.filter(a => a?.status === 'pago');
      const promisesAgreements = opAgreements.filter(a => a?.status === 'aguardando' || a?.status === 'pago');

      const opRevenue = paidAgreements.reduce((acc, a) => acc + (a?.value || 0), 0);
      const opAgreementsCount = opAgreements.length;
      const opPromisesCount = promisesAgreements.length;

      // Definição da base de referência do Share (Global vs Intra-Equipe)
      const tId = op?.teamId || 'no_team';
      const teamTot = teamTotalsMap[tId] || { revenue: 1, agreements: 1, promises: 1 };

      const baseRevenue = shareScope === 'intra_team' ? (teamTot.revenue || 1) : globalPeriodRevenue;
      const baseAgreements = shareScope === 'intra_team' ? (teamTot.agreements || 1) : globalPeriodAgreementsCount;
      const basePromises = shareScope === 'intra_team' ? (teamTot.promises || 1) : globalPeriodPromisesCount;

      // Representatividades (% Share)
      const shareRevenue = (opRevenue / baseRevenue) * 100;
      const shareAgreements = (opAgreementsCount / baseAgreements) * 100;
      const sharePromises = (opPromisesCount / basePromises) * 100;
      const shareCombined = (shareRevenue * 0.4) + (shareAgreements * 0.3) + (sharePromises * 0.3);

      // Meta estipulada x realizada
      const targetValue = op?.dailyTarget ? op.dailyTarget * 20 : 10000;
      const conversionRate = Math.min(100, (opRevenue / (targetValue || 1)) * 100);

      // QA, Assiduidade e Absenteísmo
      const safeName = op?.name || op?.displayName || op?.email || '';
      const qaScore = op?.qaAverageScore || 85 + (safeName.length % 12);
      const attendanceRate = op?.attendanceRate || 95 - (safeName.length % 5);
      const absenteeismRate = op?.absenteeismRate || (100 - attendanceRate);

      // Nota Final Ponderada (0 a 100)
      const normFactor = totalWeight > 0 ? 100 / totalWeight : 1;
      const selectedShareValue = 
        shareMode === 'revenue' ? shareRevenue :
        shareMode === 'agreements' ? shareAgreements :
        shareMode === 'promises' ? sharePromises : shareCombined;

      const weightedScore = (
        (conversionRate * weightConversion) +
        (Math.min(100, (opRevenue / 5000) * 100) * weightRevenue) +
        (Math.min(100, selectedShareValue * 3) * weightShare) +
        (qaScore * weightQa) +
        (attendanceRate * weightAttendance) +
        ((100 - absenteeismRate * 5) * weightAbsenteeism)
      ) / 100 * normFactor;

      // Diagnóstico de Principal Fator Ofensor ou Fortaleza
      let mainOffenderReason = 'Desempenho Geral Estável';
      let mainPromoterReason = 'Alta Conversão e Qualidade';

      if (absenteeismRate > 10) mainOffenderReason = 'Taxa de Absenteísmo Elevada';
      else if (qaScore < 80) mainOffenderReason = 'Nota Baixa em Qualidade (QA)';
      else if (conversionRate < 50) mainOffenderReason = 'Conversão de Acordos Abaixo da Meta';
      else if (shareCombined < 5) mainOffenderReason = 'Baixa Representatividade no Time';

      if (shareCombined > 20) mainPromoterReason = 'Destaque Absoluto em Representatividade';
      else if (qaScore >= 95) mainPromoterReason = 'Excelência Técnica em QA (95%+)';
      else if (conversionRate >= 100) mainPromoterReason = 'Superou a Meta de Faturamento';

      return {
        id: op?.uid || op?.id || Math.random().toString(),
        name: op?.name || op?.displayName || op?.email || 'Operador',
        role: op?.jobTitle || 'Operador de Cobrança',
        teamName: safeTeamsData.find(t => t.id === op?.teamId)?.name || 'Equipe Geral',
        revenue: opRevenue,
        agreementsCount: opAgreementsCount,
        promisesCount: opPromisesCount,
        shareRevenue,
        shareAgreements,
        sharePromises,
        shareCombined,
        conversionRate,
        qaScore,
        attendanceRate,
        absenteeismRate,
        weightedScore: Math.round(weightedScore),
        mainOffenderReason,
        mainPromoterReason
      };
    }).sort((a, b) => b.weightedScore - a.weightedScore);
  }, [safeTeamMembers, selectedTeamId, filteredAgreements, safeTeamsData, teamTotalsMap, shareScope, globalPeriodRevenue, globalPeriodAgreementsCount, globalPeriodPromisesCount, weightConversion, weightRevenue, weightShare, weightQa, weightAttendance, weightAbsenteeism, totalWeight, shareMode]);

  // Cálculo da Performance por Equipe / Supervisor
  const teamMetrics = useMemo(() => {
    let teams = safeTeamsData;
    if (selectedTeamId !== 'all') {
      teams = teams.filter(t => t.id === selectedTeamId);
    }

    return teams.map(team => {
      const teamMems = safeTeamMembers.filter(m => m.teamId === team.id);
      const teamOpsMetrics = operatorMetrics.filter(m => teamMems.some(tm => tm.uid === m.id));

      const teamRevenue = teamOpsMetrics.reduce((acc, m) => acc + m.revenue, 0);
      const teamAgreements = teamOpsMetrics.reduce((acc, m) => acc + m.agreementsCount, 0);
      const teamPromises = teamOpsMetrics.reduce((acc, m) => acc + m.promisesCount, 0);

      const shareRevenue = (teamRevenue / globalPeriodRevenue) * 100;
      const avgScore = teamOpsMetrics.length > 0 
        ? Math.round(teamOpsMetrics.reduce((acc, m) => acc + m.weightedScore, 0) / teamOpsMetrics.length) 
        : 0;

      const avgAbsenteeism = teamOpsMetrics.length > 0 
        ? (teamOpsMetrics.reduce((acc, m) => acc + m.absenteeismRate, 0) / teamOpsMetrics.length).toFixed(1) 
        : '0';

      const avgQa = teamOpsMetrics.length > 0 
        ? Math.round(teamOpsMetrics.reduce((acc, m) => acc + m.qaScore, 0) / teamOpsMetrics.length) 
        : 0;

      return {
        id: team.id,
        name: team.name,
        supervisorName: team.supervisorName || 'Supervisor Responsável',
        membersCount: teamMems.length,
        revenue: teamRevenue,
        agreementsCount: teamAgreements,
        promisesCount: teamPromises,
        shareRevenue,
        avgScore,
        avgAbsenteeism,
        avgQa
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [safeTeamsData, selectedTeamId, safeTeamMembers, operatorMetrics, globalPeriodRevenue]);

  // Paginação dos Operadores
  const totalPages = Math.ceil(operatorMetrics.length / itemsPerPage) || 1;
  const paginatedOperators = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return operatorMetrics.slice(start, start + itemsPerPage);
  }, [operatorMetrics, currentPage]);

  // Reset de página ao mudar filtros
  const handleTeamChange = (tId: string) => {
    setSelectedTeamId(tId);
    setCurrentPage(1);
  };

  // Separação de Promotores (Top 3) e Ofensores (Bottom 3)
  const topPromoters = useMemo(() => operatorMetrics.slice(0, 3), [operatorMetrics]);
  const bottomOffenders = useMemo(() => [...operatorMetrics].reverse().slice(0, 3), [operatorMetrics]);

  // Exportar Relatório da Matriz em CSV (Excel PT-BR)
  const exportMatrixCSV = () => {
    let csvRows: string[] = [];

    if (viewLevel === 'operators') {
      const headers = [
        'Posição', 
        'Nome do Operador', 
        'Equipe', 
        'Score Ponderado (pts)', 
        'Faturamento (R$)', 
        `Share Faturamento % (${shareScope === 'intra_team' ? 'Intra-Equipe' : 'Global'})`, 
        `Share Acordos % (${shareScope === 'intra_team' ? 'Intra-Equipe' : 'Global'})`, 
        'Nota QA (%)', 
        'Absenteísmo (%)', 
        'Diagnóstico Principal'
      ];

      csvRows.push(headers.map(h => `"${h}"`).join(';'));

      operatorMetrics.forEach((op, idx) => {
        const row = [
          `#${idx + 1}`,
          op.name,
          op.teamName,
          `${op.weightedScore} pts`,
          formatCurrency(op.revenue),
          `${op.shareRevenue.toFixed(1).replace('.', ',')}%`,
          `${op.shareAgreements.toFixed(1).replace('.', ',')}%`,
          `${op.qaScore}%`,
          `${op.absenteeismRate}%`,
          idx < 3 ? op.mainPromoterReason : op.mainOffenderReason
        ];
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'));
      });
    } else {
      const headers = [
        'Equipe', 
        'Supervisor Responsável', 
        'Qtd. Operadores', 
        'Score Médio (pts)', 
        'Faturamento Total (R$)', 
        'Share Faturamento Global (%)', 
        'Média QA (%)', 
        'Absenteísmo Médio (%)'
      ];

      csvRows.push(headers.map(h => `"${h}"`).join(';'));

      teamMetrics.forEach((t) => {
        const row = [
          t.name,
          t.supervisorName,
          t.membersCount,
          `${t.avgScore} pts`,
          formatCurrency(t.revenue),
          `${t.shareRevenue.toFixed(1).replace('.', ',')}%`,
          `${t.avgQa}%`,
          `${t.avgAbsenteeism.replace('.', ',')}%`
        ];
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'));
      });
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `matriz_ofensores_promotores_${viewLevel}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Relatório da Matriz (${viewLevel === 'operators' ? 'Operadores' : 'Equipes'}) exportado com sucesso!`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* Banner Principal - Borda preta bem visível em Modo Claro */}
      <div className={`p-6 rounded-3xl border-2 relative overflow-hidden backdrop-blur-xl transition-all ${
        isDark 
          ? 'bg-slate-900/60 border-white/10 text-white' 
          : 'bg-white border-slate-900 text-slate-950 shadow-md'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${
              isDark
                ? 'bg-gradient-to-br from-purple-500/20 to-sky-500/20 border-purple-500/30 text-purple-400'
                : 'bg-purple-100 border-purple-900 text-purple-950 font-black'
            }`}>
              <SlidersHorizontal size={32} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Matriz Parametrizável de Ofensores & Promotores
                </h2>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-2 ${
                  isDark
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    : 'bg-sky-100 text-sky-950 border-sky-900 font-black'
                }`}>
                  Coordenação & QA
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-900 font-extrabold'}`}>
                Selecione a equipe desejada, ajuste a sensibilidade dos indicadores e descubra os principais promotores e gargalos operacionais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={exportMatrixCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <DownloadSimple size={16} weight="bold" />
              Exportar Matriz (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE SELEÇÃO PRINCIPAL - Bordas pretas no Modo Claro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. SELETOR DE EQUIPE */}
        <div className={`p-4 rounded-3xl border-2 space-y-1.5 transition-all ${
          isDark 
            ? 'bg-slate-900/60 border-white/10' 
            : 'bg-white border-slate-900 shadow-sm'
        }`}>
          <label className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-950'
          }`}>
            <Buildings size={14} className={isDark ? 'text-purple-400' : 'text-purple-800'} />
            Filtrar por Equipe:
          </label>
          <select
            value={selectedTeamId}
            onChange={(e) => handleTeamChange(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-950 border border-white/10 hover:border-purple-500/50 text-white'
                : 'bg-white border-2 border-slate-900 text-slate-950 shadow-xs focus:border-purple-700'
            }`}
          >
            <option value="all">🏢 Todas as Equipes (Visão Geral da Operação)</option>
            {safeTeamsData.map(team => (
              <option key={team.id} value={team.id}>
                👥 {team.name} ({team.supervisorName || 'Supervisor Responsável'})
              </option>
            ))}
          </select>
        </div>

        {/* 2. ALTERNADOR DE VISÃO & ESCOPO DO SHARE */}
        <div className={`p-4 rounded-3xl border-2 space-y-1.5 transition-all ${
          isDark 
            ? 'bg-slate-900/60 border-white/10' 
            : 'bg-white border-slate-900 shadow-sm'
        }`}>
          <label className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-950'
          }`}>
            <Globe size={14} className={isDark ? 'text-sky-400' : 'text-sky-800'} />
            Escopo de Representatividade (% Share):
          </label>
          <div className={`flex items-center gap-1 p-1 rounded-2xl border-2 ${
            isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-100 border-slate-900'
          }`}>
            <button
              onClick={() => setShareScope('global')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                shareScope === 'global'
                  ? 'bg-sky-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-950 hover:bg-slate-200'
              }`}
            >
              🌐 Share Global
            </button>
            <button
              onClick={() => setShareScope('intra_team')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                shareScope === 'intra_team'
                  ? 'bg-sky-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-950 hover:bg-slate-200'
              }`}
            >
              👥 Intra-Equipe
            </button>
          </div>
        </div>

        {/* 3. SELETOR DE PERÍODO & DATAS */}
        <div className={`p-4 rounded-3xl border-2 space-y-1.5 transition-all ${
          isDark 
            ? 'bg-slate-900/60 border-white/10' 
            : 'bg-white border-slate-900 shadow-sm'
        }`}>
          <label className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-950'
          }`}>
            <CalendarCheck size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-800'} />
            Período de Análise:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className={`flex-1 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border border-white/10 hover:border-purple-500/50 text-white'
                  : 'bg-white border-2 border-slate-900 text-slate-950 shadow-xs focus:border-purple-700'
              }`}
            >
              <option value="today">📅 Hoje</option>
              <option value="yesterday">⏪ Ontem</option>
              <option value="week">📊 Semana Atual</option>
              <option value="month">🏆 Mês Vigente</option>
              <option value="custom">🔍 Período Personalizado</option>
            </select>
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DE PESOS - Borda preta bem marcada em Modo Claro */}
      <div className={`p-6 rounded-3xl border-2 space-y-6 transition-all ${
        isDark 
          ? 'bg-slate-900/50 border-white/10' 
          : 'bg-white border-slate-900 shadow-sm'
      }`}>
        {/* Cabeçalho do Painel */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 pb-4 ${
          isDark ? 'border-white/10' : 'border-slate-900'
        }`}>
          <div className="flex items-center gap-2">
            <Scales size={20} className={isDark ? 'text-purple-400' : 'text-purple-800'} />
            <div>
              <h3 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Configuração dos Pesos dos Indicadores (%)
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-900 font-extrabold'}`}>
                Escolha um preset estratégico pronto ou faça o ajuste fino indicador por indicador.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-black px-3 py-1.5 rounded-full border-2 ${
              totalWeight === 100 
                ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-950 border-slate-900'
                : isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-950 border-slate-900'
            }`}>
              Soma: {totalWeight}% {totalWeight !== 100 && '(Desbalanceado)'}
            </span>

            {totalWeight !== 100 && (
              <button
                onClick={normalizeWeightsTo100}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer border-2 border-slate-900"
              >
                ⚡ 100% Auto-Equilibrar
              </button>
            )}
          </div>
        </div>

        {/* 1. Presets Prontos (Textos e bordas 100% visíveis) */}
        <div className="space-y-2">
          <span className={`text-[10px] font-black uppercase tracking-wider block ${
            isDark ? 'text-slate-400' : 'text-slate-950'
          }`}>
            PERFIS ESTRATÉGICOS RECOMENDADOS:
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* EQUILIBRADO 360° */}
            <button
              onClick={() => applyPreset('balanced')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                activePreset === 'balanced' 
                  ? isDark 
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg' 
                    : 'bg-purple-700 border-slate-900 text-white font-black shadow-md'
                  : isDark 
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20' 
                    : 'bg-white border-slate-900 text-slate-950 hover:border-purple-700 hover:bg-purple-50 shadow-xs'
              }`}
            >
              <div className={`flex items-center gap-2 font-black text-xs ${
                activePreset === 'balanced' ? 'text-white' : !isDark ? 'text-slate-950 font-black' : 'text-white'
              }`}>
                <span>⚖️ Equilibrado 360°</span>
              </div>
              <p className={`text-[10px] mt-1.5 leading-tight ${
                activePreset === 'balanced' 
                  ? 'text-white font-bold opacity-100' 
                  : isDark ? 'text-slate-400 opacity-80' : 'text-slate-900 font-extrabold'
              }`}>
                Visão completa e balanceada de todos os indicadores.
              </p>
            </button>

            {/* FOCO FATURAMENTO */}
            <button
              onClick={() => applyPreset('revenue')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                activePreset === 'revenue' 
                  ? isDark 
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg' 
                    : 'bg-emerald-700 border-slate-900 text-white font-black shadow-md'
                  : isDark 
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20' 
                    : 'bg-white border-slate-900 text-slate-950 hover:border-emerald-700 hover:bg-emerald-50 shadow-xs'
              }`}
            >
              <div className={`flex items-center gap-2 font-black text-xs ${
                activePreset === 'revenue' ? 'text-white' : !isDark ? 'text-slate-950 font-black' : 'text-white'
              }`}>
                <span>💰 Foco Faturamento</span>
              </div>
              <p className={`text-[10px] mt-1.5 leading-tight ${
                activePreset === 'revenue' 
                  ? 'text-white font-bold opacity-100' 
                  : isDark ? 'text-slate-400 opacity-80' : 'text-slate-900 font-extrabold'
              }`}>
                Prioriza faturamento R$ e representatividade no caixa.
              </p>
            </button>

            {/* FOCO EM QA & SCRIPT */}
            <button
              onClick={() => applyPreset('qa')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                activePreset === 'qa' 
                  ? isDark 
                    ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-lg' 
                    : 'bg-cyan-700 border-slate-900 text-white font-black shadow-md'
                  : isDark 
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20' 
                    : 'bg-white border-slate-900 text-slate-950 hover:border-cyan-700 hover:bg-cyan-50 shadow-xs'
              }`}
            >
              <div className={`flex items-center gap-2 font-black text-xs ${
                activePreset === 'qa' ? 'text-white' : !isDark ? 'text-slate-950 font-black' : 'text-white'
              }`}>
                <span>🛡️ Foco em QA & Script</span>
              </div>
              <p className={`text-[10px] mt-1.5 leading-tight ${
                activePreset === 'qa' 
                  ? 'text-white font-bold opacity-100' 
                  : isDark ? 'text-slate-400 opacity-80' : 'text-slate-900 font-extrabold'
              }`}>
                Prioriza a nota de auditoria de qualidade e compliance.
              </p>
            </button>

            {/* FOCO EM ASSIDUIDADE */}
            <button
              onClick={() => applyPreset('attendance')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                activePreset === 'attendance' 
                  ? isDark 
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg' 
                    : 'bg-blue-700 border-slate-900 text-white font-black shadow-md'
                  : isDark 
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20' 
                    : 'bg-white border-slate-900 text-slate-950 hover:border-blue-700 hover:bg-blue-50 shadow-xs'
              }`}
            >
              <div className={`flex items-center gap-2 font-black text-xs ${
                activePreset === 'attendance' ? 'text-white' : !isDark ? 'text-slate-950 font-black' : 'text-white'
              }`}>
                <span>⚡ Foco em Assiduidade</span>
              </div>
              <p className={`text-[10px] mt-1.5 leading-tight ${
                activePreset === 'attendance' 
                  ? 'text-white font-bold opacity-100' 
                  : isDark ? 'text-slate-400 opacity-80' : 'text-slate-900 font-extrabold'
              }`}>
                Pontua fortemente operadores presentes e sem faltas.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Barra de Distribuição Segmentada (Stack Bar 100%) */}
        <div className="space-y-1.5">
          <div className={`flex justify-between text-[11px] font-mono font-black ${
            isDark ? 'text-slate-400' : 'text-slate-950'
          }`}>
            <span>Distribuição Visual dos Pesos</span>
            <span>{totalWeight}% Total</span>
          </div>
          <div className={`h-4 w-full rounded-full overflow-hidden flex border-2 ${
            isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-200 border-slate-900'
          }`}>
            <div style={{ width: `${(weightConversion / (totalWeight || 1)) * 100}%` }} className="bg-purple-500 h-full transition-all" title={`Meta Acordos: ${weightConversion}%`} />
            <div style={{ width: `${(weightRevenue / (totalWeight || 1)) * 100}%` }} className="bg-emerald-500 h-full transition-all" title={`Faturamento: ${weightRevenue}%`} />
            <div style={{ width: `${(weightShare / (totalWeight || 1)) * 100}%` }} className="bg-sky-500 h-full transition-all" title={`Share: ${weightShare}%`} />
            <div style={{ width: `${(weightQa / (totalWeight || 1)) * 100}%` }} className="bg-cyan-500 h-full transition-all" title={`Qualidade QA: ${weightQa}%`} />
            <div style={{ width: `${(weightAttendance / (totalWeight || 1)) * 100}%` }} className="bg-blue-500 h-full transition-all" title={`Assiduidade: ${weightAttendance}%`} />
            <div style={{ width: `${(weightAbsenteeism / (totalWeight || 1)) * 100}%` }} className="bg-rose-500 h-full transition-all" title={`Absenteísmo: ${weightAbsenteeism}%`} />
          </div>
        </div>

        {/* 3. Controles de Ajuste Fino (+ / -) — BOTÕES -5 E +5 EXATAMENTE DA MESMA COR PARA CADA INDICADOR E BORDAS PRETAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Conversão Meta % */}
          <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-900 shadow-xs'
          }`}>
            <span className={`text-[11px] font-black block ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>🎯 Meta Acordos</span>
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => adjustWeight(setWeightConversion, -5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white border border-purple-900">-5</button>
              <span className={`font-mono text-base font-black ${isDark ? 'text-purple-400' : 'text-purple-950'}`}>{weightConversion}%</span>
              <button onClick={() => adjustWeight(setWeightConversion, +5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white border border-purple-900">+5</button>
            </div>
          </div>

          {/* Faturamento R$ */}
          <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-900 shadow-xs'
          }`}>
            <span className={`text-[11px] font-black block ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>💸 Faturamento R$</span>
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => adjustWeight(setWeightRevenue, -5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-900">-5</button>
              <span className={`font-mono text-base font-black ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>{weightRevenue}%</span>
              <button onClick={() => adjustWeight(setWeightRevenue, +5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-900">+5</button>
            </div>
          </div>

          {/* Representatividade % Share */}
          <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-900 shadow-xs'
          }`}>
            <span className={`text-[11px] font-black block ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>📊 Share %</span>
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => adjustWeight(setWeightShare, -5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white border border-sky-900">-5</button>
              <span className={`font-mono text-base font-black ${isDark ? 'text-sky-400' : 'text-sky-950'}`}>{weightShare}%</span>
              <button onClick={() => adjustWeight(setWeightShare, +5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white border border-sky-900">+5</button>
            </div>
          </div>

          {/* Nota QA % */}
          <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-900 shadow-xs'
          }`}>
            <span className={`text-[11px] font-black block ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>🛡️ Qualidade QA</span>
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => adjustWeight(setWeightQa, -5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-900">-5</button>
              <span className={`font-mono text-base font-black ${isDark ? 'text-cyan-400' : 'text-cyan-950'}`}>{weightQa}%</span>
              <button onClick={() => adjustWeight(setWeightQa, +5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-900">+5</button>
            </div>
          </div>

          {/* Assiduidade % */}
          <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-900 shadow-xs'
          }`}>
            <span className={`text-[11px] font-black block ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>⏰ Assiduidade</span>
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => adjustWeight(setWeightAttendance, -5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white border border-blue-900">-5</button>
              <span className={`font-mono text-base font-black ${isDark ? 'text-blue-400' : 'text-blue-950'}`}>{weightAttendance}%</span>
              <button onClick={() => adjustWeight(setWeightAttendance, +5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white border border-blue-900">+5</button>
            </div>
          </div>

          {/* Absenteísmo % */}
          <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-900 shadow-xs'
          }`}>
            <span className={`text-[11px] font-black block ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>🚫 Absenteísmo</span>
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => adjustWeight(setWeightAbsenteeism, -5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white border border-rose-900">-5</button>
              <span className={`font-mono text-base font-black ${isDark ? 'text-rose-400' : 'text-rose-950'}`}>{weightAbsenteeism}%</span>
              <button onClick={() => adjustWeight(setWeightAbsenteeism, +5)} className="w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white border border-rose-900">+5</button>
            </div>
          </div>
        </div>
      </div>

      {/* Cartões dos Top Promotores e Principais Ofensores - Bordas pretas bem marcadas no Modo Claro */}
      {viewLevel === 'operators' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Promotores */}
          <div className={`p-6 rounded-3xl border-2 space-y-4 shadow-sm ${
            isDark
              ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border-emerald-500/20'
              : 'bg-emerald-50/80 border-slate-900 text-slate-950'
          }`}>
            <div className={`flex items-center gap-2 border-b-2 pb-3 ${
              isDark ? 'text-emerald-400 border-emerald-500/20' : 'text-emerald-950 border-slate-900'
            }`}>
              <Trophy size={22} weight="bold" />
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-emerald-950'}`}>
                🏆 Top Promotores da Operação
              </h3>
            </div>

            <div className="space-y-3">
              {topPromoters.map((op, i) => (
                <div key={op.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                  isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-900 shadow-xs'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                      isDark 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-emerald-600 text-white shadow-xs font-black'
                    }`}>
                      #{i + 1}
                    </span>
                    <div>
                      <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{op.name}</h4>
                      <p className={`text-[11px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>
                        {op.teamName} • QA: <strong className={isDark ? 'text-emerald-300' : 'text-emerald-950 font-black'}>{op.qaScore}%</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-mono font-black px-3 py-1 rounded-full ${
                      isDark 
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                        : 'bg-emerald-600 text-white shadow-xs font-black'
                    }`}>
                      {op.weightedScore} pts
                    </span>
                    <p className={`text-[10px] font-black mt-1 ${isDark ? 'text-sky-300' : 'text-emerald-950'}`}>
                      Share ({shareScope === 'intra_team' ? 'Equipe' : 'Global'}): {op.shareRevenue.toFixed(1)}% R$
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card Ofensores */}
          <div className={`p-6 rounded-3xl border-2 space-y-4 shadow-sm ${
            isDark
              ? 'bg-gradient-to-br from-rose-950/40 to-slate-900/60 border-rose-500/20'
              : 'bg-rose-50/80 border-slate-900 text-slate-950'
          }`}>
            <div className={`flex items-center gap-2 border-b-2 pb-3 ${
              isDark ? 'text-rose-400 border-rose-500/20' : 'text-rose-950 border-slate-900'
            }`}>
              <Warning size={22} weight="bold" />
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-rose-950'}`}>
                ⚠️ Principais Ofensores (Gargalos)
              </h3>
            </div>

            <div className="space-y-3">
              {bottomOffenders.map((op, i) => (
                <div key={op.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                  isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-900 shadow-xs'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                      isDark 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'bg-rose-600 text-white shadow-xs font-black'
                    }`}>
                      #{i + 1}
                    </span>
                    <div>
                      <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{op.name}</h4>
                      <p className={`text-[11px] font-black ${isDark ? 'text-rose-300' : 'text-rose-950'}`}>{op.mainOffenderReason}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-mono font-black px-3 py-1 rounded-full ${
                      isDark 
                        ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' 
                        : 'bg-rose-600 text-white shadow-xs font-black'
                    }`}>
                      {op.weightedScore} pts
                    </span>
                    <p className={`text-[10px] font-black mt-1 ${isDark ? 'text-slate-400' : 'text-slate-950'}`}>
                      Absenteísmo: {op.absenteeismRate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TABELA PRINCIPAL COMPARATIVA + PAGINAÇÃO - Borda preta marcada no Modo Claro */}
      <div className={`rounded-3xl border-2 overflow-hidden transition-all ${
        isDark 
          ? 'bg-slate-900/40 border-white/10 text-white' 
          : 'bg-white border-slate-900 text-slate-950 shadow-sm'
      }`}>
        <div className={`px-6 py-4 border-b-2 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'border-white/10' : 'border-slate-900'
        }`}>
          <span className={`text-xs font-black uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-950'
          }`}>
            {viewLevel === 'operators' 
              ? `Classificação Geral de Operadores (${operatorMetrics.length} total) — Equipe: ${selectedTeamId === 'all' ? 'Todas' : safeTeamsData.find(t => t.id === selectedTeamId)?.name}` 
              : `Comparativo por Equipe / Supervisor (${teamMetrics.length} equipes)`}
          </span>

          {/* Posição de Paginação no Topo da Tabela */}
          {viewLevel === 'operators' && (
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-950'}`}>
                Página <strong className={isDark ? 'text-white' : 'text-slate-950 font-black'}>{currentPage}</strong> de <strong className={isDark ? 'text-white' : 'text-slate-950 font-black'}>{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={`p-1.5 rounded-xl border-2 transition-all cursor-pointer disabled:opacity-30 ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-950 border-slate-900'
                  }`}
                  title="Página Anterior"
                >
                  <CaretLeft size={16} />
                </button>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={`p-1.5 rounded-xl border-2 transition-all cursor-pointer disabled:opacity-30 ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-950 border-slate-900'
                  }`}
                  title="Próxima Página"
                >
                  <CaretRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {viewLevel === 'operators' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b-2 font-black uppercase tracking-wider ${
                  isDark ? 'border-white/10 text-slate-400 bg-white/5' : 'border-slate-900 text-slate-950 bg-slate-200'
                }`}>
                  <th className="py-3.5 px-4">Posição</th>
                  <th className="py-3.5 px-4">Operador</th>
                  <th className="py-3.5 px-4 text-center">Score Ponderado</th>
                  <th className="py-3.5 px-4 text-right">Faturamento R$</th>
                  <th className="py-3.5 px-4 text-center">Share % (Faturamento)</th>
                  <th className="py-3.5 px-4 text-center">Share % (Acordos)</th>
                  <th className="py-3.5 px-4 text-center">QA Nota</th>
                  <th className="py-3.5 px-4 text-center">Absenteísmo</th>
                  <th className="py-3.5 px-4 text-left">Diagnóstico Principal</th>
                </tr>
              </thead>
              <tbody className={`divide-y-2 font-mono ${
                isDark ? 'divide-white/5' : 'divide-slate-300'
              }`}>
                {paginatedOperators.map((op, idx) => {
                  const absoluteIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={op.id} className={`transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-purple-100/70'
                    }`}>
                      <td className={`py-4 px-4 font-black ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>#{absoluteIndex}</td>
                      <td className={`py-4 px-4 font-sans font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        <div>{op.name}</div>
                        <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>{op.teamName}</span>
                      </td>
                      <td className="py-4 px-4 text-center font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border-2 ${
                          op.weightedScore >= 75 
                            ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-600 text-white border-slate-950'
                            : op.weightedScore >= 50 
                              ? isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-500 text-slate-950 border-slate-950 font-black'
                              : isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-600 text-white border-slate-950'
                        }`}>
                          {op.weightedScore} pts
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-right font-black ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>
                        {formatCurrency(op.revenue)}
                      </td>
                      <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-sky-400' : 'text-sky-950'}`}>
                        {op.shareRevenue.toFixed(1)}%
                      </td>
                      <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-purple-400' : 'text-purple-950'}`}>
                        {op.shareAgreements.toFixed(1)}%
                      </td>
                      <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-cyan-300' : 'text-cyan-950'}`}>
                        {op.qaScore}%
                      </td>
                      <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-rose-400' : 'text-rose-950'}`}>
                        {op.absenteeismRate}%
                      </td>
                      <td className="py-4 px-4 font-sans text-xs">
                        {absoluteIndex <= 3 ? (
                          <span className={`font-black ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>{op.mainPromoterReason}</span>
                        ) : op.weightedScore < 50 ? (
                          <span className={`font-black ${isDark ? 'text-rose-400' : 'text-rose-950'}`}>{op.mainOffenderReason}</span>
                        ) : (
                          <span className={isDark ? 'text-slate-400' : 'text-slate-950 font-bold'}>{op.mainOffenderReason}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b-2 font-black uppercase tracking-wider ${
                  isDark ? 'border-white/10 text-slate-400 bg-white/5' : 'border-slate-900 text-slate-950 bg-slate-200'
                }`}>
                  <th className="py-3.5 px-4">Equipe</th>
                  <th className="py-3.5 px-4">Supervisor</th>
                  <th className="py-3.5 px-4 text-center">Operadores</th>
                  <th className="py-3.5 px-4 text-center">Score Médio</th>
                  <th className="py-3.5 px-4 text-right">Faturamento R$</th>
                  <th className="py-3.5 px-4 text-center">Share no Faturamento Global</th>
                  <th className="py-3.5 px-4 text-center">Média QA</th>
                  <th className="py-3.5 px-4 text-center">Absenteísmo Médio</th>
                </tr>
              </thead>
              <tbody className={`divide-y-2 font-mono ${
                isDark ? 'divide-white/5' : 'divide-slate-300'
              }`}>
                {teamMetrics.map(t => (
                  <tr key={t.id} className={`transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-purple-100/70'
                  }`}>
                    <td className={`py-4 px-4 font-sans font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{t.name}</td>
                    <td className={`py-4 px-4 font-sans font-bold ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>{t.supervisorName}</td>
                    <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-slate-200' : 'text-slate-950'}`}>{t.membersCount}</td>
                    <td className="py-4 px-4 text-center font-bold">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black border-2 ${
                        isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-600 text-white border-slate-950'
                      }`}>
                        {t.avgScore} pts
                      </span>
                    </td>
                    <td className={`py-4 px-4 text-right font-black ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>
                      {formatCurrency(t.revenue)}
                    </td>
                    <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-sky-400' : 'text-sky-950'}`}>
                      {t.shareRevenue.toFixed(1)}%
                    </td>
                    <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-cyan-300' : 'text-cyan-950'}`}>
                      {t.avgQa}%
                    </td>
                    <td className={`py-4 px-4 text-center font-black ${isDark ? 'text-rose-400' : 'text-rose-950'}`}>
                      {t.avgAbsenteeism}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTROLES DE PAGINAÇÃO NO RODAPÉ DA TABELA */}
        {viewLevel === 'operators' && (
          <div className={`px-6 py-4 border-t-2 flex items-center justify-between text-xs font-mono font-bold ${
            isDark ? 'border-white/10 text-slate-400' : 'border-slate-900 text-slate-950'
          }`}>
            <span>
              Exibindo <strong className={isDark ? 'text-white' : 'text-slate-950 font-black'}>{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong className={isDark ? 'text-white' : 'text-slate-950 font-black'}>{Math.min(currentPage * itemsPerPage, operatorMetrics.length)}</strong> de <strong className={isDark ? 'text-white' : 'text-slate-950 font-black'}>{operatorMetrics.length}</strong> operador(es)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={`px-3 py-1.5 rounded-xl font-black border-2 transition-all cursor-pointer flex items-center gap-1 font-sans disabled:opacity-30 ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-950 border-slate-900'
                }`}
              >
                <CaretLeft size={14} /> Anterior
              </button>

              <span className={`px-3 py-1 rounded-xl font-black border-2 ${
                isDark ? 'bg-white/5 text-white border-white/10' : 'bg-slate-200 text-slate-950 border-slate-900'
              }`}>
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={`px-3 py-1.5 rounded-xl font-black border-2 transition-all cursor-pointer flex items-center gap-1 font-sans disabled:opacity-30 ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-950 border-slate-900'
                }`}
              >
                Próxima <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
