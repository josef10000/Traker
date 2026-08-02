import React from 'react';
import { X, CheckCircle, Clock, Warning, FileText, Calendar, CreditCard, Tag } from '@phosphor-icons/react';
import { Agreement, AgreementStatus } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';

interface AgreementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: Agreement | null;
  theme?: 'light' | 'dark';
}

export const AgreementDetailsModal: React.FC<AgreementDetailsModalProps> = ({
  isOpen,
  onClose,
  agreement,
  theme = 'dark'
}) => {
  if (!isOpen || !agreement) return null;

  const isDark = theme === 'dark';

  // Gerar parcelas simuladas/reais para a tabela de parcelas
  const installmentCount = agreement.installmentCount || 1;
  const installmentValue = agreement.installmentValue || (agreement.value / installmentCount);

  const installments = Array.from({ length: installmentCount }, (_, i) => {
    const num = i + 1;
    const baseDate = new Date(agreement.dueDate || agreement.createdAt);
    baseDate.setMonth(baseDate.getMonth() + i);

    let status: 'paid' | 'pending' | 'overdue' = 'pending';
    if (agreement.status === AgreementStatus.PAID || agreement.status === AgreementStatus.RECOVERED) {
      status = 'paid';
    } else if (agreement.status === AgreementStatus.BROKEN) {
      status = num === 1 ? 'overdue' : 'pending';
    } else if (new Date() > baseDate && agreement.status === AgreementStatus.WAITING) {
      status = 'overdue';
    }

    return {
      number: num,
      dueDate: baseDate.toLocaleDateString('pt-BR'),
      value: installmentValue,
      status
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl transition-all ${
          isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Detalhes do Acordo #AC-{agreement.id.slice(-4).toUpperCase()}</h3>
              <span className="text-xs text-slate-400 font-medium">Registrado em {new Date(agreement.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cliente</span>
            <span className="text-sm font-bold truncate block text-sky-400 mt-0.5">{agreement.clientName || 'Cliente'}</span>
            <span className="text-[11px] font-mono text-slate-400 block">{maskCPF(agreement.clientCpf)}</span>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Consolidado</span>
            <span className="text-base font-black text-emerald-400 block mt-0.5">{formatCurrency(agreement.value)}</span>
            <span className="text-[11px] font-medium text-slate-400 block uppercase">{agreement.type ? agreement.type.replace('_', ' ') : 'Acordo'}</span>
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div className={`p-3.5 rounded-2xl border mb-5 flex items-center justify-between ${
          isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <CreditCard size={16} className="text-sky-400" />
            <span>Forma de Pagamento:</span>
          </div>
          <span className="text-xs font-black uppercase text-amber-400">
            {installmentCount > 1 ? `${installmentCount}x Boleto / Pix` : 'À Vista (Boleto / Pix)'}
          </span>
        </div>

        {/* Informação de Desconto */}
        <div className={`p-3.5 rounded-2xl border mb-5 flex items-center justify-between ${
          isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <Tag size={16} className="text-pink-400" />
            <span>Política de Desconto:</span>
          </div>
          {agreement.discountApplied === true ? (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5 font-mono">
              🏷️ Com Desconto ({agreement.discountReason === 'installment_discount' ? 'Parcelamento' : agreement.discountReason === 'overdue_discount' ? 'Atrasadas' : agreement.discountReason === 'payoff_discount' ? 'Quitação' : 'Parcela'})
            </span>
          ) : agreement.discountApplied === false ? (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1.5 font-mono">
              Sem Desconto (Integral)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-900/60 text-slate-500 border border-white/5 font-mono">
              Não Informado (Legado)
            </span>
          )}
        </div>

        {/* Tabela de Parcelas */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar size={14} />
            Cronograma de Parcelas
          </span>

          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/5 bg-slate-950/30' : 'border-slate-200 bg-white'}`}>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase text-slate-400 ${isDark ? 'border-white/5 bg-slate-950/60' : 'border-slate-200 bg-slate-100'}`}>
                  <th className="px-4 py-2.5">Parcela</th>
                  <th className="px-4 py-2.5">Vencimento</th>
                  <th className="px-4 py-2.5">Valor</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {installments.map(ins => (
                  <tr key={ins.number} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 font-bold">#{ins.number} de {installmentCount}</td>
                    <td className="px-4 py-2.5 text-slate-400">{ins.dueDate}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-200">{formatCurrency(ins.value)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {ins.status === 'paid' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                          <CheckCircle size={10} /> Pago
                        </span>
                      )}
                      {ins.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex items-center gap-1">
                          <Clock size={10} /> Pendente
                        </span>
                      )}
                      {ins.status === 'overdue' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                          <Warning size={10} /> Atrasado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
