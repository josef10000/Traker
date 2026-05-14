import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutDashboard, Eye, EyeOff } from 'lucide-react';

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
}

const CARDS_OPTIONS: CardOption[] = [
  {
    id: 'cadastradosHoje',
    title: 'Cadastrados Hoje',
    description: 'Quantidade de acordos registrados no dia atual.',
    icon: <LayoutDashboard size={18} className="text-sky-400" />
  },
  {
    id: 'ticketMedioGeral',
    title: 'Ticket Médio Geral',
    description: 'Média de valor por acordo registrado no período.',
    icon: <LayoutDashboard size={18} className="text-indigo-400" />
  },
  {
    id: 'ticketMedioTipo',
    title: 'Ticket Médio por Tipo',
    description: 'Média de valor separada por Quitação, Parcelamento, etc.',
    icon: <LayoutDashboard size={18} className="text-emerald-400" />
  },
  {
    id: 'tempoMedioPagar',
    title: 'Heatmap de Pagamentos',
    description: 'Mapa de calor mostrando a distribuição dos dias com mais acordos pagos.',
    icon: <LayoutDashboard size={18} className="text-emerald-400" />
  },
  {
    id: 'projecao7Dias',
    title: 'Projeção de 7 Dias',
    description: 'Soma dos valores que vencem nos próximos 7 dias.',
    icon: <LayoutDashboard size={18} className="text-purple-400" />
  },
  {
    id: 'eficienciaCiclo',
    title: 'Eficiência por Ciclo',
    description: 'Conversão comparativa entre os turnos da Manhã e Tarde.',
    icon: <LayoutDashboard size={18} className="text-sky-400" />
  }
];

export const DashboardPreferencesModal = ({
  isOpen,
  onClose,
  hiddenCards,
  onToggleCard
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
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative glass-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/20 rounded-xl">
                  <LayoutDashboard size={20} className="text-sky-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Personalizar Visão</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Meu Dashboard Pessoal</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <p className="text-sm text-slate-400 mb-6">
                Escolha quais informações você deseja visualizar na sua tela inicial. Essa configuração afeta apenas o seu perfil.
              </p>

              <div className="space-y-3">
                {CARDS_OPTIONS.map((card) => {
                  const isHidden = localHidden.includes(card.id);
                  const isVisible = !isHidden;

                  return (
                    <div 
                      key={card.id}
                      onClick={() => handleToggle(card.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all group backdrop-blur-sm ${
                        isVisible 
                          ? 'bg-white/10 border-white/20 hover:border-sky-500/50' 
                          : 'bg-white/5 border-white/5 opacity-60 hover:opacity-100 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl transition-colors ${isVisible ? 'bg-white/10' : 'bg-white/5 text-slate-600'}`}>
                          {card.icon}
                        </div>
                        <div>
                          <p className={`text-sm font-bold transition-colors ${isVisible ? 'text-white' : 'text-slate-500'}`}>
                            {card.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isVisible ? 'bg-sky-500' : 'bg-white/10'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-white/5 shrink-0">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-sky-500/20"
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
