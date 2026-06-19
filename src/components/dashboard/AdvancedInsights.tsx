import React, { useMemo } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Calculator, 
  Loader2, 
  X,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { DashboardStats, Reconciliation, UserProfile, Agreement } from '../../types';
import { TeamPerformance } from './TeamPerformance';
import { StatCard } from './StatCard';

interface AdvancedInsightsProps {
  stats: DashboardStats;
  monthlyGoal: number;
  effectivenessGoal: number;
  workingDays: number;
  dailyGoal: number;
  viewMode: 'personal' | 'team';
  selectedTeamId: string;
  currentTeamMembers: UserProfile[];
  monthAgreements: Agreement[];
  profile: UserProfile;
  reconciliation: Reconciliation | null;
  setIsGoalModalOpen: (open: boolean) => void;
  formatCurrency: (v: number) => string;
  getEffectivenessColor: (val: number, goal: number) => string;
  qaScores?: Record<string, number>;
}

export const AdvancedInsights = ({
  stats,
  monthlyGoal,
  effectivenessGoal,
  workingDays,
  dailyGoal,
  viewMode,
  selectedTeamId,
  currentTeamMembers,
  monthAgreements,
  profile,
  reconciliation,
  setIsGoalModalOpen,
  formatCurrency,
  getEffectivenessColor,
  qaScores = {}
}: AdvancedInsightsProps) => {

  const chartData = useMemo(() => [
    { name: 'Meta', value: monthlyGoal, color: 'url(#colorMeta)' },
    { name: 'Pago', value: stats.totalPaid, color: 'url(#colorPaid)' },
    { name: 'Vencido', value: stats.totalOverdue, color: 'url(#colorOverdue)' },
    { name: 'Pendente', value: Math.max(0, stats.totalProjected - stats.totalPaid - stats.totalOverdue), color: 'url(#colorPending)' }
  ], [monthlyGoal, stats]);

  // Filtrar acordos do mês atual para exibir no TeamPerformance
  const monthFilteredAgreements = useMemo(() => monthAgreements, [monthAgreements]);
  
  // Filtrar acordos do operador atual
  const memberFilteredAgreements = useMemo(() => {
    return monthAgreements.filter(a => a.operatorId === profile.uid);
  }, [monthAgreements, profile.uid]);

  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 grid grid-cols-1 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-2xl shadow-xl relative group flex flex-col justify-center"
          >
            <button 
              onClick={() => setIsGoalModalOpen(true)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-all bg-slate-900/50 rounded-lg border border-slate-800"
            >
              <Target size={14} />
            </button>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Meta de recuperação</p>
                <h3 className="text-3xl font-bold text-white mt-1">
                  {((stats.totalPaid / (monthlyGoal || 1)) * 100).toFixed(1)}%
                </h3>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taxa de Efetividade</p>
                <p className={`text-xl font-bold ${getEffectivenessColor((stats.totalPaid / (stats.totalProjected || 1)) * 100, effectivenessGoal)}`}>
                  {((stats.totalPaid / (stats.totalProjected || 1)) * 100).toFixed(1)}%
                </p>
                <p className="text-[8px] text-slate-500 font-medium uppercase mt-0.5">Base: {formatCurrency(stats.totalProjected)} projetado</p>
                {reconciliation && reconciliation.officialEffectiveness !== undefined && reconciliation.officialEffectiveness !== null && reconciliation.officialEffectiveness > 0 && (
                  <div className="mt-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] text-emerald-400 font-bold inline-flex items-center leading-none">
                    Oficial: {reconciliation.officialEffectiveness.toFixed(1)}% 
                    <span className={`ml-1 font-extrabold ${reconciliation.differenceEffectiveness !== undefined && reconciliation.differenceEffectiveness >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      (Dif: {reconciliation.differenceEffectiveness !== undefined && reconciliation.differenceEffectiveness > 0 ? '+' : ''}{reconciliation.differenceEffectiveness?.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span>Progresso da Recuperação</span>
                <span>Meta: {formatCurrency(monthlyGoal)}</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((stats.totalPaid / (monthlyGoal || 1)) * 100, 100)}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)]"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                 <span>Recuperado: {formatCurrency(stats.totalPaid)}</span>
                 <span>Faltam: {formatCurrency(Math.max(0, monthlyGoal - stats.totalPaid))}</span>
              </div>
            </div>
          </motion.div>

          {/* Card de Meta Diária */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-2xl shadow-xl relative overflow-hidden group border-l-4 border-l-sky-500 flex flex-col justify-center"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calculator size={40} className="text-sky-400" />
            </div>
            
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ritmo Necessário</p>
            <h4 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2 mb-4">
              Meta Diária
              <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[9px] border border-sky-500/20">
                {workingDays} dias úteis
              </span>
            </h4>
            
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(dailyGoal)}
              </span>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 leading-relaxed">
                Valor diário para atingir a meta de <br />
                <span className="text-sky-400/70">{formatCurrency(monthlyGoal)}</span> no mês
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500/50 w-full animate-pulse" />
              </div>
              <TrendingUp size={12} className="text-sky-500/50" />
            </div>
          </motion.div>
        </div>
        
        {/* Gráfico Meta vs Real */}
        <div id="performance-chart" className="glass-card p-6 rounded-2xl shadow-xl flex flex-col relative overflow-hidden group lg:col-span-2">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />
          
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Performance vs Meta
          </h4>
          
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#334155" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #1e293b', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '12px' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40} animationDuration={1500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gráfico de Distribuição Temporal */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 glass-card p-6 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl" />
          
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <TrendingUp size={16} className="text-sky-400" />
            Densidade de Acordos por Horário
          </h4>
          
          <div className="grid grid-cols-12 md:grid-cols-24 gap-1.5 h-32 items-end">
            {Array.from({ length: 24 }).map((_, hour) => {
              const count = stats.hourlyDistribution[hour] || 0;
              const counts = Object.values(stats.hourlyDistribution);
              const max = counts.length > 0 ? Math.max(...counts) : 1;
              const intensity = (count / max);
              
              return (
                <div key={hour} className="flex flex-col gap-2 items-center flex-1 h-full justify-end group/item">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: count > 0 ? `${Math.max(10, intensity * 100)}%` : '4px' }}
                    className="w-full rounded-t-sm transition-all duration-500 relative"
                    style={{ 
                      backgroundColor: count > 0 
                        ? `rgba(14, 165, 233, ${0.3 + (intensity * 0.7)})` 
                        : 'rgba(30, 41, 59, 0.3)',
                      boxShadow: count > 0 ? `0 0 15px rgba(14, 165, 233, ${intensity * 0.4})` : 'none'
                    }}
                  >
                    {count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-[9px] font-bold text-white px-1.5 py-0.5 rounded border border-slate-700 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {count} acordos
                      </div>
                    )}
                  </motion.div>
                  <span className="text-[7px] text-slate-500 font-bold uppercase">{hour}h</span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 flex justify-between items-center border-t border-slate-800/50 pt-4">
            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">
              Análise de produtividade temporal baseada em {stats.counts.filtered.total} registros
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-slate-500 uppercase font-bold">Intensidade:</span>
              <div className="flex gap-0.5">
                {[0.2, 0.4, 0.6, 0.8, 1].map(v => (
                  <div key={v} className="w-2 h-2 rounded-sm" style={{ backgroundColor: `rgba(14, 165, 233, ${v})` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <StatCard 
            title="Aguardando" 
            value={stats.counts.month.waiting} 
            icon={Loader2} 
            color="amber"
            subtitle="Pendente Pagto"
          />
          <StatCard 
            title="Quebrados" 
            value={stats.counts.month.broken} 
            icon={X} 
            color="rose"
            subtitle="Faltas / Recusas"
          />
        </div>
      </section>

      {/* Seção de Eficiência de Turnos e Metas de Time */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Eficiência dos Turnos */}
        <div className="glass-card p-6 rounded-2xl shadow-xl flex flex-col justify-center">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Clock size={16} className="text-sky-400" />
            Eficiência por Turno
          </h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                <span className="text-sky-400">Manhã</span>
                <span className="text-white">{stats.insights?.cycleEfficiency?.morning.toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: `${stats.insights?.cycleEfficiency?.morning}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                <span className="text-amber-500">Tarde</span>
                <span className="text-white">{stats.insights?.cycleEfficiency?.afternoon.toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${stats.insights?.cycleEfficiency?.afternoon}%` }} />
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* SEÇÃO EXTRA DE BI & INSIGHTS DE EQUIPES (Fase 5) */}
      <section className="space-y-6 pt-6 border-t border-white/5 relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 rounded-2xl border border-sky-500/20">
              <TrendingUp className="text-sky-400" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight leading-none">BI & Analytics Estratégico</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">Análise de Liquidez, Risco e MRR futuro</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* MRR Futuro e Risco por Categoria */}
            <div className="space-y-4">
              {/* Colchão Projetado */}
              <div className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Calculator size={60} className="text-emerald-400" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Previsibilidade Financeira</span>
                <h4 className="text-xs font-bold text-white uppercase mt-1 mb-3">Colchão Projetado (MRR)</h4>
                <div className="text-2xl font-black text-emerald-400">
                  {formatCurrency(stats.projectedMrr || 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  Volume de parcelamentos ativos com vencimento futuro previstos para entrada em caixa.
                </p>
              </div>

              {/* Risco por Categoria */}
              <div className="glass-card p-6 rounded-3xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cruzamento de Quebra</span>
                <h4 className="text-xs font-bold text-white uppercase mt-1 mb-4">Risco por Categoria</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-slate-400">Acordos Fixos</span>
                      <span className="text-rose-400 font-mono font-bold">{(stats.insights?.breakRateByCategory?.fixa || 0).toFixed(1)}% quebra</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${stats.insights?.breakRateByCategory?.fixa || 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-slate-400">Acordos Variáveis</span>
                      <span className="text-rose-400 font-mono font-bold">{(stats.insights?.breakRateByCategory?.variavel || 0).toFixed(1)}% quebra</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${stats.insights?.breakRateByCategory?.variavel || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Curva de Quebra por Dilação */}
            <div className="glass-card p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Análise de Vencimento</span>
                <h4 className="text-xs font-bold text-white uppercase mt-1 mb-4">Curva de Quebra por Dilação</h4>
              </div>

              <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                {Object.entries(stats.insights?.breakRatesByDilatedDays || {}).map(([bin, rate]) => (
                  <div key={bin}>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-slate-400">{bin}</span>
                      <span className="text-rose-400 font-mono font-bold">{(rate || 0).toFixed(1)}% quebra</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500/80" style={{ width: `${rate || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Horário Nobre de Liquidez */}
            <div className="glass-card p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Horário de Pico</span>
                <h4 className="text-xs font-bold text-white uppercase mt-1 mb-4">Horário Nobre (Liquidez)</h4>
              </div>

              <div className="flex-1 min-h-[140px] flex items-end gap-1">
                {Array.from({ length: 12 }).map((_, i) => {
                  const hour = i + 8; // De 8h às 19h
                  const val = stats.insights?.primeTimeDistribution?.[hour] || 0;
                  const vals = Object.values(stats.insights?.primeTimeDistribution || {});
                  const max = vals.length > 0 ? Math.max(...vals) : 1;
                  const heightPct = val > 0 ? (val / max) * 100 : 0;

                  return (
                    <div key={hour} className="flex-1 flex flex-col gap-1.5 items-center justify-end h-full group/bar relative">
                      <div className="w-full bg-slate-850 rounded-t-md relative h-full flex items-end">
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500" 
                          style={{ height: `${heightPct}%` }}
                        />
                        {val > 0 && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 text-[8px] text-emerald-400 font-bold border border-emerald-500/20 px-1 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {formatCurrency(val)}
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">{hour}h</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-500 font-medium uppercase mt-3 text-center">
                Volume financeiro liquidado de acordo com a hora de registro.
              </p>
            </div>
          </div>

          {/* Calendário de Calor Macro de 31 dias */}
          <div className="glass-card p-6 rounded-[2rem] border border-white/5 space-y-4">
            <div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Heatmap Mensal</span>
              <h4 className="text-xs font-bold text-white uppercase mt-1">Calendário de Calor Macro (Geração vs Liquidez)</h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {stats.insights?.heatmap31Days?.map((dayData, idx) => {
                const gen = dayData.generation;
                const liq = dayData.liquidity;
                const hasActivity = gen > 0 || liq > 0;

                let bgStyle = 'bg-slate-950/40 border-white/5';
                let textStyle = 'text-slate-500';
                
                if (hasActivity) {
                  bgStyle = 'bg-slate-900/60 border-white/10 hover:border-sky-500/40 relative';
                  textStyle = 'text-white';
                }

                return (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-xl border flex flex-col justify-between h-16 transition-all group/day cursor-help ${bgStyle}`}
                  >
                    <span className={`text-[10px] font-bold font-mono ${textStyle}`}>Dia {dayData.day}</span>
                    
                    {hasActivity ? (
                      <div className="space-y-0.5 mt-auto">
                        {gen > 0 && (
                          <div className="flex items-center justify-between text-[7px] text-sky-400 font-bold leading-none">
                            <span>G:</span>
                            <span className="font-mono">{formatCurrency(gen)}</span>
                          </div>
                        )}
                        {liq > 0 && (
                          <div className="flex items-center justify-between text-[7px] text-emerald-400 font-bold leading-none">
                            <span>L:</span>
                            <span className="font-mono">{formatCurrency(liq)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[7px] text-slate-700 italic mt-auto">Sem dados</span>
                    )}

                    {hasActivity && (
                      <div className="absolute bg-slate-950 text-[9px] text-slate-300 border border-white/10 p-2.5 rounded-xl opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl flex flex-col gap-1 w-32 -translate-y-20 left-1/2 -translate-x-1/2">
                        <span className="font-bold text-white text-center border-b border-white/5 pb-1 mb-1">Dia {dayData.day}</span>
                        <div className="flex justify-between">
                          <span>Geração:</span>
                          <span className="text-sky-400 font-bold">{formatCurrency(gen)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Liquidados:</span>
                          <span className="text-emerald-400 font-bold">{formatCurrency(liq)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
    </>
  );
};
