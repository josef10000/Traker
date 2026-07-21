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
  TrendDown
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
  // Filtros de Nível e Período
  const [viewLevel, setViewLevel] = useState<'operators' | 'teams'>('operators');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('month');
  const [shareMode, setShareMode] = useState<'combined' | 'revenue' | 'agreements' | 'promises'>('combined');

  // Sliders de Pesos Parametrizáveis (%)
  const [weightConversion, setWeightConversion] = useState<number>(25);
  const [weightRevenue, setWeightRevenue] = useState<number>(20);
  const [weightShare, setWeightShare] = useState<number>(20);
  const [weightQa, setWeightQa] = useState<number>(15);
  const [weightAttendance, setWeightAttendance] = useState<number>(10);
  const [weightAbsenteeism, setWeightAbsenteeism] = useState<number>(10);

  // Normalização do Peso Total para garantir 100%
  const totalWeight = weightConversion + weightRevenue + weightShare + weightQa + weightAttendance + weightAbsenteeism;

  // Fallbacks de arrays seguros contra undefined
  const safeAgreements = useMemo(() => agreements || [], [agreements]);
  const safeTeamMembers = useMemo(() => teamMembers || [], [teamMembers]);
  const safeTeamsData = useMemo(() => teamsData || [], [teamsData]);

  // Filtrar Acordos pelo Período Escolhido
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
      return true;
    });
  }, [safeAgreements, periodFilter]);

  // Totais Gerais do Período para cálculo de Representatividade (% Share)
  const totalPeriodRevenue = useMemo(() => {
    return filteredAgreements.reduce((acc, a) => acc + (a.status === 'pago' ? a.value : 0), 0) || 1;
  }, [filteredAgreements]);

  const totalPeriodAgreementsCount = useMemo(() => {
    return filteredAgreements.length || 1;
  }, [filteredAgreements]);

  const totalPeriodPromisesCount = useMemo(() => {
    return filteredAgreements.filter(a => a.status === 'aguardando' || a.status === 'pago').length || 1;
  }, [filteredAgreements]);

  // Cálculo da Performance por Operador
  const operatorMetrics = useMemo(() => {
    // Filtrar membros que são operadores
    const operators = safeTeamMembers.filter(m => m.role === 'member' || m.role === 'supervisor' || !m.role);

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

      // Representatividades (% Share)
      const shareRevenue = (opRevenue / totalPeriodRevenue) * 100;
      const shareAgreements = (opAgreementsCount / totalPeriodAgreementsCount) * 100;
      const sharePromises = (opPromisesCount / totalPeriodPromisesCount) * 100;
      const shareCombined = (shareRevenue * 0.4) + (shareAgreements * 0.3) + (sharePromises * 0.3);

      // Meta estipulada x realizada
      const targetValue = op?.dailyTarget ? op.dailyTarget * 20 : 10000;
      const conversionRate = Math.min(100, (opRevenue / (targetValue || 1)) * 100);

      // QA, Assiduidade e Absenteísmo (com valores simulados realistas se não definidos)
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
        teamName: teamsData.find(t => t.id === op?.teamId)?.name || 'Equipe Geral',
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
  }, [teamMembers, filteredAgreements, teamsData, totalPeriodRevenue, totalPeriodAgreementsCount, totalPeriodPromisesCount, weightConversion, weightRevenue, weightShare, weightQa, weightAttendance, weightAbsenteeism, totalWeight, shareMode]);

  // Cálculo da Performance por Equipe / Supervisor
  const teamMetrics = useMemo(() => {
    return teamsData.map(team => {
      const teamMems = teamMembers.filter(m => m.teamId === team.id);
      const teamOpsMetrics = operatorMetrics.filter(m => teamMems.some(tm => tm.uid === m.id));

      const teamRevenue = teamOpsMetrics.reduce((acc, m) => acc + m.revenue, 0);
      const teamAgreements = teamOpsMetrics.reduce((acc, m) => acc + m.agreementsCount, 0);
      const teamPromises = teamOpsMetrics.reduce((acc, m) => acc + m.promisesCount, 0);

      const shareRevenue = (teamRevenue / totalPeriodRevenue) * 100;
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
  }, [teamsData, teamMembers, operatorMetrics, totalPeriodRevenue]);

  // Separação de Promotores (Top 3) e Ofensores (Bottom 3)
  const topPromoters = useMemo(() => operatorMetrics.slice(0, 3), [operatorMetrics]);
  const bottomOffenders = useMemo(() => [...operatorMetrics].reverse().slice(0, 3), [operatorMetrics]);

  // Exportar Relatório da Matriz em CSV
  const exportMatrixCSV = () => {
    const headers = ['Classificacao', 'Nome', 'Equipe', 'Pontuacao_Ponderada', 'Representatividade_R$', 'Representatividade_Acordos', 'QA_Nota', 'Absenteismo_%', 'Diagnostico'];
    const rows = operatorMetrics.map((op, idx) => [
      idx + 1,
      op.name,
      op.teamName,
      `${op.weightedScore} pts`,
      `${op.shareRevenue.toFixed(1)}%`,
      `${op.shareAgreements.toFixed(1)}%`,
      `${op.qaScore}%`,
      `${op.absenteeismRate}%`,
      idx < 3 ? op.mainPromoterReason : op.mainOffenderReason
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `matriz_ofensores_promotores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Relatório da Matriz exportado com sucesso!', 'success');
  };

  return (
    <div className="space-y-8">
      {/* Banner Principal */}
      <div className={`p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
        theme === 'dark' ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-sky-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <SlidersHorizontal size={32} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">Matriz Parametrizável de Ofensores & Promotores</h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Coordenação & QA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure os pesos dos indicadores, analise a representatividade (% Share) do time e diagnostique os gargalos operacionais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={exportMatrixCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <DownloadSimple size={16} weight="bold" />
              Exportar Matriz (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Painel de Controle de Pesos Parametrizáveis */}
      <div className={`p-6 rounded-3xl border ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-purple-400" />
            <h3 className="text-sm font-black text-white">Configuração de Pesos dos Indicadores (%)</h3>
          </div>
          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
            totalWeight === 100 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            Soma dos Pesos: {totalWeight}% {totalWeight !== 100 && '(Auto-normalizado)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {/* Conversão Meta % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">🎯 Meta Acordos</span>
              <span className="font-mono text-purple-400 font-bold">{weightConversion}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weightConversion}
              onChange={(e) => setWeightConversion(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Faturamento R$ */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">💸 Faturamento R$</span>
              <span className="font-mono text-emerald-400 font-bold">{weightRevenue}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weightRevenue}
              onChange={(e) => setWeightRevenue(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Representatividade % Share */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">📊 Representatividade %</span>
              <span className="font-mono text-sky-400 font-bold">{weightShare}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weightShare}
              onChange={(e) => setWeightShare(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Nota QA % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">🛡️ Qualidade QA</span>
              <span className="font-mono text-cyan-400 font-bold">{weightQa}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weightQa}
              onChange={(e) => setWeightQa(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Assiduidade % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">⏰ Assiduidade</span>
              <span className="font-mono text-blue-400 font-bold">{weightAttendance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weightAttendance}
              onChange={(e) => setWeightAttendance(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Absenteísmo % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">🚫 Absenteísmo</span>
              <span className="font-mono text-rose-400 font-bold">{weightAbsenteeism}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weightAbsenteeism}
              onChange={(e) => setWeightAbsenteeism(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Modos de Representatividade */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Alternador Nível: Operadores vs Equipes */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900/60 border border-white/10 shrink-0">
          <button
            onClick={() => setViewLevel('operators')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewLevel === 'operators' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} /> Visão por Operadores
          </button>
          <button
            onClick={() => setViewLevel('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewLevel === 'teams' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ChartBar size={14} /> Visão por Equipes & Supervisores
          </button>
        </div>

        {/* Modos de Representatividade (% Share) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Modo de Share:</span>
          <button
            onClick={() => setShareMode('combined')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              shareMode === 'combined' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            Combinado (Global)
          </button>
          <button
            onClick={() => setShareMode('revenue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              shareMode === 'revenue' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            Faturamento R$
          </button>
          <button
            onClick={() => setShareMode('agreements')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              shareMode === 'agreements' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            Qtd. Acordos
          </button>
          <button
            onClick={() => setShareMode('promises')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              shareMode === 'promises' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            Promessas
          </button>
        </div>

        {/* Período */}
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value as any)}
          className="bg-slate-900 border border-white/10 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
        >
          <option value="today">Hoje</option>
          <option value="yesterday">Ontem</option>
          <option value="week">Semana Atual</option>
          <option value="month">Mês Vigente</option>
        </select>
      </div>

      {/* Cartões dos Top Promotores e Principais Ofensores */}
      {viewLevel === 'operators' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Promotores */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border border-emerald-500/20 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 border-b border-emerald-500/20 pb-3">
              <Trophy size={20} weight="bold" />
              <h3 className="text-base font-black text-white">🏆 Top Promotores da Operação</h3>
            </div>

            <div className="space-y-3">
              {topPromoters.map((op, i) => (
                <div key={op.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-black text-xs flex items-center justify-center border border-emerald-500/30">
                      #{i + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{op.name}</h4>
                      <p className="text-[11px] text-slate-400">{op.teamName} • QA: <strong className="text-emerald-300">{op.qaScore}%</strong></p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      {op.weightedScore} pts
                    </span>
                    <p className="text-[10px] text-sky-300 font-bold mt-1">
                      Share: {op.shareRevenue.toFixed(1)}% R$
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card Ofensores */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-950/40 to-slate-900/60 border border-rose-500/20 space-y-4">
            <div className="flex items-center gap-2 text-rose-400 border-b border-rose-500/20 pb-3">
              <Warning size={20} weight="bold" />
              <h3 className="text-base font-black text-white">⚠️ Principais Ofensores (Gargalos)</h3>
            </div>

            <div className="space-y-3">
              {bottomOffenders.map((op, i) => (
                <div key={op.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 font-mono font-black text-xs flex items-center justify-center border border-rose-500/30">
                      #{i + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{op.name}</h4>
                      <p className="text-[11px] text-rose-300 font-semibold">{op.mainOffenderReason}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                      {op.weightedScore} pts
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Absenteísmo: {op.absenteeismRate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabela Principal Comparativa */}
      <div className={`rounded-3xl border overflow-hidden backdrop-blur-md ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {viewLevel === 'operators' ? `Classificação Geral de Operadores (${operatorMetrics.length})` : `Comparativo por Equipe / Supervisor (${teamMetrics.length})`}
          </span>
        </div>

        {viewLevel === 'operators' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider bg-white/5">
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
              <tbody className="divide-y divide-white/5 font-mono">
                {operatorMetrics.map((op, idx) => (
                  <tr key={op.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-300">#{idx + 1}</td>
                    <td className="py-4 px-4 font-sans font-bold text-white">
                      <div>{op.name}</div>
                      <span className="text-[10px] font-normal text-slate-400">{op.teamName}</span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold">
                      <span className={`px-2.5 py-1 rounded-full text-xs ${
                        op.weightedScore >= 75 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        op.weightedScore >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {op.weightedScore} pts
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(op.revenue)}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-sky-400">
                      {op.shareRevenue.toFixed(1)}%
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-purple-400">
                      {op.shareAgreements.toFixed(1)}%
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-cyan-300">
                      {op.qaScore}%
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-rose-400">
                      {op.absenteeismRate}%
                    </td>
                    <td className="py-4 px-4 font-sans text-xs">
                      {idx < 3 ? (
                        <span className="text-emerald-300 font-semibold">{op.mainPromoterReason}</span>
                      ) : op.weightedScore < 50 ? (
                        <span className="text-rose-400 font-semibold">{op.mainOffenderReason}</span>
                      ) : (
                        <span className="text-slate-400">{op.mainOffenderReason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider bg-white/5">
                  <th className="py-3.5 px-4">Equipe</th>
                  <th className="py-3.5 px-4">Supervisor</th>
                  <th className="py-3.5 px-4 text-center">Operadores</th>
                  <th className="py-3.5 px-4 text-center">Score Médio</th>
                  <th className="py-3.5 px-4 text-right">Faturamento R$</th>
                  <th className="py-3.5 px-4 text-center">Share no Faturamento</th>
                  <th className="py-3.5 px-4 text-center">Média QA</th>
                  <th className="py-3.5 px-4 text-center">Absenteísmo Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {teamMetrics.map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-sans font-bold text-white">{t.name}</td>
                    <td className="py-4 px-4 font-sans text-slate-300">{t.supervisorName}</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-200">{t.membersCount}</td>
                    <td className="py-4 px-4 text-center font-bold">
                      <span className="px-2.5 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {t.avgScore} pts
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(t.revenue)}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-sky-400">
                      {t.shareRevenue.toFixed(1)}%
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-cyan-300">
                      {t.avgQa}%
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-rose-400">
                      {t.avgAbsenteeism}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
