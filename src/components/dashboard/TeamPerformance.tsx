import React, { useMemo, useState } from 'react';
import { Trophy, Medal, TrendUp as TrendingUp, Users, MagnifyingGlass } from '@phosphor-icons/react';
import { Agreement, AgreementStatus, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/masks';

interface TeamPerformanceProps {
  agreements: Agreement[];
  members: UserProfile[];
  dailyGoal?: number;
  showRanking?: boolean;
  qaScores?: Record<string, number>;
  selectedMemberId?: string;
  onSelectMember?: (memberId: string) => void;
}

export const TeamPerformance = ({ 
  agreements, 
  members, 
  dailyGoal = 0,
  showRanking = true,
  qaScores = {},
  selectedMemberId,
  onSelectMember
}: TeamPerformanceProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (members.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl text-center text-slate-500">
        Nenhum membro encontrado nesta equipe para gerar o ranking.
      </div>
    );
  }

  // Process data for ranking and table
  const performanceData = useMemo(() => {
    const data: Record<string, { 
      name: string; 
      paid: number; 
      projected: number; 
      daily: Record<string, number> 
    }> = {};

    // Initialize with members
    members.forEach(m => {
      data[m.uid] = { name: m.displayName, paid: 0, projected: 0, daily: {} };
    });

    // Get all unique dates from agreements (sorted)
    const uniqueDates = Array.from(new Set(agreements.map(a => (a.createdAt || '').split('T')[0]))).filter(Boolean).sort();

    agreements.forEach(a => {
      if (!data[a.operatorId]) return;
      
      const date = (a.createdAt || '').split('T')[0];
      const val = a.value;
      
      data[a.operatorId].projected += val;
      if (a.status === AgreementStatus.PAID) {
        data[a.operatorId].paid += val;
        data[a.operatorId].daily[date] = (data[a.operatorId].daily[date] || 0) + val;
      }
    });

    const ranking = Object.entries(data)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.paid - a.paid);

    return { ranking, uniqueDates };
  }, [agreements, members]);

  const { ranking, uniqueDates } = performanceData;
  
  // Filter ranking based on search query
  const filteredRanking = useMemo(() => {
    if (!searchQuery.trim()) return ranking;
    return ranking.filter(row => 
      (row.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ranking, searchQuery]);

  // Only show the last 5 days in the table
  const tableDates = useMemo(() => uniqueDates.slice(-5), [uniqueDates]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  return (
    <div className="space-y-8">
      {/* Ranking / Leaderboard */}
      {showRanking && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ranking de Performance</h2>
              <p className="text-[10px] text-slate-400">Clique em um colaborador para visualizar sua performance individual</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ranking.slice(0, 4).map((item, index) => {
              const isSelected = selectedMemberId === item.id;
              return (
                <div 
                  key={item.id}
                  onClick={() => onSelectMember?.(isSelected ? 'all' : item.id)}
                  className={`relative p-6 rounded-3xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500/20 shadow-lg shadow-sky-500/5'
                      : index === 0 
                        ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20 hover:border-amber-500/60 active:scale-[0.98]' 
                        : 'glass-card hover:border-white/20 hover:bg-white/5 active:scale-[0.98]'
                  }`}
                >
                  {index < 3 && (
                    <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                      index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-300' : 'bg-orange-600'
                    }`}>
                      <Medal size={16} className="text-white" />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border transition-colors ${
                        isSelected ? 'border-sky-400 text-sky-400 bg-sky-950/40' : 'border-slate-700 text-slate-300'
                      }`}>
                        {item.name ? item.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">#{index + 1} Lugar</p>
                        <p className={`text-sm font-bold truncate max-w-[120px] ${isSelected ? 'text-sky-400' : 'text-white'}`}>{item.name || 'Usuário'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Pago</span>
                        <span className="text-sm font-bold text-emerald-400">{formatCurrency(item.paid)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-500 uppercase">Qualidade QA</span>
                        <span className="font-bold text-sky-400">
                          {qaScores[item.id] !== undefined ? `${qaScores[item.id].toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isSelected ? 'bg-sky-500' : index === 0 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${(item.paid / (ranking[0]?.paid || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Daily Productivity Table - Request Format */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Produtividade Diária (Pagos)</h2>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
            <div className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
              <MagnifyingGlass size={16} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
          <div className="max-h-[380px] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-black text-white uppercase bg-[#182235] border-r border-white/10 sticky left-0 top-0 z-30 min-w-[200px]">
                    PAGAMENTO TOTAL
                  </th>
                  {tableDates.map(date => (
                    <th key={date} className="px-4 py-3 text-center text-[10px] font-bold text-slate-300 uppercase bg-[#1e293b] border-r border-slate-700/30 sticky top-0 z-20">
                      {formatDate(date)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[11px] font-black text-white uppercase bg-[#182235] border-l border-white/10 sticky right-0 top-0 z-30">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {filteredRanking.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={tableDates.length + 2} 
                      className="px-4 py-8 text-center text-xs text-slate-500"
                    >
                      Nenhum colaborador encontrado com "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredRanking.map((row) => {
                    const isSelected = selectedMemberId === row.id;
                    return (
                      <tr 
                        key={row.id} 
                        onClick={() => onSelectMember?.(isSelected ? 'all' : row.id)}
                        className={`border-b border-white/5 cursor-pointer transition-all select-none ${
                          isSelected 
                            ? 'bg-sky-500/10 hover:bg-sky-500/15' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className={`px-4 py-2.5 font-bold text-xs border-r border-white/10 sticky left-0 z-10 transition-colors ${
                          isSelected ? 'bg-sky-950/80 text-sky-400' : 'bg-slate-900'
                        }`}>
                          {row.name || 'Usuário'}
                        </td>
                        {tableDates.map(date => (
                          <td key={date} className="px-4 py-2.5 text-center text-[11px] font-medium border-r border-slate-800/30">
                            {row.daily[date] ? formatCurrency(row.daily[date]) : 'R$ 0,00'}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right font-black text-xs text-white bg-slate-900 sticky right-0 z-10 border-l border-white/10">
                          {formatCurrency(row.paid)}
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Total Footer Row */}
                {filteredRanking.length > 0 && (
                  <tr className="bg-slate-900 sticky bottom-0 z-20 border-t border-white/10">
                    <td className="px-4 py-3 font-black text-[11px] text-white uppercase bg-slate-900 border-r border-white/10 sticky left-0 z-30">
                      Total
                    </td>
                    {tableDates.map(date => {
                      const totalDay = filteredRanking.reduce((acc, curr) => acc + (curr.daily[date] || 0), 0);
                      const isGoalReached = dailyGoal > 0 && totalDay >= dailyGoal;
                      
                      return (
                        <td key={date} className={`px-4 py-3 text-center text-[11px] font-black border-r border-white/10 transition-colors ${
                          isGoalReached 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {formatCurrency(totalDay)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right font-black text-[12px] text-sky-400 bg-slate-900 sticky right-0 z-30 border-l border-white/10">
                      {formatCurrency(filteredRanking.reduce((acc, curr) => acc + curr.paid, 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
