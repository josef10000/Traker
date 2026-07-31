import React from 'react';
import { motion } from 'motion/react';
import { 
  ChartLine, 
  ArrowUUpLeft as RecoveryIcon, 
  ShieldCheck as QaIcon, 
  ChartBar as BiIcon, 
  Users as TeamIcon, 
  Lifebuoy as SupportIcon,
  SignOut as LogOut,
  Building,
  FileCsv as FileSpreadsheet,
  Target,
  PhoneCall as TabulationIcon,
  MonitorPlay as ExecutiveIcon,
  Clock
} from '@phosphor-icons/react';
import { UserProfile } from '../../types';

interface SidebarProps {
  profile: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  organizationName: string;
  onLogoutClick: () => void;
}

export const Sidebar = ({
  profile,
  activeTab,
  setActiveTab,
  organizationName,
  onLogoutClick
}: SidebarProps) => {
  const isSuperUser = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'super_admin' || profile.role === 'monitor';

  const categories = [
    {
      id: 'operacao',
      label: 'Operação',
      badge: 'OPERAÇÃO',
      items: [
        {
          id: 'financial',
          label: 'Acordos & Operação',
          description: 'Faturamento, metas de hoje e liquidez da operação.',
          icon: ChartLine,
          show: profile.role !== 'monitor' && profile.role !== 'backoffice'
        },
        {
          id: 'tabulation',
          label: 'Tabulação & Atendimento',
          description: 'Registro rápido de chamadas por voz e WhatsApp.',
          icon: TabulationIcon,
          show: profile.role !== 'backoffice'
        },
        {
          id: 'recovery',
          label: 'Balcão de Recuperação',
          description: 'Fila cega de promessas de pagamento e renegociação.',
          icon: RecoveryIcon,
          show: profile.role !== 'monitor' && profile.role !== 'backoffice'
        },
        {
          id: 'backoffice',
          label: profile.jobTitle || 'Back Office',
          description: 'Importação e conciliação de planilhas financeiras.',
          icon: FileSpreadsheet,
          show: profile.role === 'backoffice'
        }
      ]
    },
    {
      id: 'gestao',
      label: 'Gestão & BI',
      badge: 'GESTÃO & BI',
      items: [
        {
          id: 'bi',
          label: 'BI, Metas & Performance',
          description: 'Inteligência preditiva, Heatmap, Ticket Médio, Metas e Ofensores.',
          icon: BiIcon,
          show: profile.role !== 'backoffice'
        },
        {
          id: 'jornada',
          label: 'Jornada',
          description: 'Acompanhamento passivo de atividade hora a hora, banco de pausas (72 min) e consistência da equipe.',
          icon: Clock,
          show: isSuperUser && profile.role !== 'backoffice'
        },
        {
          id: 'people',
          label: 'Gestão de Pessoas & Operação',
          description: 'Membros da equipe, convites, presença/assiduidade e fechamento PJ.',
          icon: TeamIcon,
          show: isSuperUser && profile.role !== 'backoffice' && profile.role !== 'monitor'
        },
        {
          id: 'qa',
          label: 'Qualidade & Governança',
          description: 'Monitorias de QA, auditoria de CPFs e compliance LGPD.',
          icon: QaIcon,
          show: profile.role !== 'backoffice'
        }
      ]
    },
    {
      id: 'governanca',
      label: 'Suporte',
      badge: 'SUPORTE',
      items: [
        {
          id: 'support',
          label: 'Suporte & Ajuda',
          description: 'Canal direto de suporte técnico do Tracker.',
          icon: SupportIcon,
          show: profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor' || profile.role === 'super_admin'
        }
      ]
    }
  ];

  return (
    <aside 
      className="relative flex flex-col h-screen w-20 shrink-0 select-none z-45 sidebar-glass border-r text-slate-300"
      style={{ overflow: 'visible' }}
    >
      {/* Topo / Logo Centralizada com Efeito de Vidro */}
      <div className="p-4 flex justify-center border-b border-white/5 shrink-0">
        <div 
          className="p-2 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 shadow-lg shadow-primary/10 backdrop-blur-md text-primary group relative"
        >
          <Building size={20} weight="duotone" className="animate-pulse" />
          
          {/* Tooltip da Empresa */}
          <div className="absolute left-full ml-4 opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-50">
            <div className="glass-tooltip px-3 py-2 rounded-xl min-w-[120px] text-left relative">
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                {organizationName || 'Tracker'}
              </span>
              <span className="text-[8px] text-slate-400 mt-1 block uppercase font-bold tracking-tighter">
                SaaS Cobrança
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação Principal por Categorias - Sem overflow para Tooltip flutuante */}
      <nav 
        className="flex-1 py-4 px-2 flex flex-col items-center justify-start gap-1 overflow-y-auto no-scrollbar"
        style={{ overflow: 'visible' }}
      >
        {categories.map((cat, catIdx) => {
          const visibleItems = cat.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <React.Fragment key={cat.id}>
              {/* Separador de Categoria (A partir da 2ª categoria) */}
              {catIdx > 0 && (
                <div className="w-full flex flex-col items-center my-1.5 shrink-0">
                  <div className="w-7 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest mt-1">
                    {cat.badge.slice(0, 3)}
                  </span>
                </div>
              )}

              {/* Itens da Categoria */}
              {visibleItems.map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="relative group w-full flex justify-center py-1 cursor-pointer active:scale-95 transition-all shrink-0"
                    style={{ overflow: 'visible' }}
                  >
                    {/* Pill deslizante — layoutId do Framer Motion */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/30 shadow-[0_0_15px_var(--primary-color)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {/* Ícone Glassmorphism */}
                    <div className={`glass-icon-container p-2 rounded-xl transition-colors duration-200 relative z-10 ${
                      isActive
                        ? 'text-primary'
                        : 'bg-white/5 border border-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white group-hover:border-white/10'
                    }`}>
                      <motion.span
                        animate={{ scale: isActive ? 1.1 : 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <Icon size={17} weight={isActive ? 'duotone' : 'regular'} className="shrink-0" />
                      </motion.span>
                    </div>

                    {/* Tooltip Flutuante Categorizado à Direita */}
                    <div className="absolute left-full ml-4 opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-50">
                      <div className="glass-tooltip px-3.5 py-2.5 rounded-2xl min-w-[180px] max-w-[220px] text-left relative flex flex-col">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[7px] font-black uppercase tracking-wider text-primary px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                            {cat.badge}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                          {item.label}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1 font-medium leading-relaxed">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Rodapé — Apenas Logout */}
      <div className="p-3 border-t border-white/5 flex flex-col items-center shrink-0">
        <button
          onClick={onLogoutClick}
          className="relative group p-2 rounded-xl transition-all cursor-pointer active:scale-95 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex justify-center"
        >
          <LogOut size={17} />
          
          {/* Tooltip Sair */}
          <div className="absolute bottom-2 left-full ml-4 opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-50">
            <div className="glass-tooltip px-3 py-1.5 rounded-xl min-w-[80px] text-center relative">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none">
                Sair
              </span>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
};
