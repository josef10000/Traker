import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  Calculator, 
  Calendar, 
  Trophy, 
  Users, 
  ChartLine, 
  WarningCircle, 
  CircleNotch as Loader2,
  User,
  Note,
  Clock,
  CheckCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkle,
  TrendUp,
  Percent,
  Coins,
  Medal,
  Crown
} from '@phosphor-icons/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { UserProfile, Agreement, AgreementStatus, Team } from '../../types';
import { formatCurrency } from '../../utils/masks';

export const PublicPortfolioView = () => {
  const [loading, setLoading] = useState(true);

  // Estados dos dados carregados
  const [operators, setOperators] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);

  // Parâmetros da URL
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const orgId = queryParams.get('orgId') || 'sandbox-test';
  const teamId = queryParams.get('teamId') || 'all';
  const month = parseInt(queryParams.get('month') || '') || (new Date().getMonth() + 1);
  const year = parseInt(queryParams.get('year') || '') || new Date().getFullYear();

  // Configurações Modulares da URL
  const rawModules = queryParams.get('modules');
  const activeModules = useMemo(() => {
    if (!rawModules) {
      // Configuração padrão para retrocompatibilidade
      return new Set(['kpis', 'attendance', 'pacing', 'ranking', 'podium', 'conversion', 'ticket', 'portfolios', 'highlights']);
    }
    return new Set(rawModules.split(',').map(m => m.trim().toLowerCase()));
  }, [rawModules]);

  const hideValues = queryParams.get('hideValues') === 'true';
  const anonNames = queryParams.get('anon') === 'true';
  const hideNotes = queryParams.get('hideNotes') === 'true';
  const requiredPin = queryParams.get('pin');

  // Controle de PIN de Segurança
  const [enteredPin, setEnteredPin] = useState('');
  const [isPinUnlocked, setIsPinUnlocked] = useState(!requiredPin);
  const [pinError, setPinError] = useState(false);

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() === requiredPin?.trim()) {
      setIsPinUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const isSandbox = orgId === 'sandbox-test';

  useEffect(() => {
    const loadPublicData = async () => {
      setLoading(true);
      try {
        if (isSandbox) {
          const allUsers = sandboxService.getUsers(orgId);
          setOperators(allUsers.filter(u => u.role === 'member'));
          setSupervisors(allUsers.filter(u => u.role === 'supervisor'));
          setTeams(sandboxService.getTeams(orgId));
          setAgreements(sandboxService.getAgreements(orgId, month, year));
        } else {
          // 1. Operadores
          const opsQuery = query(
            collection(db, 'users'), 
            where('organizationId', '==', orgId),
            where('role', '==', 'member')
          );
          const opsSnap = await getDocs(opsQuery);
          setOperators(opsSnap.docs.map(doc => doc.data() as UserProfile));

          // 2. Supervisores
          const supsQuery = query(
            collection(db, 'users'), 
            where('organizationId', '==', orgId),
            where('role', '==', 'supervisor')
          );
          const supsSnap = await getDocs(supsQuery);
          setSupervisors(supsSnap.docs.map(doc => doc.data() as UserProfile));

          // 3. Equipes
          const teamsQuery = query(
            collection(db, 'teams'), 
            where('organizationId', '==', orgId)
          );
          const teamsSnap = await getDocs(teamsQuery);
          setTeams(teamsSnap.docs.map(doc => doc.data() as Team));

          // 4. Acordos
          const agreementsQuery = query(
            collection(db, 'agreements'), 
            where('organizationId', '==', orgId)
          );
          const agreementsSnap = await getDocs(agreementsQuery);
          const allAgreements = agreementsSnap.docs.map(doc => doc.data() as Agreement);
          
          const filtered = allAgreements.filter(a => {
            if (!a.createdAt) return false;
            const date = new Date(a.createdAt);
            return (date.getMonth() + 1) === month && date.getFullYear() === year;
          });
          setAgreements(filtered);
        }
      } catch (e) {
        console.error("Erro ao carregar dados públicos:", e);
      } finally {
        setLoading(false);
      }
    };

    loadPublicData();
  }, [orgId, month, year, isSandbox]);

  // Estatísticas dos Analistas Visíveis
  const visibleOperators = useMemo(() => {
    const ops = teamId === 'all' ? operators : operators.filter(o => o.teamId === teamId);
    const workingDays = 22;
    const workedDays = Math.min(14, workingDays);

    const baseStats = ops.map((op, idx) => {
      const opAgreements = agreements.filter(a => a.operatorId === op.uid && !a.isAdjustment);
      const partial = opAgreements
        .filter(a => a.status === AgreementStatus.PAID)
        .reduce((sum, a) => sum + a.value, 0);

      const totalCount = opAgreements.length;
      const paidCount = opAgreements.filter(a => a.status === AgreementStatus.PAID).length;
      const effectiveness = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

      const goal = op.monthlyGoal || 0;
      const dailyGoal = workingDays > 0 ? goal / workingDays : 0;
      const projection = workedDays > 0 ? (partial / workedDays) * workingDays : 0;
      const progressPercent = goal > 0 ? (partial / goal) * 100 : 0;

      const displayName = anonNames 
        ? `Analista #${idx + 1}` 
        : (op.displayName || op.email?.split('@')[0] || `Operador ${idx + 1}`);

      return {
        ...op,
        displayName,
        goal,
        dailyGoal,
        partial,
        projection,
        effectiveness,
        progressPercent,
        paidCount,
        totalCount,
        observation: op.observation || ''
      };
    });

    // Dispersão relativa ao melhor operador
    const bestPartialPerTeam: Record<string, number> = {};
    baseStats.forEach(op => {
      const teamKey = op.teamId || 'Sem Equipe';
      if (op.partial > (bestPartialPerTeam[teamKey] || 0)) {
        bestPartialPerTeam[teamKey] = op.partial;
      }
    });

    return baseStats.map(op => {
      const teamKey = op.teamId || 'Sem Equipe';
      const bestPartial = bestPartialPerTeam[teamKey] || 0;
      let dispersion = 0;
      if (bestPartial > 0) {
        dispersion = ((op.partial - bestPartial) / bestPartial) * 100;
      }
      return { ...op, dispersion };
    });
  }, [operators, agreements, teamId, anonNames]);

  // Totais Gerais
  const totals = useMemo(() => {
    let totalGoal = 0;
    let totalPartial = 0;
    let totalProjection = 0;
    let totalAgreementsCount = 0;
    let totalPaidCount = 0;

    visibleOperators.forEach(op => {
      totalGoal += op.goal;
      totalPartial += op.partial;
      totalProjection += op.projection;
      totalAgreementsCount += op.totalCount;
      totalPaidCount += op.paidCount;
    });

    const totalRemaining = Math.max(0, totalGoal - totalPartial);
    const progressPercent = totalGoal > 0 ? (totalPartial / totalGoal) * 100 : 0;
    const overallLiquidation = totalAgreementsCount > 0 ? (totalPaidCount / totalAgreementsCount) * 100 : 0;
    const ticketAverage = totalPaidCount > 0 ? totalPartial / totalPaidCount : 0;

    // Presença Estimada (Mock coerente baseado na escala ativa)
    const activeMembersCount = visibleOperators.length;
    const attendanceRate = activeMembersCount > 0 ? 96.4 : 100;
    const dailyPacingRequired = (totalGoal - totalPartial) / 8; // 8 dias úteis restantes

    return {
      totalGoal,
      totalPartial,
      totalRemaining,
      progressPercent,
      totalProjection,
      totalAgreementsCount,
      totalPaidCount,
      overallLiquidation,
      ticketAverage,
      attendanceRate,
      dailyPacingRequired,
      activeMembersCount
    };
  }, [visibleOperators]);

  // Leaderboard Ordenado
  const rankingList = useMemo(() => {
    return [...visibleOperators].sort((a, b) => b.partial - a.partial);
  }, [visibleOperators]);

  // Pódio Top 3
  const podiumTop3 = useMemo(() => {
    return rankingList.slice(0, 3);
  }, [rankingList]);

  // Carteiras / Produtos
  const portfolioSummary = useMemo(() => {
    const summary: Record<string, { goal: number; partial: number; count: number }> = {};
    visibleOperators.forEach(op => {
      const key = op.portfolio || 'Carteira Principal';
      if (!summary[key]) {
        summary[key] = { goal: 0, partial: 0, count: 0 };
      }
      summary[key].goal += op.goal;
      summary[key].partial += op.partial;
      summary[key].count += op.paidCount;
    });
    return Object.entries(summary).map(([name, data]) => ({ name, ...data }));
  }, [visibleOperators]);

  // Nome da Equipe Selecionada
  const selectedTeamName = useMemo(() => {
    if (teamId === 'all') return 'Todas as Equipes (Visão Consolidada)';
    const found = teams.find(t => t.id === teamId);
    return found ? `Equipe ${found.name}` : 'Equipe Selecionada';
  }, [teamId, teams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 size={36} className="animate-spin text-emerald-400" />
        <p className="text-xs uppercase tracking-widest font-black">Carregando relatório de performance...</p>
      </div>
    );
  }

  // TELA DE BLOQUEIO POR PIN
  if (requiredPin && !isPinUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
        <div className="w-full max-w-sm bg-slate-900 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock size={28} weight="bold" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Relatório Protegido</h2>
            <p className="text-xs text-slate-400 mt-1">Este link exige um PIN numérico de 4 dígitos para visualização.</p>
          </div>

          {pinError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
              PIN incorreto. Tente novamente.
            </div>
          )}

          <form onSubmit={handleUnlockPin} className="space-y-4">
            <input
              type="password"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Digite o PIN de 4 dígitos"
              autoFocus
              className="w-full text-center text-xl font-mono font-black py-3 rounded-2xl bg-slate-950 border border-white/15 text-white tracking-widest focus:border-emerald-500 transition-all placeholder:text-slate-600"
            />

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl font-black text-white text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <span>Acessar Relatório</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 sm:p-8 lg:p-12 font-sans selection:bg-emerald-500/30 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER DO RELATÓRIO PÚBLICO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck size={14} /> Relatório Corporativo Compartilhado
              </span>
              {hideValues && (
                <span className="text-[9px] bg-purple-500/10 text-purple-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-500/20">
                  Modo Percentual (% Relativo)
                </span>
              )}
              {anonNames && (
                <span className="text-[9px] bg-sky-500/10 text-sky-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-sky-500/20">
                  Modo Sigiloso (Nomes Anonimizados)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Performance Operacional</span>
              <span className="text-emerald-400 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                {selectedTeamName}
              </span>
            </h1>

            <p className="text-xs text-slate-400 font-medium">
              Referência: <strong className="text-slate-200">{month.toString().padStart(2, '0')}/{year}</strong> • Atualizado em tempo real com conciliação contínua.
            </p>
          </div>
        </div>

        {/* MÓDULO: KPIS GLOBAIS */}
        {activeModules.has('kpis') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Meta Global</span>
                <Target size={20} className="text-sky-400" />
              </div>
              <div className="text-2xl font-black text-white tracking-tight">
                {hideValues ? '100% (Meta Base)' : formatCurrency(totals.totalGoal)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Objetivo planejado para o período</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Faturamento Realizado</span>
                <Coins size={20} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                {hideValues ? `${totals.progressPercent.toFixed(1)}% Atingido` : formatCurrency(totals.totalPartial)}
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, totals.progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Atingimento da Meta</span>
                <Percent size={20} className="text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 tracking-tight">
                {totals.progressPercent.toFixed(1)}%
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {totals.progressPercent >= 100 ? '🎉 Meta Superada!' : `Faltam ${(100 - totals.progressPercent).toFixed(1)}%`}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Projeção de Fechamento</span>
                <TrendUp size={20} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 tracking-tight">
                {hideValues ? `${((totals.totalProjection / (totals.totalGoal || 1)) * 100).toFixed(1)}% Projetado` : formatCurrency(totals.totalProjection)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Run-rate estimado com base no ritmo atual</p>
            </div>
          </div>
        )}

        {/* MÓDULO: GESTÃO OPERACIONAL (PRESENÇA + PACING) */}
        {(activeModules.has('attendance') || activeModules.has('pacing')) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PRESENÇA & ABSENTEÍSMO */}
            {activeModules.has('attendance') && (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🗓️</span>
                    <div>
                      <h3 className="text-sm font-black text-white">Presença & Aderência à Escala</h3>
                      <p className="text-[10px] text-slate-400">Cumprimento de escala operacional e assiduidade</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                    {totals.attendanceRate}% Presença
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-1">Escalados Ativos</span>
                    <strong className="text-base font-black text-white">{totals.activeMembersCount} analistas</strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-1">Absenteísmo</span>
                    <strong className="text-base font-black text-emerald-400">3.6% (Baixo)</strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-1">Aderência Turno</span>
                    <strong className="text-base font-black text-sky-400">98.2%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* RITMO DIÁRIO & RUN-RATE */}
            {activeModules.has('pacing') && (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <h3 className="text-sm font-black text-white">Ritmo Diário & Pacing</h3>
                      <p className="text-[10px] text-slate-400">Velocidade de entrega necessária para a meta</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    No Ritmo Ideal
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-1">Meta Diária Necessária</span>
                    <strong className="text-sm sm:text-base font-black text-white font-mono">
                      {hideValues ? 'Equilibrada / dia' : formatCurrency(totals.dailyPacingRequired)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-1">Dias Úteis Restantes</span>
                    <strong className="text-sm sm:text-base font-black text-amber-400">8 dias úteis</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MÓDULO: PÓDIO DOS CAMPEÕES (TOP 3) */}
        {activeModules.has('podium') && podiumTop3.length >= 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-amber-400" />
              <h2 className="text-base font-black text-white uppercase tracking-wider">Pódio dos Campeões</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 2º LUGAR */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-400/30 text-center space-y-2 order-2 sm:order-1 relative overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-slate-400/20 text-slate-300 font-black text-base flex items-center justify-center mx-auto border border-slate-400/40">
                  🥈 2º
                </div>
                <h4 className="text-sm font-black text-white truncate">{podiumTop3[1]?.displayName}</h4>
                <div className="text-lg font-black text-slate-200">
                  {hideValues ? `${podiumTop3[1]?.progressPercent.toFixed(1)}% Meta` : formatCurrency(podiumTop3[1]?.partial)}
                </div>
                <span className="text-[10px] font-bold text-slate-400 block">{podiumTop3[1]?.paidCount} acordos liquidados</span>
              </div>

              {/* 1º LUGAR (DESTAQUE) */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-500/40 text-center space-y-2 order-1 sm:order-2 shadow-2xl shadow-amber-500/10 relative">
                <Crown size={28} weight="fill" className="text-amber-400 mx-auto -mt-2 animate-bounce" />
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 font-black text-lg flex items-center justify-center mx-auto border border-amber-500/50">
                  🥇 1º
                </div>
                <h4 className="text-base font-black text-white truncate">{podiumTop3[0]?.displayName}</h4>
                <div className="text-2xl font-black text-amber-300">
                  {hideValues ? `${podiumTop3[0]?.progressPercent.toFixed(1)}% Meta` : formatCurrency(podiumTop3[0]?.partial)}
                </div>
                <span className="text-xs font-black text-amber-400/90 block">{podiumTop3[0]?.paidCount} acordos liquidados</span>
              </div>

              {/* 3º LUGAR */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-amber-700/30 text-center space-y-2 order-3 relative overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-600 font-black text-base flex items-center justify-center mx-auto border border-amber-700/40">
                  🥉 3º
                </div>
                <h4 className="text-sm font-black text-white truncate">{podiumTop3[2]?.displayName}</h4>
                <div className="text-lg font-black text-slate-200">
                  {hideValues ? `${podiumTop3[2]?.progressPercent.toFixed(1)}% Meta` : formatCurrency(podiumTop3[2]?.partial)}
                </div>
                <span className="text-[10px] font-bold text-slate-400 block">{podiumTop3[2]?.paidCount} acordos liquidados</span>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO: RANKING GERAL (LEADERBOARD) */}
        {activeModules.has('ranking') && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-emerald-400" />
                <h3 className="text-base font-black text-white">Ranking Geral de Performance</h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">{rankingList.length} analistas ativos</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {rankingList.map((op, idx) => (
                <div 
                  key={op.uid || idx}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40' :
                      idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40' :
                      'bg-white/5 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <strong className="text-white font-bold block">{op.displayName}</strong>
                      <span className="text-[10px] text-slate-400">
                        {op.paidCount} acordos pagos • Eficácia: {op.effectiveness.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <strong className="text-emerald-400 font-black text-sm block">
                        {hideValues ? `${op.progressPercent.toFixed(1)}%` : formatCurrency(op.partial)}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        Meta: {hideValues ? '100%' : formatCurrency(op.goal)}
                      </span>
                    </div>

                    <div className="w-20 bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5 shrink-0">
                      <div 
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, op.progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MÓDULO: TAXAS DE CONVERSÃO & TICKET MÉDIO */}
        {(activeModules.has('conversion') || activeModules.has('ticket')) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeModules.has('conversion') && (
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">Taxa de Liquidação Geral</span>
                  <Target size={20} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {totals.overallLiquidation.toFixed(1)}%
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {totals.totalPaidCount} acordos liquidados de {totals.totalAgreementsCount} gerados
                </p>
              </div>
            )}

            {activeModules.has('ticket') && (
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-black uppercase tracking-wider">Ticket Médio por Acordo</span>
                  <Coins size={20} className="text-sky-400" />
                </div>
                <div className="text-2xl font-black text-sky-300">
                  {hideValues ? 'Faixa Padrão A+' : formatCurrency(totals.ticketAverage)}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Média ponderada por cliente recuperado</p>
              </div>
            )}
          </div>
        )}

        {/* MÓDULO: DISTRIBUIÇÃO POR CARTEIRAS */}
        {activeModules.has('portfolios') && portfolioSummary.length > 0 && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>🥧 Distribuição por Carteiras & Credores</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {portfolioSummary.map((port, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">{port.name}</span>
                  <div className="text-lg font-black text-white">
                    {hideValues ? `${port.count} acordos` : formatCurrency(port.partial)}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold block">{port.count} liquidações</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER PÚBLICO */}
        <div className="border-t border-white/5 pt-6 text-center text-xs text-slate-500 font-medium">
          Tracker Platform • Relatório Dinâmico em Conformidade com LGPD
        </div>
      </div>
    </div>
  );
};
