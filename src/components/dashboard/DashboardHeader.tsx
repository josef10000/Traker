import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SignOut as LogOut, 
  Plus, 
  User as UserIcon,
  UserPlus,
  CaretDown as ChevronDown,
  Globe,
  FileCsv as FileSpreadsheet,
  FileText,
  Calculator,
  MagnifyingGlass as Search,
  Palette,
  Sparkle,
  ArrowsClockwise,
  Lifebuoy,
  Gear
} from '@phosphor-icons/react';
import { UserProfile, Team } from '../../types';
import { ToastType } from '../ui/Toast';
import { useDesignMode } from '../../hooks/useDesignMode';

interface DashboardHeaderProps {
  profile: UserProfile;
  selectedTeamId: string;
  managedTeamsData: Team[];
  isPresentMode: boolean;
  onSettingsClick: () => void;
  setIsTeamSelectorOpen: (open: boolean) => void;
  setIsConfirmLogoutOpen: (open: boolean) => void;
  setIsWebhookSettingsOpen: (open: boolean) => void;
  setIsImportCsvOpen: (open: boolean) => void;
  setIsReconciliationModalOpen: (open: boolean) => void;
  setIsModalOpen: (open: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  onSearchCpf: (cpf: string) => void;
  /** Dispara nova busca dos dados do mês no Firestore */
  onRefreshData: () => void;
  /** Data/hora da última atualização bem-sucedida dos dados */
  lastRefreshed: Date | null;
  /** Indica se uma busca está em andamento (para o spinner) */
  isRefreshing: boolean;
  /** Nome personalizado da organização exibido no header como logo */
  organizationName: string;
  /** Callback para ativar a aba de suporte */
  onSupportTabClick: () => void;
  theme?: 'light' | 'dark';
}

export const DashboardHeader = ({
  profile,
  selectedTeamId,
  managedTeamsData,
  isPresentMode,
  onSettingsClick,
  setIsTeamSelectorOpen,
  setIsConfirmLogoutOpen,
  setIsWebhookSettingsOpen,
  setIsImportCsvOpen,
  setIsReconciliationModalOpen,
  setIsModalOpen,
  showToast,
  onSearchCpf,
  onRefreshData,
  lastRefreshed,
  isRefreshing,
  organizationName,
  onSupportTabClick,
  theme = 'dark'
}: DashboardHeaderProps) => {
  const [designMode, setDesignMode] = useDesignMode();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Formata o timestamp da última atualização de forma relativa (ex: "há 3 min") */
  const formatLastRefreshed = (date: Date | null): string => {
    if (!date) return 'nunca';
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'agora mesmo';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    return `há ${diffH}h`;
  };

  if (isPresentMode) return null;

  return (
    <header className={`sticky top-0 z-50 px-6 py-4 no-print border-b shadow-sm !overflow-visible ${
      theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'
    }`} style={{ overflow: 'visible' }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div 
            className="cursor-pointer transition-transform hover:scale-105 active:scale-95" 
            onClick={onSettingsClick}
          >
            <img 
              src="/logo.png" 
              alt="Tracker Logo" 
              className="w-14 h-14 drop-shadow-lg object-contain" 
            />
          </div>
          <div className="flex-1">
            <h1 className={`text-xl font-black tracking-tight leading-none italic uppercase ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {organizationName || 'Tracker'}
            </h1>
            
            <div className="flex items-center gap-2 mt-1.5">
              {(profile.role === 'manager' || (profile.managedTeams && profile.managedTeams.length > 1)) ? (
                <button 
                  onClick={() => setIsTeamSelectorOpen(true)}
                  className="flex items-center gap-1.5 text-[10px] text-sky-500 dark:text-sky-400 uppercase tracking-widest font-bold hover:text-sky-600 dark:hover:text-sky-300 transition-colors group"
                >
                  {selectedTeamId === 'all' 
                    ? 'Visão Macro (Todas)' 
                    : managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Selecionar Equipe'}
                  <ChevronDown size={12} className="transition-transform duration-300" />
                </button>
              ) : (
                <p className={`text-[10px] uppercase tracking-widest font-bold ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Dashboard Operacional'}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Busca Global de CPF (LGPD) */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('searchCpf') as HTMLInputElement;
              const cleanCpf = input.value.replace(/\D/g, '');
              if (cleanCpf.length === 11) {
                onSearchCpf(cleanCpf);
                input.value = '';
              } else {
                showToast('Digite um CPF com 11 dígitos.', 'error');
              }
            }}
            className={`relative flex items-center px-3 py-1.5 rounded-xl border focus-within:border-sky-500/50 transition-all shrink-0 max-w-[160px] ${
              theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <input 
              name="searchCpf"
              type="text"
              placeholder="Buscar CPF..."
              maxLength={14}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 3) v = v.substring(0, 3) + '.' + v.substring(3);
                if (v.length > 7) v = v.substring(0, 7) + '.' + v.substring(7);
                if (v.length > 11) v = v.substring(0, 11) + '-' + v.substring(11, 13);
                e.target.value = v;
              }}
              className={`bg-transparent text-xs font-bold outline-none border-none w-full ${
                theme === 'dark' ? 'text-slate-200 placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            <button type="submit" className="text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors p-0.5 cursor-pointer">
              <Search size={14} />
            </button>
          </form>

          {/* Botão de Atualizar Dados */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className={`p-2 rounded-xl transition-all border shrink-0 cursor-pointer ${
              isRefreshing
                ? 'text-sky-500 bg-sky-500/10 border-sky-500/20 cursor-wait'
                : `border-transparent ${theme === 'dark' ? 'text-slate-500 hover:text-sky-400 hover:bg-sky-500/10' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`
            }`}
            title={`Atualizar dados do mês (Atualizado: ${formatLastRefreshed(lastRefreshed)})`}
          >
            <ArrowsClockwise
              size={16}
              weight="duotone"
              className={isRefreshing ? 'animate-spin' : ''}
            />
          </button>

          {/* Dropdown de Ferramentas / Ações */}
          <div className="relative shrink-0" ref={toolsMenuRef}>
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsToolsOpen(!isToolsOpen);
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isToolsOpen
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-500'
                  : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-655 hover:text-slate-900 hover:bg-slate-200'}`
              }`}
              title="Ações e Ferramentas SaaS"
            >
              <Gear size={18} weight="duotone" />
            </button>

            {/* Menu Suspenso */}
            <AnimatePresence>
              {isToolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute right-0 mt-2 w-56 backdrop-blur-2xl border rounded-2xl p-2 shadow-2xl z-50 space-y-1 ${
                    theme === 'dark' ? 'bg-slate-900/90 border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border-b mb-1 ${
                    theme === 'dark' ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'
                  }`}>
                    Ferramentas & Ações
                  </div>

                  {/* Importar CSV */}
                  {(profile.role === 'manager' || profile.role === 'supervisor') && (
                    <button
                      onClick={() => {
                        setIsToolsOpen(false);
                        setIsImportCsvOpen(true);
                      }}
                      disabled={selectedTeamId === 'all'}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                        theme === 'dark' ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      <FileSpreadsheet size={16} className="text-amber-500" />
                      <span>Importar CSV</span>
                    </button>
                  )}

                  {/* Conciliar */}
                  {profile.role !== 'manager' && (
                    <button
                      onClick={() => {
                        setIsToolsOpen(false);
                        setIsReconciliationModalOpen(true);
                      }}
                      disabled={selectedTeamId === 'all'}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                        theme === 'dark' ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-955'
                      }`}
                    >
                      <Calculator size={16} className="text-sky-500" />
                      <span>Conciliar Acordos</span>
                    </button>
                  )}


                  {/* Convidar membro */}
                  {profile.role === 'supervisor' && selectedTeamId !== 'all' && (
                    <button
                      onClick={() => {
                        setIsToolsOpen(false);
                        const currentTeam = managedTeamsData.find(t => t.id === selectedTeamId);
                        if (currentTeam) {
                          navigator.clipboard.writeText(currentTeam.inviteToken);
                          showToast(`Código de convite para ${currentTeam.name} copiado!`, 'success');
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer ${
                        theme === 'dark' ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      <UserPlus size={16} className="text-emerald-500" />
                      <span>Copiar Token Convite</span>
                    </button>
                  )}


                  {/* Relatório PDF */}
                  <button
                    onClick={() => {
                      setIsToolsOpen(false);
                      window.print();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer border-t pt-2 mt-1 ${
                      theme === 'dark' ? 'text-slate-300 hover:bg-white/5 hover:text-white border-white/5' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950 border-slate-100'
                    }`}
                  >
                    <FileText size={16} className="text-purple-500" />
                    <span>Gerar Relatório PDF</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Perfil Menu */}
          <div 
            id="user-profile-menu"
            className={`flex items-center gap-2.5 px-3 py-1.5 border rounded-xl cursor-pointer transition-all group shrink-0 ${
              theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
            onClick={onSettingsClick}
          >
            <div className="flex flex-col items-end">
              <span className={`text-xs font-bold group-hover:text-sky-500 transition-colors leading-none ${
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              }`}>
                {profile.displayName.split(' ')[0]}
              </span>
              <span className={`text-[8px] font-medium uppercase tracking-tighter mt-0.5 leading-none ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {profile.jobTitle || 'Operador'}
              </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20 shrink-0">
              <UserIcon size={14} />
            </div>
          </div>

          {/* Sair */}
          <button 
            onClick={() => setIsConfirmLogoutOpen(true)}
            className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}
            title="Sair do Sistema"
          >
            <LogOut size={18} />
          </button>
          {profile.role !== 'manager' && (
            <button 
              id="new-agreement-btn"
              onClick={() => setIsModalOpen(true)}
              disabled={selectedTeamId === 'all'}
              className={`flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:cursor-not-allowed shrink-0 text-xs cursor-pointer ${
                theme === 'dark' 
                  ? 'shadow-lg shadow-sky-500/20 disabled:bg-slate-800 disabled:text-slate-500' 
                  : 'shadow-md shadow-sky-550/10 disabled:bg-slate-100 disabled:text-slate-400'
              }`}
            >
              <Plus size={16} />
              <span>Novo Acordo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
