import React, { useMemo, useEffect, useState } from 'react';
import { Trophy, Gift, Clock, Flame, CheckCircle, Sparkle, Target, Percent, CurrencyDollar, FileText, CheckSquare, TrendUp } from '@phosphor-icons/react';
import { Agreement, GoalCampaign, GoalTargetItem, MetricType, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/masks';
import { Celebration } from './Celebration';

interface GoalCampaignCardProps {
  campaign: GoalCampaign;
  profile: UserProfile;
  agreements: Agreement[];
  onCelebrate?: () => void;
  theme?: 'light' | 'dark';
}

export const GoalCampaignCard: React.FC<GoalCampaignCardProps> = ({
  campaign,
  profile,
  agreements,
  onCelebrate,
  theme = 'dark'
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const now = new Date();
  const start = new Date(campaign.startDate);
  const end = new Date(campaign.endDate);

  // 1. Validação da Janela de Tempo: O card só surge durante o período de validade
  const isActiveWindow = now >= start && now <= end;

  // 2. Isolamento de Cálculo: filtra apenas os acordos gerados EXATAMENTE no intervalo da campanha
  const campaignAgreements = useMemo(() => {
    return agreements.filter(a => {
      const date = new Date(a.createdAt);
      const inWindow = date >= start && date <= end;
      if (!inWindow) return false;

      // Se a campanha for individual, filtra pelo operador alvo
      if (campaign.scope === 'individual') {
        return a.operatorId === campaign.targetOperatorId;
      }
      // Se for coletiva, conta todos da operação
      return true;
    });
  }, [agreements, campaign, start, end]);

  // 3. Normalização dos Alvos (Multi-Métrica + Legado)
  const targetItems: GoalTargetItem[] = useMemo(() => {
    if (campaign.targets && campaign.targets.length > 0) {
      return campaign.targets;
    }
    return [{
      id: 'legacy',
      metric: campaign.targetMetric || 'recovered_amount',
      targetValue: campaign.targetValue || 5000
    }];
  }, [campaign]);

  // 4. Cálculo de Valores Atuais por Métrica
  const targetCalculations = useMemo(() => {
    const totalRecovered = campaignAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
    const agreementsCount = campaignAgreements.length;
    const paidAgreementsCount = campaignAgreements.filter(a => {
      const st = (a.status || '').toString().toLowerCase();
      return st === 'pago' || st === 'paid' || st === 'quitado';
    }).length;
    const conversionRate = agreementsCount > 0 ? Math.round((paidAgreementsCount / agreementsCount) * 100) : 0;
    const avgTicket = agreementsCount > 0 ? Math.round(totalRecovered / agreementsCount) : 0;

    return targetItems.map(item => {
      let currentValue = 0;
      let unit = '';
      let formatFn = (v: number) => `${v}`;
      let label = '';
      let icon = <Target size={14} />;

      switch (item.metric) {
        case 'recovered_amount':
          currentValue = totalRecovered;
          formatFn = (v) => formatCurrency(v);
          label = 'R$ Recuperado';
          icon = <CurrencyDollar size={14} className="text-emerald-400" />;
          break;
        case 'agreements_count':
          currentValue = agreementsCount;
          formatFn = (v) => `${v} acordos`;
          label = 'Acordos Gerados';
          icon = <FileText size={14} className="text-sky-400" />;
          break;
        case 'paid_agreements':
          currentValue = paidAgreementsCount;
          formatFn = (v) => `${v} pagos`;
          label = 'Acordos Pagos';
          icon = <CheckSquare size={14} className="text-teal-400" />;
          break;
        case 'conversion_rate':
          currentValue = conversionRate;
          formatFn = (v) => `${v}%`;
          label = 'Taxa de Efetividade';
          icon = <Percent size={14} className="text-amber-400" />;
          break;
        case 'avg_ticket':
          currentValue = avgTicket;
          formatFn = (v) => formatCurrency(v);
          label = 'Ticket Médio';
          icon = <TrendUp size={14} className="text-indigo-400" />;
          break;
      }

      const rawPct = (currentValue / (item.targetValue || 1)) * 100;
      const pct = Math.min(100, Math.round(rawPct));
      const isCompleted = pct >= 100;

      return {
        ...item,
        label,
        icon,
        currentValue,
        formattedCurrent: formatFn(currentValue),
        formattedTarget: formatFn(item.targetValue),
        pct,
        isCompleted
      };
    });
  }, [campaignAgreements, targetItems]);

  // 5. Cálculo da Conclusão e Média Geral baseado na Regra selecionada
  const rule = campaign.completionRule || 'ALL_REQUIRED';

  const { overallPercentage, isCompleted } = useMemo(() => {
    if (!targetCalculations.length) return { overallPercentage: 0, isCompleted: false };

    const avgPct = Math.round(
      targetCalculations.reduce((acc, t) => acc + t.pct, 0) / targetCalculations.length
    );

    if (rule === 'ANY_REQUIRED') {
      const anyDone = targetCalculations.some(t => t.isCompleted);
      const maxPct = Math.max(...targetCalculations.map(t => t.pct));
      return { overallPercentage: maxPct, isCompleted: anyDone };
    }

    if (rule === 'WEIGHTED_AVERAGE') {
      return { overallPercentage: avgPct, isCompleted: avgPct >= 100 };
    }

    // ALL_REQUIRED (padrão)
    const allDone = targetCalculations.every(t => t.isCompleted);
    return { overallPercentage: avgPct, isCompleted: allDone };
  }, [targetCalculations, rule]);

  // 6. Disparo automático de comemoração
  useEffect(() => {
    if (isCompleted && !hasCelebrated) {
      setShowCelebration(true);
      setHasCelebrated(true);
      if (onCelebrate) onCelebrate();
    }
  }, [isCompleted, hasCelebrated, onCelebrate]);

  if (!isActiveWindow) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950 p-6 border border-amber-500/30 shadow-2xl text-white my-4 animate-fade-in">
      {showCelebration && (
        <Celebration onComplete={() => setShowCelebration(false)} />
      )}

      {/* Glow de Destaque */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-4">
        {/* Header da Campanha */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg">
              <Trophy size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest flex items-center gap-1">
                  <Flame size={12} className="text-amber-400" />
                  {campaign.scope === 'individual' ? '🎯 Meta Individual PDI' : '🔥 Campanha Coletiva'}
                </span>

                {/* Badge da Regra de Conclusão */}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/10">
                  {rule === 'ANY_REQUIRED' ? '⚡ Qualquer Meta' : rule === 'WEIGHTED_AVERAGE' ? '⚖️ Média Ponderada' : '🔒 Todas Metas Exigidas'}
                </span>

                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock size={12} />
                  Até {end.toLocaleDateString('pt-BR')} às {end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white mt-1">{campaign.title}</h3>
            </div>
          </div>

          {/* Badge de Recompensa */}
          <div className="flex items-center gap-2 bg-amber-500/10 px-3.5 py-2 rounded-2xl border border-amber-500/20 text-amber-300">
            <Gift size={18} className="text-amber-400" />
            <span className="text-xs font-bold">{campaign.reward}</span>
          </div>
        </div>

        {/* Barra de Progresso Geral Animada */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span>Progresso Geral da Campanha</span>
              {isCompleted && <CheckCircle size={14} className="text-emerald-400" />}
            </span>
            <span className={`font-mono text-sm font-black ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
              {overallPercentage}%
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isCompleted 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                  : 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              }`}
              style={{ width: `${overallPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* METAS INDIVIDUAIS / MULTI-MÉTRICAS (GRID / SUB-BARRAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
          {targetCalculations.map((t) => (
            <div 
              key={t.id}
              className={`p-3 rounded-2xl border transition-all ${
                t.isCompleted 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                  : 'bg-slate-950/50 border-white/5 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-[11px] truncate">
                  {t.icon}
                  <span className="truncate">{t.label}</span>
                </span>
                <span className={`font-mono text-xs font-black ${t.isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {t.pct}%
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden my-1 border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    t.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${t.pct}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>{t.formattedCurrent}</span>
                <span className="font-bold text-slate-500">Alvo: {t.formattedTarget}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Mensagem de Status */}
        <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
          <span>
            {isCompleted ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle size={14} /> Desafio concluído com sucesso! Premiação liberada!
              </span>
            ) : (
              <span>Foque nas metas marcadas acima para concluir o desafio!</span>
            )}
          </span>
          {isCompleted && (
            <span className="text-amber-400 font-black flex items-center gap-1 animate-pulse">
              <Sparkle size={14} /> Parabéns à equipe!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

