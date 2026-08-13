import React from 'react';
import { 
  X, 
  Printer, 
  TrendUp, 
  Trophy, 
  CheckCircle, 
  WarningCircle, 
  Buildings,
  CalendarBlank,
  FileText,
  Percent,
  CurrencyDollar
} from '@phosphor-icons/react';
import { UserProfile, Agreement, Team, AgreementStatus } from '../../types';
import { formatCurrency } from '../../utils/masks';
import { MONTHS } from '../../utils/date';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  agreements: Agreement[];
  collaborators: UserProfile[];
  selectedMonth: number;
  selectedYear: number;
  organizationName?: string;
  monthlyGoal?: number;
  theme?: 'dark' | 'light';
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  agreements = [],
  collaborators = [],
  selectedMonth,
  selectedYear,
  organizationName = 'Plataforma Tracker',
  monthlyGoal = 0,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  // Cálculos consolidados do relatório
  const totalCount = agreements.length;
  const totalValue = agreements.reduce((acc, a) => acc + (a.value || 0), 0);

  const paidAgreements = agreements.filter(a => a.status === AgreementStatus.PAID);
  const paidCount = paidAgreements.length;
  const paidValue = paidAgreements.reduce((acc, a) => acc + (a.value || 0), 0);

  const brokenAgreements = agreements.filter(a => a.status === AgreementStatus.BROKEN);
  const brokenCount = brokenAgreements.length;
  const brokenValue = brokenAgreements.reduce((acc, a) => acc + (a.value || 0), 0);

  const pendingAgreements = agreements.filter(a => a.status === AgreementStatus.PENDING);
  const pendingCount = pendingAgreements.length;
  const pendingValue = pendingAgreements.reduce((acc, a) => acc + (a.value || 0), 0);

  const conversionRate = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const goalAchievement = monthlyGoal > 0 ? (paidValue / monthlyGoal) * 100 : 0;
  const avgTicket = paidCount > 0 ? paidValue / paidCount : (totalCount > 0 ? totalValue / totalCount : 0);

  // Ranking por operador
  const operatorMap: Record<string, { name: string; count: number; value: number; paidValue: number; paidCount: number }> = {};
  
  agreements.forEach(ag => {
    const opId = ag.operatorId || 'outros';
    const opName = ag.operatorName || collaborators.find(c => c.uid === opId)?.displayName || 'Operador';
    if (!operatorMap[opId]) {
      operatorMap[opId] = { name: opName, count: 0, value: 0, paidValue: 0, paidCount: 0 };
    }
    operatorMap[opId].count += 1;
    operatorMap[opId].value += ag.value || 0;
    if (ag.status === AgreementStatus.PAID) {
      operatorMap[opId].paidCount += 1;
      operatorMap[opId].paidValue += ag.value || 0;
    }
  });

  const rankedOperators = Object.values(operatorMap).sort((a, b) => b.paidValue - a.paidValue);

  const handlePrint = () => {
    window.print();
  };

  const monthLabel = MONTHS[selectedMonth - 1] || 'Mês Atual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden print:max-h-none print:m-0 print:border-none print:shadow-none print:bg-white print:text-slate-900">
        
        {/* Cabeçalho do Modal (Oculto na impressão) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileText size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">Relatório Executivo Mensal</h2>
              <p className="text-xs text-slate-400">{monthLabel} de {selectedYear} • {organizationName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer size={16} weight="bold" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível do Relatório A4 */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-100 print:overflow-visible print:p-0 print:text-slate-900 print:space-y-4">
          
          {/* Topo Institucional do Relatório */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 print:border-slate-300">
            <div>
              <div className="flex items-center gap-2">
                <Buildings size={24} className="text-sky-400 print:text-sky-600" weight="bold" />
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{organizationName}</h1>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Demonstrativo Consolidado de Recuperação de Crédito e Desempenho Operacional
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-400 print:text-slate-600 space-y-1">
              <div className="flex items-center sm:justify-end gap-1.5 font-bold">
                <CalendarBlank size={14} className="text-sky-400 print:text-sky-600" />
                <span>Competência: {monthLabel} / {selectedYear}</span>
              </div>
              <p>Emitido por: <strong className="text-slate-200 print:text-slate-900">{profile.displayName || 'Gestor'}</strong></p>
              <p className="text-[10px] text-slate-500">Data de emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* Grid de KPIs Consolidados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 print:bg-slate-50 print:border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 print:text-slate-600 block">Total Negociado</span>
              <span className="text-base sm:text-lg font-black text-white print:text-slate-900 font-mono block mt-1">
                {formatCurrency(totalValue)}
              </span>
              <span className="text-[10px] text-slate-400">{totalCount} acordos gerados</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 print:bg-emerald-50 print:border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-400 print:text-emerald-700 block">Total Arrecadado</span>
              <span className="text-base sm:text-lg font-black text-emerald-300 print:text-emerald-800 font-mono block mt-1">
                {formatCurrency(paidValue)}
              </span>
              <span className="text-[10px] text-emerald-400 print:text-emerald-700">{paidCount} acordos quitados</span>
            </div>

            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 print:bg-sky-50 print:border-sky-200">
              <span className="text-[11px] font-bold text-sky-400 print:text-sky-700 block">Conversão</span>
              <span className="text-base sm:text-lg font-black text-sky-300 print:text-sky-800 font-mono block mt-1">
                {conversionRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-sky-400 print:text-sky-700">Taxa de liquidação</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 print:bg-purple-50 print:border-purple-200">
              <span className="text-[11px] font-bold text-purple-400 print:text-purple-700 block">Ticket Médio</span>
              <span className="text-base sm:text-lg font-black text-purple-300 print:text-purple-800 font-mono block mt-1">
                {formatCurrency(avgTicket)}
              </span>
              <span className="text-[10px] text-purple-400 print:text-purple-700">Por acordo quitado</span>
            </div>
          </div>

          {/* Distribuição de Status */}
          <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 print:bg-white print:border-slate-200 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 print:text-slate-800 flex items-center gap-2">
              <TrendUp size={16} className="text-sky-400" />
              <span>Distribuição da Carteira por Status</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 print:bg-slate-50 print:border-slate-200">
                <div>
                  <span className="text-xs font-bold text-emerald-400">Acordos Pagos</span>
                  <p className="text-sm font-black font-mono text-white print:text-slate-900">{formatCurrency(paidValue)}</p>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-400">{paidCount} ({totalCount > 0 ? ((paidCount / totalCount) * 100).toFixed(0) : 0}%)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 print:bg-slate-50 print:border-slate-200">
                <div>
                  <span className="text-xs font-bold text-amber-400">Pendentes / Em Aberto</span>
                  <p className="text-sm font-black font-mono text-white print:text-slate-900">{formatCurrency(pendingValue)}</p>
                </div>
                <span className="text-xs font-bold font-mono text-amber-400">{pendingCount} ({totalCount > 0 ? ((pendingCount / totalCount) * 100).toFixed(0) : 0}%)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 print:bg-slate-50 print:border-slate-200">
                <div>
                  <span className="text-xs font-bold text-rose-400">Quebras / Inadimplência</span>
                  <p className="text-sm font-black font-mono text-white print:text-slate-900">{formatCurrency(brokenValue)}</p>
                </div>
                <span className="text-xs font-bold font-mono text-rose-400">{brokenCount} ({totalCount > 0 ? ((brokenCount / totalCount) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          </div>

          {/* Ranking de Operadores */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 print:text-slate-800 flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <span>Ranking Operacional de Recuperação</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-white/5 print:border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 print:bg-slate-100 text-slate-400 print:text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-white/10 print:border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Posição / Operador</th>
                    <th className="py-3 px-4 text-center">Acordos</th>
                    <th className="py-3 px-4 text-center">Quitados</th>
                    <th className="py-3 px-4 text-right">Total Negociado</th>
                    <th className="py-3 px-4 text-right">Total Arrecadado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-slate-200">
                  {rankedOperators.slice(0, 10).map((op, idx) => (
                    <tr key={idx} className="hover:bg-white/5 print:hover:bg-transparent">
                      <td className="py-2.5 px-4 font-bold flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                          idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                          'text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-white print:text-slate-900">{op.name}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-300 print:text-slate-700">{op.count}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-400 print:text-emerald-700">{op.paidCount}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400 print:text-slate-600">{formatCurrency(op.value)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-400 print:text-emerald-800">{formatCurrency(op.paidValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé de Conformidade */}
          <div className="pt-4 border-t border-white/10 print:border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2">
            <span>Documento oficial gerado para fins de acompanhamento gerencial e auditoria interna.</span>
            <span>Página 1 de 1</span>
          </div>
        </div>

      </div>
    </div>
  );
};
