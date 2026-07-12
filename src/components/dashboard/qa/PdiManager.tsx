import React from 'react';
import { UserProfile, Pdi } from '../../../types';
import { Calendar, CheckCircle as CheckCircle2, X } from '@phosphor-icons/react';

interface PdiManagerProps {
  pdis: Pdi[];
  currentTeamMembers: UserProfile[];
  isSuperUser: boolean;
  theme?: 'light' | 'dark';
  onResolvePdi: (id: string, status: 'completed' | 'failed') => Promise<void>;
}

export const PdiManager: React.FC<PdiManagerProps> = ({
  pdis,
  currentTeamMembers,
  isSuperUser,
  theme = 'dark',
  onResolvePdi
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pdis.length === 0 ? (
        <div className="col-span-full text-center py-20 text-slate-500 text-sm italic">
          Nenhum PDI cadastrado para visualização.
        </div>
      ) : (
        pdis.map(p => {
          const opName = currentTeamMembers.find(m => m.uid === p.operatorId)?.displayName || 'Operador';
          
          return (
            <div 
              key={p.id}
              className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all ${
                p.status === 'completed' 
                  ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/15' 
                  : p.status === 'failed'
                    ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/15'
                    : p.status === 'expired'
                      ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/15'
                      : `border ${theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-slate-550 dark:text-slate-500 uppercase tracking-widest block">Colaborador</span>
                    <h4 className={`text-sm font-bold mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{opName}</h4>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                    p.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                      : p.status === 'failed'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                        : p.status === 'expired'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-250 dark:border-amber-500/20'
                  }`}>
                    {p.status === 'completed' ? 'Cumprido' : p.status === 'failed' ? 'Não Cumprido' : p.status === 'expired' ? 'Expirado' : 'Pendente'}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-slate-550 dark:text-slate-500 uppercase tracking-widest block">Competência em Foco</span>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5 block">{p.competenceName}</span>
                </div>

                <div className={`p-3 rounded-2xl border text-xs italic ${
                  theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  "{p.actionPlan}"
                </div>
              </div>

              <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t pt-3 ${
                theme === 'dark' ? 'border-white/5' : 'border-slate-100'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                  <Calendar size={12} />
                  Limite: {p.dueDate.split('-').reverse().join('/')}
                </span>

                {isSuperUser && p.status === 'pending' && (
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => onResolvePdi(p.id, 'completed')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 size={10} />
                      Cumprido
                    </button>
                    <button
                      onClick={() => onResolvePdi(p.id, 'failed')}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <X size={10} />
                      Não Cumprido
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
