import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Phone, Play, Copy, Calendar, CircleNotch as Loader2 } from '@phosphor-icons/react';
import { Agreement, UserProfile } from '../../types';

interface DailyAgendaSectionProps {
  scheduledAgreements: Agreement[];
  isLoading: boolean;
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  viewMode: 'personal' | 'team';
  onAttend: (agreement: Agreement) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  theme?: 'light' | 'dark';
}

export const DailyAgendaSection = ({
  scheduledAgreements,
  isLoading,
  profile,
  currentTeamMembers,
  selectedMemberId,
  setSelectedMemberId,
  viewMode,
  onAttend,
  showToast,
  theme = 'dark'
}: DailyAgendaSectionProps) => {
  const isSuperUser = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'super_admin';

  // Copiar telefone
  const handleCopyPhone = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone.replace(/\D/g, ''));
    showToast('WhatsApp copiado com sucesso!', 'success');
  };

  // Classificação de Urgência (Vencido, Próximo 2h, Normal)
  const getUrgencyStyles = (scheduledAtIso?: string) => {
    if (!scheduledAtIso) {
      return { 
        bg: theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm', 
        text: theme === 'dark' ? 'text-slate-400' : 'text-slate-600', 
        badge: theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500' 
      };
    }

    const now = new Date();
    const scheduledTime = new Date(scheduledAtIso);
    const diffMs = scheduledTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      // Vencido
      return { 
        bg: theme === 'dark' 
          ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 shadow-lg shadow-rose-500/5' 
          : 'bg-rose-50 border-rose-200 hover:border-rose-300 shadow-md shadow-rose-500/5', 
        text: theme === 'dark' ? 'text-rose-400 animate-pulse' : 'text-rose-600 animate-pulse', 
        badge: theme === 'dark' 
          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
          : 'bg-rose-100 text-rose-700 border border-rose-200' 
      };
    } else if (diffHours <= 2) {
      // Próximo de vencer (nas próximas 2 horas)
      return { 
        bg: theme === 'dark' 
          ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 shadow-lg shadow-amber-500/5' 
          : 'bg-amber-50 border-amber-200 hover:border-amber-300 shadow-md shadow-amber-500/5', 
        text: theme === 'dark' ? 'text-amber-400' : 'text-amber-600', 
        badge: theme === 'dark' 
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
          : 'bg-amber-100 text-amber-700 border border-amber-200' 
      };
    } else {
      // Normal
      return { 
        bg: theme === 'dark' 
          ? 'bg-slate-900/30 border-white/5 hover:border-sky-500/30' 
          : 'bg-white border-slate-200 hover:border-sky-500/30 shadow-sm', 
        text: theme === 'dark' ? 'text-slate-400' : 'text-slate-600', 
        badge: theme === 'dark' 
          ? 'bg-white/5 text-slate-400 border border-white/10' 
          : 'bg-slate-50 text-slate-500 border border-slate-200' 
      };
    }
  };

  return (
    <section className={`glass-card p-6 rounded-[2rem] border space-y-6 ${
      theme === 'dark' ? 'border-white/5 bg-slate-900/10' : 'border-slate-200 bg-white shadow-sm'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <Calendar className="text-amber-500 dark:text-amber-400" size={20} />
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Agenda do Dia</h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 block">Retornos e Compromissos</span>
          </div>
        </div>

        {/* Dropdown de Gestão Hierárquica (Apenas se for Supervisor/Gerente na visão equipe) */}
        {isSuperUser && viewMode === 'team' && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Filtrar Agenda:</span>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className={`bg-transparent text-xs font-bold outline-none border-none cursor-pointer transition-colors ${
                theme === 'dark' ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <option value="all" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Todos os Operadores</option>
              {currentTeamMembers.map(member => (
                <option key={member.uid} value={member.uid} className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                  {member.displayName || member.email.split('@')[0]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
          <Loader2 className="animate-spin text-sky-500" size={20} />
          <span className="text-xs font-medium">Sincronizando agenda...</span>
        </div>
      ) : scheduledAgreements.length === 0 ? (
        <div className={`text-center py-10 text-xs italic rounded-2xl border border-dashed ${
          theme === 'dark' ? 'text-slate-500 border-white/5 bg-white/5' : 'text-slate-400 border-slate-200 bg-slate-50/50'
        }`}>
          Nenhum retorno agendado para o período selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {scheduledAgreements.map((agreement) => {
              const styles = getUrgencyStyles(agreement.scheduledAt);
              const formattedTime = agreement.scheduledAt 
                ? new Date(agreement.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : 'Sem hora';
              const formattedDate = agreement.scheduledAt
                ? new Date(agreement.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : '';

              const operatorName = isSuperUser && viewMode === 'team' && selectedMemberId === 'all'
                ? currentTeamMembers.find(m => m.uid === agreement.operatorId)?.displayName || 'Operador'
                : null;

              return (
                <motion.div
                  key={agreement.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-300 group cursor-pointer ${styles.bg}`}
                  onClick={() => onAttend(agreement)}
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg ${styles.badge} flex items-center gap-1`}>
                        <Clock size={10} />
                        {formattedDate} - {formattedTime}
                      </span>
                      {operatorName && (
                        <span className="text-[9px] font-black text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 max-w-[100px] truncate" title={operatorName}>
                          {operatorName}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold leading-snug truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        {agreement.clientName || 'Cliente sem nome'}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">CPF: {agreement.clientCpf.substring(0, 3)}.***.***-**</p>
                    </div>

                    {agreement.notes && (
                      <div className={`p-2.5 rounded-xl border text-[11px] italic line-clamp-2 ${
                        theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`} title={agreement.notes}>
                        "{agreement.notes}"
                      </div>
                    )}
                  </div>

                  <div className={`flex gap-2 items-center justify-between border-t pt-3 mt-auto shrink-0 ${
                    theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                  }`}>
                    <div className="flex gap-1">
                      {agreement.phone && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(e, agreement.phone)}
                            className={`p-2 rounded-xl transition-all border cursor-pointer ${
                              theme === 'dark' 
                                ? 'bg-white/5 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 border-white/5' 
                                : 'bg-slate-50 hover:bg-sky-500/10 text-slate-500 hover:text-sky-600 border-slate-200'
                            }`}
                            title="Copiar WhatsApp"
                          >
                            <Copy size={12} />
                          </button>
                          <a
                            href={`https://wa.me/${agreement.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer ${
                              theme === 'dark' 
                                ? 'bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 border-white/5' 
                                : 'bg-slate-50 hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-600 border-slate-200'
                            }`}
                            title="Chamar no WhatsApp"
                          >
                            <Phone size={12} />
                          </a>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-500/10 flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Play size={10} fill="currentColor" />
                      Atender
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
