import React from 'react';
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
  Target
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

  const menuItems = [
    {
      id: 'backoffice',
      label: profile.role === 'backoffice' ? (profile.jobTitle || 'Back Office') : 'Back Office',
      description: 'Importação e conciliação de planilhas financeiras.',
      icon: FileSpreadsheet,
      show: profile.role === 'backoffice' || profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'super_admin' || profile.organizationId === 'sandbox-test'
    },
    {
      id: 'carga_acordos',
      label: 'Carga de Acordos',
      description: 'Suba planilhas e registre seus acordos no sistema.',
      icon: FileSpreadsheet,
      show: profile.role === 'supervisor' || profile.role === 'member'
    },
    {
      id: 'coordination',
      label: 'Gestão & Coordenação',
      description: 'Consolidado de metas, escala de presença, equipes, contratações e pagamentos PJ.',
      icon: TeamIcon,
      show: profile.role === 'coordinator' || profile.role === 'manager'
    },
    {
      id: 'financial',
      label: 'Painel Financeiro',
      description: 'Faturamento, metas e acordos de hoje.',
      icon: ChartLine,
      show: profile.role !== 'monitor' && profile.role !== 'backoffice'
    },
    {
      id: 'recovery',
      label: 'Recuperação',
      description: 'Gestão de promessas de pagamento e renegociação.',
      icon: RecoveryIcon,
      show: profile.role !== 'monitor' && profile.role !== 'backoffice'
    },
    {
      id: 'qa',
      label: 'Qualidade (QA)',
      description: 'Monitoria de ligações e avaliações de operadores.',
      icon: QaIcon,
      show: profile.role !== 'backoffice'
    },
    {
      id: 'bi',
      label: 'BI & Analytics',
      description: 'Relatórios estratégicos e gráficos de desempenho.',
      icon: BiIcon,
      show: profile.role !== 'backoffice' && profile.role !== 'monitor'
    },
    {
      id: 'people',
      label: 'Gestão de Equipe',
      description: 'Administração de colaboradores e novos convites.',
      icon: TeamIcon,
      show: isSuperUser && profile.role !== 'monitor' && profile.role !== 'backoffice' && profile.role !== 'coordinator' && profile.role !== 'manager'
    },
    {
      id: 'portfolio',
      label: 'Metas & Carteiras',
      description: 'Consolidado de metas, dispersões, projeções e exportações.',
      icon: Target,
      show: profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor' || profile.role === 'super_admin' || profile.role === 'monitor' || (profile.role as string) === 'qa'
    },
    {
      id: 'support',
      label: 'Suporte & Ajuda',
      description: 'Canal direto de suporte técnico do Tracker.',
      icon: SupportIcon,
      show: profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor'
    },
    {
      id: 'audit',
      label: 'Auditoria & CPF',
      description: 'Trilha histórica de ações de colaboradores sobre CPFs.',
      icon: QaIcon,
      show: profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor' || profile.role === 'super_admin'
    }
  ];

  return (
    <aside 
      className="relative flex flex-col h-screen w-20 shrink-0 select-none z-45 sidebar-glass border-r text-slate-300"
      style={{ overflow: 'visible' }}
    >
      {/* Topo / Logo Centralizada com Efeito de Vidro */}
      <div className="p-5 flex justify-center border-b border-white/5 shrink-0">
        <div 
          className="p-2.5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 shadow-lg shadow-primary/10 backdrop-blur-md text-primary group relative"
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

      {/* Navegação Principal - Sem overflow oculto para permitir o Tooltip flutuante */}
      <nav 
        className="flex-1 py-6 px-3 flex flex-col items-center gap-4"
        style={{ overflow: 'visible' }}
      >
        {menuItems
          .filter(item => item.show)
          .map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative group w-full flex justify-center py-1 cursor-pointer active:scale-95 transition-all"
                style={{ overflow: 'visible' }}
              >
                {/* Ícone Glassmorphism */}
                <div className={`glass-icon-container p-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-primary/15 border border-primary/30 text-primary shadow-[0_0_15px_var(--primary-color)]'
                    : 'bg-white/5 border border-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white group-hover:border-white/10'
                }`}>
                  <Icon size={18} weight={isActive ? 'duotone' : 'regular'} className="shrink-0" />
                </div>

                {/* Tooltip Premium Flutuante à Direita */}
                <div className="absolute left-full ml-4 opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-50">
                  <div className="glass-tooltip px-3.5 py-2.5 rounded-2xl min-w-[180px] max-w-[220px] text-left relative flex flex-col">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                      {item.description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
      </nav>

      {/* Rodapé — Apenas Logout */}
      <div className="p-4 border-t border-white/5 flex flex-col items-center gap-4 shrink-0">
        {/* Botão de Logout */}
        <button
          onClick={onLogoutClick}
          className="relative group p-2.5 rounded-xl transition-all cursor-pointer active:scale-95 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex justify-center"
        >
          <LogOut size={18} />
          
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
