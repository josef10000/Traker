import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sliders, 
  ArrowUp, 
  ArrowDown, 
  ArrowsClockwise,
  Trophy,
  Clock,
  WarningOctagon,
  Phone,
  Lightning,
  ChartBar,
  Megaphone,
  CheckCircle
} from '@phosphor-icons/react';
import { DashboardWidgetConfig, WidgetId, UserProfile, UserRole } from '../../types';

export const isWidgetAllowedForRole = (id: WidgetId, role: UserRole): boolean => {
  switch (id) {
    case 'personal_goal':
      // Metas pessoais de arrecadação (apenas operadores e supervisores diretos)
      // Coordenadores e gerência acompanham apenas metas consolidadas nos painéis executivos
      return ['member', 'supervisor'].includes(role);

    case 'hourly_cockpit':
      // Cockpit Hora a Hora e Controle de Pausas da Operação (supervisores, coordenadores e gerência)
      return ['coordinator', 'manager', 'supervisor', 'super_admin'].includes(role);

    case 'risk_carousel':
      // CPFs em risco de vencimento (apenas operadores e supervisores que atendem a carteira)
      return ['member', 'supervisor'].includes(role);

    case 'crm_callbacks':
      // Agenda CRM de retornos telefônicos (operadores, supervisores e backoffice)
      return ['member', 'supervisor', 'backoffice'].includes(role);

    case 'quick_actions':
      // Atalhos rápidos gerais da plataforma (todos os cargos)
      return true;

    case 'mini_bi':
      // Mini BI de Conversão & Arrecadação (supervisores, coordenadores e gerência)
      return ['supervisor', 'coordinator', 'manager', 'super_admin'].includes(role);

    case 'wiki_announcements':
      // Avisos da Wiki Corporativa (todos os cargos)
      return true;

    case 'qa_radar':
      // Radar de Qualidade e Monitoria QA (operadores, monitores e supervisores)
      return ['member', 'monitor', 'supervisor'].includes(role);

    default:
      return true;
  }
};

interface DashboardWidgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveWidgets: (widgets: DashboardWidgetConfig[]) => Promise<void>;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'personal_goal', label: 'Meta Pessoal & Progresso', enabled: true, order: 1 },
  { id: 'hourly_cockpit', label: 'Cockpit Hora a Hora & Pausas', enabled: true, order: 2 },
  { id: 'risk_carousel', label: 'Carrossel de CPFs em Risco', enabled: true, order: 3 },
  { id: 'quick_actions', label: 'Atalhos Rápidos de Operação', enabled: true, order: 4 },
  { id: 'crm_callbacks', label: 'Agenda CRM de Retornos', enabled: true, order: 5 },
  { id: 'mini_bi', label: 'Mini BI de Conversão & Arrecadação', enabled: true, order: 6 },
  { id: 'wiki_announcements', label: 'Avisos da Wiki Corporativa', enabled: true, order: 7 },
  { id: 'qa_radar', label: 'Radar de Qualidade & Monitoria QA', enabled: true, order: 8 },
];

export const getWidgetMeta = (id: WidgetId) => {
  switch (id) {
    case 'personal_goal':
      return {
        icon: Trophy,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        desc: 'Card compacto de progresso da meta financeira ou quantidade de acordos do mês.'
      };
    case 'hourly_cockpit':
      return {
        icon: Clock,
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        desc: 'Monitor diário de faturamento acumulado, tempo em pausas (72 min) e turno.'
      };
    case 'risk_carousel':
      return {
        icon: WarningOctagon,
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        desc: 'Alertas urgentes de CPFs com dívidas prestes a vencer para ação prioritária.'
      };
    case 'crm_callbacks':
      return {
        icon: Phone,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        desc: 'Lista de clientes com horário agendado para retorno telefônico no dia.'
      };
    case 'quick_actions':
      return {
        icon: Lightning,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        desc: 'Botões de 1-clique para registrar acordo, abrir chat, copiar script e importar dados.'
      };
    case 'mini_bi':
      return {
        icon: ChartBar,
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        desc: 'Gráfico sintético de projeção de liquidez e taxa de cumprimento das equipes.'
      };
    case 'wiki_announcements':
      return {
        icon: Megaphone,
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        desc: 'Destaques e avisos urgentes da base de conhecimento corporativa.'
      };
    case 'qa_radar':
      return {
        icon: CheckCircle,
        color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
        desc: 'Resumo das notas de monitoria de qualidade e feedbacks do supervisor.'
      };
  }
};

export const DashboardWidgetManagerModal: React.FC<DashboardWidgetManagerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveWidgets,
  showToast
}) => {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => {
    const existing = profile.dashboardWidgets && profile.dashboardWidgets.length > 0
      ? profile.dashboardWidgets
      : DEFAULT_DASHBOARD_WIDGETS;
    
    // Garantir que todos os widgets padrão existam caso novos tenham sido criados
    const existingIds = new Set(existing.map(w => w.id));
    const missing = DEFAULT_DASHBOARD_WIDGETS.filter(d => !existingIds.has(d.id));
    const merged = [...existing, ...missing];
    return merged
      .filter(w => isWidgetAllowedForRole(w.id, profile.role))
      .sort((a, b) => a.order - b.order);
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggleWidget = (id: WidgetId) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= widgets.length) return;

    const copy = [...widgets];
    const temp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = temp;

    // Atualizar propriedade order
    const reordered = copy.map((w, idx) => ({ ...w, order: idx + 1 }));
    setWidgets(reordered);
  };

  const handleResetToDefault = () => {
    const roleDefault = DEFAULT_DASHBOARD_WIDGETS.filter(w => isWidgetAllowedForRole(w.id, profile.role));
    setWidgets(roleDefault);
    if (showToast) showToast('Widgets restaurados para o padrão do seu cargo!', 'info');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveWidgets(widgets);
      if (showToast) showToast('Configuração de widgets do Dashboard salva com sucesso!', 'success');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar widgets:', err);
      if (showToast) showToast('Falha ao salvar configuração de widgets.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      tabIndex={0}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 outline-none animate-fadeIn"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER DO MODAL */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Sliders size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Personalizar Widgets do Dashboard</h2>
              <p className="text-xs text-slate-400">Ative, desative e reordene os blocos de acordo com sua rotina de trabalho</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL - LISTA DE WIDGETS */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {widgets.map((widget, index) => {
            const meta = getWidgetMeta(widget.id);
            const Icon = meta.icon;

            return (
              <div
                key={widget.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  widget.enabled 
                    ? 'bg-slate-950/60 border-white/10 hover:border-white/20' 
                    : 'bg-slate-950/20 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${meta.color}`}>
                    <Icon size={20} weight="bold" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                      {widget.label}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {meta.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* BOTÕES DE REORDENAÇÃO */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Mover para Cima"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === widgets.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Mover para Baixo"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* TOGGLE SWITCH ATIVO/INATIVO */}
                  <button
                    type="button"
                    onClick={() => handleToggleWidget(widget.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      widget.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    title={widget.enabled ? 'Clique para desativar este widget' : 'Clique para ativar este widget'}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      widget.enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowsClockwise size={14} />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check size={16} weight="bold" />
              <span>{isSaving ? 'Salvando...' : 'Aplicar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
