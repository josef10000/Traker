import React, { useState, useMemo } from 'react';
import { 
  Users, 
  User, 
  Trophy, 
  TrendUp, 
  CurrencyDollar, 
  CheckCircle, 
  Warning, 
  ArrowsDownUp, 
  ChartBar, 
  Sparkle,
  Crown,
  Flame,
  UserCheck
} from '@phosphor-icons/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Agreement, Team, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/masks';

interface MultiLevelPerformanceComparatorProps {
  agreements: Agreement[];
  teams: Team[];
  collaborators: UserProfile[];
  theme?: 'light' | 'dark';
}

type ComparatorMode = 'teams' | 'supervisors' | 'operators';

export const MultiLevelPerformanceComparator: React.FC<MultiLevelPerformanceComparatorProps> = ({
  agreements,
  teams,
  collaborators,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<ComparatorMode>('teams');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [metricView, setMetricView] = useState<'financial' | 'rate'>('financial');

  // Supervisores cadastrados
  const supervisors = useMemo(() => {
    return collaborators.filter(c => c.role === 'supervisor' || c.role === 'manager');
  }, [collaborators]);

  // Operadores cadastrados
  const operators = useMemo(() => {
    return collaborators.filter(c => c.role === 'operator' || c.role === 'member' || !c.role);
  }, [collaborators]);

  // 1. Métricas de Equipes
  const teamMetrics = useMemo(() => {
    return teams.map(t => {
      const teamAgreements = agreements.filter(a => a.teamId === t.id);
      const totalGenerated = teamAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
      const paidAgreements = teamAgreements.filter(a => {
        const st = (a.status || '').toString().toLowerCase();
        return st === 'pago' || st === 'paid' || st === 'quitado';
      });
      const totalPaid = paidAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
      const brokenAgreements = teamAgreements.filter(a => {
        const st = (a.status || '').toString().toLowerCase();
        return st === 'quebrado' || st === 'broken' || st === 'cancelado';
      });
      const totalBroken = brokenAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
      const count = teamAgreements.length;
      const effectivenessRate = totalGenerated > 0 ? Math.round((totalPaid / totalGenerated) * 100) : 0;
      const breakRate = count > 0 ? Math.round((brokenAgreements.length / count) * 100) : 0;
      const averageTicket = count > 0 ? Math.round(totalGenerated / count) : 0;

      return {
        id: t.id,
        name: t.name,
        type: 'team',
        count,
        paidCount: paidAgreements.length,
        totalGenerated,
        totalPaid,
        totalBroken,
        effectivenessRate,
        breakRate,
        averageTicket,
        membersCount: collaborators.filter(c => c.teamId === t.id).length
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [teams, agreements, collaborators]);

  // 2. Métricas de Supervisores (Consolidando todas as equipes do supervisor)
  const supervisorMetrics = useMemo(() => {
    return supervisors.map(sup => {
      // Equipes lideradas pelo supervisor
      const supTeams = teams.filter(t => t.supervisorId === sup.uid || t.id === sup.teamId);
      const supTeamIds = new Set(supTeams.map(t => t.id));
      if (sup.teamId) supTeamIds.add(sup.teamId);

      // Operadores vinculados
      const supOperators = collaborators.filter(c => supTeamIds.has(c.teamId || ''));
      const supOperatorIds = new Set(supOperators.map(o => o.uid));

      const supAgreements = agreements.filter(a => 
        (a.teamId && supTeamIds.has(a.teamId)) || 
        (a.operatorId && supOperatorIds.has(a.operatorId))
      );

      const totalGenerated = supAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
      const paidAgreements = supAgreements.filter(a => {
        const st = (a.status || '').toString().toLowerCase();
        return st === 'pago' || st === 'paid' || st === 'quitado';
      });
      const totalPaid = paidAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
      const brokenAgreements = supAgreements.filter(a => {
        const st = (a.status || '').toString().toLowerCase();
        return st === 'quebrado' || st === 'broken' || st === 'cancelado';
      });
      const count = supAgreements.length;
      const effectivenessRate = totalGenerated > 0 ? Math.round((totalPaid / totalGenerated) * 100) : 0;
      const breakRate = count > 0 ? Math.round((brokenAgreements.length / count) * 100) : 0;
      const averageTicket = count > 0 ? Math.round(totalGenerated / count) : 0;

      return {
        id: sup.uid,
        name: sup.displayName || sup.name || 'Supervisor',
        type: 'supervisor',
        count,
        paidCount: paidAgreements.length,
        totalGenerated,
        totalPaid,
        totalBroken: brokenAgreements.reduce((sum, a) => sum + (a.value || 0), 0),
        effectivenessRate,
        breakRate,
        averageTicket,
        membersCount: supOperators.length
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [supervisors, teams, collaborators, agreements]);

  // 3. Métricas de Operadores
  const operatorMetrics = useMemo(() => {
    return operators.map(op => {
      const opAgreements = agreements.filter(a => a.operatorId === op.uid || a.operatorName === op.displayName);
      const totalGenerated = opAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
      const paidAgreements = opAgreements.filter(a => {
        const st = (a.status || '').toString().toLowerCase();
        return st === 'pago' || st === 'paid' || st === 'quitado';
      });
      const totalPaid = paidAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
      const brokenAgreements = opAgreements.filter(a => {
        const st = (a.status || '').toString().toLowerCase();
        return st === 'quebrado' || st === 'broken' || st === 'cancelado';
      });
      const count = opAgreements.length;
      const effectivenessRate = totalGenerated > 0 ? Math.round((totalPaid / totalGenerated) * 100) : 0;
      const breakRate = count > 0 ? Math.round((brokenAgreements.length / count) * 100) : 0;
      const averageTicket = count > 0 ? Math.round(totalGenerated / count) : 0;
      const teamName = teams.find(t => t.id === op.teamId)?.name || 'Sem Equipe';

      return {
        id: op.uid,
        name: op.displayName || op.name || 'Operador',
        teamName,
        type: 'operator',
        count,
        paidCount: paidAgreements.length,
        totalGenerated,
        totalPaid,
        totalBroken: brokenAgreements.reduce((sum, a) => sum + (a.value || 0), 0),
        effectivenessRate,
        breakRate,
        averageTicket
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [operators, agreements, teams]);

  // Métricas ativas com base no modo
  const activeMetrics = useMemo(() => {
    if (mode === 'teams') return teamMetrics;
    if (mode === 'supervisors') return supervisorMetrics;
    return operatorMetrics;
  }, [mode, teamMetrics, supervisorMetrics, operatorMetrics]);

  // Filtrados por seleção manual ou top 5
  const displayedMetrics = useMemo(() => {
    if (selectedIds.length > 0) {
      return activeMetrics.filter(m => selectedIds.includes(m.id));
    }
    return activeMetrics.slice(0, 5);
  }, [activeMetrics, selectedIds]);

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Dados para o gráfico Recharts
  const chartData = useMemo(() => {
    return displayedMetrics.map(m => ({
      name: m.name.split(' ')[0],
      fullName: m.name,
      'R$ Gerado': m.totalGenerated,
      'R$ Pago': m.totalPaid,
      'Efetividade %': m.effectivenessRate,
      'Quebra %': m.breakRate
    }));
  }, [displayedMetrics]);

  return (
    <div className={`p-6 rounded-3xl border space-y-6 shadow-xl ${
      isDark ? 'bg-slate-900/60 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Cabeçalho do Comparador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-lg shrink-0">
            <Trophy size={26} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Benchmark de Performance
              </span>
              <span className="text-xs text-slate-400 font-bold">Lado a Lado</span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-0.5">
              Comparador de Desempenho Multi-Nível
            </h2>
          </div>
        </div>

        {/* Seletor de Modo (Equipes / Supervisores / Operadores) */}
        <div className={`flex p-1 rounded-2xl border ${
          isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => { setMode('teams'); setSelectedIds([]); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'teams'
                ? isDark ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-sky-600 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={15} />
            <span>Equipes</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('supervisors'); setSelectedIds([]); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'supervisors'
                ? isDark ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-sky-600 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown size={15} />
            <span>Supervisores</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('operators'); setSelectedIds([]); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'operators'
                ? isDark ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-sky-600 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={15} />
            <span>Operadores</span>
          </button>
        </div>
      </div>

      {/* Seletor de Entidades para Comparar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Selecione para colocar lado a lado (ou veja o Top Geral):
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
            >
              Resetar para Top 5
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {activeMetrics.map(item => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSelectId(item.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-sm ring-1 ring-sky-400'
                    : isDark
                    ? 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-slate-600 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.name}</span>
                <span className="text-[10px] font-mono text-emerald-400 font-black">
                  {formatCurrency(item.totalPaid)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Lado a Lado dos Selecionados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {displayedMetrics.map((item, idx) => {
          const isLeader = idx === 0;
          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                isLeader
                  ? isDark 
                    ? 'bg-gradient-to-b from-amber-950/30 to-slate-950 border-amber-500/30' 
                    : 'bg-amber-50/50 border-amber-300 shadow-md'
                  : isDark 
                    ? 'bg-slate-950/80 border-white/10' 
                    : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {isLeader && (
                <span className="absolute top-3 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Crown size={11} weight="fill" /> Líder
                </span>
              )}

              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black">
                  #{idx + 1} Ranking
                </span>
                <h4 className="text-base font-black text-white truncate mt-0.5">{item.name}</h4>
                {'teamName' in item && (
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Equipe: {(item as any).teamName}
                  </span>
                )}
              </div>

              {/* Métricas Principais */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-slate-400 font-semibold">Volume Pago:</span>
                  <span className="font-mono font-black text-sm text-emerald-400">
                    {formatCurrency(item.totalPaid)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-slate-400 font-semibold">Volume Gerado:</span>
                  <span className="font-mono font-bold text-xs text-slate-300">
                    {formatCurrency(item.totalGenerated)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-slate-400 font-semibold">Taxa de Efetividade:</span>
                  <span className="font-mono font-black text-xs text-sky-400">
                    {item.effectivenessRate}%
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-slate-400 font-semibold">Taxa de Quebra:</span>
                  <span className="font-mono font-bold text-xs text-rose-400">
                    {item.breakRate}%
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-slate-400 font-semibold">Ticket Médio:</span>
                  <span className="font-mono font-bold text-xs text-amber-300">
                    {formatCurrency(item.averageTicket)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico Comparativo Recharts */}
      <div className="p-5 rounded-3xl bg-slate-950/60 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <ChartBar size={16} className="text-sky-400" />
            Gráfico Comparativo de Desempenho
          </h4>

          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setMetricView('financial')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                metricView === 'financial' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              R$ Financeiro
            </button>
            <button
              type="button"
              onClick={() => setMetricView('rate')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                metricView === 'rate' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              % Efetividade
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: any) => metricView === 'financial' ? formatCurrency(Number(val)) : `${val}%`}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {metricView === 'financial' ? (
                <>
                  <Bar dataKey="R$ Gerado" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="R$ Pago" fill="#10b981" radius={[6, 6, 0, 0]} />
                </>
              ) : (
                <>
                  <Bar dataKey="Efetividade %" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Quebra %" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
