import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, CircleNotch as Loader2, Clock, CheckCircle as CheckCircle2, Eye, EyeClosed as EyeOff } from '@phosphor-icons/react';
import { Agreement, AgreementStatus, AgreementType } from '../../types';
import { OriginBadge } from '../dashboard/OriginBadge';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { logAudit } from '../../lib/audit';
import { CustomConfirm } from '../ui/CustomConfirm';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientCpf: string | null;
  history: Agreement[];
  isLoading: boolean;
  userName?: string;
  isSupervisor?: boolean;
  onAnonimize?: (cpf: string) => void;
  organizationId?: string;
  theme?: string;
}

export const HistoryModal = ({ 
  isOpen, 
  onClose, 
  clientCpf, 
  history, 
  isLoading,
  userName = 'Operador',
  isSupervisor = false,
  onAnonimize,
  organizationId,
  theme = 'dark'
}: HistoryModalProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isRevealed) {
      const timer = setTimeout(() => setIsRevealed(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  const handleReveal = () => {
    if (!isRevealed && clientCpf) {
      logAudit('REVEAL_CPF', { cpf: clientCpf, context: 'HistoryModal' }, userName, organizationId);
    }
    setIsRevealed(!isRevealed);
  };

  const handleClose = () => {
    setIsRevealed(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, x: 20 }}
        animate={{ scale: 1, opacity: 1, x: 0 }}
        exit={{ scale: 0.95, opacity: 0, x: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col border cursor-default transition-all ${
          theme === 'dark' 
            ? 'bg-slate-900 border-white/10 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)]' 
            : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]'
        }`}
      >
        <div className={`px-8 py-5 flex justify-between items-center shrink-0 border-b ${
          theme === 'dark' 
            ? 'border-white/5 bg-white/5 backdrop-blur-xl' 
            : 'border-slate-100 bg-slate-50'
        }`}>
          <div>
            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Histórico do Cliente</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                CPF: {clientCpf ? (isRevealed ? clientCpf : maskCPF(clientCpf)) : ''}
              </span>
              {clientCpf && (
                <button
                  type="button"
                  onClick={handleReveal}
                  className={`transition-colors p-0.5 rounded ${
                    theme === 'dark' ? 'text-slate-500 hover:text-sky-400' : 'text-slate-400 hover:text-primary'
                  }`}
                  title={isRevealed ? "Ocultar CPF" : "Revelar CPF"}
                >
                  {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={handleClose}
            className={`p-2 rounded-full transition-colors ${
              theme === 'dark' 
                ? 'hover:bg-white/10 text-slate-500 hover:text-white' 
                : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="text-xs font-medium text-slate-500">Buscando histórico...</span>
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              {history.map((item) => (
                <div 
                  key={item.id}
                  className={`p-5 rounded-2xl border ${
                    theme === 'dark'
                      ? item.status === AgreementStatus.PAID 
                        ? 'bg-emerald-500/5 border-emerald-500/10' 
                        : item.status === AgreementStatus.BROKEN 
                          ? 'bg-rose-500/5 border-rose-500/10' 
                          : item.status === AgreementStatus.RECOVERED
                            ? 'bg-teal-500/5 border-teal-500/10'
                            : 'bg-slate-800/20 border-slate-800'
                      : item.status === AgreementStatus.PAID 
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 shadow-sm' 
                        : item.status === AgreementStatus.BROKEN 
                          ? 'bg-rose-50/50 border-rose-200 text-rose-950 shadow-sm' 
                          : item.status === AgreementStatus.RECOVERED
                            ? 'bg-teal-50/50 border-teal-200 text-teal-950 shadow-sm'
                            : 'bg-slate-100 border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(item.value)}</span>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {item.status === AgreementStatus.PAID ? (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded">PAGO</span>
                      ) : item.status === AgreementStatus.BROKEN ? (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white px-2 py-0.5 rounded">QUEBRADO</span>
                      ) : item.status === AgreementStatus.RECOVERED ? (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-teal-500 text-white px-2 py-0.5 rounded">RECUPERADO</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-2 py-0.5 rounded">AGUARDANDO</span>
                      )}
                      <OriginBadge origin={item.origin} />
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {item.type === 'quitacao' ? 'Quitação' : 
                           item.type === 'parcelamento' ? 'Parcelamento' :
                           item.type === 'parcela_atrasada' ? 'Parc. Atrasada' :
                           item.type === 'antecipacao' ? 'Antecipação' : item.type}
                        </span>
                        {/* Badge de parcelamento com detalhes */}
                        {item.type === 'parcelamento' && item.installmentCount && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            theme === 'dark'
                              ? 'bg-primary/10 border border-primary/20 text-primary'
                              : 'bg-primary/10 border border-primary/20 text-primary'
                          }`}>
                            {item.hasEntry && item.installmentValue
                              ? `entrada + ${item.installmentCount}x ${formatCurrency(item.installmentValue)}`
                              : `${item.installmentCount}x`}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                  <div className={`flex items-center gap-4 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      Vencimento: {(item.dueDate || '').split('-').reverse().join('/')}
                    </div>
                    {item.paidAt && (
                      <div className="flex items-center gap-1 text-emerald-500 font-bold">
                        <CheckCircle2 size={12} />
                        Pago em: {new Date(item.paidAt).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                  {item.notes && (
                    <div className={`mt-3 p-3 rounded-xl border text-xs ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/5 text-slate-300' 
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">Observação do Atendimento:</p>
                      <p className="italic font-medium">"{item.notes}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 italic">
              Nenhum registro encontrado para este CPF.
            </div>
          )}
        </div>
        <div className={`px-8 py-4 border-t flex justify-between items-center shrink-0 ${
          theme === 'dark' 
            ? 'border-white/5 bg-white/5 backdrop-blur-xl' 
            : 'border-slate-100 bg-slate-50'
        }`}>
           <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total de negociações: {history.length}</p>
           {onAnonimize && isSupervisor && clientCpf && (
             <button
               type="button"
               onClick={() => setIsConfirmOpen(true)}
               className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors px-2 py-1 rounded border ${
                 theme === 'dark'
                   ? 'text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border-rose-500/20'
                   : 'text-rose-600 hover:text-rose-500 hover:bg-rose-50 border-rose-200'
               }`}
               title="Anonimizar dados do cliente (Direito ao Esquecimento — LGPD)"
             >
               Anonimizar Cliente
             </button>
           )}
        </div>
      </motion.div>

      <CustomConfirm 
         isOpen={isConfirmOpen}
         title="Direito ao Esquecimento (LGPD)"
         message="Atenção: Ao anonimizar este cliente, o CPF, Nome e Telefone dele serão permanentemente removidos/alterados para dados genéricos em todos os acordos associados no sistema. Esta ação cumpre o Direito ao Esquecimento da LGPD e NÃO pode ser desfeita. Deseja continuar?"
         type="danger"
         onConfirm={() => {
           if (clientCpf && onAnonimize) {
             onAnonimize(clientCpf);
             handleClose();
           }
         }}
         onClose={() => setIsConfirmOpen(false)}
       />
    </div>
  );
};
