import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ScrollText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const TermsModal = ({ isOpen, onAccept }: TermsModalProps) => {
  const [checked, setChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-8 py-6 border-b border-white/5 flex items-center gap-3 bg-white/5 backdrop-blur-xl shrink-0">
          <ShieldCheck className="text-sky-500" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Termos de Uso e Política de Privacidade</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Conformidade LGPD — Tracker RNV Gestão</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar text-slate-300 text-sm leading-relaxed">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ScrollText size={18} className="text-sky-400" />
            1. Objeto e Consentimento
          </div>
          <p>
            O presente documento estabelece as condições de uso do sistema Tracker RNV Gestão. Ao utilizar esta plataforma, você concorda expressamente com a coleta, processamento e armazenamento de suas ações operacionais, com foco na transparência e rastreabilidade exigidas pela Lei Geral de Proteção de Dados (LGPD).
          </p>

          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ShieldCheck size={18} className="text-sky-400" />
            2. Proteção de Dados Pessoais (LGPD)
          </div>
          <p>
            Esta plataforma lida com dados pessoais de terceiros, especificamente CPFs e nomes de clientes em processos de negociação. 
            Você, como operador autorizado, compromete-se a:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>Acessar ou revelar CPFs completos apenas quando houver estrita necessidade operacional (legítimo interesse ou execução de contrato).</li>
            <li>Manter sigilo absoluto sobre os dados visualizados no sistema, não os compartilhando por canais externos não seguros.</li>
            <li>Reconhecer que todas as ações de revelação de dados pessoais e exportação de relatórios são rastreadas e auditadas em log com seu usuário e carimbo de data/hora.</li>
          </ul>

          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ScrollText size={18} className="text-sky-400" />
            3. Segurança da Informação
          </div>
          <p>
            O acesso a esta plataforma é pessoal e intransferível. Você é inteiramente responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram sob sua conta. Notifique imediatamente os administradores sobre qualquer uso não autorizado de sua conta ou falha de segurança.
          </p>

          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ShieldCheck size={18} className="text-sky-400" />
            4. Direito de Acesso e Exclusão
          </div>
          <p>
            Em conformidade com o Artigo 18 da LGPD, o sistema Tracker disponibiliza ferramentas de anonimização de dados a pedido dos titulares de dados, que podem ser acionadas a qualquer momento pelos supervisores para exclusão de dados identificáveis (Direito ao Esquecimento).
          </p>
        </div>

        <div className="px-8 py-6 border-t border-white/5 bg-white/5 backdrop-blur-xl space-y-4 shrink-0">
          <label className="relative flex items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="peer mt-1 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed select-none">
              Li e concordo com os Termos de Uso e Política de Privacidade do Tracker RNV Gestão, comprometendo-me a agir em conformidade com as diretrizes da LGPD no manuseio de dados pessoais.
            </span>
          </label>

          <button 
            disabled={!checked}
            onClick={onAccept}
            className="w-full px-6 py-4 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-500/20 active:scale-95"
          >
            Aceitar e Continuar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
