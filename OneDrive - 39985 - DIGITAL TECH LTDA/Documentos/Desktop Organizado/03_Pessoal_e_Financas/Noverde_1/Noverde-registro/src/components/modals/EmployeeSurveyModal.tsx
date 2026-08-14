import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Heart, Lock, CheckCircle, ChatCircleText, Sparkle, PaperPlaneRight } from '@phosphor-icons/react';
import { EmployeeSurveyConfig } from '../../types';
import { submitAnonymousSurveyResponse } from '../../lib/surveyService';

interface EmployeeSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EmployeeSurveyConfig;
  userTeamId?: string;
  onSubmitted: () => void;
  theme?: 'light' | 'dark';
}

export const EmployeeSurveyModal: React.FC<EmployeeSurveyModalProps> = ({
  isOpen,
  onClose,
  config,
  userTeamId,
  onSubmitted,
  theme = 'dark'
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) return;

    setIsSubmitting(true);
    try {
      await submitAnonymousSurveyResponse(
        config.organizationId,
        config.id,
        rating,
        config.scaleType,
        comment,
        userTeamId
      );

      setIsSuccess(true);
      setTimeout(() => {
        onSubmitted();
        onClose();
        setIsSuccess(false);
        setRating(null);
        setComment('');
      }, 2000);
    } catch (err) {
      console.error('Erro ao enviar resposta da pesquisa:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-8 border shadow-2xl overflow-hidden ${
            isDark 
              ? 'bg-slate-900/95 border-slate-700/60 text-white shadow-sky-950/40' 
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
          }`}
        >
          {/* Efeitos de fundo iluminados */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className={`absolute top-5 right-5 p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
            title="Responder depois"
          >
            <X size={18} />
          </button>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30 animate-bounce">
                <CheckCircle size={36} weight="fill" />
              </div>
              <h3 className="text-xl font-black mb-2">Obrigado pelo seu Feedback!</h3>
              <p className={`text-sm max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Sua resposta 100% anônima foi salva com sucesso e ajuda a construir um ambiente melhor.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header com Badge */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs flex items-center gap-1.5">
                  <Sparkle size={14} weight="fill" />
                  <span>Pesquisa de Clima Interno</span>
                </div>
              </div>

              {/* Pergunta Principal */}
              <div>
                <h3 className="text-lg sm:text-xl font-black leading-snug tracking-tight">
                  {config.question}
                </h3>
              </div>

              {/* Opções de Escala */}
              <div className="py-2">
                {config.scaleType === '0_10' && (
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider mb-2 text-slate-400">
                      <span>Pouco Provável (0)</span>
                      <span>Muito Provável (10)</span>
                    </div>
                    <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                      {Array.from({ length: 11 }, (_, i) => i).map((num) => {
                        const isSelected = rating === num;
                        let colorClasses = 'border-slate-700 hover:border-slate-500 bg-slate-800/50 text-slate-300';
                        
                        if (isSelected) {
                          if (num >= 9) colorClasses = 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105';
                          else if (num >= 7) colorClasses = 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30 scale-105';
                          else colorClasses = 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30 scale-105';
                        }

                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRating(num)}
                            className={`h-10 sm:h-11 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-center ${colorClasses}`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {config.scaleType === 'stars' && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = rating !== null && rating >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star
                            size={36}
                            weight={isFilled ? 'fill' : 'bold'}
                            className={isFilled ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600 hover:text-slate-400'}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {config.scaleType === 'emojis' && (
                  <div className="grid grid-cols-5 gap-2 py-2">
                    {[
                      { val: 1, label: 'Péssimo', icon: '😠' },
                      { val: 2, label: 'Ruim', icon: '🙁' },
                      { val: 3, label: 'Regular', icon: '😐' },
                      { val: 4, label: 'Bom', icon: '🙂' },
                      { val: 5, label: 'Excelente', icon: '😁' }
                    ].map((item) => {
                      const isSelected = rating === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setRating(item.val)}
                          className={`p-3 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-sky-500/20 border-sky-500 text-sky-400 scale-105 shadow-lg shadow-sky-500/20' 
                              : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Zona de Comentário Livre */}
              {config.allowComments && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
                    <ChatCircleText size={14} />
                    <span>Comentário ou Sugestão (Opcional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={config.commentPlaceholder || 'Deixe aqui sua opinião anônima para a equipe de qualidade...'}
                    className={`w-full p-3.5 rounded-2xl text-xs outline-none transition-all resize-none border ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-sky-500/60' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                    }`}
                  />
                </div>
              )}

              {/* Botão Enviar & Rodapé com Fine Print 100% Anônimo */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={rating === null || isSubmitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-sky-400/30 cursor-pointer shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span>Enviando Resposta...</span>
                  ) : (
                    <>
                      <PaperPlaneRight size={16} weight="bold" />
                      <span>Enviar Resposta Anônima</span>
                    </>
                  )}
                </button>

                {/* Fine Print 100% Anônimo */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium text-center">
                  <Lock size={12} className="text-emerald-400 shrink-0" weight="fill" />
                  <span>
                    Esta pesquisa é <strong className="text-emerald-400 font-bold">100% anônima</strong>. Suas respostas não são vinculadas ao seu perfil ou nome.
                  </span>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
