import React from 'react';
import { motion } from 'motion/react';
import { 
  Eye, EyeClosed as EyeOff, ClockCounterClockwise as History, Sun, Moon, Check, Lightning as Zap, 
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
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right no-print">Ações</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-100'}`}>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <span>Carregando acordos...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedAgreements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
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
                const regDate = agreement.createdAt ? new Date(agreement.createdAt) : null;
                const isMorning = regDate ? regDate.getHours() < 12 : true;
                const isCheckedToday = agreement.lastCheckedAt && 
                  new Date(agreement.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
                // Lógica de Prioridade (Qualquer acordo criado antes de hoje que ainda esteja aguardando)
                const isPriorityOntem = regDate && regDate < today && agreement.status === AgreementStatus.WAITING;
                
                const getRowBgClass = () => {
                  if (agreement.status === AgreementStatus.PAID) {
                    return theme === 'dark' ? 'bg-emerald-500/5 border-l-emerald-500/50' : 'bg-emerald-50/50 border-l-emerald-500';
                  }
                  if (isBroken) {
                    return theme === 'dark' ? 'bg-rose-500/5 border-l-rose-500/50' : 'bg-rose-50/50 border-l-rose-500';
                  }
                  if (isCheckedToday) {
                    return theme === 'dark' ? 'bg-sky-500/5 border-l-sky-500/50' : 'bg-sky-50/50 border-l-sky-500';
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

                // Badge de Status Unificado
                const renderStatusBadge = () => {
                  if (agreement.status === AgreementStatus.PAID) {
                    return (
                      <span 
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                          theme === 'dark' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                        title="Status: Pago — Acordo quitado e verificado no sistema"
                      >
                        <CheckCircle2 size={12} weight="bold" />
                        Pago
                      </span>
                    );
                  }
                  if (isOverdue && isCheckedToday) {
                    return (
                      <span 
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                          theme === 'dark' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                        title="Status: Quebrado — O cliente não efetuou o pagamento no prazo estipulado"
                      >
                        <AlertTriangle size={12} weight="bold" />
                        Quebrado
                      </span>
                    );
                  }
                  if (isOverdue && !isCheckedToday) {
                    return (
                      <span 
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                          theme === 'dark' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                        title="Status: Vencido — Data limite expirada aguardando confirmação de pagamento"
                      >
                        <AlertTriangle size={12} weight="bold" />
                        Vencido
                      </span>
                    );
                  }
                  if (isPriorityOntem) {
                    return (
                      <span 
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                          theme === 'dark' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-500 text-white border-amber-400'
                        }`}
                        title="Status: Prioridade — Acordo registrado anteriormente pendente de acompanhamento"
                      >
                        <Zap size={12} weight="bold" />
                        Prioridade
                      </span>
                    );
                  }
                  if (isCheckedToday) {
                    return (
                      <span 
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                          theme === 'dark' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-sky-500 text-white border-sky-400'
                        }`}
                        title="Status: Conferido Hoje — Acordo checado pelo operador no turno de hoje"
                      >
                        <Check size={12} weight="bold" />
                        Conferido
                      </span>
                    );
                  }
                  return (
                    <span 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                        isMorning 
                          ? theme === 'dark' ? 'bg-sky-500/10 text-sky-300 border-sky-500/30' : 'bg-sky-50 text-sky-700 border-sky-300'
                          : theme === 'dark' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                      title={isMorning ? "Status: Ciclo Hoje — Aguardando acompanhamento no turno do dia" : "Status: Ciclo Seguinte — Agendado para acompanhamento no ciclo seguinte"}
                    >
                      {isMorning ? <Sun size={10} /> : <Moon size={10} />}
                      {isMorning ? 'Ciclo Hoje' : 'Ciclo Seg.'}
                    </span>
                  );
                };

                return (
                  <motion.tr 
                    key={agreement.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group transition-colors relative border-l-4 ${getRowBgClass()}`}
                  >
                    {/* Cliente & CPF */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${
                            isBroken ? 'text-slate-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {agreement.clientName}
                          </span>
                          {agreement.notes && (
                            <MessageSquare 
                              size={14} 
                              className="text-sky-400 cursor-help shrink-0" 
                              title={`Observação do cliente: ${agreement.notes}`}
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          {/* Clique no CPF para Copiar */}
                          <button
                            type="button"
                            onClick={() => {
                              const cleanCpf = agreement.clientCpf.replace(/\D/g, '');
                              navigator.clipboard.writeText(cleanCpf);
                              showToast('CPF copiado!', 'success');
                              logAudit('COPY_CPF', {
                                cpf: cleanCpf,
                                clientName: agreement.clientName,
                                agreementId: agreement.id
                              }, userProfile?.name || 'Operador', userProfile?.organizationId);
                              if (onCopyCpf) onCopyCpf(agreement.id, agreement.clientCpf);
                            }}
                            className={`text-xs font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md transition-all cursor-pointer border border-transparent active:scale-95 ${
                              theme === 'dark' 
                                ? 'text-slate-300 hover:text-sky-300 hover:bg-sky-500/10 hover:border-sky-500/30' 
                                : 'text-slate-700 hover:text-sky-600 hover:bg-sky-50 hover:border-sky-200'
                            }`}
                            title="Clique para copiar o CPF limpo (somente números)"
                          >
                            {revealedCpfs[agreement.id] ? agreement.clientCpf : maskCPF(agreement.clientCpf)}
                          </button>

                          {/* Revelar / Ocultar CPF */}
                          <button 
                            onClick={() => toggleRevealCpf(agreement.id, agreement.clientCpf)}
                            className={`p-1 rounded-md transition-all cursor-pointer ${
                              theme === 'dark' 
                                ? 'text-slate-400 hover:text-sky-400 hover:bg-sky-400/10' 
                                : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'
                            }`}
                            title={revealedCpfs[agreement.id] ? "Ocultar CPF completo" : "Revelar CPF completo"}
                          >
                            {revealedCpfs[agreement.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>

                          {/* Ver Histórico */}
                          <button 
                            onClick={() => handleClientClick(agreement.clientCpf)}
                            className={`p-1 rounded-md transition-all cursor-pointer ${
                              theme === 'dark' 
                                ? 'text-slate-400 hover:text-sky-400 hover:bg-sky-400/10' 
                                : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'
                            }`}
                            title="Ver Histórico de Negociações do Cliente"
                          >
                            <History size={13} />
                          </button>
                        </div>

                        {/* Data em que o acordo foi feito */}
                        {regDate && (
                          <span 
                            className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5"
                            title="Data e hora em que este acordo foi registrado pelo operador"
                          >
                            Feito em {regDate.toLocaleDateString('pt-BR')} às {regDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Origem */}
                    <td className="px-6 py-4">
                      <OriginBadge origin={agreement.origin} />
                    </td>

                    {/* Tipo com Alto Contraste */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span 
                          className={`text-xs font-black px-3 py-1 rounded-full border w-fit shadow-xs ${
                            theme === 'dark' 
                              ? 'text-sky-300 bg-sky-500/15 border-sky-500/30' 
                              : 'text-slate-900 bg-slate-100 border-slate-300'
                          }`}
                          title={`Tipo de Negociação: ${
                            agreement.type === 'quitacao' ? 'Quitação' : 
                            agreement.type === 'parcelamento' ? 'Parcelamento' :
                            agreement.type === 'parcela_atrasada' ? 'Parcela Atrasada' : 
                            agreement.type === 'antecipacao' ? 'Antecipação' : agreement.type
                          }`}
                        >
                          {agreement.type === 'quitacao' ? 'Quitação' : 
                           agreement.type === 'parcelamento' ? 'Parcelamento' :
                           agreement.type === 'parcela_atrasada' ? 'Pcl Atrasada' : 
                           agreement.type === 'antecipacao' ? 'Antecipação' : agreement.type}
                        </span>
                        {agreement.currentInstallment && (
                          <span className="text-[10px] text-sky-400 font-black mt-1 ml-1 uppercase tracking-wider">
                            Parcela: {agreement.currentInstallment}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Vencimento com Alto Contraste (idêntico ao Valor) */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span 
                          className={`text-sm font-black tabular-nums ${
                            isOverdue && agreement.status !== AgreementStatus.PAID
                              ? theme === 'dark' ? 'text-rose-400' : 'text-rose-600' 
                              : theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                          title="Data de Vencimento do Acordo"
                        >
                          {(agreement.dueDate || '').split('-').reverse().join('/')}
                        </span>
                      </div>
                    </td>

                    {/* Valor com Alto Contraste (Verde se Pago) */}
                    <td 
                      className={`px-6 py-4 text-sm font-black tabular-nums ${
                        agreement.status === AgreementStatus.PAID
                          ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                          : theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}
                      title={agreement.status === AgreementStatus.PAID ? "Valor Pago e Confirmado no Sistema" : "Valor do Acordo registrado"}
                    >
                      {formatCurrency(agreement.value)}
                    </td>

                    {/* Status Unificado */}
                    <td className="px-6 py-4 text-center">
                      {renderStatusBadge()}
                    </td>

                    {/* Régua de Ações (Opção A - 4 Slots Idênticos e Sempre Visíveis) */}
                    <td className="px-6 py-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1.5">
                        {(() => {
                          const canAct = profile.role === 'member' && agreement.operatorId === profile.uid;
                          if (!canAct) {
                            return (
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {agreement.status === AgreementStatus.PAID ? 'Concluído' : isBroken ? 'Quebrado' : 'Aguardando'}
                              </span>
                            );
                          }

                          return (
                            <>
                              {/* Slot 1: Efetivar Pagamento */}
                              {agreement.status !== AgreementStatus.PAID && (
                                <button 
                                  onClick={() => handleEfetivar(agreement.id)}
                                  className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-xs border border-emerald-500/20 active:scale-95 cursor-pointer"
                                  title="Efetivar Pagamento (Marcar acordo como pago)"
                                >
                                  <Check size={16} weight="bold" />
                                </button>
                              )}
                              
                              {/* Slot 2: Conferir Hoje */}
                              {agreement.status !== AgreementStatus.PAID && (
                                <button 
                                  onClick={() => handleToggleChecked(agreement.id, agreement.lastCheckedAt)}
                                  className={`p-2 rounded-xl transition-all border active:scale-95 cursor-pointer ${
                                    isCheckedToday 
                                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20' 
                                      : theme === 'dark' 
                                        ? 'bg-slate-900 border-white/10 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10' 
                                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-slate-200'
                                  }`}
                                  title={isCheckedToday ? 'Remover marcação de conferido hoje' : 'Conferir Acordo (Marcar como checado no turno de hoje)'}
                                >
                                  <Search size={16} weight="bold" />
                                </button>
                              )}

                              {/* Slot 3: Editar Acordo */}
                              <button 
                                onClick={() => {
                                  setEditingAgreement(agreement);
                                  setIsModalOpen(true);
                                }}
                                className={`p-2 rounded-xl transition-all border active:scale-95 cursor-pointer ${
                                  theme === 'dark' 
                                    ? 'bg-slate-900 border-white/10 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10' 
                                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-slate-200'
                                }`}
                                title="Editar Acordo (Alterar dados, valores ou observações)"
                              >
                                <Edit3 size={16} weight="bold" />
                              </button>

                              {/* Slot 4: Excluir Acordo */}
                              <button 
                                onClick={() => handleDelete(agreement.id)}
                                className={`p-2 rounded-xl transition-all border active:scale-95 cursor-pointer ${
                                  theme === 'dark' 
                                    ? 'bg-slate-900 border-white/10 text-rose-400 hover:bg-rose-500 hover:text-white' 
                                    : 'bg-slate-100 border-slate-200 text-rose-600 hover:bg-rose-500 hover:text-white'
                                }`}
                                title="Excluir Acordo (Remover registro permanentemente)"
                              >
                                <Trash2 size={16} weight="bold" />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div className={`px-6 py-4 border-t flex items-center justify-between no-print ${
          theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Página {currentPage} de {totalPages || 1} — Exibindo {paginatedAgreements.length} registro(s) nesta página
          </span>
          <div className="flex gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className={`p-2 rounded-lg border text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Ir para a página anterior"
            >
              Anterior
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className={`p-2 rounded-lg border text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Ir para a próxima página"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
