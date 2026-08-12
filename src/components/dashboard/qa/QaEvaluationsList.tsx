import React, { useState } from 'react';
import { UserProfile, QaCompetence, QaEvaluation } from '../../../types';
import { ArrowUpRight, Star, FileText } from '@phosphor-icons/react';
import { CustomAudioPlayer } from '../../ui/CustomAudioPlayer';
import { QaEvaluationCardModal } from './QaEvaluationCardModal';

interface QaEvaluationsListProps {
  evaluations: QaEvaluation[];
  currentTeamMembers: UserProfile[];
  competences: QaCompetence[];
  isSuperUser: boolean;
  theme?: 'light' | 'dark';
  onToggleBestPractice?: (evalId: string, currentVal: boolean) => void;
  currentUser?: UserProfile | null;
  onAcknowledgeEvaluation?: (evalId: string, replyComment?: string) => Promise<void> | void;
  onRecordView?: (evalId: string) => Promise<void> | void;
}

export const QaEvaluationsList: React.FC<QaEvaluationsListProps> = ({
  evaluations,
  currentTeamMembers,
  competences,
  isSuperUser,
  theme = 'dark',
  onToggleBestPractice,
  currentUser,
  onAcknowledgeEvaluation,
  onRecordView
}) => {
  const [filterBestPracticeOnly, setFilterBestPracticeOnly] = useState(false);
  const [selectedEvalForCard, setSelectedEvalForCard] = useState<QaEvaluation | null>(null);

  const displayedEvaluations = filterBestPracticeOnly 
    ? evaluations.filter(e => e.isBestPractice)
    : evaluations;

  const activeOperator = selectedEvalForCard 
    ? currentTeamMembers.find(m => m.uid === selectedEvalForCard.operatorId) 
    : null;

  const activeEvaluatorName = selectedEvalForCard
    ? (currentTeamMembers.find(m => m.uid === selectedEvalForCard.evaluatorId)?.displayName || 'Monitor de Qualidade')
    : 'Monitor de Qualidade';

  const handleAcknowledgeCard = async (evalId: string, replyComment?: string) => {
    if (onAcknowledgeEvaluation) {
      await onAcknowledgeEvaluation(evalId, replyComment);
      const now = new Date().toISOString();
      if (selectedEvalForCard && selectedEvalForCard.id === evalId) {
        setSelectedEvalForCard(prev => prev ? { ...prev, readAt: prev.readAt || now, acknowledgedAt: now, operatorReply: replyComment } : null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Modal Ficha Completa */}
      <QaEvaluationCardModal
        isOpen={Boolean(selectedEvalForCard)}
        onClose={() => setSelectedEvalForCard(null)}
        evaluation={selectedEvalForCard}
        operator={activeOperator}
        evaluatorName={activeEvaluatorName}
        competences={competences}
        theme={theme}
        currentUser={currentUser}
        onAcknowledgeEvaluation={handleAcknowledgeCard}
        onRecordView={onRecordView}
      />

      {/* Filtro Rápido de Best Practices / Gravações Modelo */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterBestPracticeOnly(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !filterBestPracticeOnly
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Todas as Monitorias ({evaluations.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterBestPracticeOnly(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterBestPracticeOnly
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : theme === 'dark' ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <Star size={14} weight="fill" className="text-amber-400" />
            <span>⭐ Gravações Modelo ({evaluations.filter(e => e.isBestPractice).length})</span>
          </button>
        </div>
      </div>

      <div className={`rounded-[2rem] border overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {displayedEvaluations.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm italic">
            {filterBestPracticeOnly 
              ? 'Nenhuma gravação marcada como modelo/treinamento ainda.' 
              : 'Nenhuma avaliação registrada ainda.'}
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
                  <th className="px-6 py-4">Status Leitura</th>
                  <th className="px-6 py-4">Competências Chave</th>
                  <th className="px-6 py-4">Feedback / Ficha</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className={`text-xs divide-y ${
                theme === 'dark' ? 'text-slate-300 divide-white/[0.02]' : 'text-slate-700 divide-slate-100'
              }`}>
                {displayedEvaluations.map(e => {
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
                          <div className="mt-1.5">
                            <CustomAudioPlayer
                              src={e.callLink}
                              expiresAt={e.callExpiresAt}
                              theme={theme}
                              compact
                            />
                          </div>
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
                      <td className="px-6 py-4">
                        {e.acknowledgedAt ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title={`Ciente em ${new Date(e.acknowledgedAt).toLocaleString('pt-BR')}`}>
                            🟢 Ciente
                          </span>
                        ) : e.readAt ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20" title={`Visualizado em ${new Date(e.readAt).toLocaleString('pt-BR')}`}>
                            🟡 Lido
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            🔴 Pendente
                          </span>
                        )}
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
                      <td className="px-6 py-4 max-w-[250px]">
                        <div className="space-y-1.5">
                          <p className="italic text-slate-500 dark:text-slate-400 truncate" title={e.feedback}>
                            "{e.feedback}"
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedEvalForCard(e)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText size={12} weight="bold" />
                            <span>📋 Ver Ficha Completa</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleBestPractice && onToggleBestPractice(e.id, !!e.isBestPractice)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            e.isBestPractice
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                              : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
                          }`}
                          title={e.isBestPractice ? "Remover destaque Best Practice" : "Marcar como Áudio Destaque (Treinamento)"}
                        >
                          <Star size={16} weight={e.isBestPractice ? "fill" : "regular"} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
