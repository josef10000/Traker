import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Phone, Play, Copy, Calendar, Loader2 } from 'lucide-react';
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
  showToast
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
    if (!scheduledAtIso) return { bg: 'bg-slate-900/40 border-white/5', text: 'text-slate-400', badge: 'bg-slate-800 text-slate-400' };

    const now = new Date();
    const scheduledTime = new Date(scheduledAtIso);
    const diffMs = scheduledTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      // Vencido
      return { 
        bg: 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 shadow-lg shadow-rose-500/5', 
        text: 'text-rose-400 animate-pulse', 
        badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
      };
    } else if (diffHours <= 2) {
      // Próximo de vencer (nas próximas 2 horas)
      return { 
        bg: 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 shadow-lg shadow-amber-500/5', 
        text: 'text-amber-400', 
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
      };
    } else {
      // Normal
      return { 
        bg: 'bg-slate-900/30 border-white/5 hover:border-sky-500/30', 
        text: 'text-slate-400', 
        badge: 'bg-white/5 text-slate-400 border border-white/10' 
      };
    }
  };

  return (
    <section className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-900/10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <Calendar className="text-amber-400" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight leading-none">Agenda do Dia</h2>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">Retornos e Compromissos</span>
          </div>
        </div>

        {/* Dropdown de Gestão Hierárquica (Apenas se for Supervisor/Gerente na visão equipe) */}
        {isSuperUser && viewMode === 'team' && (
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Filtrar Agenda:</span>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 outline-none border-none cursor-pointer hover:text-white transition-colors"
            >
              <option value="all" className="bg-slate-900 text-white">Todos os Operadores</option>
              {currentTeamMembers.map(member => (
                <option key={member.uid} value={member.uid} className="bg-slate-900 text-white">
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
        <div className="text-center py-10 text-slate-500 text-xs italic bg-white/5 rounded-2xl border border-dashed border-white/5">
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
                        <span className="text-[9px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 max-w-[100px] truncate" title={operatorName}>
                          {operatorName}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug truncate group-hover:text-sky-400 transition-colors">
                        {agreement.clientName || 'Cliente sem nome'}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">CPF: {agreement.clientCpf.substring(0, 3)}.***.***-**</p>
                    </div>

                    {agreement.notes && (
                      <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-[11px] text-slate-400 italic line-clamp-2" title={agreement.notes}>
                        "{agreement.notes}"
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 items-center justify-between border-t border-white/5 pt-3 mt-auto shrink-0">
                    <div className="flex gap-1">
                      {agreement.phone && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(e, agreement.phone)}
                            className="p-2 bg-white/5 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-xl transition-all border border-white/5"
                            title="Copiar WhatsApp"
                          >
                            <Copy size={12} />
                          </button>
                          <a
                            href={`https://wa.me/${agreement.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-xl transition-all border border-white/5 flex items-center justify-center"
                            title="Chamar no WhatsApp"
                          >
                            <Phone size={12} />
                          </a>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-500/10 flex items-center gap-1 active:scale-95"
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
