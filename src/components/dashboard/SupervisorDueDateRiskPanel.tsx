import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Warning, 
  Copy, 
  Check, 
  User, 
  ChatText, 
  SortDescending, 
  MagnifyingGlass, 
  Clock, 
  CurrencyDollar, 
  FileText, 
  ShieldAlert, 
  Paperclip,
  CheckCircle,
  Funnel
} from '@phosphor-icons/react';
import { Agreement, UserProfile } from '../../types';
import { formatCurrency, formatCPF } from '../../utils/masks';

interface SupervisorDueDateRiskPanelProps {
  agreements: Agreement[];
  profile: UserProfile;
  onOpenCpfHistory: (cpf: string) => void;
  onOpenReceiptModal: (agreement: Agreement) => void;
  theme?: 'dark' | 'light';
}

export const SupervisorDueDateRiskPanel: React.FC<SupervisorDueDateRiskPanelProps> = ({
  agreements,
  profile,
  onOpenCpfHistory,
  onOpenReceiptModal,
  theme = 'dark'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'name'>('value_desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Exclusividade: exibe apenas para perfis de liderança
  const isSupervisorRole = ['supervisor', 'coordinator', 'manager', 'admin'].includes(profile.role);

  // Data de hoje em formato YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Filtragem dos acordos que vencem hoje
  const todayAgreements = useMemo(() => {
    return agreements.filter(a => {
      if (!a.dueDate) return false;
      const dueStr = a.dueDate.split('T')[0];
      return dueStr === todayStr;
    });
  }, [agreements, todayStr]);

  // Separação entre pendentes (em risco) e pagos
  const pendingAgreements = useMemo(() => {
    return todayAgreements.filter(a => {
      const st = (a.status || '').toString().toLowerCase();
      return st !== 'pago' && st !== 'paid' && st !== 'quitado';
    });
  }, [todayAgreements]);

  const paidAgreements = useMemo(() => {
    return todayAgreements.filter(a => {
      const st = (a.status || '').toString().toLowerCase();
      return st === 'pago' || st === 'paid' || st === 'quitado';
    });
  }, [todayAgreements]);

  // Cálculos consolidados
  const totalValueAtRisk = useMemo(() => {
    return pendingAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
  }, [pendingAgreements]);

  const totalValueRescued = useMemo(() => {
    return paidAgreements.reduce((sum, a) => sum + (a.value || 0), 0);
  }, [paidAgreements]);

  const rescueRate = useMemo(() => {
    const total = todayAgreements.length;
    if (total === 0) return 0;
    return Math.round((paidAgreements.length / total) * 100);
  }, [todayAgreements, paidAgreements]);

  // Filtragem e ordenação por maior valor
  const filteredAgreements = useMemo(() => {
    let result = [...pendingAgreements];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a => 
        (a.clientName || '').toLowerCase().includes(term) ||
        (a.clientCpf || '').replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        (a.operatorName || '').toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'value_desc') return (b.value || 0) - (a.value || 0);
      if (sortBy === 'value_asc') return (a.value || 0) - (b.value || 0);
      return (a.clientName || '').localeCompare(b.clientName || '');
    });

    return result;
  }, [pendingAgreements, searchTerm, sortBy]);

  // Função para copiar texto com feedback visual de 2s
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Gerador de Mensagem Personalizada (SEM PIX)
  const getCustomMessage = (a: Agreement) => {
    const cleanFirstName = (a.clientName || 'Cliente').split(' ')[0];
    const valFormatted = formatCurrency(a.value || 0);
    return `Olá ${cleanFirstName}, identificamos o vencimento do seu acordo hoje no valor de ${valFormatted}. Podemos ajudar no envio de dúvidas ou confirmação do atendimento pelo chat?`;
  };

  if (!isSupervisorRole) return null;

  return (
    <div className="w-full mb-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 p-6 border border-amber-500/30 shadow-2xl text-slate-100 relative overflow-hidden">
      {/* Glow de Destaque */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        
        {/* CABEÇALHO DO PAINEL DO SUPERVISOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shrink-0">
              <ShieldAlert size={26} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Warning size={12} className="text-amber-400" /> Exclusivo Supervisão
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                Painel de Acordos em Risco de Vencimento no Dia
              </h2>
            </div>
          </div>

          {/* MÉTRICAS DE RESGATE DO DIA */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-2xl border border-white/10 text-center">
            <div className="px-2">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Em Risco Hoje</span>
              <span className="text-sm font-black text-white font-mono">{formatCurrency(totalValueAtRisk)}</span>
              <span className="text-[10px] text-slate-400 block font-bold">{pendingAgreements.length} pendentes</span>
            </div>

            <div className="px-2 border-x border-white/10">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">Resgatados</span>
              <span className="text-sm font-black text-emerald-300 font-mono">{formatCurrency(totalValueRescued)}</span>
              <span className="text-[10px] text-slate-400 block font-bold">{paidAgreements.length} quitados</span>
            </div>

            <div className="px-2">
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider block">Efetividade</span>
              <span className="text-sm font-black text-sky-300 font-mono">{rescueRate}%</span>
              <span className="text-[10px] text-slate-400 block font-bold">taxa do dia</span>
            </div>
          </div>
        </div>

        {/* CONTROLES: BUSCA E ORDENAÇÃO */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, CPF ou operador..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <SortDescending size={14} className="text-amber-400" /> Ordenar por:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="value_desc">💰 Maior Valor Primeiro</option>
              <option value="value_asc">💵 Menor Valor Primeiro</option>
              <option value="name">👤 Nome do Cliente</option>
            </select>
          </div>
        </div>

        {/* LISTA DE ACORDOS EM RISCO */}
        {filteredAgreements.length === 0 ? (
          <div className="bg-slate-950/60 rounded-2xl p-8 border border-white/5 text-center space-y-2">
            <CheckCircle size={32} className="text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-300">
              {pendingAgreements.length === 0 
                ? 'Excelente! Nenhum acordo pendente de vencimento para o dia de hoje.' 
                : 'Nenhum acordo encontrado com os filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAgreements.map((agreement) => {
              const cleanCpf = (agreement.clientCpf || '').replace(/\D/g, '');
              const formattedCpf = formatCPF(agreement.clientCpf || '');
              const customMsg = getCustomMessage(agreement);

              const keyCpf = `cpf_${agreement.id}`;
              const keyName = `name_${agreement.id}`;
              const keyMsg = `msg_${agreement.id}`;

              return (
                <div
                  key={agreement.id}
                  className="bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 p-4 rounded-2xl space-y-3.5 transition-all shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                          Vence Hoje
                        </span>
                        <h4 className="font-bold text-sm text-white line-clamp-1">
                          {agreement.clientName}
                        </h4>
                      </div>

                      <span className="font-mono font-black text-sm text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                        {formatCurrency(agreement.value || 0)}
                      </span>
                    </div>

                    {/* Detalhes do Cliente */}
                    <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-white/5 font-medium">
                      <div className="flex items-center justify-between">
                        <span>CPF: <strong className="text-slate-200 font-mono">{formattedCpf}</strong></span>
                        <button
                          type="button"
                          onClick={() => onOpenCpfHistory(cleanCpf)}
                          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                        >
                          Histórico 360°
                        </button>
                      </div>

                      {agreement.operatorName && (
                        <p className="text-[11px] text-slate-400 truncate">
                          Operador: <span className="text-slate-300 font-semibold">{agreement.operatorName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AÇÕES RÁPIDAS EM 1-CLIQUE (SEM BOTÃO DE PIX) */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Botão Copiar CPF */}
                      <button
                        type="button"
                        onClick={() => handleCopy(cleanCpf, keyCpf)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        {copiedId === keyCpf ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} className="text-sky-400" />
                        )}
                        <span>{copiedId === keyCpf ? 'Copiado!' : 'Copiar CPF'}</span>
                      </button>

                      {/* Botão Copiar Nome */}
                      <button
                        type="button"
                        onClick={() => handleCopy(agreement.clientName, keyName)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        {copiedId === keyName ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <User size={14} className="text-indigo-400" />
                        )}
                        <span>{copiedId === keyName ? 'Copiado!' : 'Copiar Nome'}</span>
                      </button>
                    </div>

                    {/* Botão Copiar Mensagem Personalizada */}
                    <button
                      type="button"
                      onClick={() => handleCopy(customMsg, keyMsg)}
                      className="w-full px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      {copiedId === keyMsg ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <ChatText size={14} className="text-amber-400" />
                      )}
                      <span>{copiedId === keyMsg ? 'Mensagem Copiada!' : 'Copiar Mensagem de Cobrança'}</span>
                    </button>

                    {/* Botão Anexo de Comprovante R2 */}
                    <button
                      type="button"
                      onClick={() => onOpenReceiptModal(agreement)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Paperclip size={14} className={agreement.receiptUrl ? 'text-emerald-400' : 'text-slate-500'} />
                      <span>{agreement.receiptUrl ? 'Ver Comprovante Anexo' : 'Anexar Comprovante (R2)'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDueDateRiskPanel;
