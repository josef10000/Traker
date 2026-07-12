import React from 'react';
import { UserProfile, QaCompetence, QaEvaluation } from '../../../types';
import { ArrowUpRight } from '@phosphor-icons/react';

interface QaEvaluationsListProps {
  evaluations: QaEvaluation[];
  currentTeamMembers: UserProfile[];
  competences: QaCompetence[];
  isSuperUser: boolean;
  theme?: 'light' | 'dark';
}

export const QaEvaluationsList: React.FC<QaEvaluationsListProps> = ({
  evaluations,
  currentTeamMembers,
  competences,
  isSuperUser,
  theme = 'dark'
}) => {
  return (
    <div className={`rounded-[2rem] border overflow-hidden ${
      theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {evaluations.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm italic">
          Nenhuma avaliação registrada ainda.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={`border-b text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ${
                theme === 'dark' ? 'border-white/5 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <th className="px-6 py-4">Data</th>
                {isSuperUser && <th className="px-6 py-4">Operador</th>}
                <th className="px-6 py-4">Mídia / Protocolo</th>
                <th className="px-6 py-4">Nota</th>
                <th className="px-6 py-4">Competências Chave</th>
                <th className="px-6 py-4">Feedback do Monitor</th>
              </tr>
            </thead>
            <tbody className={`text-xs divide-y ${
              theme === 'dark' ? 'text-slate-300 divide-white/[0.02]' : 'text-slate-700 divide-slate-100'
            }`}>
              {evaluations.map(e => {
                const opName = currentTeamMembers.find(m => m.uid === e.operatorId)?.displayName || 'Operador';
                
                return (
                  <tr key={e.id} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                    <td className="px-6 py-4 font-bold text-slate-400">
                      {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    {isSuperUser && (
                      <td className={`px-6 py-4 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {opName}
                      </td>
                    )}
                    <td className="px-6 py-4 font-mono text-[11px]">
                      {e.callId && <div className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>ID: {e.callId}</div>}
                      {e.protocol && <div className="text-slate-400 dark:text-slate-500">Prot: {e.protocol}</div>}
                      {e.callLink && (
                        <a 
                          href={e.callLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sky-500 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer"
                        >
                          Ouvir Áudio <ArrowUpRight size={10} />
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        e.score >= 85 
                          ? theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                          : e.score >= 70 
                            ? theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-250'
                            : theme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-250'
                      }`}>
                        {e.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(e.grades).map(([id, grade]) => {
                          const cName = competences.find(c => c.id === id)?.name || 'Comp';
                          return (
                            <span key={id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              theme === 'dark' ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {cName}: {grade}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 italic text-slate-500 dark:text-slate-400 max-w-[250px] truncate" title={e.feedback}>
                      "{e.feedback}"
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
