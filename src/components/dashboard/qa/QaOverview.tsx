import React from 'react';
import { UserProfile, QaCompetence, QaEvaluation } from '../../../types';
import { QaStatsResult, OpPerformanceResult } from '../../../lib/qaService';
import { 
  Medal as Award, ShieldWarning as ShieldAlert, Gear, User, 
  Compass, TrendUp as TrendingUp, CheckCircle as CheckCircle2 
} from '@phosphor-icons/react';
import { 
  BarChart, Bar, Cell, ReferenceLine, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface QaOverviewProps {
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  selectedOperatorId: string;
  setSelectedOperatorId: (id: string) => void;
  editingNextQaDate: string;
  setEditingNextQaDate: (date: string) => void;
  isUpdatingDates: boolean;
  onUpdateOperatorDates: (operatorId: string, date: string) => Promise<void>;
  onToggleCycleStatus: (operatorId: string, currentStatus: 'pending' | 'evaluated') => Promise<void>;
  onOpenSettings: () => void;
  stats: QaStatsResult;
  opPerformance: OpPerformanceResult | null;
  isSuperUser: boolean;
  theme?: 'light' | 'dark';
}

export const QaOverview: React.FC<QaOverviewProps> = ({
  profile,
  currentTeamMembers,
  selectedOperatorId,
  setSelectedOperatorId,
  editingNextQaDate,
  setEditingNextQaDate,
  isUpdatingDates,
  onUpdateOperatorDates,
  onToggleCycleStatus,
  onOpenSettings,
  stats,
  opPerformance,
  isSuperUser,
  theme = 'dark'
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LISTA LATERAL DE OPERADORES */}
      {isSuperUser && (
        <div className={`w-full lg:w-72 shrink-0 p-5 rounded-3xl border flex flex-col gap-4 ${
          theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Operadores</h4>
            {profile.role === 'monitor' && (
              <button
                onClick={onOpenSettings}
                className={`p-1.5 rounded-lg border hover:text-sky-500 transition-colors ${
                  theme === 'dark' ? 'bg-slate-950 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
                title="Configurações de Ciclos de QA"
              >
                <Gear size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedOperatorId('all')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all font-bold text-xs cursor-pointer ${
                selectedOperatorId === 'all'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-500 dark:text-sky-400'
                  : theme === 'dark'
                    ? 'bg-slate-950/40 border-white/[0.02] text-slate-400 hover:border-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>Todos os Operadores</span>
              <span className="text-[10px] bg-sky-500/10 px-1.5 py-0.5 rounded-full font-black">
                {stats.totalEvals}
              </span>
            </button>

            {currentTeamMembers.map(member => {
              const isEvaluated = member.qaCycleStatus === 'evaluated';
              const hasNextQa = member.nextQaDate;
              
              return (
                <button
                  key={member.uid}
                  onClick={() => {
                    setSelectedOperatorId(member.uid);
                    setEditingNextQaDate(member.nextQaDate || '');
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedOperatorId === member.uid
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-500 dark:text-sky-400'
                      : theme === 'dark'
                        ? 'bg-slate-950/40 border-white/[0.02] text-slate-400 hover:border-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    isEvaluated
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {member.displayName?.[0].toUpperCase() || 'O'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-xs truncate ${
                      selectedOperatorId === member.uid
                        ? 'text-sky-455 dark:text-sky-400'
                        : theme === 'dark' ? 'text-slate-200' : 'text-slate-950'
                    }`}>{member.displayName}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">
                      {isEvaluated ? 'Avaliado' : 'Pendente'}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`w-2 h-2 rounded-full ${isEvaluated ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {hasNextQa && (
                      <span className="text-[8px] font-bold text-slate-500 bg-slate-500/10 px-1 py-0.5 rounded">
                        {member.nextQaDate.split('-').reverse().slice(0, 2).join('/')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* KPIs E GRÁFICOS */}
      <div className="flex-1 w-full space-y-6">
        
        {/* Seção do Operador Selecionado (Agenda e Status de Avaliação) */}
        {selectedOperatorId !== 'all' && (
          <div className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
            theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              <h4 className={`text-base font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <User size={16} className="text-sky-500" />
                Ciclo de QA: {currentTeamMembers.find(m => m.uid === selectedOperatorId)?.displayName || 'Operador'}
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Último QA: <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {currentTeamMembers.find(m => m.uid === selectedOperatorId)?.lastQaDate 
                      ? currentTeamMembers.find(m => m.uid === selectedOperatorId)?.lastQaDate.split('-').reverse().join('/') 
                      : 'Nunca'}
                  </span>
                </div>
                <div className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />
                <div>
                  Próxima Avaliação: <span className="font-bold text-sky-500 dark:text-sky-400">
                    {currentTeamMembers.find(m => m.uid === selectedOperatorId)?.nextQaDate 
                      ? currentTeamMembers.find(m => m.uid === selectedOperatorId)?.nextQaDate.split('-').reverse().join('/') 
                      : 'Não agendada'}
                  </span>
                </div>
              </div>
            </div>

            {profile.role === 'monitor' && (
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Agendar Data */}
                <div className={`flex items-center px-3 py-1.5 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <input
                    type="date"
                    value={editingNextQaDate}
                    onChange={(e) => setEditingNextQaDate(e.target.value)}
                    className={`bg-transparent text-xs outline-none border-none text-white ${
                      theme === 'dark' ? 'color-scheme-dark' : ''
                    }`}
                  />
                  <button
                    onClick={() => onUpdateOperatorDates(selectedOperatorId, editingNextQaDate)}
                    disabled={isUpdatingDates}
                    className="text-[10px] text-sky-500 font-black uppercase tracking-wider ml-2 hover:text-sky-400 cursor-pointer disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </div>

                {/* Toggle de Status Avaliado */}
                <button
                  onClick={() => {
                    const currentStatus = currentTeamMembers.find(m => m.uid === selectedOperatorId)?.qaCycleStatus || 'pending';
                    onToggleCycleStatus(selectedOperatorId, currentStatus);
                  }}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    currentTeamMembers.find(m => m.uid === selectedOperatorId)?.qaCycleStatus === 'evaluated'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-450 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-450 border border-amber-500/30'
                  }`}
                >
                  {currentTeamMembers.find(m => m.uid === selectedOperatorId)?.qaCycleStatus === 'evaluated'
                    ? 'Marcar como Pendente'
                    : 'Marcar como Avaliado'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Card Único de Desempenho e Frequência (RH) */}
        {selectedOperatorId !== 'all' && opPerformance && (
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h5 className={`text-xs font-black uppercase tracking-widest mb-4 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Desempenho e Frequência do Operador
            </h5>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-550 dark:text-slate-500 font-bold block uppercase tracking-wider">Faturamento (Mês)</span>
                <p className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  R$ {opPerformance.monthVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-550 dark:text-slate-500 font-bold block uppercase tracking-wider">Faturamento (7 dias)</span>
                <p className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  R$ {opPerformance.weekVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-550 dark:text-slate-500 font-bold block uppercase tracking-wider">Média de Acordos/Dia</span>
                <p className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {opPerformance.avgCount.toFixed(1)} acordos
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-550 dark:text-slate-500 font-bold block uppercase tracking-wider">Frequência Hoje</span>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider mt-1 border ${
                    opPerformance.todayStatus === 'present'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : opPerformance.todayStatus === 'late'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {opPerformance.todayStatus === 'present' ? 'Presença' : opPerformance.todayStatus === 'late' ? 'Atraso' : 'Falta'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* KPIs de Qualidade */}
          <div className="md:col-span-1 space-y-4 flex flex-col justify-between">
            <div className={`p-6 rounded-3xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Média de Qualidade</p>
                <h3 className={`text-3xl font-black mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {stats.avgScore > 0 ? `${stats.avgScore.toFixed(1)}%` : '0.0%'}
                </h3>
              </div>
              <div className="p-3.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-500/20">
                <Award size={22} />
              </div>
            </div>

            <div className={`p-6 rounded-3xl border flex items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pontos Fracos Comuns</p>
                <h3 className="text-base font-black text-rose-600 dark:text-rose-455 mt-1 leading-tight break-words" title={stats.worstCompetence}>
                  {stats.worstCompetence}
                </h3>
              </div>
              <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-500/20 shrink-0">
                <ShieldAlert size={22} />
              </div>
            </div>

            <div className={`p-6 rounded-3xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avaliações Realizadas</p>
                <h3 className={`text-2xl font-black mt-1 ${
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                }`}>{stats.totalEvals} no total</h3>
              </div>
              <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded-2xl border border-emerald-500/20">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>

          {/* Gráfico de Análise de Competências (Forças e Gaps) */}
          <div className={`p-6 rounded-3xl border min-h-[340px] md:col-span-2 ${
            theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h4 className={`text-sm font-bold uppercase tracking-tight flex items-center gap-2 mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Compass size={16} className="text-sky-500 dark:text-sky-400" />
              {selectedOperatorId === 'all'
                ? 'Médias Gerais por Competência'
                : 'Forças e Oportunidades (Gaps)'}
            </h4>
            <p className={`text-[10px] mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedOperatorId === 'all'
                ? 'Visão consolidada das notas médias do time em cada indicador de desempenho.'
                : 'Mostra os desvios em relação à média geral. Barras verdes indicam forças; vermelhas indicam gaps.'}
            </p>
            
            {stats.gapsData.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs italic">Nenhuma avaliação realizada para desenhar gráfico.</div>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={stats.gapsData}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis
                      type="number"
                      domain={selectedOperatorId === 'all' ? [0, 100] : [-50, 50]}
                      stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                      style={{ fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="subject"
                      stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                      style={{ fontSize: 9, fontWeight: 'bold' }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#fff',
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                      }}
                    />
                    {selectedOperatorId !== 'all' && (
                      <ReferenceLine x={0} stroke={theme === 'dark' ? '#475569' : '#94a3b8'} strokeWidth={1.5} />
                    )}
                    <Bar
                      dataKey={selectedOperatorId === 'all' ? 'Média Geral' : 'Operador'}
                      radius={[0, 8, 8, 0]}
                    >
                      {selectedOperatorId === 'all' ? (
                        stats.gapsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#0ea5e9" />
                        ))
                      ) : (
                        stats.gapsData.map((entry, index) => {
                          const isPositive = entry.Diferença >= 0;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={isPositive ? '#10b981' : '#f43f5e'}
                            />
                          );
                        })
                      )}
                      <LabelList 
                        dataKey={selectedOperatorId === 'all' ? 'Média Geral' : 'Diferença'}
                        position={selectedOperatorId === 'all' ? 'right' : 'inside'} 
                        fill={selectedOperatorId === 'all' ? (theme === 'dark' ? '#f8fafc' : '#0f172a') : '#ffffff'}
                        style={{ fontSize: 9, fontWeight: 'black' }}
                        formatter={(value: number) => {
                          if (selectedOperatorId === 'all') return `${value}%`;
                          return value >= 0 ? `+${value}` : `${value}`;
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Gráfico de Evolução de Qualidade do Operador (Linha do Tempo) */}
          {selectedOperatorId !== 'all' && stats.chartData.length > 0 && (
            <div className={`p-6 rounded-3xl border min-h-[300px] md:col-span-3 ${
              theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <h4 className={`text-sm font-bold uppercase tracking-tight flex items-center gap-2 mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <TrendingUp size={16} className="text-sky-500" />
                Histórico de Notas do Operador (Linha do Tempo)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNota" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="date" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} style={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis domain={[0, 100]} stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} style={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0' }} />
                    <Area type="monotone" dataKey="Nota" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNota)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
