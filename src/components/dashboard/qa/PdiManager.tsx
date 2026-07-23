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
              className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                p.status === 'completed' 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : p.status === 'failed' || p.status === 'expired'
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : theme === 'dark' ? 'bg-slate-900/40 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
              }`}
            >
              <div className="space-y-3.5">
                {/* Header do Card */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Colaborador
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {opName}
                    </h4>
                  </div>

                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${
                    p.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : p.status === 'failed' || p.status === 'expired'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {p.status === 'completed' ? 'Cumprido' : p.status === 'failed' ? 'Não Cumprido' : p.status === 'expired' ? 'Expirado' : 'Pendente'}
                  </span>
                </div>

                {/* Competência em Foco */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Foco:
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {p.competenceName}
                  </span>
                </div>

                {/* Plano de Ação com Barra Lateral */}
                <div className={`p-3 rounded-r-xl border-l-2 border-l-indigo-500 text-xs font-normal leading-relaxed ${
                  theme === 'dark'
                    ? 'bg-slate-950/40 text-slate-300'
                    : 'bg-slate-50 text-slate-700'
                }`}>
                  {p.actionPlan}
                </div>
              </div>

              {/* Rodapé e Ações */}
              <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t pt-3 ${
                theme === 'dark' ? 'border-slate-800/80' : 'border-slate-100'
              }`}>
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  Limite: {p.dueDate.split('-').reverse().join('/')}
                </span>

                {canResolve && p.status === 'pending' && (
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => onResolvePdi(p.id, 'completed')}
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Marcar como Cumprido"
                    >
                      <CheckCircle2 size={13} weight="bold" />
                      <span>Cumprido</span>
                    </button>
                    <button
                      onClick={() => onResolvePdi(p.id, 'failed')}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Marcar como Não Cumprido"
                    >
                      <X size={13} weight="bold" />
                      <span>Não Cumprido</span>
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
