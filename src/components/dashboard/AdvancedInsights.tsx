import React from 'react';
import { TrendUp as TrendingUp } from '@phosphor-icons/react';
import { DashboardStats } from '../../types';

interface AdvancedInsightsProps {
  stats: DashboardStats;
  formatCurrency: (v: number) => string;
}

export const AdvancedInsights = ({
  stats,
  formatCurrency
}: AdvancedInsightsProps) => {

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-sky-500/10 rounded-2xl border border-sky-500/20">
          <TrendingUp className="text-sky-400" size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight leading-none">BI & Analytics Estratégico</h3>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">Análise de Liquidez, Risco e Vencimentos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risco por Categoria (Cruzamento de Clientes) */}
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

        {/* Curva de Quebra por Dilação (Análise de Vencimento) */}
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

        {/* Horário Nobre de Liquidez (Horário de Pico) */}
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
    </div>
  );
};
