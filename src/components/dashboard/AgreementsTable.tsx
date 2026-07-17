import React from 'react';
import { motion } from 'motion/react';
import { 
  Copy, Eye, EyeClosed as EyeOff, ClockCounterClockwise as History, Sun, Moon, Check, Lightning as Zap, 
  Warning as AlertTriangle, CheckCircle as CheckCircle2, WarningCircle as AlertCircle, Clock, Pencil as Edit3, Trash as Trash2, MagnifyingGlass as Search, CircleNotch as Loader2, ChatText as MessageSquare
} from '@phosphor-icons/react';
import { Agreement, AgreementStatus, UserProfile } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { parseLocalDate } from '../../utils/date';
import { OriginBadge } from './OriginBadge';
import { logAudit } from '../../lib/audit';

interface AgreementsTableProps {
  paginatedAgreements: Agreement[];
  isLoading: boolean;
  revealedCpfs: Record<string, boolean>;
  toggleRevealCpf: (id: string, cpf: string) => void;
  handleClientClick: (cpf: string) => void;
  handleEfetivar: (id: string) => void;
  handleToggleChecked: (id: string, lastCheckedAt?: string) => void;
  setEditingAgreement: (a: Agreement | null) => void;
  setIsModalOpen: (open: boolean) => void;
  handleDelete: (id: string) => void;
  profile: UserProfile;
  currentPage: number;
  totalPages: number;
  nextPage: () => void;
  prevPage: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  theme?: 'light' | 'dark';
  onCopyCpf?: (id: string, cpf: string) => void;
}

export const AgreementsTable: React.FC<AgreementsTableProps> = ({
  paginatedAgreements,
  isLoading,
  revealedCpfs,
  toggleRevealCpf,
  handleClientClick,
  handleEfetivar,
  handleToggleChecked,
  setEditingAgreement,
  setIsModalOpen,
  handleDelete,
  profile,
  currentPage,
  totalPages,
  nextPage,
  prevPage,
  showToast,
  theme = 'dark',
  onCopyCpf
}) => {
  return (
    <section className={`rounded-2xl overflow-hidden border ${
      theme === 'dark' ? 'bg-slate-900/10 border-white/5 shadow-none' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b ${
              theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500 font-bold'
            }`}>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Origem</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Vencimento</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Valor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right no-print">Ação</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-100'}`}>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <span>Carregando acordos...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedAgreements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                  Nenhum acordo encontrado.
                </td>
              </tr>
            ) : (
              paginatedAgreements.map((agreement) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = agreement.status === AgreementStatus.WAITING && parseLocalDate(agreement.dueDate) < today;
                const isBroken = agreement.status === AgreementStatus.BROKEN || isOverdue;
                // Lógica de Ciclo (Manhã até 12:00, Tarde após 12:00)
                const regDate = new Date(agreement.createdAt);
                const isMorning = regDate.getHours() < 12;
                const isCheckedToday = agreement.lastCheckedAt && 
                  new Date(agreement.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
                // Lógica de Prioridade (Qualquer acordo criado antes de hoje que ainda esteja aguardando)
                const isPriorityOntem = regDate < today && agreement.status === AgreementStatus.WAITING;
                
                const getRowBgClass = () => {
                  if (agreement.status === AgreementStatus.PAID) {
                    return theme === 'dark' ? 'bg-emerald-500/5 border-l-emerald-500/50' : 'bg-emerald-50/50 border-l-emerald-500';
                  }
                  if (isBroken) {
                    return theme === 'dark' ? 'bg-rose-500/5 border-l-rose-500/50' : 'bg-rose-50/50 border-l-rose-500';
                  }
                  if (isCheckedToday) {
                    return theme === 'dark' ? 'bg-primary/5 border-l-primary/50' : 'bg-primary/5 border-l-primary';
                  }
                  if (isMorning) {
                    return theme === 'dark' 
                      ? 'hover:bg-primary/5 border-l-primary/40 bg-slate-900/20' 
                      : 'hover:bg-slate-50 border-l-primary/40 bg-slate-50/30';
                  }
                  return theme === 'dark' 
                    ? 'hover:bg-amber-500/5 border-l-amber-500/30 bg-slate-900/40' 
                    : 'hover:bg-slate-50 border-l-amber-500/30 bg-slate-50/60';
                };

                return (
                  <motion.tr 
                    key={agreement.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group transition-colors relative border-l-4 ${getRowBgClass()}`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col text-left">
                        <span className={`font-semibold flex items-center gap-1.5 ${
                          isBroken ? 'text-slate-500' : theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          {agreement.clientName}
                          {agreement.notes && (
                            <MessageSquare 
                              size={12} 
                              className="text-primary cursor-help shrink-0" 
                              title={agreement.notes}
                            />
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {revealedCpfs[agreement.id] ? agreement.clientCpf : maskCPF(agreement.clientCpf)}
                          </span>
                          <button
                            onClick={() => {
                              const isRevealed = revealedCpfs[agreement.id];
                              if (isRevealed) {
                                navigator.clipboard.writeText(agreement.clientCpf.replace(/\D/g, ''));
                                showToast('CPF copiado!', 'success');
                              } else {
                                if (onCopyCpf) {
                                  onCopyCpf(agreement.id, agreement.clientCpf);
                                }
                              }
                            }}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              theme === 'dark' 
                                ? 'text-slate-500 hover:text-sky-400 hover:bg-sky-400/10' 
                                : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50'
                            }`}
                            title="Copiar CPF completo"
                          >
                            <Copy size={11} />
                          </button>
                          <button 
                            onClick={() => toggleRevealCpf(agreement.id, agreement.clientCpf)}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              theme === 'dark' 
                                ? 'text-slate-500 hover:text-sky-400 hover:bg-sky-400/10' 
                                : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50'
                            }`}
                            title={revealedCpfs[agreement.id] ? "Ocultar CPF" : "Revelar CPF completo"}
                          >
                            {revealedCpfs[agreement.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button 
                            onClick={() => handleClientClick(agreement.clientCpf)}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              theme === 'dark' 
                                ? 'text-slate-500 hover:text-sky-400 hover:bg-sky-400/10' 
                                : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50'
                            }`}
                            title="Ver Histórico"
                          >
                            <History size={12} />
                          </button>
                          
                          {agreement.status === AgreementStatus.WAITING && (
                            <div 
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all ${
                                isMorning 
                                  ? theme === 'dark' ? 'bg-sky-500/5 text-sky-400 border-sky-500/20 shadow-sm' : 'bg-sky-50 text-sky-600 border-sky-200'
                                  : theme === 'dark' ? 'bg-amber-500/5 text-amber-400 border-amber-500/20 shadow-sm' : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}
                              title={isMorning ? 'Registrado no ciclo da manhã (Verificação Hoje)' : 'Registrado no ciclo da tarde (Verificação Amanhã)'}
                            >
                              {isMorning ? <Sun size={9} /> : <Moon size={9} />}
                              {isMorning ? 'Ciclo Hoje' : 'Ciclo Seg.'}
                            </div>
                          )}
                          {isCheckedToday && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                              theme === 'dark' ? 'bg-sky-500/10 text-sky-300 border-sky-500/25' : 'bg-sky-500 text-white border-sky-400'
                            }`}>
                              <Check size={9} strokeWidth={4} />
                              Conferido
                            </div>
                          )}
                          {isPriorityOntem && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                              theme === 'dark' ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' : 'bg-amber-500 text-white border-amber-400'
                            }`}>
                              <Zap size={9} fill="currentColor" />
                              Prioridade Ontem
                            </div>
                          )}
                          {isOverdue && !isCheckedToday && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                              theme === 'dark' ? 'bg-rose-500/5 text-rose-450 border-rose-500/20' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            }`}>
                              <AlertTriangle size={9} />
                              Vencimento Expirado
                            </div>
                          )}
                          {isOverdue && isCheckedToday && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                              theme === 'dark' ? 'bg-rose-500/15 text-rose-350 border-rose-500/25' : 'bg-rose-600 text-white border-rose-500'
                            }`}>
                              <AlertTriangle size={9} />
                              Confirmado: Quebrado
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <OriginBadge origin={agreement.origin} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border w-fit ${
                          theme === 'dark' ? 'text-slate-300 bg-slate-900 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-200'
                        }`}>
                          {agreement.type === 'quitacao' ? 'Quitação' : 
                           agreement.type === 'parcelamento' ? 'Parcelamento' :
                           agreement.type === 'parcela_atrasada' ? 'Pcl Atrasada' : 
                           agreement.type === 'antecipacao' ? 'Antecipação' : agreement.type}
                        </span>
                        {agreement.currentInstallment && (
                          <span className="text-[10px] text-sky-400 font-bold mt-1 ml-1 uppercase tracking-tighter">
                            Parcela: {agreement.currentInstallment}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${
                          isOverdue 
                            ? theme === 'dark' ? 'text-rose-400' : 'text-rose-600' 
                            : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {(agreement.dueDate || '').split('-').reverse().join('/')}
                        </span>
                        {isOverdue && (
                          <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Vencido</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-5 text-sm font-bold tabular-nums ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {formatCurrency(agreement.value)}
                    </td>
                    <td className="px-6 py-5 text-right no-print">
                      <div className="flex items-center justify-end gap-2">
                       {agreement.status === AgreementStatus.PAID ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 pr-2">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold uppercase tracking-wide">Pago</span>
                          </div>
                        ) : (() => {
                          // Apenas o operador dono do acordo pode agir sobre ele
                          const canAct = profile.role === 'member' && agreement.operatorId === profile.uid;
                          const isOverdueOrBroken = isOverdue || agreement.status === AgreementStatus.BROKEN;
                          if (!canAct) {
                            // Supervisor e outros cargos: somente status visual
                            return isOverdueOrBroken ? (
                              <div className="flex items-center gap-1.5 text-rose-400 pr-2">
                                <AlertCircle size={16} />
                                <span className="text-xs font-bold uppercase tracking-wide">Quebrado</span>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-1.5 pr-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                <Clock size={16} />
                                <span className="text-xs font-bold uppercase tracking-wide">Aguardando</span>
                              </div>
                            );
                          }
                          // Operador dono: botões de ação completos
                          return (
                            <>
                              {isOverdue && (
                                <div className="flex items-center gap-1 text-rose-500/40 mr-1 hidden sm:flex">
                                  <AlertCircle size={14} />
                                </div>
                              )}
                              <button 
                                onClick={() => handleEfetivar(agreement.id)}
                                className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg hover:bg-emerald-500 hover:text-white transition-all active:scale-[0.95] border border-emerald-500/20 cursor-pointer"
                                title="Efetivar Pagamento"
                              >
                                <Check size={18} />
                              </button>
                              
                              <button 
                                onClick={() => handleToggleChecked(agreement.id, agreement.lastCheckedAt)}
                                className={`p-2 rounded-lg transition-all active:scale-[0.95] border cursor-pointer ${
                                  isCheckedToday 
                                    ? theme === 'dark' 
                                      ? 'bg-sky-500/20 text-sky-450 border-sky-500/40 shadow-sm' 
                                      : 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-550/20' 
                                    : theme === 'dark' 
                                      ? 'bg-slate-800 border-transparent text-slate-400 hover:text-sky-400 hover:border-sky-500/50' 
                                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-sky-500 hover:bg-slate-200'
                                }`}
                                title={isCheckedToday ? 'Remover marcação de conferido' : 'Marcar como conferido hoje'}
                              >
                                <Search size={18} />
                              </button>
                            </>
                          );
                        })()
                        }
                        {/* Botões editar e excluir: somente para o operador dono do acordo */}
                        {profile.role === 'member' && agreement.operatorId === profile.uid && (
                          <div className={`flex items-center gap-1 border-l pl-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
                          }`}>
                            <button 
                              onClick={() => {
                                setEditingAgreement(agreement);
                                setIsModalOpen(true);
                              }}
                              className={`p-2 rounded-lg transition-all active:scale-[0.95] cursor-pointer ${
                                theme === 'dark' ? 'text-slate-500 hover:text-sky-400 hover:bg-white/5' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50'
                              }`}
                              title="Editar"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(agreement.id)}
                              className={`p-2 rounded-lg transition-all active:scale-[0.95] cursor-pointer ${
                                theme === 'dark' ? 'text-slate-500 hover:text-rose-400 hover:bg-white/5' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                              }`}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={`px-6 py-4 border-t flex items-center justify-between no-print ${
          theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
          }`}>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-slate-450 hover:text-white hover:bg-white/10' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Anterior
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-slate-450 hover:text-white hover:bg-white/10' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
