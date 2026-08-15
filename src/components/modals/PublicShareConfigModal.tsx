import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Link, 
  Copy, 
  Check, 
  WhatsappLogo, 
  Eye, 
  SlidersHorizontal, 
  Sparkle, 
  ShieldCheck, 
  Lock, 
  Users, 
  Buildings, 
  Calendar, 
  X, 
  TelevisionSimple, 
  Briefcase, 
  UserList, 
  QrCode,
  TrendUp,
  Tag,
  UserCheck,
  DownloadSimple
} from '@phosphor-icons/react';
import { Team, UserProfile } from '../../types';

interface PublicShareConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName?: string;
  teams: Team[];
  managers?: UserProfile[];
  supervisors?: UserProfile[];
  userProfile: UserProfile;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

interface ModuleOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'operational' | 'financial' | 'gamification';
}

const MODULE_OPTIONS: ModuleOption[] = [
  // 1. Gestão & Escala Operacional
  {
    id: 'attendance',
    label: 'Presença & Absenteísmo',
    description: 'Taxa de aderência à escala, faltas e cumprimento mensal',
    icon: '🗓️',
    category: 'operational'
  },
  {
    id: 'pacing',
    label: 'Ritmo Diário & Run-rate',
    description: 'Meta diária necessária, realizado por dia útil e farol de ritmo',
    icon: '⏱️',
    category: 'operational'
  },
  {
    id: 'hourly',
    label: 'Picos de Produção',
    description: 'Faixas de horário de maior conversão de acordos',
    icon: '⏰',
    category: 'operational'
  },

  // 2. Resultados Financeiros
  {
    id: 'kpis',
    label: 'KPIs Globais de Recuperação',
    description: 'Meta Total, Faturamento Realizado R$, % Atingimento e Projeção',
    icon: '📊',
    category: 'financial'
  },
  {
    id: 'mom',
    label: 'Comparativo vs. Mês Anterior (MoM)',
    description: 'Indicadores percentuais de crescimento vs. fechamento anterior',
    icon: '📈',
    category: 'financial'
  },
  {
    id: 'conversion',
    label: 'Taxa de Conversão & Liquidação',
    description: 'Relação entre promessas de pagamento e acordos liquidados',
    icon: '🎯',
    category: 'financial'
  },
  {
    id: 'ticket',
    label: 'Ticket Médio & Faixas de Valor',
    description: 'Valor médio por acordo e distribuição em faixas financeiras',
    icon: '🏷️',
    category: 'financial'
  },
  {
    id: 'portfolios',
    label: 'Distribuição por Carteiras',
    description: 'Divisão do faturamento por carteiras, credores ou produtos',
    icon: '🥧',
    category: 'financial'
  },

  // 3. Gamificação & Equipe
  {
    id: 'ranking',
    label: 'Ranking Geral (Leaderboard)',
    description: 'Classificação ordenada por desempenho dos analistas',
    icon: '🏆',
    category: 'gamification'
  },
  {
    id: 'podium',
    label: 'Pódio dos Campeões (Top 3)',
    description: 'Destaque especial com troféus para o 1º, 2º e 3º lugares',
    icon: '🥇',
    category: 'gamification'
  },
  {
    id: 'highlights',
    label: 'Mural de Destaques',
    description: 'Craque do mês, maior recuperação única e mérito de equipe',
    icon: '⭐',
    category: 'gamification'
  },
  {
    id: 'dispersion',
    label: 'Matriz de Eficiência & Dispersão',
    description: 'Comparativo relativo entre a melhor performance e a média',
    icon: '📈',
    category: 'gamification'
  }
];

export const PublicShareConfigModal: React.FC<PublicShareConfigModalProps> = ({
  isOpen,
  onClose,
  orgId,
  orgName = 'Empresa',
  teams = [],
  managers = [],
  supervisors = [],
  userProfile,
  showToast
}) => {
  const isSupervisor = userProfile.role === 'supervisor';
  const isManager = userProfile.role === 'manager';
  const isSuperAdminOrCoord = userProfile.role === 'super_admin' || userProfile.role === 'coordinator';

  // 1. Estados da Árvore Hierárquica em Cascata
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(isSupervisor ? userProfile.uid : 'all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(isSupervisor ? (userProfile.managedTeams?.[0] || userProfile.teamId || 'all') : 'all');
  const [customReportTitle, setCustomReportTitle] = useState<string>('');

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Estado do Preset Selecionado
  const [selectedPreset, setSelectedPreset] = useState<'tv' | 'board' | 'attendance' | 'all' | 'custom'>('tv');

  // Módulos Ativos (Set de IDs)
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({
    kpis: true,
    mom: true,
    attendance: false,
    pacing: true,
    ranking: true,
    podium: true,
    conversion: true,
    ticket: false,
    portfolios: false,
    hourly: true,
    highlights: true,
    dispersion: false
  });

  // Privacidade & Segurança
  const [hideValues, setHideValues] = useState<boolean>(false);
  const [anonNames, setAnonNames] = useState<boolean>(false);
  const [hideNotes, setHideNotes] = useState<boolean>(true);
  const [requirePin, setRequirePin] = useState<boolean>(false);
  const [pinCode, setPinCode] = useState<string>('');

  // Controle de QR Code Modal
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Lista de Produtos Disponíveis
  const availableProducts = useMemo(() => {
    const set = new Set<string>();
    teams.forEach(t => {
      const prod = t.product || (t as any).portfolio;
      if (prod && typeof prod === 'string' && prod.trim()) {
        set.add(prod.trim());
      }
    });
    if (isManager && userProfile.managedProducts && userProfile.managedProducts.length > 0) {
      return userProfile.managedProducts;
    }
    const list = Array.from(set).sort();
    return list.length > 0 ? list : ['Consignado', 'Cartões', 'Veículos', 'Varejo'];
  }, [teams, isManager, userProfile]);

  // Gerentes Filtrados por Produto
  const filteredManagers = useMemo(() => {
    if (!isSuperAdminOrCoord) return [];
    if (selectedProduct === 'all') return managers;
    return managers.filter(m => m.managedProducts?.includes(selectedProduct) || m.product === selectedProduct);
  }, [isSuperAdminOrCoord, selectedProduct, managers]);

  // Supervisores Filtrados por Produto e Gerente
  const filteredSupervisors = useMemo(() => {
    if (isSupervisor) return supervisors.filter(s => s.uid === userProfile.uid);
    let sups = supervisors;
    if (isManager) {
      sups = sups.filter(s => s.managerId === userProfile.uid || !s.managerId);
    } else if (selectedManagerId !== 'all') {
      sups = sups.filter(s => s.managerId === selectedManagerId);
    }
    if (selectedProduct !== 'all') {
      const productTeamIds = new Set(teams.filter(t => (t.product === selectedProduct || (t as any).portfolio === selectedProduct)).map(t => t.id));
      sups = sups.filter(s => s.product === selectedProduct || s.managedTeams?.some(tid => productTeamIds.has(tid)));
    }
    return sups;
  }, [isSupervisor, isManager, userProfile, selectedManagerId, selectedProduct, supervisors, teams]);

  // Equipes Filtradas
  const filteredTeams = useMemo(() => {
    let tList = teams;
    if (isSupervisor) {
      const supManaged = new Set(userProfile.managedTeams || (userProfile.teamId ? [userProfile.teamId] : []));
      return tList.filter(t => supManaged.has(t.id) || t.supervisorId === userProfile.uid);
    }
    if (isManager) {
      tList = tList.filter(t => t.managerId === userProfile.uid || !t.managerId);
    } else if (selectedManagerId !== 'all') {
      tList = tList.filter(t => t.managerId === selectedManagerId);
    }
    if (selectedProduct !== 'all') {
      tList = tList.filter(t => (t.product === selectedProduct || (t as any).portfolio === selectedProduct));
    }
    if (selectedSupervisorId !== 'all') {
      tList = tList.filter(t => t.supervisorId === selectedSupervisorId);
    }
    return tList;
  }, [teams, isSupervisor, isManager, userProfile, selectedManagerId, selectedProduct, selectedSupervisorId]);

  // Alternar Módulo Individual
  const toggleModule = (moduleId: string) => {
    setSelectedPreset('custom');
    setActiveModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Presets Rápidos
  const applyPreset = (presetType: 'tv' | 'board' | 'attendance' | 'all') => {
    setSelectedPreset(presetType);
    if (presetType === 'tv') {
      setActiveModules({
        kpis: true,
        mom: true,
        attendance: false,
        pacing: true,
        ranking: true,
        podium: true,
        conversion: true,
        ticket: false,
        portfolios: false,
        hourly: true,
        highlights: true,
        dispersion: false
      });
      setHideValues(false);
      setAnonNames(false);
      showToast('Preset "TV da Operação" selecionado com sucesso!', 'success');
    } else if (presetType === 'board') {
      setActiveModules({
        kpis: true,
        mom: true,
        attendance: true,
        pacing: true,
        ranking: false,
        podium: false,
        conversion: true,
        ticket: true,
        portfolios: true,
        hourly: false,
        highlights: false,
        dispersion: true
      });
      setHideValues(false);
      setAnonNames(true);
      showToast('Preset "Diretoria & Clientes" selecionado com sucesso!', 'success');
    } else if (presetType === 'attendance') {
      setActiveModules({
        kpis: false,
        mom: false,
        attendance: true,
        pacing: true,
        ranking: false,
        podium: false,
        conversion: false,
        ticket: false,
        portfolios: false,
        hourly: false,
        highlights: false,
        dispersion: false
      });
      setHideValues(true);
      showToast('Preset "Escala & Presença" selecionado com sucesso!', 'success');
    } else if (presetType === 'all') {
      const allTrue: Record<string, boolean> = {};
      MODULE_OPTIONS.forEach(m => { allTrue[m.id] = true; });
      setActiveModules(allTrue);
      showToast('Todos os módulos foram selecionados!', 'success');
    }
  };

  // Construção Dinâmica da URL do Link
  const generatedUrl = useMemo(() => {
    const baseUrl = `${window.location.origin}/public/portfolio`;
    const params = new URLSearchParams();
    params.set('orgId', orgId);
    params.set('month', selectedMonth.toString());
    params.set('year', selectedYear.toString());

    // Dimensão Hierárquica
    if (selectedProduct !== 'all') params.set('product', selectedProduct);
    if (selectedManagerId !== 'all') params.set('managerId', selectedManagerId);
    if (selectedSupervisorId !== 'all') params.set('supervisorId', selectedSupervisorId);
    if (selectedTeamId !== 'all') params.set('teamId', selectedTeamId);
    if (customReportTitle.trim()) params.set('title', customReportTitle.trim());

    // Módulos ativos separados por vírgula
    const activeList = Object.entries(activeModules)
      .filter(([_, isActive]) => isActive)
      .map(([id]) => id);
    
    if (activeList.length > 0) {
      params.set('modules', activeList.join(','));
    }

    if (hideValues) params.set('hideValues', 'true');
    if (anonNames) params.set('anon', 'true');
    if (hideNotes) params.set('hideNotes', 'true');
    if (requirePin && pinCode.trim().length === 4) {
      params.set('pin', pinCode.trim());
    }

    return `${baseUrl}?${params.toString()}`;
  }, [
    orgId, 
    selectedProduct, 
    selectedManagerId, 
    selectedSupervisorId, 
    selectedTeamId, 
    customReportTitle, 
    selectedMonth, 
    selectedYear, 
    activeModules, 
    hideValues, 
    anonNames, 
    hideNotes, 
    requirePin, 
    pinCode
  ]);

  // URL do QR Code
  const qrCodeImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedUrl)}`;
  }, [generatedUrl]);

  // Copiar Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    showToast('Link do relatório público copiado com sucesso!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  // Compartilhar WhatsApp
  const handleShareWhatsApp = () => {
    const productTxt = selectedProduct !== 'all' ? ` [Produto: ${selectedProduct}]` : '';
    const message = `📊 *Relatório de Performance Operacional — ${orgName}${productTxt}*\n\nAcesse os resultados consolidados através do link seguro abaixo:\n🔗 ${generatedUrl}${requirePin && pinCode ? `\n🔑 *PIN de Acesso*: ${pinCode}` : ''}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl my-6 bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 cursor-default max-h-[92vh] flex flex-col"
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <SlidersHorizontal size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>Configurador de Link Público Modular</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Liderança Multi-Produto
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Segmente por Produto, Gerente, Supervisor e Equipes com controle de módulos e privacidade.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO COM SCROLL */}
        <div className="space-y-6 overflow-y-auto pr-1 flex-1">
          {/* 1. ÁRVORE HIERÁRQUICA EM CASCATA */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-white/5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Tag size={15} className="text-sky-400" />
              1. Escopo Hierárquico (Árvore de Produtos & Equipes):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* NÍVEL 1: PRODUTO */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">🏷️ Produto / Carteira</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    setSelectedManagerId('all');
                    setSelectedSupervisorId(isSupervisor ? userProfile.uid : 'all');
                    setSelectedTeamId('all');
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="all">🏢 Todos os Produtos</option>
                  {availableProducts.map(p => (
                    <option key={p} value={p}>🏷️ {p}</option>
                  ))}
                </select>
              </div>

              {/* NÍVEL 2: GERENTE (Se for Coordenador/Admin) */}
              {isSuperAdminOrCoord && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">👔 Gerente Responsável</label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => {
                      setSelectedManagerId(e.target.value);
                      setSelectedSupervisorId('all');
                      setSelectedTeamId('all');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    <option value="all">👔 Todos os Gerentes</option>
                    {filteredManagers.map(m => (
                      <option key={m.uid} value={m.uid}>👔 {m.displayName || m.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* NÍVEL 3: SUPERVISOR */}
              {!isSupervisor && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">👤 Supervisor da Operação</label>
                  <select
                    value={selectedSupervisorId}
                    onChange={(e) => {
                      setSelectedSupervisorId(e.target.value);
                      setSelectedTeamId('all');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    <option value="all">👤 Todos os Supervisores</option>
                    {filteredSupervisors.map(s => (
                      <option key={s.uid} value={s.uid}>👤 {s.displayName || s.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* NÍVEL 4: EQUIPE */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">👥 Equipe / Time</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="all">👥 Todas as Equipes</option>
                  {filteredTeams.map(t => (
                    <option key={t.id} value={t.id}>👥 {t.name}</option>
                  ))}
                </select>
              </div>

              {/* PERÍODO DE REFERÊNCIA */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">📅 Período (Mês/Ano)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-2 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-emerald-500 transition-all"
                  >
                    <option value={1}>Jan</option>
                    <option value={2}>Fev</option>
                    <option value={3}>Mar</option>
                    <option value={4}>Abr</option>
                    <option value={5}>Mai</option>
                    <option value={6}>Jun</option>
                    <option value={7}>Jul</option>
                    <option value={8}>Ago</option>
                    <option value={9}>Set</option>
                    <option value={10}>Out</option>
                    <option value={11}>Nov</option>
                    <option value={12}>Dez</option>
                  </select>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-2 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:border-emerald-500 text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PRESETS EM 1-CLIQUE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkle size={14} className="text-amber-400" />
                Presets Rápidos (1-Clique):
              </span>
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className={`text-[10px] font-bold transition-all px-2 py-0.5 rounded-lg cursor-pointer ${
                  selectedPreset === 'all'
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 font-black'
                    : 'text-emerald-400 hover:text-emerald-300 underline'
                }`}
              >
                {selectedPreset === 'all' ? '✓ Todos Ativados' : 'Ativar Todos'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* PRESET: TV DA OPERAÇÃO */}
              <button
                type="button"
                onClick={() => applyPreset('tv')}
                className={`p-3 rounded-2xl border text-left transition-all group cursor-pointer relative overflow-hidden ${
                  selectedPreset === 'tv'
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10'
                    : 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/10 hover:border-emerald-500/30 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <TelevisionSimple size={16} className={`transition-transform ${selectedPreset === 'tv' ? 'text-emerald-400 scale-110' : 'text-sky-400 group-hover:scale-110'}`} />
                    <span className="text-xs font-black text-white">TV da Operação</span>
                  </div>
                  {selectedPreset === 'tv' && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Ativo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">KPIs, Pódio, Ranking, Pacing e Picos</p>
              </button>

              {/* PRESET: DIRETORIA & CLIENTES */}
              <button
                type="button"
                onClick={() => applyPreset('board')}
                className={`p-3 rounded-2xl border text-left transition-all group cursor-pointer relative overflow-hidden ${
                  selectedPreset === 'board'
                    ? 'bg-purple-950/40 border-purple-500/60 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10'
                    : 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/10 hover:border-purple-500/30 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className={`transition-transform ${selectedPreset === 'board' ? 'text-purple-400 scale-110' : 'text-purple-400 group-hover:scale-110'}`} />
                    <span className="text-xs font-black text-white">Diretoria & Clientes</span>
                  </div>
                  {selectedPreset === 'board' && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ✓ Ativo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">KPIs Macro, MoM, Carteiras (Sigiloso)</p>
              </button>

              {/* PRESET: ESCALA & PRESENÇA */}
              <button
                type="button"
                onClick={() => applyPreset('attendance')}
                className={`p-3 rounded-2xl border text-left transition-all group cursor-pointer relative overflow-hidden ${
                  selectedPreset === 'attendance'
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10'
                    : 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/10 hover:border-emerald-500/30 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <UserList size={16} className={`transition-transform ${selectedPreset === 'attendance' ? 'text-emerald-400 scale-110' : 'text-emerald-400 group-hover:scale-110'}`} />
                    <span className="text-xs font-black text-white">Escala & Presença</span>
                  </div>
                  {selectedPreset === 'attendance' && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Ativo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Aderência, Faltas PJ e Pacing Operacional</p>
              </button>
            </div>
          </div>

          {/* 2. LISTA DE MÓDULOS COM SWITCHES DE BOLINHA VERDE */}
          <div className="space-y-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">
              Módulos Visíveis no Relatório:
            </span>

            {/* SEÇÃO OPERACIONAL */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                1. Gestão Operacional & Escala PJ
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODULE_OPTIONS.filter(m => m.category === 'operational').map(mod => {
                  const isActive = !!activeModules[mod.id];
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                          : 'bg-slate-950/50 border-white/5 opacity-70 hover:opacity-100 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0 mt-0.5">{mod.icon}</span>
                        <div>
                          <strong className={`text-xs font-bold block ${isActive ? 'text-emerald-200' : 'text-slate-300'}`}>
                            {mod.label}
                          </strong>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{mod.description}</p>
                        </div>
                      </div>

                      {/* SWITCH DE BOLINHA VERDE */}
                      <div
                        className={`w-11 h-6 shrink-0 rounded-full transition-colors duration-300 ease-in-out p-0.5 flex items-center border ${
                          isActive
                            ? 'bg-emerald-500/30 border-emerald-500/60 justify-end'
                            : 'bg-slate-800 border-white/10 justify-start'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`w-5 h-5 rounded-full shadow-md ${
                            isActive
                              ? 'bg-emerald-400 shadow-emerald-500/60'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO FINANCEIRA & MOM */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">
                2. Resultados Financeiros & Previsibilidade
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODULE_OPTIONS.filter(m => m.category === 'financial').map(mod => {
                  const isActive = !!activeModules[mod.id];
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                          : 'bg-slate-950/50 border-white/5 opacity-70 hover:opacity-100 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0 mt-0.5">{mod.icon}</span>
                        <div>
                          <strong className={`text-xs font-bold block ${isActive ? 'text-emerald-200' : 'text-slate-300'}`}>
                            {mod.label}
                          </strong>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{mod.description}</p>
                        </div>
                      </div>

                      {/* SWITCH DE BOLINHA VERDE */}
                      <div
                        className={`w-11 h-6 shrink-0 rounded-full transition-colors duration-300 ease-in-out p-0.5 flex items-center border ${
                          isActive
                            ? 'bg-emerald-500/30 border-emerald-500/60 justify-end'
                            : 'bg-slate-800 border-white/10 justify-start'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`w-5 h-5 rounded-full shadow-md ${
                            isActive
                              ? 'bg-emerald-400 shadow-emerald-500/60'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO GAMIFICAÇÃO */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                3. Gamificação & Equipe
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODULE_OPTIONS.filter(m => m.category === 'gamification').map(mod => {
                  const isActive = !!activeModules[mod.id];
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                          : 'bg-slate-950/50 border-white/5 opacity-70 hover:opacity-100 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0 mt-0.5">{mod.icon}</span>
                        <div>
                          <strong className={`text-xs font-bold block ${isActive ? 'text-emerald-200' : 'text-slate-300'}`}>
                            {mod.label}
                          </strong>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{mod.description}</p>
                        </div>
                      </div>

                      {/* SWITCH DE BOLINHA VERDE */}
                      <div
                        className={`w-11 h-6 shrink-0 rounded-full transition-colors duration-300 ease-in-out p-0.5 flex items-center border ${
                          isActive
                            ? 'bg-emerald-500/30 border-emerald-500/60 justify-end'
                            : 'bg-slate-800 border-white/10 justify-start'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`w-5 h-5 rounded-full shadow-md ${
                            isActive
                              ? 'bg-emerald-400 shadow-emerald-500/60'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. PRIVACIDADE & SEGURANÇA */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-white/10">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-400" />
              Controles de Privacidade & Segurança LGPD
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Ocultar R$ */}
              <div 
                onClick={() => setHideValues(!hideValues)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  hideValues ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-900/60 border-white/5'
                }`}
              >
                <div>
                  <strong className="text-xs font-bold text-slate-200 block">Ocultar Valores em R$</strong>
                  <span className="text-[10px] text-slate-400">Exibir apenas % e índices</span>
                </div>
                <div
                  className={`w-9 h-5 shrink-0 rounded-full transition-colors duration-300 p-0.5 flex items-center border ${
                    hideValues ? 'bg-emerald-500/30 border-emerald-500/60 justify-end' : 'bg-slate-800 border-white/10 justify-start'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${hideValues ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>
              </div>

              {/* Modo Sigiloso */}
              <div 
                onClick={() => setAnonNames(!anonNames)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  anonNames ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-900/60 border-white/5'
                }`}
              >
                <div>
                  <strong className="text-xs font-bold text-slate-200 block">Modo Sigiloso</strong>
                  <span className="text-[10px] text-slate-400">Anonimizar: Analista #1, #2</span>
                </div>
                <div
                  className={`w-9 h-5 shrink-0 rounded-full transition-colors duration-300 p-0.5 flex items-center border ${
                    anonNames ? 'bg-emerald-500/30 border-emerald-500/60 justify-end' : 'bg-slate-800 border-white/10 justify-start'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${anonNames ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>
              </div>

              {/* Ocultar Anotações */}
              <div 
                onClick={() => setHideNotes(!hideNotes)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  hideNotes ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-900/60 border-white/5'
                }`}
              >
                <div>
                  <strong className="text-xs font-bold text-slate-200 block">Ocultar Anotações</strong>
                  <span className="text-[10px] text-slate-400">Esconder notas internas</span>
                </div>
                <div
                  className={`w-9 h-5 shrink-0 rounded-full transition-colors duration-300 p-0.5 flex items-center border ${
                    hideNotes ? 'bg-emerald-500/30 border-emerald-500/60 justify-end' : 'bg-slate-800 border-white/10 justify-start'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${hideNotes ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>
              </div>
            </div>

            {/* PIN de 4 dígitos */}
            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div 
                onClick={() => setRequirePin(!requirePin)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div
                  className={`w-9 h-5 shrink-0 rounded-full transition-colors duration-300 p-0.5 flex items-center border ${
                    requirePin ? 'bg-emerald-500/30 border-emerald-500/60 justify-end' : 'bg-slate-800 border-white/10 justify-start'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${requirePin ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>
                <div>
                  <strong className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Lock size={13} className="text-amber-400" />
                    Proteger Link com PIN de 4 Dígitos
                  </strong>
                  <span className="text-[10px] text-slate-400">Exige código numérico para abrir o link</span>
                </div>
              </div>

              {requirePin && (
                <input
                  type="text"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN: 1234"
                  className="w-28 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-mono font-bold text-center text-xs focus:border-amber-400"
                />
              )}
            </div>
          </div>
        </div>

        {/* BARRA INFERIOR DE AÇÕES, QR CODE & LINK GERADO */}
        <div className="pt-4 border-t border-white/10 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono truncate flex items-center gap-2">
              <Link size={16} className="text-slate-400 shrink-0" />
              <span className="truncate">{generatedUrl}</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border shrink-0 ${
                  copied 
                    ? 'bg-emerald-600 text-white border-emerald-400' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/10"
                title="Exibir QR Code Instantâneo"
              >
                <QrCode size={18} />
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Compartilhar no WhatsApp"
              >
                <WhatsappLogo size={18} weight="fill" />
              </button>

              <button
                type="button"
                onClick={() => window.open(generatedUrl, '_blank')}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Abrir Prévia em Nova Aba"
              >
                <Eye size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* MODAL EXPANSÍVEL DE QR CODE INSTANTÂNEO */}
        <AnimatePresence>
          {showQrModal && (
            <div 
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
              onClick={() => setShowQrModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-white/10 p-6 sm:p-8 rounded-3xl text-center space-y-4 max-w-sm w-full shadow-2xl cursor-default"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <QrCode size={20} className="text-emerald-400" />
                    <h3 className="text-sm font-black text-white">QR Code Instantâneo</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto">
                  <img 
                    src={qrCodeImageUrl} 
                    alt="QR Code do Relatório Público" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>

                <p className="text-xs text-slate-400">
                  Aponte a câmera do celular para abrir o relatório público imediatamente.
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy size={14} />
                    <span>Copiar Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(qrCodeImageUrl, '_blank')}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    title="Baixar Imagem do QR Code"
                  >
                    <DownloadSimple size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
