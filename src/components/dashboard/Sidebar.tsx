import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChartLine, 
  ArrowUUpLeft as RecoveryIcon, 
  ShieldCheck as QaIcon, 
  ChartBar as BiIcon, 
  Users as TeamIcon, 
  Lifebuoy as SupportIcon,
  CaretLeft, 
  CaretRight,
  SignOut as LogOut,
  Building,
  User,
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const isSuperUser = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'super_admin' || profile.role === 'monitor';

  const menuItems = [
    {
      id: 'backoffice',
      label: profile.jobTitle || 'Back Office',
      icon: FileSpreadsheet,
      show: profile.role === 'backoffice'
    },
    {
      id: 'financial',
      label: 'Painel Financeiro',
      icon: ChartLine,
      show: profile.role !== 'monitor'
    },
    {
      id: 'recovery',
      label: 'Recuperação',
      icon: RecoveryIcon,
      show: profile.role !== 'monitor'
    },
    {
      id: 'qa',
      label: 'Qualidade (QA)',
      icon: QaIcon,
      show: profile.role !== 'backoffice'
    },
    {
      id: 'bi',
      label: 'BI & Analytics',
      icon: BiIcon,
      show: profile.role !== 'backoffice'
    },
    {
      id: 'people',
      label: 'Gestão de Equipe',
      icon: TeamIcon,
      show: isSuperUser && profile.role !== 'monitor' && profile.role !== 'backoffice'
    },
    {
      id: 'support',
      label: 'Suporte & Ajuda',
      icon: SupportIcon,
      show: profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor'
    }
  ];

  return (
    <aside 
      className={`relative flex flex-col h-screen transition-all duration-300 border-r shrink-0 select-none z-40 bg-slate-950/70 border-white/5 text-slate-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Topo / Header da Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5 shrink-0">
        <div className="p-2 rounded-xl flex items-center justify-center shrink-0 bg-sky-500/10 text-sky-400">
          <Building size={22} weight="duotone" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h1 className="font-black text-sm uppercase tracking-wider leading-none truncate text-white">
              {organizationName || 'Tracker'}
            </h1>
            <span className="text-[9px] font-bold tracking-widest uppercase block mt-0.5 text-slate-400">SaaS Cobrança</span>
          </div>
        )}
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems
          .filter(item => item.show)
          .map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left transition-all relative group cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20'
                    : 'border border-transparent hover:bg-white/5 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={18} weight={isActive ? 'duotone' : 'regular'} className="shrink-0" />
                {!isCollapsed && <span className="text-xs uppercase tracking-wider font-semibold">{item.label}</span>}
                
                {isActive && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-sky-500 rounded-r-md" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
      </nav>

      {/* Rodapé — Usuário e Logout */}
      <div className="p-4 border-t border-white/5 space-y-3 shrink-0">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl shrink-0 bg-white/5 text-slate-400">
              <User size={16} />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-none text-white">
                  {profile.displayName?.split(' ')[0] || 'Usuário'}
                </p>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                  {profile.role === 'super_admin' ? 'Admin Master' : 
                   profile.role === 'manager' ? 'Gerente' : 
                   profile.role === 'coordinator' ? 'Coordenador' :
                   profile.role === 'supervisor' ? 'Supervisor' : 'Operador'}
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={onLogoutClick}
            className="p-2 rounded-xl transition-all cursor-pointer active:scale-95 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Botão de Recolher */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer shadow-md transition-transform active:scale-90 bg-slate-900 border-white/10 text-slate-400 hover:text-white"
      >
        {isCollapsed ? <CaretRight size={12} /> : <CaretLeft size={12} />}
      </button>
    </aside>
  );
};
