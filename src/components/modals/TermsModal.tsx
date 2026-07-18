import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Scroll as ScrollText } from '@phosphor-icons/react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const TermsModal = ({ isOpen, onAccept }: TermsModalProps) => {
  const [checked, setChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[16px] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-4 bg-gray-50/50 dark:bg-white/5 shrink-0">
          <div className="text-[#004d40] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">Termos de Uso e Política de Privacidade</h1>
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 mt-1 uppercase">Conformidade LGPD — Tracker RNV Gestão</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-container text-slate-600 dark:text-slate-300 text-sm leading-relaxed custom-scrollbar max-h-[400px]">
          {/* Seção 1 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <ScrollText size={24} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">1. Objeto e Consentimento</h2>
            </div>
            <p>
              O presente documento estabelece as condições de uso do sistema Tracker RNV Gestão. Ao utilizar esta plataforma, você concorda expressamente com a coleta, processamento e armazenamento de suas ações operacionais, com foco na transparência e rastreabilidade exigidas pela Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>

          {/* Seção 2 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">2. Proteção de Dados Pessoais (LGPD)</h2>
            </div>
            <p className="mb-4">
              Esta plataforma lida com dados pessoais de terceiros, especificamente CPFs e nomes de clientes em processos de negociação. Você, como operador autorizado, compromete-se a:
            </p>
            <ul className="list-disc ml-6 text-slate-600 dark:text-slate-400 space-y-2">
              <li>Garantir o sigilo absoluto das informações acessadas;</li>
              <li>Utilizar os dados estritamente para os fins previstos na plataforma;</li>
              <li>Não compartilhar credenciais de acesso em nenhuma hipótese.</li>
            </ul>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-start gap-4 mb-8">
            <input 
              type="checkbox"
              id="terms-consent"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-5 w-5 text-emerald-600 dark:text-emerald-500 border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded focus:ring-emerald-500 cursor-pointer"
            />
            <label className="text-sm text-slate-600 dark:text-slate-400 leading-snug cursor-pointer select-none" htmlFor="terms-consent">
              Li e concordo com os Termos de Uso e Política de Privacidade do Tracker RNV Gestão, comprometendo-me a agir em conformidade com as diretrizes da LGPD no manuseio de dados pessoais.
            </label>
          </div>
          <div className="flex flex-col items-center">
            <button 
              disabled={!checked}
              onClick={onAccept}
              className={`w-full md:w-auto px-12 py-4 font-bold rounded-lg transition-all duration-200 active:scale-95 ${
                checked 
                  ? 'bg-[#004d40] dark:bg-emerald-600 text-white hover:shadow-lg hover:bg-[#00382f] dark:hover:bg-emerald-500 cursor-pointer' 
                  : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              Aceitar e Continuar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
