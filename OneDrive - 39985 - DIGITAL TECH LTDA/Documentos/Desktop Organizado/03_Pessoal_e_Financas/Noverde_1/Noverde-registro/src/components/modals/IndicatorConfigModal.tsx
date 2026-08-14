import React, { useState } from 'react';
import { X, Plus, Trash, Sliders, Tag, Check, Sparkle, ArrowClockwise } from '@phosphor-icons/react';
import { CustomIndicatorConfig, PerformanceProfileConfig } from '../../types';

interface IndicatorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: CustomIndicatorConfig[];
  onSaveIndicators: (indicators: CustomIndicatorConfig[], weightsMap: Record<string, number>) => void;
  profiles: PerformanceProfileConfig[];
  activePresetId: string;
  onSaveProfile: (profileId: string, updatedWeights: Record<string, number>) => void;
  onAddCustomProfile?: (title: string, weights: Record<string, number>) => void;
  theme?: 'light' | 'dark';
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const IndicatorConfigModal: React.FC<IndicatorConfigModalProps> = ({
  isOpen,
  onClose,
  indicators: initialIndicators,
  onSaveIndicators,
  profiles,
  activePresetId,
  onSaveProfile,
  onAddCustomProfile,
  theme = 'dark',
  showToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'indicators' | 'weights'>('indicators');
  
  // Lista Local de Indicadores
  const [indicatorsList, setIndicatorsList] = useState<CustomIndicatorConfig[]>(initialIndicators);
  const [newLabel, setNewLabel] = useState('');
  const [newMetricKey, setNewMetricKey] = useState<CustomIndicatorConfig['metricKey']>('custom');

  // Perfil Selecionado para Edição de Pesos
  const [selectedProfileId, setSelectedProfileId] = useState<string>(activePresetId || profiles[0]?.id || 'balanced');
  
  // Pesos do Perfil Selecionado
  const activeProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];
  const [currentWeights, setCurrentWeights] = useState<Record<string, number>>(() => {
    return activeProfile ? { ...activeProfile.weights } : {};
  });

  // Atualizar os pesos locais quando trocar de perfil
  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    const target = profiles.find(p => p.id === profileId);
    if (target) {
      setCurrentWeights({ ...target.weights });
    }
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // 1. Ações de Indicadores
  const handleUpdateLabel = (id: string, newTitle: string) => {
    setIndicatorsList(prev => prev.map(ind => ind.id === id ? { ...ind, label: newTitle } : ind));
  };

  const handleDeleteIndicator = (id: string) => {
    if (indicatorsList.length <= 2) {
      showToast('A pontuação precisa ter pelo menos 2 indicadores ativos.', 'warning');
      return;
    }
    setIndicatorsList(prev => prev.filter(ind => ind.id !== id));
    setCurrentWeights(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    showToast('Indicador removido.', 'info');
  };

  const handleAddIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newId = `ind_${Date.now()}`;
    const newObj: CustomIndicatorConfig = {
      id: newId,
      label: newLabel.trim(),
      metricKey: newMetricKey
    };

    setIndicatorsList(prev => [...prev, newObj]);
    setCurrentWeights(prev => ({ ...prev, [newId]: 10 }));
    setNewLabel('');
    showToast(`Indicador "${newObj.label}" adicionado com sucesso!`, 'success');
  };

  // 2. Cálculo dos Pesos e Normalização
  const totalWeight = indicatorsList.reduce((acc, ind) => acc + (currentWeights[ind.id] || 0), 0);

  const handleWeightChange = (id: string, value: number) => {
    const val = Math.max(0, Math.min(100, value));
    setCurrentWeights(prev => ({ ...prev, [id]: val }));
  };

  // Algoritmo de Auto-Normalização para 100% (Método Hamilton)
  const handleNormalizeTo100 = () => {
    if (totalWeight === 0) return;

    const values = indicatorsList.map(ind => currentWeights[ind.id] || 0);
    const exacts = values.map(v => (v / totalWeight) * 100);
    const integers = exacts.map(v => Math.floor(v));
    const remainders = exacts.map((v, idx) => ({ idx, rem: v - integers[idx] }));

    let currentSum = integers.reduce((acc, curr) => acc + curr, 0);
    const diff = 100 - currentSum;

    remainders.sort((a, b) => b.rem - a.rem);
    for (let i = 0; i < diff; i++) {
      integers[remainders[i].idx] += 1;
    }

    const updated: Record<string, number> = {};
    indicatorsList.forEach((ind, idx) => {
      updated[ind.id] = integers[idx];
    });

    setCurrentWeights(updated);
    showToast('Pesos auto-normalizados para exatamente 100%!', 'success');
  };

  // 3. Salvar Tudo
  const handleSaveAll = () => {
    onSaveIndicators(indicatorsList, currentWeights);
    onSaveProfile(selectedProfileId, currentWeights);
    showToast('Configurações de indicadores e pesos salvas com sucesso!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 shadow-2xl transition-all my-auto ${
          isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-white/10 sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10 -mt-1 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Personalização de Indicadores & Pesos</h3>
              <span className="text-[11px] text-slate-400 font-medium">Adicione, edite nomes e ajuste a ponderação dos perfis</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegação de Abas Internas */}
        <div className="flex items-center gap-2 mt-4 p-1 rounded-2xl bg-slate-950/60 border border-white/5">
          <button
            onClick={() => setActiveSubTab('indicators')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'indicators'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag size={14} />
            <span>1. Nomes & Indicadores ({indicatorsList.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('weights')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'weights'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders size={14} />
            <span>2. Pesos (%) dos Perfis</span>
          </button>
        </div>

        {/* CONTEÚDO ABA 1: GERENCIAR INDICADORES */}
        {activeSubTab === 'indicators' && (
          <div className="space-y-4 my-4 animate-fade-in">
            {/* Formulário para Adicionar Novo Indicador */}
            <form onSubmit={handleAddIndicator} className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">➕ Adicionar Novo Indicador Customizado</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input 
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Nome do Indicador (ex: Ticket Médio)"
                  required
                  className="sm:col-span-2 px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <select
                  value={newMetricKey}
                  onChange={(e) => setNewMetricKey(e.target.value as any)}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="conversion">🎯 Meta de Acordos</option>
                  <option value="revenue">💰 Faturamento R$</option>
                  <option value="share">📊 Share Operação</option>
                  <option value="qa">🛡️ Nota QA</option>
                  <option value="attendance">⏰ Assiduidade</option>
                  <option value="absenteeism">🚫 Absenteísmo</option>
                  <option value="custom">✨ Métrica Customizada</option>
                </select>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Adicionar Indicador</span>
                </button>
              </div>
            </form>

            {/* Lista de Indicadores Cadastrados */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Indicadores Ativos na Avaliação:</span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {indicatorsList.map((ind, idx) => (
                  <div key={ind.id} className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1">
                      <span className="text-xs font-black text-purple-400 w-5">#{idx + 1}</span>
                      <input 
                        type="text"
                        value={ind.label}
                        onChange={(e) => handleUpdateLabel(ind.id, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                        {ind.metricKey.toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleDeleteIndicator(ind.id)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                        title="Remover indicador"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO ABA 2: CONFIGURAÇÃO DE PESOS (%) */}
        {activeSubTab === 'weights' && (
          <div className="space-y-4 my-4 animate-fade-in">
            {/* Seleção do Perfil Recomendado */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Selecione o Perfil para Ajustar os Pesos:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {profiles.map(prof => (
                  <button
                    key={prof.id}
                    onClick={() => handleSelectProfile(prof.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedProfileId === prof.id
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-bold block truncate">{prof.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Painel do Totalizador / Normalização */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              totalWeight === 100 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkle size={18} />
                <div>
                  <span className="text-xs font-bold block">Soma Atual dos Pesos: {totalWeight}%</span>
                  <span className="text-[10px] opacity-80 block">
                    {totalWeight === 100 ? '✓ Soma perfeita igual a 100%' : '⚠️ Ajuste ou use a auto-normalização'}
                  </span>
                </div>
              </div>
              {totalWeight !== 100 && (
                <button
                  type="button"
                  onClick={handleNormalizeTo100}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1 shadow-md cursor-pointer transition-all"
                >
                  <ArrowClockwise size={14} />
                  <span>Auto 100%</span>
                </button>
              )}
            </div>

            {/* Sliders dos Indicadores Cadastrados */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {indicatorsList.map(ind => {
                const weightVal = currentWeights[ind.id] || 0;

                return (
                  <div key={ind.id} className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{ind.label}</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number"
                          value={weightVal}
                          onChange={(e) => handleWeightChange(ind.id, Number(e.target.value))}
                          min={0}
                          max={100}
                          className="w-16 px-2 py-0.5 rounded-lg text-center font-bold bg-slate-900 border border-slate-700 text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    <input 
                      type="range"
                      min={0}
                      max={100}
                      value={weightVal}
                      onChange={(e) => handleWeightChange(ind.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check size={16} />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </div>
    </div>
  );
};
