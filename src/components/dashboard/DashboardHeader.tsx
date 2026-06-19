import React from 'react';
import { 
  LogOut, 
  Plus, 
  User as UserIcon,
  UserPlus,
  ChevronDown,
  Globe,
  FileSpreadsheet,
  FileText,
  Calculator,
  Search
} from 'lucide-react';
import { UserProfile, Team } from '../../types';
import { ToastType } from '../ui/Toast';

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
  onSearchCpf
}: DashboardHeaderProps) => {
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
              className="w-[360px] h-[360px] drop-shadow-lg object-contain" 
            />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Tracker</h1>
            {(profile.role === 'manager' || (profile.managedTeams && profile.managedTeams.length > 1)) ? (
              <button 
                onClick={() => setIsTeamSelectorOpen(true)}
                className="flex items-center gap-1.5 text-[10px] text-sky-400 uppercase tracking-widest font-bold mt-1.5 hover:text-sky-300 transition-colors group"
              >
                {selectedTeamId === 'all' 
                  ? 'Visão Macro (Todas)' 
                  : managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Selecionar Equipe'}
                <ChevronDown size={12} className="transition-transform duration-300" />
              </button>
            ) : (
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">
                {managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Dashboard Operacional'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
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
            className="relative flex items-center bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5 focus-within:border-sky-500/50 transition-all shrink-0 max-w-[200px]"
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
            <button type="submit" className="text-slate-500 hover:text-sky-400 transition-colors p-0.5">
              <Search size={14} />
            </button>
          </form>

          <div 
            id="user-profile-menu"
            className="flex items-center gap-3 px-3 py-1.5 glass-card rounded-xl cursor-pointer transition-all group"
            onClick={onSettingsClick}
          >
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                {profile.displayName}
              </span>
              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">
                {profile.jobTitle || 'Operador'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <UserIcon size={16} />
            </div>
          </div>
          {profile.role === 'supervisor' && selectedTeamId !== 'all' && (
            <button 
              onClick={() => {
                const currentTeam = managedTeamsData.find(t => t.id === selectedTeamId);
                if (currentTeam) {
                  navigator.clipboard.writeText(currentTeam.inviteToken);
                  showToast(`Código de convite para ${currentTeam.name} copiado!`, 'success');
                }
              }}
              className="p-2.5 text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-xl transition-all border border-transparent"
              title="Copiar Convite"
            >
              <UserPlus size={20} />
            </button>
          )}
          <button 
            onClick={() => setIsConfirmLogoutOpen(true)}
            className="p-2.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
          {profile.role === 'super_admin' && (
            <button 
              onClick={() => setIsWebhookSettingsOpen(true)}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-white/10 transition-all active:scale-[0.98] group"
              title="Configurações de Webhooks"
            >
              <Globe size={18} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Webhooks</span>
            </button>
          )}

          {(profile.role === 'manager' || profile.role === 'supervisor') && (
            <button 
              onClick={() => setIsImportCsvOpen(true)}
              disabled={selectedTeamId === 'all'}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Importar acordos via CSV"
            >
              <FileSpreadsheet size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Importar CSV</span>
            </button>
          )}

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-white/10 transition-all active:scale-[0.98] group"
            title="Gerar Relatório PDF"
          >
            <FileText size={18} className="text-purple-400 group-hover:translate-y-[-2px] transition-transform" />
            <span className="hidden sm:inline">Relatório PDF</span>
          </button>

          {profile.role !== 'manager' && (
            <button 
              onClick={() => setIsReconciliationModalOpen(true)}
              disabled={selectedTeamId === 'all'}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Conciliar com Sistema Oficial"
            >
              <Calculator size={18} className="text-sky-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Conciliar</span>
            </button>
          )}

          {profile.role !== 'manager' && (
            <button 
              id="new-agreement-btn"
              onClick={() => setIsModalOpen(true)}
              disabled={selectedTeamId === 'all'}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-400 transition-all shadow-lg shadow-primary/10 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Acordo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
