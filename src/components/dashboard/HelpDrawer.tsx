import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  BookOpen, 
  Calculator, 
  TrendUp, 
  ShieldCheck, 
  Lifebuoy, 
  Question,
  FileCode,
  CheckCircle,
  WarningCircle
} from '@phosphor-icons/react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export const HelpDrawer = ({ isOpen, onClose, theme }: HelpDrawerProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay de fundo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Lateral */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 bottom-0 w-full max-w-md border-l z-50 flex flex-col shadow-2xl ${
              theme === 'dark'
                ? 'bg-slate-950 border-white/10 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Header do Drawer */}
            <div className={`p-6 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-slate-900/20' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  theme === 'dark' ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-500/5 text-sky-600'
                }`}>
                  <BookOpen size={20} weight="duotone" />
                </div>
                <div>
                  <h2 className={`font-black text-sm uppercase tracking-wider leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    Central de Ajuda
                  </h2>
                  <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mt-0.5">SaaS & Termos de Cobrança</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo Explicativo */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Glossário de KPIs */}
              <section className="space-y-4">
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-sky-400' : 'text-sky-600'
                }`}>
                  <Calculator size={16} />
                  <span>Dicionário de Estatísticas</span>
                </h3>
                
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border ${
                    theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className={`text-xs font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Total Projetado</h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Soma total do valor nominal de todos os acordos cadastrados no sistema dentro do período mensal corrente, independentemente do status de pagamento.
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className={`text-xs font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Produtividade Diária (Efetivados)</h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Total financeiro de acordos cujo pagamento foi validado como **Pago** na data corrente ou no período selecionado, refletindo a produtividade operacional instantânea.
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className={`text-xs font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Falta para Meta</h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Diferença entre o valor acumulado já pago e a meta mensal estabelecida pelo gerente administrativo para a equipe. Mostra o percentual em tempo real.
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className={`text-xs font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Projeção para o Mês</h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Cálculo preditivo que multiplica o ritmo médio de recuperação diária pelo número total de dias úteis do mês corrente, indicando a tendência de fechamento financeiro.
                    </p>
                  </div>
                </div>
              </section>

              {/* Status de Acordos */}
              <section className="space-y-4">
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-sky-400' : 'text-sky-600'
                }`}>
                  <WarningCircle size={16} />
                  <span>Entendendo os Status</span>
                </h3>

                <div className="space-y-3.5">
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>Pago</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Acordo liquidado integralmente. Soma diretamente na produtividade e no atingimento da meta.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>Aguardando</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">O boleto/PIX do acordo já foi enviado ao cliente e está aguardando o vencimento.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>Quebrado</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Data de vencimento ultrapassada sem registro de pagamento. O acordo entra automaticamente no Balcão de Recuperação.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Balcão de Recuperação */}
              <section className="space-y-4">
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-sky-400' : 'text-sky-600'
                }`}>
                  <TrendUp size={16} />
                  <span>Balcão de Recuperação</span>
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Quando um acordo de cobrança vence e não é pago, ele se torna um **Acordo Quebrado**. Para evitar perdas, o sistema o move para a aba **Recuperação**.
                  Lá, qualquer operador ou supervisor da organização pode assumir a carteira de cobrança deste cliente para renegociar os valores, gerando uma nova oportunidade de meta.
                </p>
              </section>

              {/* Qualidade e Avaliações de QA */}
              <section className="space-y-4">
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-sky-400' : 'text-sky-600'
                }`}>
                  <ShieldCheck size={16} />
                  <span>Sistema de Qualidade (QA)</span>
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O painel de QA permite que os supervisores ou monitores ouçam as ligações, verifiquem os históricos e avaliem cada acordo registrado pelos operadores baseado em critérios objetivos. 
                  A nota média do operador é exibida como **Efetividade/Qualidade (QA)** nos relatórios individuais.
                </p>
              </section>


            </div>

            {/* Rodapé do Drawer */}
            <div className={`p-4 border-t text-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-slate-950' : 'border-slate-100 bg-slate-50'
            }`}>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Tracker SaaS © {new Date().getFullYear()} — Todos os direitos reservados
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
