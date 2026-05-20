import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calculator, RefreshCw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/masks';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackerValue: number;
  trackerProjected: number; // Prop para calcular a efetividade do tracker
  currentOfficialValue: number;
  currentOfficialEffectiveness: number; // Prop para exibir a efetividade oficial atual
  onSave: (officialValue: number, officialEffectiveness: number) => void;
  onNormalize: (difference: number) => void;
  onClear: () => void;
  adjustments: any[];
  onDeleteAdjustment: (id: string) => Promise<void>;
}

export const ReconciliationModal = ({
  isOpen,
  onClose,
  trackerValue,
  trackerProjected,
  currentOfficialValue,
  currentOfficialEffectiveness,
  onSave,
  onNormalize,
  onClear,
  adjustments,
  onDeleteAdjustment
}: ReconciliationModalProps) => {
  const [inputValue, setInputValue] = useState('');
  const [inputEffectiveness, setInputEffectiveness] = useState('');
  const [difference, setDifference] = useState(0);
  const [differenceEffectiveness, setDifferenceEffectiveness] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (currentOfficialValue) {
        setInputValue((currentOfficialValue * 100).toFixed(0));
      } else {
        setInputValue('');
      }
      
      if (currentOfficialEffectiveness) {
        setInputEffectiveness(currentOfficialEffectiveness.toString());
      } else {
        setInputEffectiveness('');
      }
    }
  }, [isOpen, currentOfficialValue, currentOfficialEffectiveness]);

  useEffect(() => {
    const official = parseFloat(inputValue.replace(/[^\d]/g, '')) / 100 || 0;
    setDifference(official - trackerValue);
  }, [inputValue, trackerValue]);

  useEffect(() => {
    const trackerEff = trackerProjected > 0 ? (trackerValue / trackerProjected) * 100 : 0;
    const officialEff = parseFloat(inputEffectiveness.replace(',', '.')) || 0;
    setDifferenceEffectiveness(officialEff - trackerEff);
  }, [inputEffectiveness, trackerValue, trackerProjected]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value === '') {
      setInputValue('');
      return;
    }
    setInputValue(value);
  };

  const handleEffectivenessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d.,]/g, ''); // Permite apenas números, pontos e vírgulas
    setInputEffectiveness(value);
  };

  const formattedInput = () => {
    if (inputValue === '') return 'R$ 0,00';
    const val = parseFloat(inputValue) / 100;
    return formatCurrency(val);
  };

  const handleSave = () => {
    const official = parseFloat(inputValue) / 100 || 0;
    const officialEff = parseFloat(inputEffectiveness.replace(',', '.')) || 0;
    onSave(official, officialEff);
    onClose();
  };

  if (!isOpen) return null;

  const trackerEffectiveness = trackerProjected > 0 ? (trackerValue / trackerProjected) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative glass-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-xl">
              <Calculator size={20} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Conciliar Resultados</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Saldo e Efetividade Oficial</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
          {/* SEÇÃO 1: CONCILIAÇÃO DE SALDO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-3 bg-sky-500 rounded-full"></span>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Conciliação de Saldo (R$)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Meu Tracker</p>
                <p className="text-lg font-bold text-white">{formatCurrency(trackerValue)}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Diferença</p>
                <p className={`text-lg font-bold ${difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Valor Recebido Oficial (Teams) *</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                <input 
                  type="text" 
                  value={formattedInput().replace('R$', '').trim()}
                  onChange={handleValueChange}
                  placeholder="0,00"
                  className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white text-xl font-bold backdrop-blur-sm"
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {difference !== 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3">
                  <AlertCircle className="text-rose-400 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-bold text-rose-200">Divergência de Saldo Detectada</p>
                    <p className="text-[10px] text-rose-300/80 mt-0.5">O valor do Tracker está diferente do oficial. Você pode salvar apenas o valor para referência ou normalizar o saldo agora.</p>
                  </div>
                </div>
              </motion.div>
            )}
            {difference === 0 && inputValue !== '' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3">
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-bold text-emerald-200">Saldo Sincronizado</p>
                    <p className="text-[10px] text-emerald-300/80 mt-0.5">Os valores de saldo estão batendo perfeitamente. Ótimo trabalho de registro!</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DIVISOR */}
          <div className="border-t border-white/5 my-6"></div>

          {/* SEÇÃO 2: CONCILIAÇÃO DE EFETIVIDADE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Conciliação de Efetividade (%)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Efetividade Tracker</p>
                <p className="text-lg font-bold text-white">{trackerEffectiveness.toFixed(1)}%</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Diferença</p>
                <p className={`text-lg font-bold ${differenceEffectiveness === 0 ? 'text-emerald-400' : (differenceEffectiveness > 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                  {differenceEffectiveness > 0 ? '+' : ''}{differenceEffectiveness.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Efetividade Oficial (Teams) *</label>
              <div className="relative group">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                <input 
                  type="text" 
                  value={inputEffectiveness}
                  onChange={handleEffectivenessChange}
                  placeholder="0.0"
                  className="w-full bg-white/5 border border-white/10 pl-4 pr-10 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-white text-xl font-bold backdrop-blur-sm"
                />
              </div>
            </div>
          </div>

          {currentOfficialValue > 0 && (
            <button 
              onClick={() => {
                if (window.confirm("Tem certeza que deseja apagar a conciliação salva? Isso também removerá todos os ajustes automáticos gerados.")) {
                  onClear();
                  onClose();
                }
              }}
              className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 font-bold rounded-xl border border-rose-500/20 transition-all text-xs flex items-center justify-center gap-2 mb-2"
            >
              Apagar Conciliação Salva
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              onClick={handleSave}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
            >
              Salvar Dados
            </button>
            <button 
              disabled={difference === 0}
              onClick={() => {
                onNormalize(difference);
                onClose();
              }}
              className="flex-[1.5] py-4 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} className={difference !== 0 ? 'animate-spin-slow' : ''} />
              Normalizar Saldo
            </button>
          </div>

          {/* Histórico de Ajustes Técnicos no Mês */}
          <div className="pt-6 border-t border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-sky-500/10 rounded-lg text-sky-400">
                <RefreshCw size={12} className="animate-spin-slow" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Ajustes de Saldo Realizados neste Mês
              </h3>
            </div>
            
            {adjustments.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic ml-1">Nenhum ajuste de saldo realizado neste período.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {adjustments.map((adj) => {
                  const dateStr = new Date(adj.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div key={adj.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl text-xs transition-all">
                      <div>
                        <span className="font-bold text-white block">{formatCurrency(adj.value)}</span>
                        <span className="text-[9px] text-slate-500 block font-semibold mt-0.5">{dateStr}</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Deseja realmente excluir este ajuste de saldo de ${formatCurrency(adj.value)}?`)) {
                            onDeleteAdjustment(adj.id);
                          }
                        }}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all border border-rose-500/10 hover:border-transparent active:scale-95"
                        title="Excluir Ajuste"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
