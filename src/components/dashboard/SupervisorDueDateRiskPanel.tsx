import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  ShieldWarning, 
  Paperclip,
  CheckCircle,
  Funnel,
  CaretLeft,
  CaretRight,
  CaretUp,
  CaretDown,
  PencilSimple,
  SlidersHorizontal,
  X,
  WhatsappLogo,
  Flame,
  Sparkle
} from '@phosphor-icons/react';
import { Agreement, UserProfile } from '../../types';
import { formatCurrency, formatCPF } from '../../utils/masks';

interface SupervisorDueDateRiskPanelProps {
  agreements: Agreement[];
  profile: UserProfile;
  onOpenCpfHistory: (cpf: string) => void;
  onOpenReceiptModal: (agreement: Agreement) => void;
  onOpenMessageTemplates?: (agreement: Agreement) => void;
  theme?: 'dark' | 'light';
}

export const SupervisorDueDateRiskPanel: React.FC<SupervisorDueDateRiskPanelProps> = ({
  agreements,
  profile,
  onOpenCpfHistory,
  onOpenReceiptModal,
  onOpenMessageTemplates,
  theme = 'dark'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'name'>('value_desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Configurações do Supervisor (Valor Alto & Filtro Estrito)
  const [highValueThreshold, setHighValueThreshold] = useState<number>(1000);
  const [onlyHighValue, setOnlyHighValue] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [tempThreshold, setTempThreshold] = useState<string>('1000');
  const [tempOnlyHighValue, setTempOnlyHighValue] = useState<boolean>(false);

  // Carrega configurações salvas do supervisor
  useEffect(() => {
    const key = `supervisor_risk_config_${profile.uid || profile.id || 'default'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.threshold === 'number') {
          setHighValueThreshold(parsed.threshold);
          setTempThreshold(parsed.threshold.toString());
        }
        if (typeof parsed.onlyHighValue === 'boolean') {
          setOnlyHighValue(parsed.onlyHighValue);
          setTempOnlyHighValue(parsed.onlyHighValue);
        }
      } catch (e) {
        console.error('Erro ao ler config de risco:', e);
      }
    }
  }, [profile.uid, profile.id]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempThreshold.replace(/\D/g, '')) || 0;
    setHighValueThreshold(val);
    setOnlyHighValue(tempOnlyHighValue);
    const key = `supervisor_risk_config_${profile.uid || profile.id || 'default'}`;
    localStorage.setItem(key, JSON.stringify({
      threshold: val,
      onlyHighValue: tempOnlyHighValue
    }));
    setIsConfigModalOpen(false);
  };

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 360;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Exclusividade: exibe apenas para o perfil de supervisor
  const isSupervisorRole = profile.role === 'supervisor';

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

    // Filtro estrito de valor alto se configurado
    if (onlyHighValue && highValueThreshold > 0) {
      result = result.filter(a => (a.value || 0) >= highValueThreshold);
    }

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
  }, [pendingAgreements, searchTerm, sortBy, onlyHighValue, highValueThreshold]);

  // Função para copiar texto com feedback visual de 2s
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Gerador de Mensagem Personalizada
  const getCustomMessage = (a: Agreement) => {
    const cleanFirstName = (a.clientName || 'Cliente').split(' ')[0];
    const valFormatted = formatCurrency(a.value || 0);
    return `Olá ${cleanFirstName}, identificamos o vencimento do seu acordo hoje no valor de ${valFormatted}. Podemos ajudar no envio de dúvidas ou confirmação do atendimento pelo chat?`;
  };

  const handleOpenWhatsApp = (a: Agreement) => {
    const msg = encodeURIComponent(getCustomMessage(a));
    const phone = (a.clientPhone || '').replace(/\D/g, '');
    const url = phone ? `https://wa.me/55${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
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
              <ShieldWarning size={26} weight="duotone" />
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

          <div className="flex items-center gap-3">
            {/* MÉTRICAS DE RESGATE DO DIA */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-2xl border border-white/10 text-center flex-1 md:flex-none">
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

            {/* BOTÃO DE CONFIGURAR VALOR ALTO (LÁPIS/ENGRENAGEM) */}
            <button
              type="button"
              onClick={() => {
                setTempThreshold(highValueThreshold.toString());
                setTempOnlyHighValue(onlyHighValue);
                setIsConfigModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
              title="Configurar corte de valor alto e preferências"
            >
              <PencilSimple size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Corte R$ {highValueThreshold}</span>
            </button>

            {/* BOTÃO DE MINIMIZAR / EXPANDIR PAINEL */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0"
              title={isCollapsed ? 'Expandir Painel' : 'Minimizar Painel'}
            >
              {isCollapsed ? (
                <>
                  <CaretDown size={16} className="text-amber-400" />
                  <span className="hidden sm:inline">Expandir</span>
                </>
              ) : (
                <>
                  <CaretUp size={16} className="text-amber-400" />
                  <span className="hidden sm:inline">Minimizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CORPO DO PAINEL (EXIBIDO SOMENTE SE NÃO ESTIVER MINIMIZADO) */}
        {!isCollapsed && (
          <>
            {/* CONTROLES: BUSCA, ORDENAÇÃO E BOTÕES DE NAVEGAÇÃO LATERAL DO CARROSSEL */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
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

                {onlyHighValue && (
                  <span className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black shrink-0 flex items-center gap-1">
                    <Flame size={13} className="text-amber-400" /> Filtro Ativo: ≥ {formatCurrency(highValueThreshold)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <SortDescending size={14} className="text-amber-400" /> Ordenar:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="value_desc">💰 Maior Valor</option>
                    <option value="value_asc">💵 Menor Valor</option>
                    <option value="name">👤 Nome do Cliente</option>
                  </select>
                </div>

                {/* SETAS DE NAVEGAÇÃO LATERAL DO CARROSSEL */}
                {filteredAgreements.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => scrollCarousel('left')}
                      className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Rolar para esquerda"
                    >
                      <CaretLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('right')}
                      className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Rolar para direita"
                    >
                      <CaretRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* LISTA DE ACORDOS EM RISCO (CARROSSEL HORIZONTAL) */}
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
              <div 
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory"
              >
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
                      className="min-w-[310px] max-w-[340px] w-full shrink-0 snap-start bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 p-4 rounded-2xl space-y-3.5 transition-all shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                                Vence Hoje
                              </span>
                              {(agreement.value || 0) >= highValueThreshold && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-tight flex items-center gap-0.5">
                                  <Flame size={10} className="text-amber-400" /> Alto Valor
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-white line-clamp-1">
                              {agreement.clientName}
                            </h4>
                          </div>

                          <span className="font-mono font-black text-sm text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                            {formatCurrency(agreement.value || 0)}
                          </span>
                        </div>

                        {/* DESTAQUE NOME DO OPERADOR */}
                        <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate">
                            <User size={14} className="text-amber-400 shrink-0" />
                            <span className="truncate">Operador: <strong className="text-white">{agreement.operatorName || 'Não Informado'}</strong></span>
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
                        </div>
                      </div>

                      {/* AÇÕES RÁPIDAS EM 1-CLIQUE */}
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

                        {/* Botões de Mensagem & WhatsApp */}
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(agreement)}
                            className="px-2.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            title="Disparar mensagem no WhatsApp com 1 clique"
                          >
                            <WhatsappLogo size={16} weight="fill" className="text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(customMsg, keyMsg)}
                            className="flex-1 px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            {copiedId === keyMsg ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <ChatText size={14} className="text-amber-400" />
                            )}
                            <span>{copiedId === keyMsg ? 'Copiada!' : 'Copiar Texto'}</span>
                          </button>

                          {onOpenMessageTemplates && (
                            <button
                              type="button"
                              onClick={() => onOpenMessageTemplates(agreement)}
                              className="px-2.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[11px] font-bold text-blue-400 flex items-center justify-center gap-1 transition-all"
                              title="Central de Templates"
                            >
                              <span>Templates</span>
                            </button>
                          )}
                        </div>

                        {/* COMPROVANTE: EXIBE MINIATURA SE ANEXADO, OU BOTÃO DE ANEXAR (SEM R2) */}
                        {agreement.receiptUrl ? (
                          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <img
                              src={agreement.receiptUrl}
                              alt="Comprovante Anexado"
                              className="w-10 h-10 object-cover rounded-lg border border-emerald-500/40 cursor-pointer hover:scale-105 transition-transform shrink-0"
                              onClick={() => onOpenReceiptModal(agreement)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-bold text-emerald-400 block truncate">
                                ✅ Comprovante Anexado
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenReceiptModal(agreement)}
                                className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer truncate block"
                              >
                                Ver imagem completa
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenReceiptModal(agreement)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Paperclip size={14} className="text-slate-500" />
                            <span>Anexar Comprovante</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DE CONFIGURAÇÃO DE VALOR ALTO DO SUPERVISOR */}
      {isConfigModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsConfigModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-slate-100 relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Configurar Painel de Risco</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Preferências exclusivas do seu perfil de supervisão</span>
                </div>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-400" />
                  Corte de "Valor Alto" (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400 font-mono">
                    R$
                  </span>
                  <input 
                    type="number"
                    min="1"
                    step="50"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-black font-mono bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Acordos a partir deste valor receberão destaque visual prioritário no carrossel.
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-white block">Filtrar Apenas Valores Altos</span>
                    <span className="text-[11px] text-slate-400 block">
                      Oculta acordos abaixo do corte e exibe estritamente os acordos mais pesados.
                    </span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={tempOnlyHighValue}
                    onChange={(e) => setTempOnlyHighValue(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Salvar Preferências
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDueDateRiskPanel;
