import React from 'react';
import { motion } from 'motion/react';
import { 
  Copy, Eye, EyeOff, History, Sun, Moon, Check, Zap, 
  AlertTriangle, CheckCircle2, AlertCircle, Clock, Edit3, Trash2, Search, Loader2 
} from 'lucide-react';
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
  showToast
}) => {
  return (
    <section className="glass-card rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-white/40">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Origem</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Vencimento</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Valor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right no-print">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
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
                
                return (
                  <motion.tr 
                    key={agreement.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group transition-colors relative border-l-4 ${
                      agreement.status === AgreementStatus.PAID 
                        ? 'bg-emerald-500/5 border-l-emerald-500/50' 
                        : isBroken
                          ? 'bg-rose-500/5 border-l-rose-500/50' 
                          : isCheckedToday
                            ? 'bg-sky-500/5 border-l-sky-500/50'
                            : isMorning 
                              ? 'hover:bg-sky-500/5 border-l-sky-500/40 bg-slate-900/20' 
                              : 'hover:bg-amber-500/5 border-l-amber-500/30 bg-slate-900/40'
                    }`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col text-left">
                        <span className={`font-semibold text-slate-100 ${isBroken ? 'text-slate-500' : ''}`}>
                          {agreement.clientName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400 font-mono">
                            {revealedCpfs[agreement.id] ? agreement.clientCpf : maskCPF(agreement.clientCpf)}
                          </span>
                          <button
                            onClick={() => {
                              const isRevealed = revealedCpfs[agreement.id];
                              if (isRevealed) {
                                navigator.clipboard.writeText(agreement.clientCpf.replace(/\D/g, ''));
                                showToast('CPF copiado!', 'success');
                              } else {
                                if (window.confirm('Você tem certeza que deseja copiar o CPF completo? Essa ação envolve acesso a dados pessoais sob a LGPD.')) {
                                  navigator.clipboard.writeText(agreement.clientCpf.replace(/\D/g, ''));
                                  logAudit('REVEAL_CPF', { agreementId: agreement.id, cpf: agreement.clientCpf, context: 'CopyToClipboard' }, profile.displayName || '');
                                  showToast('CPF copiado!', 'success');
                                }
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-all"
                            title="Copiar CPF completo"
                          >
                            <Copy size={11} />
                          </button>
                          <button 
                            onClick={() => toggleRevealCpf(agreement.id, agreement.clientCpf)}
                            className="p-1 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-all"
                            title={revealedCpfs[agreement.id] ? "Ocultar CPF" : "Revelar CPF completo"}
                          >
                            {revealedCpfs[agreement.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button 
                            onClick={() => handleClientClick(agreement.clientCpf)}
                            className="p-1 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-all"
                            title="Ver Histórico"
                          >
                            <History size={12} />
                          </button>
                          
                          {agreement.status === AgreementStatus.WAITING && (
                            <div 
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                                isMorning 
                                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}
                              title={isMorning ? 'Registrado no ciclo da manhã (Verificação Hoje)' : 'Registrado no ciclo da tarde (Verificação Amanhã)'}
                            >
                              {isMorning ? <Sun size={8} /> : <Moon size={8} />}
                              {isMorning ? 'Ciclo Hoje' : 'Ciclo Seg.'}
                            </div>
                          )}
                          {isCheckedToday && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-sky-500 text-white border border-sky-400">
                              <Check size={8} strokeWidth={4} />
                              Conferido
                            </div>
                          )}
                          {isPriorityOntem && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-amber-500 text-white border border-amber-400">
                              <Zap size={8} fill="currentColor" />
                              Prioridade Ontem
                            </div>
                          )}
                          {isOverdue && !isCheckedToday && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              <AlertTriangle size={8} />
                              Vencimento Expirado
                            </div>
                          )}
                          {isOverdue && isCheckedToday && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-rose-600 text-white border border-rose-500">
                              <AlertTriangle size={8} />
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
                        <span className="text-xs text-slate-300 font-medium px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 w-fit">
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
                        <span className={`text-sm font-medium ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                          {(agreement.dueDate || '').split('-').reverse().join('/')}
                        </span>
                        {isOverdue && (
                          <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Vencido</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-white tabular-nums">
                      {formatCurrency(agreement.value)}
                    </td>
                    <td className="px-6 py-5 text-right no-print">
                      <div className="flex items-center justify-end gap-2">
                        {agreement.status === AgreementStatus.PAID ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 pr-2">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold uppercase tracking-wide">Pago</span>
                          </div>
                        ) : profile.role === 'manager' ? (
                          isOverdue || agreement.status === AgreementStatus.BROKEN ? (
                            <div className="flex items-center gap-1.5 text-rose-400 pr-2">
                              <AlertCircle size={16} />
                              <span className="text-xs font-bold uppercase tracking-wide">Quebrado</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 pr-2">
                              <Clock size={16} />
                              <span className="text-xs font-bold uppercase tracking-wide">Aguardando</span>
                            </div>
                          )
                        ) : (
                          <>
                            {isOverdue && (
                              <div className="flex items-center gap-1 text-rose-500/40 mr-1 hidden sm:flex">
                                <AlertCircle size={14} />
                              </div>
                            )}
                            <button 
                              onClick={() => handleEfetivar(agreement.id)}
                              className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                              title="Efetivar Pagamento"
                            >
                              <Check size={18} />
                            </button>
                            
                            <button 
                              onClick={() => handleToggleChecked(agreement.id, agreement.lastCheckedAt)}
                              className={`p-2 rounded-lg transition-all border ${
                                isCheckedToday 
                                  ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20' 
                                  : 'bg-slate-800 text-slate-400 hover:text-sky-400 hover:border-sky-500/50'
                              }`}
                              title={isCheckedToday ? 'Remover marcação de conferido' : 'Marcar como conferido hoje'}
                            >
                              <Search size={18} />
                            </button>
                          </>
                        )}
                        {profile.role !== 'manager' && (
                          <div className="flex items-center gap-1 border-l border-slate-800 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingAgreement(agreement);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-slate-500 hover:text-sky-400 hover:bg-primary/10 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(agreement.id)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
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
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/5 no-print">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Anterior
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
