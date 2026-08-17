import React, { useState, useMemo } from 'react';
import { UserProfile, QaCompetence, QaEvaluation } from '../../../types';
import { 
  Star, 
  Headphones, 
  MagnifyingGlass, 
  User, 
  Calendar, 
  FileText
} from '@phosphor-icons/react';
import { CustomAudioPlayer } from '../../ui/CustomAudioPlayer';
import { QaEvaluationCardModal } from './QaEvaluationCardModal';

interface QaGoldenLibraryProps {
  evaluations: QaEvaluation[];
  currentTeamMembers: UserProfile[];
  competences: QaCompetence[];
  isSuperUser: boolean;
  currentUser?: UserProfile | null;
  onToggleBestPractice?: (evalId: string, currentVal: boolean) => void;
  onAcknowledgeEvaluation?: (evalId: string, replyComment?: string) => Promise<void> | void;
  onRecordView?: (evalId: string) => Promise<void> | void;
  theme?: 'light' | 'dark';
}

export const QaGoldenLibrary: React.FC<QaGoldenLibraryProps> = ({
  evaluations,
  currentTeamMembers,
  competences,
  isSuperUser,
  currentUser,
  onToggleBestPractice,
  onAcknowledgeEvaluation,
  onRecordView,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('all');
  const [selectedEvalForCard, setSelectedEvalForCard] = useState<QaEvaluation | null>(null);

  // Filtra apenas avaliações marcadas como Best Practice ou que tenham áudio de alto desempenho
  const goldenEvaluations = useMemo(() => {
    return evaluations.filter(e => e.isBestPractice || (e.audioUrl && e.finalScore >= 95));
  }, [evaluations]);

  // Filtragem combinada por busca e operador
  const filteredEvaluations = useMemo(() => {
    let list = [...goldenEvaluations];

    if (selectedOperatorId !== 'all') {
      list = list.filter(e => e.operatorId === selectedOperatorId);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(e => {
        const opName = (currentTeamMembers.find(m => m.uid === e.operatorId)?.displayName || '').toLowerCase();
        const feedback = (e.generalFeedback || '').toLowerCase();
        return opName.includes(term) || feedback.includes(term);
      });
    }

    return list.sort((a, b) => b.finalScore - a.finalScore);
  }, [goldenEvaluations, selectedOperatorId, searchTerm, currentTeamMembers]);

  const activeOperator = selectedEvalForCard 
    ? currentTeamMembers.find(m => m.uid === selectedEvalForCard.operatorId) 
    : null;

  const activeEvaluatorName = selectedEvalForCard
    ? (currentTeamMembers.find(m => m.uid === selectedEvalForCard.evaluatorId)?.displayName || 'Monitor de Qualidade')
    : 'Monitor de Qualidade';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner de Apresentação da Biblioteca de Ouro */}
      <div className={`p-6 rounded-3xl border relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark 
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/30 text-white' 
          : 'bg-gradient-to-r from-amber-50 to-white border-amber-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <Star size={26} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Treinamento & Best Practices
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {goldenEvaluations.length} gravações de referência
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-0.5">
              ⭐ Biblioteca de Ouro: Gravações de Alto Desempenho
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Coleção de atendimentos e negociações com excelência em postura, conformidade de script e contorno de objeções selecionados pelo time de Qualidade.
            </p>
          </div>
        </div>
      </div>

      {/* Controles: Busca e Filtro por Operador */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por operador ou tema do feedback..."
            className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              isDark ? 'bg-slate-950 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-1 shrink-0">
            <User size={14} className="text-amber-400" /> Operador:
          </span>
          <select
            value={selectedOperatorId}
            onChange={(e) => setSelectedOperatorId(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
              isDark ? 'bg-slate-950 border-white/10 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">👥 Todos os Operadores</option>
            {currentTeamMembers.map(m => (
              <option key={m.uid} value={m.uid}>
                {m.displayName || m.name || m.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Cards da Biblioteca de Ouro */}
      {filteredEvaluations.length === 0 ? (
        <div className={`p-12 rounded-3xl border text-center space-y-3 ${
          isDark ? 'bg-slate-900/20 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <Headphones size={36} className="mx-auto text-slate-600 opacity-60" />
          <h4 className="text-sm font-bold">Nenhuma gravação de destaque encontrada</h4>
          <p className="text-xs max-w-sm mx-auto">
            Quando o Monitor de Qualidade avaliar uma ligação e marcá-la com a estrela de destaque (Best Practice), ela aparecerá aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvaluations.map((ev) => {
            const operator = currentTeamMembers.find(m => m.uid === ev.operatorId);
            const opName = operator?.displayName || operator?.name || 'Operador';
            const evalDate = new Date(ev.createdAt).toLocaleDateString('pt-BR');

            return (
              <div
                key={ev.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-lg ${
                  isDark 
                    ? 'bg-slate-900/60 border-amber-500/20 hover:border-amber-500/40 text-slate-200' 
                    : 'bg-white border-amber-200 hover:border-amber-400 text-slate-800'
                }`}
              >
                <div className="space-y-3">
                  {/* Header do Card com Nota e Botão Destaque */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs">
                        <Star size={16} weight="fill" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{opName}</h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar size={11} /> {evalDate}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-base text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-xl border border-amber-500/20">
                        {ev.finalScore.toFixed(1)}
                      </span>
                      <span className="block text-[9px] text-emerald-400 font-bold uppercase mt-0.5">Nota Final</span>
                    </div>
                  </div>

                  {/* Feedback ou Destaque Textual */}
                  {ev.generalFeedback && (
                    <div className={`p-3 rounded-2xl text-xs line-clamp-3 italic border ${
                      isDark ? 'bg-slate-950/60 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      "{ev.generalFeedback}"
                    </div>
                  )}

                  {/* Player de Áudio Incorporado */}
                  {ev.audioUrl ? (
                    <div className="pt-1">
                      <CustomAudioPlayer 
                        audioUrl={ev.audioUrl} 
                        audioExpiresAt={ev.audioExpiresAt} 
                        theme={theme} 
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-[11px] text-slate-500 text-center">
                      Áudio não disponível diretamente
                    </div>
                  )}
                </div>

                {/* Ações: Ver Ficha Completa & Alternar Best Practice */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEvalForCard(ev)}
                    className="flex-1 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Ver Ficha da Monitoria</span>
                  </button>

                  {isSuperUser && onToggleBestPractice && (
                    <button
                      type="button"
                      onClick={() => onToggleBestPractice(ev.id, ev.isBestPractice || false)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        ev.isBestPractice
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                      title={ev.isBestPractice ? 'Remover da Biblioteca de Ouro' : 'Adicionar à Biblioteca de Ouro'}
                    >
                      <Star size={16} weight={ev.isBestPractice ? 'fill' : 'regular'} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        onAcknowledgeEvaluation={onAcknowledgeEvaluation}
        onRecordView={onRecordView}
      />
    </div>
  );
};
