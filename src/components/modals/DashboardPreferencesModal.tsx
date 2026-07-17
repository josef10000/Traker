import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layout as LayoutDashboard, Eye, EyeClosed as EyeOff } from '@phosphor-icons/react';

interface CardOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface DashboardPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  hiddenCards: string[];
  onToggleCard: (cardId: string) => void;
  theme?: string;
}

const CARDS_OPTIONS: CardOption[] = [
  {
    id: 'cadastradosHoje',
    title: 'Cadastrados Hoje',
    description: 'Quantidade de acordos registrados no dia atual.',
    icon: <LayoutDashboard size={18} />
  },
  {
    id: 'ticketMedioGeral',
    title: 'Ticket Médio Geral',
    description: 'Média de valor por acordo registrado no período.',
    icon: <LayoutDashboard size={18} />
  },
  {
    id: 'ticketMedioTipo',
    title: 'Ticket Médio por Tipo',
    description: 'Média de valor separada por Quitação, Parcelamento, etc.',
    icon: <LayoutDashboard size={18} />
  },
  {
    id: 'tempoMedioPagar',
    title: 'Heatmap de Pagamentos',
    description: 'Mapa de calor mostrando a distribuição dos dias com mais acordos pagos.',
    icon: <LayoutDashboard size={18} />
  },
  {
    id: 'projecao7Dias',
    title: 'Projeção de 7 Dias',
    description: 'Soma dos valores que vencem nos próximos 7 dias.',
    icon: <LayoutDashboard size={18} />
  },
  {
    id: 'eficienciaCiclo',
    title: 'Eficiência por Ciclo',
    description: 'Conversão comparativa entre os turnos da Manhã e Tarde.',
    icon: <LayoutDashboard size={18} />
  },
  {
    id: 'agendaDoDia',
    title: 'Agenda do Dia (Retornos)',
    description: 'Grade de compromissos e retornos de clientes agendados.',
    icon: <LayoutDashboard size={18} />
  },
  {
    id: 'mediaQualidadeQa',
    title: 'Média de Qualidade (QA)',
    description: 'Nota média das avaliações de monitoria de qualidade.',
    icon: <LayoutDashboard size={18} />
  }
];

const getCardStyles = (cardId: string, theme: string) => {
  const isDark = theme === 'dark';
  switch (cardId) {
    case 'projecao7Dias':
      return { 
        text: isDark ? 'text-purple-400' : 'text-[#a855f7]', 
        bg: isDark ? 'bg-purple-500' : 'bg-[#a855f7]' 
      };
    case 'agendaDoDia':
      return { 
        text: isDark ? 'text-amber-400' : 'text-[#f59e0b]', 
        bg: isDark ? 'bg-amber-500' : 'bg-[#f59e0b]' 
      };
    case 'ticketMedioGeral':
      return { 
        text: isDark ? 'text-indigo-400' : 'text-[#3b82f6]', 
        bg: isDark ? 'bg-indigo-500' : 'bg-[#3b82f6]' 
      };
    case 'tempoMedioPagar':
      return { 
        text: isDark ? 'text-emerald-400' : 'text-[#10b981]', 
        bg: isDark ? 'bg-emerald-500' : 'bg-[#10b981]' 
      };
    case 'ticketMedioTipo':
      return { 
        text: isDark ? 'text-emerald-400' : 'text-[#3a8383]', 
        bg: isDark ? 'bg-emerald-500' : 'bg-[#3a8383]' 
      };
    case 'cadastradosHoje':
      return { 
        text: isDark ? 'text-sky-400' : 'text-[#3a8383]', 
        bg: isDark ? 'bg-sky-500' : 'bg-[#3a8383]' 
      };
    case 'eficienciaCiclo':
      return { 
        text: isDark ? 'text-sky-400' : 'text-[#3a8383]', 
        bg: isDark ? 'bg-sky-500' : 'bg-[#3a8383]' 
      };
    case 'mediaQualidadeQa':
      return { 
        text: isDark ? 'text-sky-400' : 'text-[#3a8383]', 
        bg: isDark ? 'bg-sky-500' : 'bg-[#3a8383]' 
      };
    default:
      return { 
        text: isDark ? 'text-sky-400' : 'text-[#3a8383]', 
        bg: isDark ? 'bg-sky-500' : 'bg-[#3a8383]' 
      };
  }
};

export const DashboardPreferencesModal = ({
  isOpen,
  onClose,
  hiddenCards,
  onToggleCard,
  theme = 'dark'
}: DashboardPreferencesModalProps) => {
  const [localHidden, setLocalHidden] = React.useState<string[]>(hiddenCards);

  React.useEffect(() => {
    setLocalHidden(hiddenCards);
  }, [hiddenCards]);

  const handleToggle = (cardId: string) => {
    setLocalHidden(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
    onToggleCard(cardId);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`absolute inset-0 backdrop-blur-md ${
              theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-900/40'
            }`}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-[580px] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${
              theme === 'dark' 
                ? 'glass-card border-white/5 text-white' 
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className={`px-8 py-6 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' 
                ? 'border-white/5 bg-white/5 backdrop-blur-xl' 
                : 'border-gray-200 bg-[#f1f5f9]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${
                  theme === 'dark' ? 'bg-sky-500/20 text-sky-400' : 'bg-[#d1e5e5] text-[#3a8383]'
                }`}>
                  <LayoutDashboard size={24} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-[#0f172a]'}`}>
                    Personalizar Visão
                  </h2>
                  <p className={`text-xs font-bold tracking-widest uppercase mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#64748b]'}`}>
                    Meu Dashboard Pessoal
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-white/10 text-slate-500 hover:text-white' 
                    : 'hover:bg-slate-200 text-[#64748b] hover:text-gray-900'
                }`}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-4 custom-scrollbar">
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-[#64748b]'}`}>
                Escolha quais informações você deseja visualizar na sua tela inicial. Essa configuração afeta apenas o seu perfil.
              </p>

              <div className="space-y-3">
                {CARDS_OPTIONS.map((card) => {
                  const isHidden = localHidden.includes(card.id);
                  const isVisible = !isHidden;
                  const cardStyles = getCardStyles(card.id, theme);

                  return (
                    <div 
                      key={card.id}
                      onClick={() => handleToggle(card.id)}
                      className={`flex items-center justify-between p-6 rounded-2xl border cursor-pointer transition-all group backdrop-blur-sm ${
                        theme === 'dark'
                          ? isVisible 
                            ? 'bg-white/10 border-white/20 hover:border-sky-500/50' 
                            : 'bg-white/5 border-white/5 opacity-60 hover:opacity-100 hover:border-white/10'
                          : isVisible
                            ? 'bg-[#f8fafc] border-gray-200 hover:bg-slate-50 hover:border-[#a855f7] hover:shadow-md' 
                            : 'bg-[#f8fafc] border-gray-200 opacity-60 hover:opacity-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`p-3 rounded-xl transition-colors ${
                          theme === 'dark' 
                            ? isVisible ? 'bg-white/10' : 'bg-white/5 text-slate-600'
                            : isVisible ? `bg-white shadow-sm ${cardStyles.text}` : 'bg-white shadow-sm text-[#94a3b8]'
                        }`}>
                          {React.cloneElement(card.icon as React.ReactElement, {
                            className: theme === 'dark' ? cardStyles.text : undefined
                          })}
                        </div>
                        <div className="flex-1">
                          <p className={`text-lg font-bold transition-colors ${
                            theme === 'dark' 
                              ? isVisible ? 'text-white' : 'text-slate-500'
                              : isVisible ? 'text-[#0f172a]' : 'text-[#94a3b8]'
                          }`}>
                            {card.title}
                          </p>
                          <p className={`text-sm font-medium leading-relaxed mt-0.5 ${
                            theme === 'dark' 
                              ? 'text-slate-500' 
                              : isVisible ? 'text-[#64748b]' : 'text-[#94a3b8]'
                          }`}>
                            {card.description}
                          </p>
                        </div>
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        isVisible 
                          ? theme === 'dark' ? 'bg-sky-500' : cardStyles.bg 
                          : theme === 'dark' ? 'bg-white/10' : 'bg-[#cbd5e1]'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`p-8 border-t shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-[#f1f5f9]'
            }`}>
              <button 
                onClick={onClose}
                className={`w-full py-4 font-bold text-xl rounded-xl transition-all shadow-lg ${
                  theme === 'dark'
                    ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
                    : 'bg-[#4b2c6e] text-white hover:opacity-90'
                }`}
              >
                Concluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
