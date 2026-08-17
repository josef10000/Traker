import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, 
  ShieldCheck, 
  TrendUp, 
  Users, 
  Headphones, 
  Sparkle, 
  CheckCircle, 
  Lightning, 
  CurrencyDollar, 
  ChartLineUp, 
  Cpu, 
  Star, 
  Crown, 
  Database,
  Lock,
  CalendarCheck,
  Check,
  Clock,
  ChartPieSlice,
  GearSix,
  ArrowsClockwise,
  Target,
  PresentationChart,
  Eye,
  SlidersHorizontal,
  WarningCircle,
  Brain
} from '@phosphor-icons/react';
import { formatCurrency } from '../../utils/masks';

export const SalesPresentationPage: React.FC = () => {
  // Controle de Navegação por Slides da Apresentação
  const [activeSection, setActiveSection] = useState<'overview' | 'cockpit' | 'roi' | 'risk' | 'pricing' | 'ai_roadmap' | 'security'>('overview');

  // Estados do Simulador de ROI ao Vivo
  const [operatorCount, setOperatorCount] = useState<number>(25);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(1800000);
  const [breakRate, setBreakRate] = useState<number>(24);

  // Estado da Alternância de Perfil no Cockpit Interativo
  const [activePreviewRole, setActivePreviewRole] = useState<'director' | 'supervisor' | 'operator' | 'qa'>('supervisor');

  // Cálculos Dinâmicos do Simulador de ROI
  const roiCalculations = useMemo(() => {
    const brokenVolume = monthlyVolume * (breakRate / 100);
    // Recuperação conservadora estimada: 20% do volume que quebraria
    const recoveredWithTracker = brokenVolume * 0.20;
    // Ganho de produtividade / Pacing operacional: +4% sobre a carteira
    const pacingGain = monthlyVolume * 0.04;
    const totalExtraRecovery = Math.round(recoveredWithTracker + pacingGain);

    const trackerInvestment = 3200;
    const netProfitGain = totalExtraRecovery - trackerInvestment;
    const roiMultiplier = Math.max(1, Math.round(totalExtraRecovery / trackerInvestment));

    // Comparativo com plataformas tradicionais que cobram por assento de operador (~R$ 160/licença)
    const competitorCost = operatorCount * 160;
    const monthlySavingsVsCompetitor = Math.max(0, competitorCost - trackerInvestment);

    return {
      totalExtraRecovery,
      netProfitGain,
      roiMultiplier,
      competitorCost,
      monthlySavingsVsCompetitor
    };
  }, [operatorCount, monthlyVolume, breakRate]);

  // Seções da Apresentação
  const navigationItems = [
    { id: 'overview', label: 'Visão Geral', icon: Sparkle },
    { id: 'cockpit', label: 'Cockpit Operacional', icon: PresentationChart },
    { id: 'roi', label: 'Simulador de ROI', icon: CurrencyDollar },
    { id: 'risk', label: 'Prevenção de Quebra', icon: Target },
    { id: 'pricing', label: 'Modelo de Parceria', icon: Crown },
    { id: 'ai_roadmap', label: 'Roadmap de IA', icon: Brain },
    { id: 'security', label: 'Segurança & Nuvem', icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-sky-500 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* BACKGROUND GLOWS SUTIS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-10 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[180px]" />
      </div>

      {/* HEADER EXECUTIVO FIXO */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* IDENTIDADE OFICIAL TRACKER */}
          <div className="flex items-center gap-3.5">
            <img 
              src="/logo.png" 
              alt="Tracker Logo" 
              className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]" 
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white uppercase font-mono">
                  Tracker Platform
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Enterprise
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
                Apresentação Executiva Interativa
              </span>
            </div>
          </div>

          {/* MENU DE NAVEGAÇÃO ENTRE MÓDULOS */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-white/10">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} weight={isActive ? 'bold' : 'regular'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* BADGE DE SESSÃO AO VIVO */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Pitch Deck Ao Vivo
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO MOBILE */}
        <div className="flex lg:hidden overflow-x-auto gap-1.5 pt-2.5 pb-1 no-scrollbar">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                    : 'bg-slate-900 border border-white/10 text-slate-400'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (RENDERIZAÇÃO POR SEÇÃO ATIVA) */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12">

        {/* ========================================================================= */}
        {/* SEÇÃO 1: VISÃO GERAL & DIAGNÓSTICO (HERO) */}
        {/* ========================================================================= */}
        {activeSection === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* HERO TITLE */}
            <div className="text-center max-w-4xl mx-auto space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-black uppercase tracking-widest">
                <Rocket size={16} weight="bold" />
                Inteligência Operacional em Tempo Real
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                Transforme sua Operação com <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400">Visibilidade Total</span> e Menos Quebras
              </h1>

              <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
                A Tracker é a plataforma executiva desenhada para elevar o faturamento e a produtividade de operações de cobrança e teleatendimento através de cockpits preditivos em tempo real.
              </p>
            </div>

            {/* OS 3 PILARES ESTRATÉGICOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-sky-500/40 transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Clock size={26} weight="bold" />
                </div>
                <h3 className="text-lg font-black text-white">Cockpit em Tempo Real</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Acompanhamento instantâneo de acordos gerados, pacing hora a hora e status dos operadores sem dependência de relatórios lentos de D-1.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Target size={26} weight="bold" />
                </div>
                <h3 className="text-lg font-black text-white">Prevenção Ativa de Quebras</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Matriz de risco inteligente que identifica promessas de pagamento com alta probabilidade de não pagamento antes do vencimento do boleto/PIX.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CurrencyDollar size={26} weight="bold" />
                </div>
                <h3 className="text-lg font-black text-white">Modelo All-Inclusive</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Um plano único com <strong>usuários ilimitados</strong>. Cresça a sua equipe de 10 para 200 operadores sem aumento de fatura de software.
                </p>
              </div>
            </div>

            {/* PAINEL DE IMPACTO VISUAL */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <ChartLineUp size={20} className="text-sky-400" />
                    <span>Métricas Médias Alcançadas por Nossos Parceiros</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Resultados consolidados em mais de 50 operações ativas</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Resgate de Acordos</span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400">+22%</p>
                  <span className="text-[11px] text-slate-500">recuperação sobre quebras</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Pacing Diário</span>
                  <p className="text-2xl sm:text-3xl font-black text-sky-400">+18%</p>
                  <span className="text-[11px] text-slate-500">aceleração na meta do mês</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Economia em Licenças</span>
                  <p className="text-2xl sm:text-3xl font-black text-purple-400">-75%</p>
                  <span className="text-[11px] text-slate-500">vs plataformas por assento</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Tempo de Implantação</span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-400">48 Horas</p>
                  <span className="text-[11px] text-slate-500">operação 100% ativa</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 2: COCKPIT OPERACIONAL MULTIVISÃO (INTERATIVO) */}
        {/* ========================================================================= */}
        {activeSection === 'cockpit' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-widest">
                <PresentationChart size={16} weight="bold" />
                Demonstração de Visões ao Vivo
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                A Ferramenta Certa para Cada Nível da Hierarquia
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Selecione o perfil abaixo para alternar a interface e visualizar como cada papel opera dentro da Tracker:
              </p>
            </div>

            {/* SELETOR DE PERFIS OPERACIONAIS */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { id: 'director', label: '👑 Diretoria / Gerência', desc: 'Metas Macro & Faturamento' },
                { id: 'supervisor', label: '👥 Supervisão de Equipe', desc: 'Cockpit Hora a Hora & Risco' },
                { id: 'operator', label: '🎧 Operador de Atendimento', desc: 'Metas Pessoais & Negociação' },
                { id: 'qa', label: '🛡️ Monitoria / Qualidade', desc: 'Auditoria 360° & Feedbacks' }
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => setActivePreviewRole(role.id as any)}
                  className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer text-left border ${
                    activePreviewRole === role.id 
                      ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border-sky-500 text-white shadow-lg shadow-sky-500/20' 
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <p className="font-bold text-sm">{role.label}</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">{role.desc}</p>
                </button>
              ))}
            </div>

            {/* MOCKUP INTERATIVO DA INTERFACE SELECIONADA */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-md space-y-6">
              
              {/* CABEÇALHO DO MOCKUP COM LOGO TRACKER */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Tracker" className="h-7 w-auto object-contain" />
                  <div>
                    <span className="text-xs font-bold text-slate-300">
                      Ambiente de Operação: <strong>Empresa Exemplo S.A.</strong>
                    </span>
                    <p className="text-[10px] text-slate-500">Visualização ativa: {activePreviewRole.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    STATUS: ONLINE (100% REAL-TIME)
                  </span>
                </div>
              </div>

              {/* CONTEÚDO DINÂMICO CONFORME O PERFIL SELECIONADO */}
              {activePreviewRole === 'director' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Recuperado no Mês</span>
                      <p className="text-2xl font-black text-emerald-400">R$ 1.842.600</p>
                      <span className="text-[10px] text-emerald-500 font-bold">↑ 14.8% vs mês anterior</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Meta Global</span>
                      <p className="text-2xl font-black text-white">88.4%</p>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-sky-400 h-full w-[88%]" />
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Índice de Quebra</span>
                      <p className="text-2xl font-black text-purple-400">18.2%</p>
                      <span className="text-[10px] text-slate-500">Média de mercado: 26%</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Ticket Médio</span>
                      <p className="text-2xl font-black text-sky-400">R$ 1.480</p>
                      <span className="text-[10px] text-slate-500">1.245 acordos fechados</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-3">
                    <span className="text-xs font-black uppercase text-slate-400 block">Ranking Executivo de Carteiras / Produtos</span>
                    <div className="space-y-2">
                      {[
                        { name: 'Carteira Cartões / Varejo', value: 'R$ 780.000', pct: '94% da Meta', color: 'bg-emerald-500' },
                        { name: 'Carteira Veículos & Financiamentos', value: 'R$ 620.000', pct: '86% da Meta', color: 'bg-sky-500' },
                        { name: 'Carteira Empréstimo Pessoal', value: 'R$ 442.600', pct: '79% da Meta', color: 'bg-indigo-500' }
                      ].map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/5">
                          <span className="text-xs font-bold text-white">{c.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono font-bold text-slate-300">{c.value}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{c.pct}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePreviewRole === 'supervisor' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Produção Hora a Hora</span>
                      <p className="text-2xl font-black text-sky-400">42 Acordos / Hora</p>
                      <span className="text-[10px] text-slate-500">Pico operacional às 14:30</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/20 bg-rose-950/10 space-y-1">
                      <span className="text-[10px] font-black uppercase text-rose-300">Alerta de Risco de Quebra</span>
                      <p className="text-2xl font-black text-rose-400">14 Casos Críticos</p>
                      <span className="text-[10px] text-rose-400/80">Boletos a vencer nas próx. 24h</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Operadores Ativos</span>
                      <p className="text-2xl font-black text-emerald-400">24 / 25 Logados</p>
                      <span className="text-[10px] text-emerald-400/80">96% de adesão à escala</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-3">
                    <span className="text-xs font-black uppercase text-slate-400 block">Painel em Tempo Real de Operadores da Equipe</span>
                    <div className="space-y-2">
                      {[
                        { name: 'Ana Souza', deals: '12 acordos (R$ 18.400)', status: 'Em Atendimento', color: 'text-emerald-400' },
                        { name: 'Carlos Ferreira', deals: '9 acordos (R$ 14.100)', status: 'Tabulando', color: 'text-sky-400' },
                        { name: 'Juliana Mendes', deals: '8 acordos (R$ 11.800)', status: 'Disponível', color: 'text-emerald-400' }
                      ].map((op, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/5">
                          <span className="text-xs font-bold text-white">{op.name}</span>
                          <span className="text-xs font-mono text-slate-300">{op.deals}</span>
                          <span className={`text-[10px] font-bold ${op.color}`}>{op.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePreviewRole === 'operator' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-slate-950 border border-indigo-500/30 space-y-1">
                      <span className="text-[10px] font-black uppercase text-indigo-300">Minha Meta do Dia</span>
                      <p className="text-2xl font-black text-white">R$ 12.000 / R$ 15.000</p>
                      <span className="text-[10px] text-indigo-300">Faltam apenas R$ 3.000 para bater!</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Minha Comissão Estimada</span>
                      <p className="text-2xl font-black text-emerald-400">R$ 1.420,00</p>
                      <span className="text-[10px] text-slate-500">Cálculo transparente em tempo real</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Meus Acordos Hoje</span>
                      <p className="text-2xl font-black text-sky-400">8 Acordos</p>
                      <span className="text-[10px] text-slate-500">Taxa de conversão: 34%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">Calculadora Inteligente de Descontos & Parcelas</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Permite ao operador simular cenários autorizados sem precisar chamar o supervisor</p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-sky-500/20 text-sky-300 text-xs font-black border border-sky-500/30">
                      Gatilhos Ativos
                    </span>
                  </div>
                </div>
              )}

              {activePreviewRole === 'qa' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Nota Média de Monitoria</span>
                      <p className="text-2xl font-black text-purple-400">94.8 / 100</p>
                      <span className="text-[10px] text-slate-500">Conformidade e Script</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Auditorias Realizadas</span>
                      <p className="text-2xl font-black text-sky-400">142 no Mês</p>
                      <span className="text-[10px] text-slate-500">Amostragem com gravação anexada</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Feedbacks Aplicados</span>
                      <p className="text-2xl font-black text-emerald-400">100% Cientes</p>
                      <span className="text-[10px] text-slate-500">Assinatura digital do operador</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 p-4 space-y-2">
                    <span className="text-xs font-bold text-white block">Régua de Qualidade & Retenção de Áudios</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Gravações e formulários de auditoria integrados ao Cloudflare R2 com retenção automatizada de segurança.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 3: SIMULADOR DE IMPACTO FINANCEIRO & ROI (AO VIVO) */}
        {/* ========================================================================= */}
        {activeSection === 'roi' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-widest">
                <CurrencyDollar size={16} weight="bold" />
                Simulador de Retorno Financeiro
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Calcule o Retorno Real para a sua Operação
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Ajuste os controles abaixo com os números da sua empresa para projetar o impacto financeiro da Tracker:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* CONTROLES / SLIDERS (LADO ESQUERDO) */}
              <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 space-y-6">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <SlidersHorizontal size={20} className="text-sky-400" />
                  <span>Parâmetros da Sua Operação</span>
                </h3>

                {/* SLIDER 1: OPERADORES */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-300">Quantidade de Operadores</span>
                    <span className="px-3 py-1 rounded-xl bg-sky-500/20 text-sky-300 font-mono font-black">
                      {operatorCount} operadores
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="150" 
                    step="5"
                    value={operatorCount}
                    onChange={(e) => setOperatorCount(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>5 op.</span>
                    <span>50 op.</span>
                    <span>150 op.</span>
                  </div>
                </div>

                {/* SLIDER 2: VOLUME MENSAL */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-300">Volume Trabalhado / Mês</span>
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-black">
                      {formatCurrency(monthlyVolume)}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="300000" 
                    max="10000000" 
                    step="100000"
                    value={monthlyVolume}
                    onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>R$ 300 mil</span>
                    <span>R$ 5 mi</span>
                    <span>R$ 10 mi</span>
                  </div>
                </div>

                {/* SLIDER 3: TAXA DE QUEBRA */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-300">Taxa Média de Quebra Atual</span>
                    <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-mono font-black">
                      {breakRate}% quebra
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="45" 
                    step="1"
                    value={breakRate}
                    onChange={(e) => setBreakRate(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>10% (Baixa)</span>
                    <span>25% (Típica)</span>
                    <span>45% (Crítica)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/15 text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong>Metodologia Conservadora:</strong> Consideramos um resgate direto de 20% sobre as quebras identificadas preventivamente pelo Radar de Risco, somado a 4% de ganho de produtividade com o Pacing em tempo real.
                </div>
              </div>

              {/* RESULTADOS / RETORNO FINANCEIRO (LADO DIREITO) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* CARD DE DESTAQUE: GANHO ESTIMADO */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <TrendUp size={18} weight="bold" />
                      Impacto Financeiro Extra Estimado
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ROI de {roiCalculations.roiMultiplier}x
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-4xl sm:text-5xl font-black text-emerald-300 font-mono tracking-tight">
                      +{formatCurrency(roiCalculations.totalExtraRecovery)}
                    </p>
                    <p className="text-xs text-slate-400">
                      em faturamento recuperado todos os meses que sua operação hoje deixa na mesa.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Investimento Mensal Tracker</span>
                      <p className="text-xl font-black text-white font-mono">R$ 3.200 / mês</p>
                      <span className="text-[10px] text-emerald-400 font-bold">Usuários Ilimitados</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Lucro Líquido Adicional</span>
                      <p className="text-xl font-black text-emerald-400 font-mono">
                        +{formatCurrency(roiCalculations.netProfitGain)}
                      </p>
                      <span className="text-[10px] text-slate-400">já descontado o custo do sistema</span>
                    </div>
                  </div>
                </div>

                {/* COMPARAÇÃO VS SOFTWARE TRADICIONAL POR ASSENTO */}
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                    Comparativo vs. Concorrência Tradicional (Cobrança por Licença de Operador)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-1">
                      <span className="text-slate-400 block font-bold">Mercado (~R$ 160 / operador)</span>
                      <p className="text-lg font-black text-rose-300 font-mono">
                        {formatCurrency(roiCalculations.competitorCost)} / mês
                      </p>
                      <span className="text-[10px] text-rose-400/80">Trava contratação de novos operadores</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-1">
                      <span className="text-slate-400 block font-bold">Economia Mensal com Tracker</span>
                      <p className="text-lg font-black text-sky-300 font-mono">
                        {formatCurrency(roiCalculations.monthlySavingsVsCompetitor)} / mês
                      </p>
                      <span className="text-[10px] text-sky-300">Economia pura em licenças de software</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 4: PREVENÇÃO DE QUEBRAS (RADAR DE RISCO) */}
        {/* ========================================================================= */}
        {activeSection === 'risk' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest">
                <Target size={16} weight="bold" />
                Inteligência Preditiva de Carteira
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Como Funciona a Prevenção Ativa de Quebra
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                O maior vazamento de faturamento em cobrança acontece entre o acordo fechado e o pagamento do boleto. Veja como a Tracker estanca essa perda:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black font-mono">
                  01
                </div>
                <h3 className="text-base font-black text-white">Detecção Precoce de Sinais</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O sistema analisa prazo de vencimento, histórico de tentativas anteriores e canais de contato para classificar a probabilidade de inadimplência em tempo real.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black font-mono">
                  02
                </div>
                <h3 className="text-base font-black text-white">Fila de Recontato Preventivo</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gera automaticamente alertas para que os operadores façam recontatos estratégicos (Preventiva) antes do vencimento do boleto ou PIX.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black font-mono">
                  03
                </div>
                <h3 className="text-base font-black text-white">Conciliação Automática</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Validação instantânea dos comprovantes pagos, atualizando o status da carteira e recalculando a comissão do operador sem atrasos.
                </p>
              </div>
            </div>

            {/* MOCKUP VISUAL DO RADAR */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <WarningCircle size={18} className="text-amber-400" />
                  <span>Matriz de Risco ao Vivo no Cockpit</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Atualizado a cada 30 segundos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                  <span className="text-emerald-300 font-bold">🟢 Risco Baixo (Acordos Confiáveis)</span>
                  <p className="text-xl font-bold text-white font-mono">76% da carteira</p>
                  <span className="text-[10px] text-slate-500">Fluxo padrão de notificação</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-1">
                  <span className="text-amber-300 font-bold">🟡 Risco Moderado (Acompanhamento)</span>
                  <p className="text-xl font-bold text-white font-mono">16% da carteira</p>
                  <span className="text-[10px] text-slate-500">Mensagem preventiva programada</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-1">
                  <span className="text-rose-300 font-bold">🔴 Risco Alto (Ação Imediata)</span>
                  <p className="text-xl font-bold text-white font-mono">8% da carteira</p>
                  <span className="text-[10px] text-rose-400/80">Recontato por operador experiente</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 5: MODELO DE PARCERIA & PLANO ÚNICO */}
        {/* ========================================================================= */}
        {activeSection === 'pricing' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest">
                <Crown size={16} weight="bold" />
                Transparência Total de Investimento
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Um Único Plano. Sem Surpresas. Sem Limite de Usuários.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                A Tracker não cobra por operador. Acreditamos que seu software de gestão deve incentivar o crescimento da sua equipe, não puni-lo a cada nova contratação.
              </p>
            </div>

            {/* CARD ÚNICO DO PLANO ALL-INCLUSIVE */}
            <div className="max-w-3xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-sky-500/40 shadow-2xl space-y-8 relative overflow-hidden">
              
              {/* BADGE ENTERPRISE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-white">Tracker Enterprise All-Inclusive</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Plano Único
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Acesso irrestrito a todas as funcionalidades presentes e futuras da plataforma.</p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 font-bold block uppercase">Mensalidade Fixa</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono">R$ 3.200</span>
                    <span className="text-xs text-slate-400">/ mês</span>
                  </div>
                </div>
              </div>

              {/* LISTA COMPLETA DE ENTREGAS INCLUÍDAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                {[
                  '👥 Usuários & Operadores 100% Ilimitados',
                  '⚡ Cockpit Operacional em Tempo Real',
                  '🎯 Radar de Risco & Prevenção de Quebras',
                  '👑 Múltiplas Visões (Diretoria, Supervisão, Operador, QA)',
                  '🛠️ Suporte Executivo Direto de Segunda a Sexta',
                  '🚀 Novas Funcionalidades & Melhorias Contínuas',
                  '🤖 Roadmap de Inteligência Artificial sem custo extra',
                  '🔒 Multi-tenant com Isolamento de Dados Corporativo',
                  '🛡️ Biometria Windows Hello & Autenticação Segura',
                  '☁️ Infraestrutura em Nuvem de Alta Disponibilidade'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check size={12} weight="bold" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* NOTA DE CONTRATO SEM MULTA OU AMARRAÇÃO */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>✅ Sem taxa de setup oculta • Implantação guiada em até 48h</span>
                <span className="text-sky-400 font-bold font-mono">Contrato Corporativo</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 6: ROADMAP DE IA & INOVAÇÃO */}
        {/* ========================================================================= */}
        {activeSection === 'ai_roadmap' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest">
                <Brain size={16} weight="bold" />
                Evolução Contínua da Plataforma
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Roadmap de Inteligência Artificial
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Todas as inovações tecnológicas de IA são desenvolvidas continuamente e integradas à plataforma para nossos clientes parceiros:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* ITEM ROADMAP 1 */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Headphones size={22} weight="bold" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Em Produção
                  </span>
                </div>
                <h3 className="text-base font-black text-white">Speech Analytics & Transcrição</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Transcrição automática de áudios de atendimento para identificação de termos proibidos, promessas fora de alçada e conformidade regulatória.
                </p>
              </div>

              {/* ITEM ROADMAP 2 */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Brain size={22} weight="bold" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Próxima Release
                  </span>
                </div>
                <h3 className="text-base font-black text-white">Análise de Sentimento do Devedor</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mapeamento do tom de voz e palavras-chave na negociação para orientar o operador sobre a melhor abordagem no momento exato da chamada.
                </p>
              </div>

              {/* ITEM ROADMAP 3 */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Sparkle size={22} weight="bold" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Q4 / 2026
                  </span>
                </div>
                <h3 className="text-base font-black text-white">Copiloto Preditivo de Negociação</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sugestão em tempo real da melhor combinação de entrada e parcelamento com maior chance estatística de honra por aquele perfil de CPF.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 7: SEGURANÇA CORPORATIVA & INFRAESTRUTURA */}
        {/* ========================================================================= */}
        {activeSection === 'security' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-black uppercase tracking-widest">
                <ShieldCheck size={16} weight="bold" />
                Conformidade & Governança
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Segurança Corporativa em Nível Bancário
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Seus dados e de seus clientes protegidos sob os mais rígidos padrões de segurança da informação e LGPD:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Lock size={22} weight="bold" />
                </div>
                <h3 className="text-sm font-black text-white">Isolamento Multi-Tenant</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cada organização possui seus dados isolados com regras estritas de segurança a nível de documento.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={22} weight="bold" />
                </div>
                <h3 className="text-sm font-black text-white">Windows Hello & 2FA</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Autenticação nativa por biometria facial e leitor de impressão digital com kit de emergência em dois fatores.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Database size={22} weight="bold" />
                </div>
                <h3 className="text-sm font-black text-white">Redundância em Nuvem</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Infraestrutura distribuída com backup contínuo e 99.9% de SLA de disponibilidade operacional.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <CalendarCheck size={22} weight="bold" />
                </div>
                <h3 className="text-sm font-black text-white">Conformidade com LGPD</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Termos de uso, aceite digital no primeiro acesso e controle rígido de expiração de dados sensíveis.
                </p>
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* FOOTER EXECUTIVO COM LOGO OFICIAL */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/90 py-8 px-4 sm:px-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Tracker" className="h-8 w-auto object-contain" />
            <div>
              <p className="text-xs font-black text-white uppercase font-mono">Tracker Platform</p>
              <p className="text-[10px] text-slate-500">Plataforma de Gestão e Inteligência Operacional</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-xs text-slate-400">Apresentação Executiva Interativa de Alto Nível</p>
            <p className="text-[10px] text-slate-600">Material de uso restrito em reuniões comerciais • Todos os direitos reservados</p>
          </div>
        </div>
      </footer>

    </div>
  );
};
