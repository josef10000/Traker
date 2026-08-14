import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Headset, CurrencyDollar, CheckCircle, Warning, Sparkle, Star, Calendar, FileText, ArrowRight } from '@phosphor-icons/react';
import { QaEvaluation, QaCompetence, UserProfile } from '../../../types';
import { Avatar } from '../../ui/Avatar';
import { formatCurrency } from '../../../utils/masks';
import { CustomAudioPlayer } from '../../ui/CustomAudioPlayer';

interface QaEvaluationCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: QaEvaluation | null;
  operator?: UserProfile | null;
  evaluatorName?: string;
  competences: QaCompetence[];
  theme?: 'light' | 'dark';
  currentUser?: UserProfile | null;
  onAcknowledgeEvaluation?: (evalId: string, replyComment?: string) => Promise<void> | void;
  onRecordView?: (evalId: string) => Promise<void> | void;
}

export const QaEvaluationCardModal: React.FC<QaEvaluationCardModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  operator,
  evaluatorName = 'Monitor de Qualidade',
  competences,
  theme = 'dark',
  currentUser,
  onAcknowledgeEvaluation,
  onRecordView
}) => {
  const [operatorReplyText, setOperatorReplyText] = React.useState('');
  const [isSubmittingAck, setIsSubmittingAck] = React.useState(false);

  // Registra visualização de leitura automaticamente quando o operador abre o modal
  React.useEffect(() => {
    if (isOpen && evaluation && currentUser && onRecordView) {
      const isOperator = !currentUser ? true : (currentUser.uid === evaluation.operatorId || currentUser.role === 'member' || currentUser.role === 'operator');
      if (isOperator && !evaluation.readAt) {
        onRecordView(evaluation.id);
      }
    }
  }, [isOpen, evaluation?.id, currentUser?.uid, evaluation?.readAt, onRecordView]);

  if (!isOpen || !evaluation) return null;

  const isOperatorUser = !currentUser ? true : (currentUser.uid === evaluation.operatorId || currentUser.role === 'member' || currentUser.role === 'operator' || currentUser.role === 'supervisor');

  const handleConfirmAck = async () => {
    if (!onAcknowledgeEvaluation) return;
    setIsSubmittingAck(true);
    try {
      await onAcknowledgeEvaluation(evaluation.id, operatorReplyText.trim() || undefined);
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const opName = operator?.displayName || (operator?.email ? operator.email.split('@')[0] : 'Operador');
  const formattedScore = `${evaluation.score}%`;
  const isHighScore = evaluation.score >= 85;
  const isMidScore = evaluation.score >= 70 && evaluation.score < 85;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-2xl rounded-[2.5rem] shadow-2xl border overflow-hidden my-8 ${
            theme === 'dark'
              ? 'bg-slate-900 border-white/10 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header Bar */}
          <div className={`px-8 py-5 border-b flex items-center justify-between ${
            theme === 'dark' ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Headset size={22} weight="duotone" />
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                  Ficha de Monitoria de Qualidade
                  {evaluation.isBestPractice && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Star size={11} weight="fill" /> Modelo
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Avaliado por <span className="font-semibold text-slate-400">{evaluatorName}</span> em {new Date(evaluation.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* CARTÃO ESTILO FICHA DA IMAGEM */}
            <div className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-950/80 via-slate-900/90 to-slate-950/80 border-sky-500/20 shadow-xl shadow-sky-500/5' 
                : 'bg-slate-50 border-slate-200 shadow-md'
            }`}>
              
              {/* Ícone Astronauta / Atendimento no Topo */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10 relative group">
                  <Headset size={42} weight="duotone" />
                  <Sparkle size={18} weight="fill" className="absolute top-2 right-2 text-amber-400 animate-pulse" />
                </div>
              </div>

              {/* Nome e Métricas Chave */}
              <div className="text-left space-y-2 mb-6 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  {operator && (
                    <Avatar
                      displayName={operator.displayName}
                      email={operator.email}
                      avatarStyle={operator.avatarStyle}
                      avatarSeed={operator.avatarSeed}
                      photoURL={operator.photoURL}
                      avatarType={operator.avatarType}
                      theme={theme}
                      size="md"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-sky-400 dark:text-sky-300">
                      {opName}
                    </h2>
                    <div className="flex items-center gap-4 text-sm mt-1">
                      <span className="font-semibold text-slate-300">
                        Nota: <strong className={`font-bold ${isHighScore ? 'text-emerald-400' : isMidScore ? 'text-amber-400' : 'text-rose-400'}`}>{formattedScore}</strong>
                      </span>
                      {evaluation.recoveredAmount !== undefined && (
                        <span className="font-semibold text-slate-300">
                          Recuperado: <strong className="font-extrabold text-emerald-400">{formatCurrency(evaluation.recoveredAmount)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seções da Ficha de Diagnóstico */}
              <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                
                {/* Perfil de atraso / Categoria Editável */}
                {evaluation.delayProfile && (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-100">
                      {evaluation.delayProfileLabel || 'Perfil de atraso'}: <span className="font-normal text-slate-300">{evaluation.delayProfile}</span>
                    </p>
                  </div>
                )}

                {/* Motivo apresentado pelo cliente */}
                {evaluation.clientReason && (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-100">
                      Motivo apresentado pelo cliente:
                    </p>
                    <p className="text-slate-300 text-sm leading-snug pl-1">
                      {evaluation.clientReason}
                    </p>
                  </div>
                )}

                {/* Objeções para não negociar */}
                {evaluation.objections && (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-100">
                      Objeções para não negociar:
                    </p>
                    <p className="text-slate-300 text-sm leading-snug pl-1">
                      {evaluation.objections}
                    </p>
                  </div>
                )}

                {/* Oportunidades de melhoria */}
                {evaluation.improvementOpportunities && evaluation.improvementOpportunities.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="font-bold text-slate-100">
                      Oportunidades de melhoria:
                    </p>
                    <ul className="space-y-2 pl-1">
                      {evaluation.improvementOpportunities.map((op, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm leading-snug">
                          <span className="text-amber-400 mt-1 shrink-0">•</span>
                          <span>{op}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feedback Geral (caso não haja oportunidades separadas) */}
                {evaluation.feedback && (!evaluation.improvementOpportunities || evaluation.improvementOpportunities.length === 0) && (
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <p className="font-bold text-slate-100">Parecer do Monitor:</p>
                    <p className="italic text-slate-300">"{evaluation.feedback}"</p>
                  </div>
                )}

              </div>

            </div>

            {/* Mídia de Áudio (se existir) */}
            {evaluation.callLink && (
              <div className={`p-4 rounded-2xl border ${
                theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Gravação do Atendimento Auditado</p>
                <CustomAudioPlayer
                  src={evaluation.callLink}
                  expiresAt={evaluation.callExpiresAt}
                  theme={theme}
                />
              </div>
            )}

            {/* Detalhamento de Competências */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Notas por Competência Auditada</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(evaluation.grades).map(([compId, gradeVal]) => {
                  const grade = Number(gradeVal) || 0;
                  const comp = competences.find(c => c.id === compId);
                  const name = comp?.name || 'Competência';
                  return (
                    <div key={compId} className={`p-3 rounded-xl border flex items-center justify-between ${
                      theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <span className="text-xs font-semibold text-slate-300">{name}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        grade >= 85 ? 'bg-emerald-500/20 text-emerald-400' :
                        grade >= 70 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {grade}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO DE CONFIRMAÇÃO DE LEITURA & CIENTE DO OPERADOR */}
            <div className={`p-5 rounded-2xl border space-y-3.5 ${
              theme === 'dark' ? 'bg-slate-950/60 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle size={16} className={evaluation.acknowledgedAt ? 'text-emerald-400' : evaluation.readAt ? 'text-amber-400' : 'text-slate-500'} />
                  <span>Confirmação de Leitura e Ciência (Feedback)</span>
                </h4>

                {/* BADGE DE STATUS PARA MONITOR / SUPERVISOR */}
                {evaluation.acknowledgedAt ? (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🟢 Ciente em {new Date(evaluation.acknowledgedAt).toLocaleString('pt-BR')}
                  </span>
                ) : evaluation.readAt ? (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    🟡 Lido em {new Date(evaluation.readAt).toLocaleString('pt-BR')}
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    🔴 Pendente de Leitura
                  </span>
                )}
              </div>

              {/* CONTEÚDO DA RESPOSTA DO OPERADOR OU FORMULÁRIO DE ACEITE */}
              {evaluation.acknowledgedAt ? (
                <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs text-slate-300">
                  <p className="font-semibold text-emerald-400">
                    ✅ O operador confirmou estar ciente destas recomendações de qualidade.
                  </p>
                  {evaluation.operatorReply && (
                    <p className="p-3 rounded-xl bg-slate-900 border border-white/5 italic text-slate-200">
                      💬 <strong>Tréplica do Operador:</strong> "{evaluation.operatorReply}"
                    </p>
                  )}
                </div>
              ) : isOperatorUser ? (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <p className="text-xs text-slate-300">
                    Por favor, confirme que você leu a monitoria e compreendeu os pontos de melhoria apresentados. Se desejar, você pode adicionar um comentário de tréplica:
                  </p>

                  <textarea
                    value={operatorReplyText}
                    onChange={(e) => setOperatorReplyText(e.target.value)}
                    placeholder="Adicionar um comentário / observação de tréplica (opcional)..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 min-h-[60px]"
                  />

                  <button
                    type="button"
                    disabled={isSubmittingAck}
                    onClick={handleConfirmAck}
                    className="w-full py-2.5 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>{isSubmittingAck ? 'Registrando...' : 'Confirmar Ciência e Assinar Feedback'}</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic pt-1 border-t border-white/5">
                  Aguardando confirmação de ciência pelo operador.
                </p>
              )}
            </div>

          </div>

          {/* Rodapé com Fechamento */}
          <div className={`px-8 py-4 border-t flex justify-end ${
            theme === 'dark' ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-100'
          }`}>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              Fechar Ficha
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
