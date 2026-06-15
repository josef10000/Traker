import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X, FileSpreadsheet, Lock } from 'lucide-react';

interface ExportCpfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (complete: boolean) => void;
}

export const ExportCpfModal = ({ 
  isOpen, 
  onClose, 
  onExport 
}: ExportCpfModalProps) => {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
          className="relative bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col"
        >
          <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-amber-500 animate-pulse" size={20} />
              <h2 className="text-lg font-bold text-white leading-tight">Exportação de Relatório (LGPD)</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), a exportação de dados pessoais identificáveis (como o CPF completo) deve ser realizada apenas para finalidades legítimas e com o devido controle.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
              <Lock className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-amber-400/90 leading-relaxed">
                A exportação padrão com os <strong>CPFs mascarados</strong> (ex: ***.***.*89-01) é recomendada para relatórios gerais e análise de metas.
              </div>
            </div>

            <div className="space-y-4">
              <label className="relative flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="peer mt-1 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed select-none">
                  Declaro que possuo finalidade legal e legítimo interesse para acessar e exportar os CPFs completos dos clientes, assumindo total responsabilidade pelo tratamento seguro dessas informações.
                </span>
              </label>
            </div>
          </div>

          <div className="p-8 pt-4 border-t border-white/5 bg-white/5 backdrop-blur-xl flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => {
                onExport(false);
                onClose();
              }}
              className="flex-1 px-5 py-4 rounded-xl border border-sky-500/30 hover:border-sky-500/60 bg-sky-500/5 text-sky-400 font-bold hover:bg-sky-500/10 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={16} />
              Exportar Mascarado
            </button>
            <button 
              disabled={!accepted}
              onClick={() => {
                onExport(true);
                onClose();
              }}
              className="flex-1 px-5 py-4 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/10 active:scale-95 flex items-center justify-center gap-2"
            >
              <ShieldAlert size={16} />
              Exportar CPF Completo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
