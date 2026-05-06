import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, Crown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/masks';

interface LeaderboardItem {
  name: string;
  value: number;
  count: number;
  rank: number;
}

interface TVLeaderboardProps {
  data: LeaderboardItem[];
}

export const TVLeaderboard = ({ data }: TVLeaderboardProps) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex flex-col h-full gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-500/30">
            <Trophy className="text-amber-400" size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Ranking de Recuperação</h2>
            <p className="text-amber-500/70 font-bold uppercase tracking-[0.3em] text-xs">Os Maiores Resultados do Período</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 flex-1">
        {data.slice(0, 5).map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative glass-card p-6 rounded-[2rem] flex items-center gap-6 overflow-hidden border-2 ${
              index === 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'
            }`}
          >
            {/* Rank Number/Icon */}
            <div className="flex flex-col items-center justify-center w-20">
              {index === 0 ? (
                <Crown className="text-amber-400 mb-1" size={32} />
              ) : index === 1 ? (
                <Award className="text-slate-300 mb-1" size={28} />
              ) : index === 2 ? (
                <Award className="text-amber-700 mb-1" size={24} />
              ) : (
                <span className="text-2xl font-black text-slate-600">#{index + 1}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Operador</p>
                  <h3 className={`text-2xl font-black ${index === 0 ? 'text-amber-400' : 'text-white'}`}>
                    {item.name}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Recuperado</p>
                  <span className={`text-2xl font-black ${index === 0 ? 'text-amber-400' : 'text-white'}`}>
                    {formatCurrency(item.value)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-4 bg-slate-900/50 rounded-full overflow-hidden p-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / maxVal) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full rounded-full ${
                    index === 0 ? 'bg-amber-500' : 
                    index === 1 ? 'bg-slate-400' : 
                    index === 2 ? 'bg-amber-700' : 'bg-sky-500'
                  }`}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <span className="text-slate-500">{item.count} Acordos Pagos</span>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp size={10} />
                  <span>Em Alta</span>
                </div>
              </div>
            </div>

            {/* Background Glow for #1 */}
            {index === 0 && (
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-amber-500/10 blur-[100px] rounded-full" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
