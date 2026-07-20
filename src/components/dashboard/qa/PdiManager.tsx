import React from 'react';
import { UserProfile, Pdi } from '../../../types';
import { Calendar, CheckCircle as CheckCircle2, X } from '@phosphor-icons/react';

interface PdiManagerProps {
  pdis: Pdi[];
  currentTeamMembers: UserProfile[];
  profile: UserProfile;
  theme?: 'light' | 'dark';
  onResolvePdi: (id: string, status: 'completed' | 'failed') => Promise<void>;
}

export const PdiManager: React.FC<PdiManagerProps> = ({
  pdis,
  currentTeamMembers,
  profile,
  theme = 'dark',
  onResolvePdi
}) => {
  const canResolve = profile.role === 'monitor';
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
              className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all shadow-md ${
                p.status === 'completed' 
                  ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' 
                  : p.status === 'failed' || p.status === 'expired'
                    ? 'bg-rose-500/5 border-rose-500/20 shadow-rose-500/5'
                    : theme === 'dark' ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="space-y-4">
                {/* Header do Card */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
                      Colaborador
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {opName}
                    </h4>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border tracking-wider shadow-2xs ${
                    p.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                      : p.status === 'failed'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                        : p.status === 'expired'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                  }`}>
                    {p.status === 'completed' ? 'Cumprido' : p.status === 'failed' ? 'Não Cumprido' : p.status === 'expired' ? 'Expirado' : 'Pendente'}
                  </span>
                </div>

                {/* Competência em Foco */}
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
                    Competência em Foco
                  </span>
                  <span className="text-xs font-black text-teal-600 dark:text-teal-400 mt-0.5 block">
                    {p.competenceName}
                  </span>
                </div>

                {/* Citação do Plano de Ação */}
                <div className={`p-3.5 rounded-2xl border text-xs italic font-medium leading-relaxed shadow-xs ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}>
                  &quot;{p.actionPlan}&quot;
                </div>
              </div>

              {/* Rodapé e Ações */}
              <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t pt-3.5 ${
                theme === 'dark' ? 'border-white/10' : 'border-slate-100'
              }`}>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  Limite: {p.dueDate.split('-').reverse().join('/')}
                </span>

                {canResolve && p.status === 'pending' && (
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => onResolvePdi(p.id, 'completed')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      title="Marcar como Cumprido"
                    >
                      <CheckCircle2 size={12} weight="bold" />
                      Cumprido
                    </button>
                    <button
                      onClick={() => onResolvePdi(p.id, 'failed')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      title="Marcar como Não Cumprido"
                    >
                      <X size={12} weight="bold" />
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
