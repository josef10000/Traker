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
  Note
} from '@phosphor-icons/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { UserProfile, Agreement, AgreementStatus, Team } from '../../types';
import { formatCurrency } from '../../utils/masks';

export const PublicPortfolioView = () => {
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');
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

  const isSandbox = orgId === 'sandbox-test';

  useEffect(() => {
    const loadPublicData = async () => {
      setLoading(true);
      try {
        if (isSandbox) {
          // Carregar do Sandbox Service
          const allUsers = sandboxService.getUsers(orgId);
          setOperators(allUsers.filter(u => u.role === 'member'));
          setSupervisors(allUsers.filter(u => u.role === 'supervisor'));
          setTeams(sandboxService.getTeams(orgId));
          setAgreements(sandboxService.getAgreements(orgId, month, year));
        } else {
          // Carregar do Firestore
          // 1. Carregar Operadores
          const opsQuery = query(
            collection(db, 'users'), 
            where('organizationId', '==', orgId),
            where('role', '==', 'member')
          );
          const opsSnap = await getDocs(opsQuery);
          const opsData = opsSnap.docs.map(doc => doc.data() as UserProfile);
          setOperators(opsData);

          // 2. Carregar Supervisores
          const supsQuery = query(
            collection(db, 'users'), 
            where('organizationId', '==', orgId),
            where('role', '==', 'supervisor')
          );
          const supsSnap = await getDocs(supsQuery);
          const supsData = supsSnap.docs.map(doc => doc.data() as UserProfile);
          setSupervisors(supsData);

          // 3. Carregar Equipes
          const teamsQuery = query(
            collection(db, 'teams'), 
            where('organizationId', '==', orgId)
          );
          const teamsSnap = await getDocs(teamsQuery);
          const teamsData = teamsSnap.docs.map(doc => doc.data() as Team);
          setTeams(teamsData);

          // 4. Carregar Acordos
          const agreementsQuery = query(
            collection(db, 'agreements'), 
            where('organizationId', '==', orgId)
          );
          const agreementsSnap = await getDocs(agreementsQuery);
          const allAgreements = agreementsSnap.docs.map(doc => doc.data() as Agreement);
          
          // Filtrar por mês/ano no client-side para evitar queries compostas complexas
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

  // Filtramos e calculamos estatísticas dos operadores visíveis no link
  const visibleOperators = useMemo(() => {
    const ops = teamId === 'all' ? operators : operators.filter(o => o.teamId === teamId);
    
    // 1. Calcular os faturamentos e metas básicas de todos os analistas visíveis
    const baseStats = ops.map(op => {
      const opAgreements = agreements.filter(a => a.operatorId === op.uid && !a.isAdjustment);
      const partial = opAgreements
        .filter(a => a.status === AgreementStatus.PAID)
        .reduce((sum, a) => sum + a.value, 0);

      const totalCount = opAgreements.length;
      const paidCount = opAgreements.filter(a => a.status === AgreementStatus.PAID).length;
      const effectiveness = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

      const goal = op.monthlyGoal || 0;
      const workingDays = 23; // Fixo para visualização pública padrão
      const workedDays = 8;   // Fixo para visualização pública padrão
      const dailyGoal = workingDays > 0 ? goal / workingDays : 0;

      // Projeção
      const projection = workedDays > 0 ? (partial / workedDays) * workingDays : 0;

      return {
        ...op,
        goal,
        dailyGoal,
        partial,
        projection,
        effectiveness,
        observation: op.observation || ''
      };
    });

    // 2. Encontrar o faturamento do melhor operador de cada equipe (teamId)
    const bestPartialPerTeam: Record<string, number> = {};
    baseStats.forEach(op => {
      const teamKey = op.teamId || 'Sem Equipe';
      if (op.partial > (bestPartialPerTeam[teamKey] || 0)) {
        bestPartialPerTeam[teamKey] = op.partial;
      }
    });

    // 3. Adicionar cálculo de dispersão relativa ao melhor operador da equipe
    return baseStats.map(op => {
      const teamKey = op.teamId || 'Sem Equipe';
      const bestPartial = bestPartialPerTeam[teamKey] || 0;
      let dispersion = 0;
      if (bestPartial > 0) {
        dispersion = ((op.partial - bestPartial) / bestPartial) * 100;
      }

      return {
        ...op,
        dispersion
      };
    });
  }, [operators, agreements, teamId]);

  // Agrupamento por Equipe
  const teamsGroupedData = useMemo(() => {
    const groups: Record<string, typeof visibleOperators> = {};
    visibleOperators.forEach(stat => {
      const key = stat.teamId || 'Sem Equipe';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(stat);
    });

    // Ordenar cada grupo por faturamento (parcial) decrescente
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.partial - a.partial);
    });

    return groups;
  }, [visibleOperators]);

  // Totais Gerais
  const totals = useMemo(() => {
    let totalGoal = 0;
    let totalPartial = 0;
    let totalProjection = 0;

    visibleOperators.forEach(op => {
      totalGoal += op.goal;
      totalPartial += op.partial;
      totalProjection += op.projection;
    });

    const totalRemaining = Math.max(0, totalGoal - totalPartial);
    const progressPercent = totalGoal > 0 ? (totalPartial / totalGoal) * 100 : 0;

    return {
      totalGoal,
      totalPartial,
      totalRemaining,
      progressPercent,
      totalProjection
    };
  }, [visibleOperators]);

  // Leaderboard (Ranking decrescente por Parcial)
  const rankingList = useMemo(() => {
    return [...visibleOperators].sort((a, b) => b.partial - a.partial);
  }, [visibleOperators]);

  // Agrupamento de faturamento por Carteira para gráfico
  const portfolioSummary = useMemo(() => {
    const summary: Record<string, { goal: number; partial: number }> = {};
    visibleOperators.forEach(op => {
      const key = op.portfolio || 'Sem Carteira';
      if (!summary[key]) {
        summary[key] = { goal: 0, partial: 0 };
      }
      summary[key].goal += op.goal;
      summary[key].partial += op.partial;
    });
    return Object.entries(summary).map(([name, data]) => ({
      name,
      ...data
    }));
  }, [visibleOperators]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 size={32} className="animate-spin text-sky-400" />
        <p className="text-xs uppercase tracking-widest font-black">Carregando painel de performance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-6 md:p-12 font-sans selection:bg-sky-500/30 selection:text-white">
      {/* HEADER DA VISÃO PÚBLICA */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8 mb-8">
        <div>
          <span className="text-[9px] bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-sky-500/20">
            📊 Visão de Operação Compartilhada
          </span>
          <h1 className="text-2xl font-black text-white mt-3 tracking-tight">Performance & Metas</h1>
          <p className="text-xs text-slate-400 mt-1.5">Acompanhamento transparente do realizado, dispersão e projeções.</p>
        </div>

        {/* TABS PÚBLICAS */}
        <div className="flex bg-slate-900/60 p-1.5 border border-white/5 rounded-2xl gap-1.5">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'table' 
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tabela de Resultados
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'charts' 
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mural de Gráficos (Dashboard)
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* RESUMO GERAL */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/20 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Meta Consolidada</span>
              <span className="text-lg font-bold text-sky-400 block mt-1">{formatCurrency(totals.totalGoal)}</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Entregue Acumulado</span>
              <span className="text-lg font-bold text-emerald-400 block mt-1">{formatCurrency(totals.totalPartial)}</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Projeção Fechamento</span>
              <span className="text-lg font-bold text-amber-400 block mt-1">{formatCurrency(totals.totalProjection)}</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Progresso</span>
              <span className="text-lg font-bold text-white block mt-1">{totals.progressPercent.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-sky-500 to-sky-400 h-full rounded-full" 
              style={{ width: `${Math.min(totals.progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {activeTab === 'table' ? (
          /* TABELA DE METAS */
          <div className="space-y-8">
            {(Object.entries(teamsGroupedData) as [string, any[]][]).map(([groupId, ops]) => {
              const teamInfo = teams.find(t => t.id === groupId);
              const teamName = teamInfo ? teamInfo.name : 'Sem Equipe';
              
              // Localizar Supervisor da equipe
              const supervisorProfile = teamInfo ? supervisors.find(s => s.uid === teamInfo.supervisorId) : null;
              const supervisorName = supervisorProfile ? supervisorProfile.displayName : 'Sem Supervisor';

              return (
                <div key={groupId} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                  <div className="px-6 py-4 bg-sky-500/10 border-b border-sky-500/20 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                      👥 Equipe: {teamName} <span className="text-slate-400 font-normal">| Supervisor: {supervisorName}</span>
                    </h4>
                    <span className="text-[9px] bg-sky-500/20 px-2.5 py-0.5 rounded-md text-sky-400 font-black">
                      {ops.length} Operadores
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-950/40 text-[9px] text-slate-500 uppercase font-black tracking-widest border-b border-white/5">
                          <th className="px-6 py-3">Carteira</th>
                          <th className="px-6 py-3">Analista</th>
                          <th className="px-6 py-3 text-right">Meta Recuperação</th>
                          <th className="px-6 py-3 text-right">Meta por Dia</th>
                          <th className="px-6 py-3 text-right">Parcial</th>
                          <th className="px-6 py-3 text-center">Dispersão</th>
                          <th className="px-6 py-3 text-center">% Meta</th>
                          <th className="px-6 py-3 text-right">Projeção</th>
                          <th className="px-6 py-3 text-center">Efetividade</th>
                          <th className="px-6 py-3">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {ops.map(op => {
                          const progress = op.goal > 0 ? (op.partial / op.goal) * 100 : 0;
                          return (
                            <tr key={op.uid} className="hover:bg-white/[0.01] transition-colors leading-relaxed">
                              <td className="px-6 py-3.5 text-slate-400">{op.portfolio || 'Sem Carteira'}</td>
                              <td className="px-6 py-3.5 font-bold text-white flex items-center gap-1.5">
                                <User size={12} className="text-slate-500" />
                                {op.displayName}
                              </td>
                              <td className="px-6 py-3.5 text-right font-semibold">{formatCurrency(op.goal)}</td>
                              <td className="px-6 py-3.5 text-right font-medium text-slate-400">{formatCurrency(op.dailyGoal)}</td>
                              <td className="px-6 py-3.5 text-right font-bold text-emerald-400">{formatCurrency(op.partial)}</td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  op.dispersion >= 0 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                                }`}>
                                  {op.dispersion > 0 ? '+' : ''}{op.dispersion.toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-center font-bold text-white">{progress.toFixed(0)}%</td>
                              <td className="px-6 py-3.5 text-right font-bold text-amber-400">{formatCurrency(op.projection)}</td>
                              <td className="px-6 py-3.5 text-center font-bold text-slate-300">{op.effectiveness.toFixed(0)}%</td>
                              <td className="px-6 py-3.5 text-slate-400">{op.observation || <span className="text-slate-600 italic">Sem notas</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MURAL DE GRÁFICOS */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* CARD 1: TERMÔMETRO DE META (GAUGE) */}
            <div className="glass-card p-6 rounded-3xl border border-white/5 flex flex-col justify-between items-center text-center">
              <div className="w-full flex items-center gap-2 mb-4 text-left">
                <Trophy size={16} className="text-amber-500" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atingimento Coletivo</h3>
              </div>

              {/* Gauge Circular SVG */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    className="stroke-slate-900"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    className="stroke-sky-500 transition-all duration-1000"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="502"
                    strokeDashoffset={502 - (502 * Math.min(totals.progressPercent, 100)) / 100}
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-white">{totals.progressPercent.toFixed(1)}%</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mt-1">Recuperado</span>
                </div>
              </div>

              <div className="mt-4 space-y-1 text-xs">
                <p className="text-slate-400">Total Pago: <strong className="text-emerald-400">{formatCurrency(totals.totalPartial)}</strong></p>
                <p className="text-slate-500 text-[10px]">Meta Geral: {formatCurrency(totals.totalGoal)}</p>
              </div>
            </div>

            {/* CARD 2: TOP OPERADORES (PODIUM) */}
            <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-6 lg:col-span-2">
              <div className="flex items-center gap-2 text-left">
                <Trophy size={16} className="text-yellow-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Podium de Performance</h3>
              </div>

              {/* Pódio de Imagens/Nomes */}
              {rankingList.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex justify-center items-end gap-6 pt-8 pb-4">
                    {/* 2º Lugar */}
                    {rankingList[1] && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">{rankingList[1].displayName}</span>
                        <div className="w-20 bg-slate-900 border border-white/5 rounded-t-xl h-20 flex flex-col items-center justify-center text-center shadow-lg">
                          <span className="text-xl font-bold text-slate-400">2º</span>
                          <span className="text-[8px] text-emerald-400 font-bold">{formatCurrency(rankingList[1].partial)}</span>
                        </div>
                      </div>
                    )}

                    {/* 1º Lugar */}
                    {rankingList[0] && (
                      <div className="flex flex-col items-center gap-2 -translate-y-2">
                        <Trophy size={20} className="text-yellow-400 animate-bounce" />
                        <span className="text-xs font-black text-white">{rankingList[0].displayName}</span>
                        <div className="w-24 bg-gradient-to-t from-sky-500/10 to-sky-500/20 border border-sky-500/30 rounded-t-2xl h-28 flex flex-col items-center justify-center text-center shadow-2xl shadow-sky-500/15">
                          <span className="text-3xl font-black text-sky-400">1º</span>
                          <span className="text-[9px] text-emerald-400 font-black">{formatCurrency(rankingList[0].partial)}</span>
                        </div>
                      </div>
                    )}

                    {/* 3º Lugar */}
                    {rankingList[2] && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">{rankingList[2].displayName}</span>
                        <div className="w-20 bg-slate-900 border border-white/5 rounded-t-xl h-14 flex flex-col items-center justify-center text-center shadow-lg">
                          <span className="text-lg font-bold text-amber-600">3º</span>
                          <span className="text-[8px] text-emerald-400 font-bold">{formatCurrency(rankingList[2].partial)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Restante dos Operadores em lista compacta */}
                  {rankingList.length > 3 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {rankingList.slice(3).map((op, idx) => (
                        <div key={op.uid} className="flex justify-between items-center p-2.5 bg-slate-900/30 border border-white/5 rounded-xl text-xs">
                          <span className="text-slate-400 font-medium">#{idx + 4} {op.displayName}</span>
                          <span className="text-white font-bold">{formatCurrency(op.partial)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-12">Nenhum operador com faturamento registrado no período.</p>
              )}
            </div>

            {/* CARD 3: COMPARATIVO POR CARTEIRA */}
            <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-6 lg:col-span-3">
              <div className="flex items-center gap-2 text-left">
                <ChartLine size={16} className="text-sky-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Acumulado por Carteira</h3>
              </div>

              {portfolioSummary.length > 0 ? (
                <div className="space-y-4">
                  {portfolioSummary.map(ps => {
                    const pct = ps.goal > 0 ? (ps.partial / ps.goal) * 100 : 0;
                    return (
                      <div key={ps.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-white">{ps.name}</span>
                          <span className="text-sky-400">{pct.toFixed(0)}% ({formatCurrency(ps.partial)} / {formatCurrency(ps.goal)})</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="bg-sky-500 h-full rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-12">Sem dados de carteiras carregados.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
