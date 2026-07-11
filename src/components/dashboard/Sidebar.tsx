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
  User as UserIcon,
  FileCsv as FileSpreadsheet
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
      label: profile.jobTitle || 'Back Office',
      description: 'Importação e conciliação de planilhas financeiras.',
      icon: FileSpreadsheet,
      show: profile.role === 'backoffice'
    },
    {
      id: 'financial',
      label: 'Painel Financeiro',
      description: 'Faturamento, metas e acordos de hoje.',
      icon: ChartLine,
      show: profile.role !== 'monitor'
    },
    {
      id: 'recovery',
      label: 'Recuperação',
      description: 'Gestão de promessas de pagamento e renegociação.',
      icon: RecoveryIcon,
      show: profile.role !== 'monitor'
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
      show: profile.role !== 'backoffice'
    },
    {
      id: 'people',
      label: 'Gestão de Equipe',
      description: 'Administração de colaboradores e novos convites.',
      icon: TeamIcon,
      show: isSuperUser && profile.role !== 'monitor' && profile.role !== 'backoffice'
    },
    {
      id: 'support',
      label: 'Suporte & Ajuda',
      description: 'Canal direto de suporte técnico do Tracker.',
      icon: SupportIcon,
      show: profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor'
    }
  ];

  return (
    <aside className="relative flex flex-col h-screen w-20 shrink-0 select-none z-40 sidebar-glass border-r text-slate-300">
      {/* Topo / Logo Centralizada com Efeito de Pulso e Vidro */}
      <div className="p-5 flex justify-center border-b border-white/5 shrink-0">
        <div 
          className="p-2.5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-sky-500/5 border border-sky-500/25 shadow-lg shadow-sky-500/10 backdrop-blur-md text-sky-400 group relative"
          title={organizationName || 'Tracker'}
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

      {/* Navegação Principal */}
      <nav className="flex-1 py-6 px-3 flex flex-col items-center gap-4 overflow-y-auto custom-scrollbar">
        {menuItems
          .filter(item => item.show)
          .map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative group w-full flex justify-center py-1 cursor-pointer active:scale-95 transition-all`}
              >
                {/* Ícone Glassmorphism */}
                <div className={`glass-icon-container p-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-sky-500/15 border border-sky-500/30 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
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

      {/* Rodapé — Usuário e Logout */}
      <div className="p-4 border-t border-white/5 flex flex-col items-center gap-4 shrink-0">
        {/* Avatar/Perfil do Usuário com Tooltip */}
        <div className="relative group cursor-pointer flex justify-center w-full">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
            <UserIcon size={18} />
          </div>

          {/* Tooltip do Usuário */}
          <div className="absolute bottom-2 left-full ml-4 opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-50">
            <div className="glass-tooltip px-3.5 py-2 rounded-2xl min-w-[140px] text-left relative flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                {profile.displayName || 'Usuário'}
              </span>
              <span className="text-[8px] text-slate-400 mt-1 block uppercase font-bold tracking-tighter">
                {profile.role === 'super_admin' ? 'Admin Master' : 
                 profile.role === 'manager' ? 'Gerente' : 
                 profile.role === 'coordinator' ? 'Coordenador' :
                 profile.role === 'supervisor' ? 'Supervisor' : 'Operador'}
              </span>
            </div>
          </div>
        </div>

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
