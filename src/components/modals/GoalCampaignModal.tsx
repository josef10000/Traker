import React, { useState } from 'react';
import { X, Trophy, Users, User, Calendar, CurrencyDollar, Gift, Target, Clock, Plus, Trash, CheckCircle } from '@phosphor-icons/react';
import { GoalCampaign, GoalTargetItem, MetricType, CompletionRule, UserProfile } from '../../types';

interface GoalCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaign: Omit<GoalCampaign, 'id' | 'createdAt'>) => void;
  operators: UserProfile[];
  organizationId: string;
  theme?: 'light' | 'dark';
}

export const GoalCampaignModal: React.FC<GoalCampaignModalProps> = ({
  isOpen,
  onClose,
  onSave,
  operators = [],
  organizationId,
  theme = 'dark'
}) => {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<'collective' | 'individual'>('collective');
  const [targetOperatorId, setTargetOperatorId] = useState('');
  
  // Múltiplos Alvos
  const [targets, setTargets] = useState<GoalTargetItem[]>([
    { id: '1', metric: 'recovered_amount', targetValue: 5000 }
  ]);
  
  // Regra de Conclusão da Campanha
  const [completionRule, setCompletionRule] = useState<CompletionRule>('ALL_REQUIRED');

  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 3);
    return end.toISOString().slice(0, 16);
  });
  const [reward, setReward] = useState('Voucher iFood R$ 100 + Bônus PIX');

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleAddTarget = () => {
    const nextMetric: MetricType = targets.some(t => t.metric === 'recovered_amount') ? 'agreements_count' : 'recovered_amount';
    const defaultValue = nextMetric === 'agreements_count' ? 20 : 5000;
    setTargets(prev => [
      ...prev,
      { id: Date.now().toString(), metric: nextMetric, targetValue: defaultValue }
    ]);
  };

  const handleRemoveTarget = (id: string) => {
    if (targets.length <= 1) return;
    setTargets(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTarget = (id: string, field: 'metric' | 'targetValue', value: any) => {
    setTargets(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, [field]: value };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor, informe o título da campanha.');
      return;
    }
    if (scope === 'individual' && !targetOperatorId) {
      alert('Por favor, selecione o operador para a Meta Individual (PDI).');
      return;
    }
    if (!targets.length) {
      alert('Adicione ao menos uma meta para a campanha.');
      return;
    }

    onSave({
      organizationId,
      title: title.trim(),
      scope,
      targetOperatorId: scope === 'individual' ? targetOperatorId : undefined,
      // Legado
      targetMetric: targets[0].metric,
      targetValue: Number(targets[0].targetValue),
      // Multi-Metas
      targets: targets.map(t => ({ ...t, targetValue: Number(t.targetValue) })),
      completionRule,
      startDate,
      endDate,
      reward: reward.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Configurador de Campanhas Multi-Métricas</h3>
              <span className="text-xs text-slate-400 font-medium">Sprints de curto prazo e metas individuais (PDI)</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-5">
          {/* Título do Desafio */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Título do Desafio / Campanha <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sprint Relâmpago Fim de Mês, Desafio PDI Superação..."
              required
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Seleção do Alcance (Coletivo vs Individual) */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Alcance do Desafio <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('collective')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  scope === 'collective'
                    ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950/40 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                <Users size={16} />
                <span>🌐 Campanha Coletiva</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('individual')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  scope === 'individual'
                    ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20'
                    : 'bg-slate-950/40 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                <User size={16} />
                <span>🎯 Meta Individual (PDI)</span>
              </button>
            </div>
          </div>

          {/* Operador para Meta Individual */}
          {scope === 'individual' && (
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Operador Alvo <span className="text-rose-400">*</span>
              </label>
              <select
                value={targetOperatorId}
                onChange={(e) => setTargetOperatorId(e.target.value)}
                required
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="" disabled>-- Selecionar Operador --</option>
                {operators.map(op => (
                  <option key={op.uid} value={op.uid}>
                    {op.displayName || op.email} ({op.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SEÇÃO DE MÚLTIPLAS METAS DINÂMICAS */}
          <div className="space-y-2 border-t border-b border-white/10 py-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Target size={16} className="text-amber-400" />
                Objetivos & Metas da Campanha ({targets.length})
              </label>
              <button
                type="button"
                onClick={handleAddTarget}
                className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Adicionar Meta</span>
              </button>
            </div>

            <div className="space-y-2.5 mt-2">
              {targets.map((item, index) => (
                <div key={item.id} className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center gap-2">
                  <span className="text-xs font-black text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10">
                    #{index + 1}
                  </span>
                  
                  <div className="flex-1">
                    <select
                      value={item.metric}
                      onChange={(e) => handleUpdateTarget(item.id, 'metric', e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="recovered_amount">💰 R$ Recuperado</option>
                      <option value="agreements_count">📜 Nº de Acordos Gerados</option>
                      <option value="paid_agreements">✅ Nº de Acordos Pagos</option>
                      <option value="conversion_rate">📊 Taxa de Conversão/Efetividade (%)</option>
                      <option value="avg_ticket">🎟️ Ticket Médio (R$)</option>
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      value={item.targetValue}
                      onChange={(e) => handleUpdateTarget(item.id, 'targetValue', Number(e.target.value))}
                      required
                      min={0.01}
                      step={item.metric === 'conversion_rate' ? 0.1 : 1}
                      placeholder="Valor Alvo"
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTarget(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                      title="Remover Meta"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* SELETOR DE REGRA DE CONCLUSÃO */}
            <div className="mt-3 pt-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Regra de Conclusão da Campanha <span className="text-amber-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCompletionRule('ALL_REQUIRED')}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                    completionRule === 'ALL_REQUIRED'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1 font-black">🔒 Todas Batidas</span>
                  <span className="text-[10px] font-normal text-slate-400 mt-1">100% em cada uma</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompletionRule('ANY_REQUIRED')}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                    completionRule === 'ANY_REQUIRED'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1 font-black">⚡ Qualquer Uma</span>
                  <span className="text-[10px] font-normal text-slate-400 mt-1">Conclui se 1 for batida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompletionRule('WEIGHTED_AVERAGE')}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                    completionRule === 'WEIGHTED_AVERAGE'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1 font-black">⚖️ Média Ponderada</span>
                  <span className="text-[10px] font-normal text-slate-400 mt-1">Média dos percentuais</span>
                </button>
              </div>
            </div>
          </div>

          {/* Janela de Prazo (Início e Fim) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock size={12} className="text-amber-400" />
                Data/Hora de Início
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock size={12} className="text-rose-400" />
                Data/Hora de Fim
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Premiação / Recompensa */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Gift size={14} className="text-amber-400" />
              Premiação / Recompensa
            </label>
            <input
              type="text"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="Ex: Voucher iFood R$ 100, Folga na Sexta, Bônus PIX..."
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
            >
              Criar Campanha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

