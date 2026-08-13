import React from 'react';
import { ShieldCheck, Star, CaretRight, Trophy, CheckCircle } from '@phosphor-icons/react';
import { QaEvaluation, UserProfile } from '../../../types';

interface QaRadarWidgetCardProps {
  evaluations: QaEvaluation[];
  profile: UserProfile;
  onOpenQaTab?: () => void;
  theme?: 'dark' | 'light';
}

export const QaRadarWidgetCard: React.FC<QaRadarWidgetCardProps> = ({
  evaluations,
  profile,
  onOpenQaTab,
  theme = 'dark'
}) => {
  // Filtrar avaliações pertencentes ao usuário ou mais recente da equipe
  const userEvals = evaluations.filter(e => e.operatorId === profile.uid || e.evaluatorId === profile.uid);
  const latestEval = userEvals.length > 0 ? userEvals[0] : (evaluations.length > 0 ? evaluations[0] : null);

  const isDark = theme === 'dark';

  return (
    <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
      isDark 
        ? 'bg-slate-900/60 border-teal-500/20 hover:border-teal-500/40 shadow-xl shadow-teal-950/10' 
        : 'bg-white border-teal-200 hover:border-teal-300 shadow-md'
    }`}>
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <ShieldCheck size={22} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Radar de Qualidade & Monitoria QA</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                Ativo
              </span>
            </h3>
            <p className="text-xs text-slate-400">Desempenho operacional e pontuações de atendimento</p>
          </div>
        </div>

        {onOpenQaTab && (
          <button
            type="button"
            onClick={onOpenQaTab}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>Ver Painel QA</span>
            <CaretRight size={14} />
          </button>
        )}
      </div>

      {latestEval ? (
        <div className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-mono font-black text-lg shadow-inner">
                {latestEval.score}
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-200 block">
                  Última Avaliação de Atendimento
                </span>
                <span className="text-[11px] text-slate-400">
                  Realizada em {new Date(latestEval.createdAt).toLocaleDateString('pt-BR')} por {latestEval.evaluatorName || 'Supervisor/Monitor'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                latestEval.score >= 90
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  : latestEval.score >= 70
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
              }`}>
                {latestEval.score >= 90 ? '🌟 Excelente' : latestEval.score >= 70 ? '👍 Conforme' : '⚠️ Requer Atenção'}
              </span>
            </div>
          </div>

          {latestEval.generalFeedback && (
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-300 italic">
              "{latestEval.generalFeedback}"
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-500 space-y-2">
          <Trophy size={36} className="mx-auto opacity-30 text-teal-400" />
          <p className="text-xs font-medium">Nenhuma monitoria de qualidade registrada recentemente para este operador.</p>
        </div>
      )}
    </div>
  );
};
