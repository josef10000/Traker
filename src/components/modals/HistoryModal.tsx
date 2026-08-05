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
        role="button"
        tabIndex={0}
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            handleClose();
          }
        }}
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
                  {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className={`p-2 rounded-full transition-colors ${
              theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 size={32} className="animate-spin text-sky-400 mb-3" />
              <p className="text-xs font-semibold">Buscando histórico completo...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">Nenhum registro encontrado para este CPF.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {history.map((item) => {
                const itemAny = item as any;
                return (
                  <div key={item.id} className="relative group">
                    <div className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 group-hover:border-sky-400' : 'bg-white border-slate-300 group-hover:border-primary'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        item.status === AgreementStatus.PAID ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                    </div>

                    <div className={`p-5 rounded-2xl border transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-900/60 border-white/5 hover:border-white/10' 
                        : 'bg-slate-50/80 border-slate-200/60 hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {item.type === AgreementType.QUITACAO ? 'Quitação' : 'Acordo'}
                            </span>
                            {item.origin && <OriginBadge origin={item.origin} />}
                          </div>
                          <span className={`text-[10px] font-mono block mt-0.5 ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'Data n/a'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.status === AgreementStatus.PAID 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.status === AgreementStatus.PAID ? 'Pago' : 'Pendente'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs">
                        <div>
                          <span className={`text-[10px] block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Valor Negociado</span>
                          <span className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                            {formatCurrency(item.value || 0)}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[10px] block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Operador</span>
                          <span className={`font-medium truncate block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            {itemAny.operatorName || 'Desconhecido'}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[10px] block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Canal</span>
                          <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            {itemAny.channel || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[10px] block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Parcelas</span>
                          <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            {itemAny.installments ? `${itemAny.installments}x` : 'À vista'}
                          </span>
                        </div>
                      </div>

                      {item.notes && (
                        <div className={`mt-3 p-3 rounded-xl text-xs border ${
                          theme === 'dark' 
                            ? 'bg-slate-950/40 border-white/5 text-slate-400' 
                            : 'bg-white border-slate-200/60 text-slate-600'
                        }`}>
                          <span className="font-bold block text-[10px] uppercase text-slate-500 mb-0.5">Observações:</span>
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com botão de anonimização (LGPD) */}
        {isSupervisor && onAnonimize && clientCpf && (
          <div className={`px-8 py-4 border-t flex justify-between items-center ${
            theme === 'dark' ? 'border-white/5 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}>
            <span className="text-[10px] text-slate-500">Conformidade LGPD: Anonimização de dados do titular.</span>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all"
            >
              Anonimizar Cliente
            </button>
          </div>
        )}
      </motion.div>

      <CustomConfirm
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          if (clientCpf && onAnonimize) {
            onAnonimize(clientCpf);
            handleClose();
          }
        }}
        title="Anonimizar Dados do Cliente?"
        message={`Esta ação irá rasurar permanentemente o CPF (${clientCpf ? maskCPF(clientCpf) : ''}) e dados pessoais vinculados a este histórico em conformidade com a LGPD. Esta ação não poderá ser desfeita.`}
        confirmText="Sim, Anonimizar"
        type="danger"
      />
    </div>
  );
};
