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
  Lifebuoy
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
  onSupportTabClick
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
    <header className="glass-card sticky top-0 z-30 px-6 py-4 no-print">
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
            <h1 className="text-xl font-black tracking-tight text-white leading-none italic uppercase">
              {organizationName || 'Tracker'}
            </h1>
            
            <div className="flex items-center gap-2 mt-1.5">
              {(profile.role === 'manager' || (profile.managedTeams && profile.managedTeams.length > 1)) ? (
                <button 
                  onClick={() => setIsTeamSelectorOpen(true)}
                  className="flex items-center gap-1.5 text-[10px] text-sky-400 uppercase tracking-widest font-bold hover:text-sky-300 transition-colors group"
                >
                  {selectedTeamId === 'all' 
                    ? 'Visão Macro (Todas)' 
                    : managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Selecionar Equipe'}
                  <ChevronDown size={12} className="transition-transform duration-300" />
                </button>
              ) : (
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  {managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Dashboard Operacional'}
                </p>
              )}

              {(profile.role === 'manager' || profile.role === 'supervisor') && (
                <>
                  <span className="text-slate-700 text-xs leading-none">|</span>
                  <button 
                    onClick={onSupportTabClick}
                    className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 uppercase tracking-widest font-bold transition-all group cursor-pointer"
                  >
                    <Lifebuoy size={12} className="text-amber-500 animate-pulse shrink-0" />
                    Suporte & Chamados
                  </button>
                </>
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
            className="relative flex items-center bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5 focus-within:border-sky-500/50 transition-all shrink-0 max-w-[160px]"
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
              className="bg-transparent text-xs font-bold text-slate-200 outline-none border-none placeholder-slate-600 w-full"
            />
            <button type="submit" className="text-slate-500 hover:text-sky-400 transition-colors p-0.5 cursor-pointer">
              <Search size={14} />
            </button>
          </form>

          {/* Botão de Atualizar Dados */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className={`p-2 rounded-xl transition-all border shrink-0 cursor-pointer ${
              isRefreshing
                ? 'text-sky-400 bg-sky-500/10 border-sky-500/20 cursor-wait'
                : 'text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 border-transparent'
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
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isToolsOpen
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Ações e Ferramentas SaaS"
            >
              <Palette size={18} weight="duotone" />
            </button>

            {/* Menu Suspenso */}
            <AnimatePresence>
              {isToolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 space-y-1"
                >
                  <div className="px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <FileSpreadsheet size={16} className="text-amber-400" />
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Calculator size={16} className="text-sky-400" />
                      <span>Conciliar Acordos</span>
                    </button>
                  )}

                  {/* Webhooks */}
                  {profile.role === 'super_admin' && (
                    <button
                      onClick={() => {
                        setIsToolsOpen(false);
                        setIsWebhookSettingsOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                    >
                      <Globe size={16} className="text-emerald-400" />
                      <span>Configurar Webhooks</span>
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                    >
                      <UserPlus size={16} className="text-emerald-400" />
                      <span>Copiar Token Convite</span>
                    </button>
                  )}

                  {/* Alternador de Layout */}
                  <button
                    onClick={() => {
                      setDesignMode(designMode === 'classic' ? 'premium' : 'classic');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  >
                    {designMode === 'premium' ? (
                      <>
                        <Sparkle size={16} className="text-amber-400 animate-pulse" />
                        <span>Usar Modo Clássico</span>
                      </>
                    ) : (
                      <>
                        <Palette size={16} className="text-slate-400" />
                        <span>Usar Modo Premium</span>
                      </>
                    )}
                  </button>

                  {/* Relatório PDF */}
                  <button
                    onClick={() => {
                      setIsToolsOpen(false);
                      window.print();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer border-t border-white/5 pt-2 mt-1"
                  >
                    <FileText size={16} className="text-purple-400" />
                    <span>Gerar Relatório PDF</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Perfil Menu */}
          <div 
            id="user-profile-menu"
            className="flex items-center gap-2.5 px-3 py-1.5 glass-card rounded-xl cursor-pointer transition-all hover:bg-white/5 group shrink-0"
            onClick={onSettingsClick}
          >
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors leading-none">
                {profile.displayName.split(' ')[0]}
              </span>
              <span className="text-[8px] text-slate-500 font-medium uppercase tracking-tighter mt-0.5 leading-none">
                {profile.jobTitle || 'Operador'}
              </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <UserIcon size={14} />
            </div>
          </div>

          {/* Sair */}
          <button 
            onClick={() => setIsConfirmLogoutOpen(true)}
            className="p-2.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all shrink-0 cursor-pointer"
            title="Sair do Sistema"
          >
            <LogOut size={18} />
          </button>

          {/* Novo Acordo */}
          {profile.role !== 'manager' && (
            <button 
              id="new-agreement-btn"
              onClick={() => setIsModalOpen(true)}
              disabled={selectedTeamId === 'all'}
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed shrink-0 text-xs cursor-pointer"
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
