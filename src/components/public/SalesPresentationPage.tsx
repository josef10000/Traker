import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
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
  Crown, 
  Database,
  Lock,
  CalendarCheck,
  Check,
  Clock,
  ChartPieSlice,
  ArrowsClockwise,
  Target,
  PresentationChart,
  Eye,
  SlidersHorizontal,
  WarningCircle,
  Brain,
  CaretDown,
  FileText,
  ChartBar,
  CloudCheck,
  Buildings,
  Scales,
  Lightbulb,
  Quotes
} from '@phosphor-icons/react';
import { formatCurrency } from '../../utils/masks';

export const SalesPresentationPage: React.FC = () => {
  // Estados do Simulador de ROI Interativo
  const [operatorCount, setOperatorCount] = useState<number>(25);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(1800000);
  const [breakRate, setBreakRate] = useState<number>(24);

  // Estado do Preview do Cockpit Multivisão
  const [activePreviewRole, setActivePreviewRole] = useState<'director' | 'supervisor' | 'operator' | 'qa'>('supervisor');

  // Estado do FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Cálculos Dinâmicos do Simulador de ROI (Baseado em Applied Behavioral Economics & Loss Aversion)
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

    // Comparativo contra modelo tradicional por licença (~R$ 160/operador)
    const competitorCost = operatorCount * 160;
    const monthlySavingsVsCompetitor = Math.max(0, competitorCost - trackerInvestment);

    return {
      brokenVolume,
      totalExtraRecovery,
      netProfitGain,
      roiMultiplier,
      competitorCost,
      monthlySavingsVsCompetitor
    };
  }, [operatorCount, monthlyVolume, breakRate]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-sky-500 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* BACKGROUND GLOWS SUTIS & PROFUNDIDADE */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[700px] h-[700px] bg-sky-500/10 rounded-full blur-[180px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[180px]" />
        <div className="absolute top-2/3 left-10 w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-[200px]" />
        <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[180px]" />
      </div>

      {/* HEADER EXECUTIVO FIXO CLÁSSICO */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* IDENTIDADE OFICIAL TRACKER */}
          <div className="flex items-center gap-3.5">
            <img 
              src="/logo.png" 
              alt="Tracker Logo" 
              className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]" 
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white uppercase font-mono">
                  Tracker Platform
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Enterprise
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Inteligência & Gestão Operacional em Tempo Real
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300">
              <Buildings size={16} className="text-sky-400" />
              <span>Para Operações de 10 a 500+ Operadores</span>
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* FLUXO CONTÍNUO VERTICAL (LANDING PAGE CLÁSSICA) */}
      {/* ========================================================================= */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-24">

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 1: HERO & PROPOSTA DE VALOR */}
        {/* ------------------------------------------------------------------------- */}
        <section className="text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-black uppercase tracking-widest">
            <Rocket size={16} weight="bold" />
            Visibilidade Absoluta • Mais Faturamento • Menos Quebras
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.12] tracking-tight">
            A Plataforma de Gestão que <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400">Estanca a Perda de Acordos</span> em Tempo Real
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Elimine relatórios atrasados de D-1. Acompanhe a produção hora a hora, identifique quebras antes do vencimento do boleto e escale sua operação com <strong>usuários ilimitados</strong> em um plano fixo.
          </p>

          {/* GRID DE MÉTRICAS COMPROVADAS DE MERCADO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6">
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Recuperação de Quebras</span>
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">+20%</p>
              <span className="text-xs text-slate-400">resgate de promessas de pgto</span>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pacing Diário</span>
              <p className="text-3xl sm:text-4xl font-black text-sky-400 font-mono">+18%</p>
              <span className="text-xs text-slate-400">aceleração da meta do mês</span>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Economia de Software</span>
              <p className="text-3xl sm:text-4xl font-black text-purple-400 font-mono">-70%</p>
              <span className="text-xs text-slate-400">vs licenças por operador</span>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Implantação Ágil</span>
              <p className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">48h</p>
              <span className="text-xs text-slate-400">operação pronta e rodando</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 2: AUTORIDADE & DADOS DE MERCADO (MCKINSEY & IGEOC) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-black uppercase tracking-widest">
              <Lightbulb size={16} weight="bold" />
              Evidências & Dados de Mercado
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              O Que Dizem os Estudos Globais e Setoriais de Cobrança
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Dados consolidados do mercado financeiro e das maiores consultorias comprovam o impacto direto da agilidade e da prevenção em tempo real:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* CARD MCKINSEY */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-sky-950/30 border border-sky-500/30 space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-400">
                  <Quotes size={28} weight="fill" />
                  <span className="text-xs font-black uppercase tracking-widest">McKinsey & Company</span>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Estudo Global de Recuperação
                </span>
              </div>

              <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed italic">
                &ldquo;Operações de cobrança e crédito que migram de processos manuais e reativos para <strong>gestão digital em tempo real e automação preventiva</strong> elevam as taxas de recuperação em até <strong>20%</strong> e reduzem os custos operacionais em até <strong>40%</strong>.&rdquo;
              </p>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Impacto Direto: <strong>Elevação de Margem & Agilidade</strong></span>
                <span className="text-sky-400 font-bold font-mono">Fonte: McKinsey Insights</span>
              </div>
            </div>

            {/* CARD IGEOC & BIRÔS */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/30 border border-purple-500/30 space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Quotes size={28} weight="fill" />
                  <span className="text-xs font-black uppercase tracking-widest">IGEOC & Birôs de Crédito</span>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Mercado Brasileiro
                </span>
              </div>

              <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed italic">
                &ldquo;Entre <strong>25% e 40% dos acordos fechados quebram</strong> por falta de acompanhamento antes do vencimento. O recontato preventivo nas primeiras <strong>24h a 48h antes do vencimento</strong> resgata mais de <strong>20% dos acordos</strong> que seriam perdidos.&rdquo;
              </p>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Fator Decisivo: <strong>Prevenção antes da quebra</strong></span>
                <span className="text-purple-400 font-bold font-mono">Setor de Cobrança Nacional</span>
              </div>
            </div>

          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 3: O DIAGNÓSTICO DO GARGALO (POR QUE AS OPERAÇÕES PERDEM DINHEIRO) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-black uppercase tracking-widest">
              <WarningCircle size={16} weight="bold" />
              Onde o Dinheiro Está Vazando na Sua Operação
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              O Modelo Tradicional de Cobrança Ficou no Passado
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Operações que utilizam relatórios manuais e CRMs genéricos enfrentam diariamente três grandes vazamentos de receita:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-gradient-to-b from-rose-950/20 to-slate-900/60 border border-rose-500/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Clock size={26} weight="bold" />
              </div>
              <h3 className="text-lg font-black text-white">A Ilusão do Relatório D-1</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Descobrir no dia seguinte que a equipe não bateu a meta da tarde não permite nenhuma reação. A gestão reativa custa milhares de reais em acordos perdidos todos os dias.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-950/20 to-slate-900/60 border border-amber-500/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Target size={26} weight="bold" />
              </div>
              <h3 className="text-lg font-black text-white">Quebras Despercebidas</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Mais de 25% dos acordos fechados nunca são pagos porque o devedor não recebe o reforço preventivo no momento certo antes do vencimento do boleto ou PIX.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-b from-purple-950/20 to-slate-900/60 border border-purple-500/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <CurrencyDollar size={26} weight="bold" />
              </div>
              <h3 className="text-lg font-black text-white">O Pedágio por Operador</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Softwares legados cobram R$ 150 a R$ 200 por licença. Ao expandir a equipe de 20 para 80 posições, sua conta de software explode, punindo o crescimento da empresa.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 4: BENCHMARKING EXECUTIVO (TRACKER VS MERCADO TRADICIONAL) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-widest">
              <Scales size={16} weight="bold" />
              Benchmarking de Mercado
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Por Que a Tracker é Superior às Plataformas Legadas
            </h2>
            <p className="text-sm text-slate-400">
              Compare lado a lado o modelo tradicional do mercado contra a arquitetura moderna da Tracker:
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-md">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80">
                  <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs">Critério Operacional</th>
                  <th className="p-5 font-black text-rose-400 uppercase tracking-wider text-xs">Softwares Tradicionais / Legados</th>
                  <th className="p-5 font-black text-emerald-400 uppercase tracking-wider text-xs bg-sky-500/10 border-l border-sky-500/30">
                    Tracker Platform Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="p-5 font-bold text-white">Modelo de Cobrança</td>
                  <td className="p-5 text-rose-300/90 font-medium">R$ 150 a R$ 250 / operador / mês (Custo escala)</td>
                  <td className="p-5 font-black text-emerald-300 bg-sky-500/5 border-l border-sky-500/20">
                    R$ 3.200 / mês fixo com USUÁRIOS ILIMITADOS
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-bold text-white">Velocidade dos Dados</td>
                  <td className="p-5 text-slate-400">Relatórios estáticos em D-1 (Reação tardia)</td>
                  <td className="p-5 font-black text-emerald-300 bg-sky-500/5 border-l border-sky-500/20">
                    Tempo Real Contínuo (Pacing hora a hora instantâneo)
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-bold text-white">Prevenção de Quebras</td>
                  <td className="p-5 text-slate-400">Reativo (espera o boleto vencer para cobrar de novo)</td>
                  <td className="p-5 font-black text-emerald-300 bg-sky-500/5 border-l border-sky-500/20">
                    Radar de Risco Preditivo (Age 24h a 48h antes do vencimento)
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-bold text-white">Visões por Cargo</td>
                  <td className="p-5 text-slate-400">Telas genéricas iguais para todos os níveis</td>
                  <td className="p-5 font-black text-emerald-300 bg-sky-500/5 border-l border-sky-500/20">
                    4 Cockpits dedicados (Diretoria, Supervisão, Operador, QA)
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-bold text-white">Taxa de Setup & Adesão</td>
                  <td className="p-5 text-slate-400">R$ 5.000 a R$ 15.000 + semanas de implantação</td>
                  <td className="p-5 font-black text-emerald-300 bg-sky-500/5 border-l border-sky-500/20">
                    Zero taxa oculta • Implantação e treinamento em 48h
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 5: COCKPIT OPERACIONAL MULTIVISÃO (INTERATIVO) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-widest">
              <PresentationChart size={16} weight="bold" />
              A Solução Tracker
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Cockpits Especializados para Cada Papel da Operação
            </h2>
            <p className="text-sm text-slate-400">
              Alterne os perfis abaixo para ver a visão de trabalho customizada para cada nível da hierarquia:
            </p>
          </div>

          {/* SELETOR DE PERFIS */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { id: 'director', label: '👑 Diretoria / Gerência', desc: 'Faturamento, Pacing & Metas Globais' },
              { id: 'supervisor', label: '👥 Supervisão de Equipe', desc: 'Cockpit Hora a Hora & Radar de Risco' },
              { id: 'operator', label: '🎧 Operador', desc: 'Metas Pessoais & Produtividade' },
              { id: 'qa', label: '🛡️ Monitoria / Qualidade', desc: 'Auditorias 360° & Feedbacks' }
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

          {/* PAINEL DINÂMICO DO MOCKUP COM LOGO OFICIAL TRACKER */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Tracker" className="h-7 w-auto object-contain" />
                <div>
                  <span className="text-xs font-bold text-slate-300">
                    Empresa Parceira • <strong>Painel em Tempo Real</strong>
                  </span>
                  <p className="text-[10px] text-slate-500">Módulo Ativo: {activePreviewRole.toUpperCase()}</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sincronização Contínua
              </span>
            </div>

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
                      { name: 'Carteira Cartões / Varejo', value: 'R$ 780.000', pct: '94% da Meta' },
                      { name: 'Carteira Financiamento Auto', value: 'R$ 620.000', pct: '86% da Meta' },
                      { name: 'Carteira Empréstimo Pessoal', value: 'R$ 442.600', pct: '79% da Meta' }
                    ].map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/5 text-xs">
                        <span className="font-bold text-white">{c.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-slate-300">{c.value}</span>
                          <span className="font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{c.pct}</span>
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
                  <span className="text-xs font-black uppercase text-slate-400 block">Monitoramento ao Vivo de Operadores</span>
                  <div className="space-y-2">
                    {[
                      { name: 'Ana Souza', deals: '12 acordos (R$ 18.400)', status: 'Em Atendimento', color: 'text-emerald-400' },
                      { name: 'Carlos Ferreira', deals: '9 acordos (R$ 14.100)', status: 'Tabulando', color: 'text-sky-400' },
                      { name: 'Juliana Mendes', deals: '8 acordos (R$ 11.800)', status: 'Disponível', color: 'text-emerald-400' }
                    ].map((op, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/5 text-xs">
                        <span className="font-bold text-white">{op.name}</span>
                        <span className="font-mono text-slate-300">{op.deals}</span>
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

                <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">Visão Direta de Desempenho & Metas Individuais</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Interface limpa que motiva o operador a acompanhar suas conversões e comissões minuto a minuto</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-sky-500/20 text-sky-300 text-xs font-black border border-sky-500/30">
                    Tempo Real
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
                    <span className="text-[10px] text-slate-500">Amostragem com anexo de gravação</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Feedbacks Aplicados</span>
                    <p className="text-2xl font-black text-emerald-400">100% Cientes</p>
                    <span className="text-[10px] text-slate-500">Assinatura digital do colaborador</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 p-4 space-y-1 text-xs">
                  <span className="font-bold text-white block">Régua de Qualidade & Retenção de Provas de Atendimento</span>
                  <p className="text-slate-400 leading-relaxed text-xs">
                    Armazenamento seguro de evidências, roteiros de conformidade e histórico de evolução por operador.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 6: PREVENÇÃO DE QUEBRAS (RADAR DE RISCO PREDITIVO) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest">
              <Target size={16} weight="bold" />
              Prevenção Ativa de Quebra
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Pare de Esperar o Boleto Vencer para Agir
            </h2>
            <p className="text-sm text-slate-400">
              O Radar de Risco da Tracker classifica cada acordo em tempo real e ativa gatilhos de recontato preventivo:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black font-mono">
                01
              </div>
              <h3 className="text-base font-black text-white">Análise Preditiva de Prazo</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Mapeia acordos com vencimento em até 48 horas e perfil de risco elevado, separando quem precisa de lembrete imediato.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black font-mono">
                02
              </div>
              <h3 className="text-base font-black text-white">Fila de Recontato Preventivo</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Distribui automaticamente os casos críticos para a equipe de supervisão e operadores experientes reforçarem o canal de pagamento.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black font-mono">
                03
              </div>
              <h3 className="text-base font-black text-white">Conciliação Instantânea</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Baixa os acordos pagos em segundos, liberando a comissão do operador e atualizando o atingimento de metas da empresa.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 7: SIMULADOR DE ROI INTERATIVO (CALCULADORA DE RETORNO) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-widest">
              <CurrencyDollar size={16} weight="bold" />
              Calculadora de Retorno Financeiro
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Simule o Ganho Real na Sua Carteira
            </h2>
            <p className="text-sm text-slate-400">
              Ajuste os parâmetros abaixo com os dados reais da sua operação para ver o faturamento extra projetado:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* CONTROLES / SLIDERS */}
            <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 space-y-6">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-sky-400" />
                <span>Dados da Sua Operação</span>
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
                  <span className="text-slate-300">Volume de Acordos / Mês</span>
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
                    {breakRate}% de quebra
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
                💡 <strong>Cálculo Conservador:</strong> Projeção baseada em resgate de 20% sobre as quebras evitadas pelo Radar de Risco somado a 4% de ganho de pacing com visibilidade em tempo real.
              </div>
            </div>

            {/* RETORNO FINANCEIRO ESTIMADO */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <TrendUp size={18} weight="bold" />
                    Faturamento Adicional Estimado
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Retorno de {roiCalculations.roiMultiplier}x
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-4xl sm:text-5xl font-black text-emerald-300 font-mono tracking-tight">
                    +{formatCurrency(roiCalculations.totalExtraRecovery)}
                  </p>
                  <p className="text-xs text-slate-400">
                    em faturamento recuperado todos os meses que hoje sua operação deixa na mesa.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Mensalidade Fixa Tracker</span>
                    <p className="text-xl font-black text-white font-mono">R$ 3.200 / mês</p>
                    <span className="text-[10px] text-emerald-400 font-bold">Usuários Ilimitados</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Ganho Líquido Direto</span>
                    <p className="text-xl font-black text-emerald-400 font-mono">
                      +{formatCurrency(roiCalculations.netProfitGain)}
                    </p>
                    <span className="text-[10px] text-slate-400">já descontado o custo do sistema</span>
                  </div>
                </div>
              </div>

              {/* COMPARAÇÃO VS CONCORRÊNCIA POR LICENÇA */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                  Comparativo vs. Concorrência (Cobrança Tradicional por Assento)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-1">
                    <span className="text-slate-400 block font-bold">Mercado (~R$ 160 / operador)</span>
                    <p className="text-lg font-black text-rose-300 font-mono">
                      {formatCurrency(roiCalculations.competitorCost)} / mês
                    </p>
                    <span className="text-[10px] text-rose-400/80">Custo escala com o time</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-1">
                    <span className="text-slate-400 block font-bold">Economia Mensal com Tracker</span>
                    <p className="text-lg font-black text-sky-300 font-mono">
                      {formatCurrency(roiCalculations.monthlySavingsVsCompetitor)} / mês
                    </p>
                    <span className="text-[10px] text-sky-300">Economia direta de licenças</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 8: ROADMAP DE INTELIGÊNCIA ARTIFICIAL (FUTURO / PREVISÃO) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest">
              <Brain size={16} weight="bold" />
              Inovação Futura • Em Desenvolvimento
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Roadmap de Inteligência Artificial
            </h2>
            <p className="text-sm text-slate-400">
              Conheça as tecnologias avançadas de IA que estão no nosso roadmap de evolução contínua e serão integradas à plataforma sem custo adicional:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ITEM 1 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Headphones size={24} weight="bold" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Previsão Q3 / 2026
                </span>
              </div>
              <h3 className="text-base font-black text-white">Speech Analytics & Transcrição de Áudio</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Transcrição automática de ligações e áudios para auditar scripts de atendimento, identificar termos proibidos e verificar conformidade.
              </p>
              <div className="pt-2 text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                <span>⚡ Em fase de testes e homologação</span>
              </div>
            </div>

            {/* ITEM 2 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Brain size={24} weight="bold" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Previsão Q4 / 2026
                </span>
              </div>
              <h3 className="text-base font-black text-white">Análise de Sentimento do Devedor</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Reconhecimento de padrões de hesitação e objeções durante o diálogo para orientar o operador em tempo real sobre a melhor postura de fechamento.
              </p>
              <div className="pt-2 text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                <span>⚡ Em desenvolvimento de modelos</span>
              </div>
            </div>

            {/* ITEM 3 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sparkle size={24} weight="bold" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Planejado 2027
                </span>
              </div>
              <h3 className="text-base font-black text-white">Copiloto Preditivo de Negociação</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sugestão instantânea da melhor combinação de entrada e parcelamento com maior probabilidade estatística de pagamento para cada perfil de CPF.
              </p>
              <div className="pt-2 text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                <span>⚡ Pesquisa e modelagem estatística</span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 9: MODELO DE PARCERIA & PLANO ÚNICO */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest">
              <Crown size={16} weight="bold" />
              Transparência Total
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Investimento Claro. Sem Pegadinhas. Sem Limites de Assento.
            </h2>
            <p className="text-sm text-slate-400">
              A Tracker opera no modelo All-Inclusive Enterprise. Sua empresa paga uma assinatura mensal única e pode cadastrar quantos operadores e equipes precisar.
            </p>
          </div>

          <div className="max-w-3xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-sky-500/40 shadow-2xl space-y-8 relative overflow-hidden">
            
            {/* CABEÇALHO DO PLANO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-white">Tracker Enterprise</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Plano Único
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Acesso irrestrito e completo a todas as ferramentas da plataforma.</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 font-bold block uppercase">Mensalidade Fixa</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">R$ 3.200</span>
                  <span className="text-xs text-slate-400">/ mês</span>
                </div>
              </div>
            </div>

            {/* BENEFÍCIOS INCLUÍDOS (LISTA LIMPA COM APENAS CHECK VERDE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              {[
                'Usuários & Operadores 100% Ilimitados',
                'Cockpit Operacional em Tempo Real',
                'Radar de Risco & Prevenção de Quebras',
                'Múltiplas Visões (Diretoria, Supervisão, Operador, QA)',
                'Suporte Executivo Direto de Segunda a Sexta',
                'Novas Funcionalidades & Melhorias Contínuas',
                'Roadmap de IA sem custo de adesão adicional',
                'Multi-tenant com Isolamento de Dados Corporativo',
                'Infraestrutura em Nuvem de Alta Disponibilidade',
                'Telemetria FinOps & Exportação de Relatórios'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={12} weight="bold" />
                  </div>
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check size={10} weight="bold" />
                </div>
                <span>Sem taxas ocultas de setup • Implantação e treinamento inclusos</span>
              </div>
              <span className="text-sky-400 font-bold font-mono">Contrato Corporativo</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 10: SEGURANÇA CORPORATIVA & GOVERNANÇA */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-black uppercase tracking-widest">
              <ShieldCheck size={16} weight="bold" />
              Segurança & Infraestrutura
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Arquitetura Segura para Operações Críticas
            </h2>
            <p className="text-sm text-slate-400">
              Garantia de integridade, sigilo e alta disponibilidade dos dados da sua empresa:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Lock size={22} weight="bold" />
              </div>
              <h3 className="text-sm font-black text-white">Isolamento Multi-Tenant</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada empresa possui sua base segregada com regras estritas de segurança a nível de documento no banco de dados.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={22} weight="bold" />
              </div>
              <h3 className="text-sm font-black text-white">Criptografia Ponta a Ponta</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Comunicações criptografadas via TLS 1.3 e proteção de senhas via hash criptográfico seguro no Firebase Auth.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Database size={22} weight="bold" />
              </div>
              <h3 className="text-sm font-black text-white">Alta Disponibilidade</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Infraestrutura distribuída com redundância global de servidores e 99.9% de SLA operacional.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <CalendarCheck size={22} weight="bold" />
              </div>
              <h3 className="text-sm font-black text-white">Conformidade LGPD</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Termos de uso formais, controle de acesso por níveis de cargo e política estrita de descarte de dados sensíveis.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* BLOCO 11: FAQ EXECUTIVO (RESOLUÇÃO DE OBJEÇÕES) */}
        {/* ------------------------------------------------------------------------- */}
        <section className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Perguntas Frequentes de Gestores & Diretores
            </h2>
            <p className="text-sm text-slate-400">
              Esclarecimentos técnicos e operacionais sobre a implantação da Tracker:
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {[
              {
                q: 'Quanto tempo leva para a plataforma estar 100% ativa na minha operação?',
                a: 'A implantação padrão leva até 48 horas. Nossa equipe realiza a configuração da sua empresa, cadastro das equipes e alçadas de negociação, entregando o ambiente pronto para uso imediato.'
              },
              {
                q: 'Existe algum limite de operadores ou cobrança por usuário adicional?',
                a: 'Não. O plano Enterprise possui usuários e operadores 100% ilimitados. Sua mensalidade de R$ 3.200 permanece rigorosamente a mesma se sua equipe tiver 15 ou 150 colaboradores.'
              },
              {
                q: 'A Tracker substitui nosso discador ou integra com nossos sistemas atuais?',
                a: 'A Tracker atua como o Cockpit Central de Inteligência e Gestão. Ela convive em harmonia com qualquer discador ou telefonia do mercado, centralizando os acordos, comissões, monitoria e prevenção de quebra.'
              },
              {
                q: 'Como funciona o suporte técnico e atendimento?',
                a: 'Oferecemos suporte executivo direto de segunda a sexta-feira via canal dedicado, além de treinamentos e melhorias contínuas incluídas na mensalidade.'
              }
            ].map((faq, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <div 
                  key={i}
                  className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <CaretDown size={18} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-400' : 'text-slate-400'}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* FOOTER EXECUTIVO COM LOGO OFICIAL */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/90 py-10 px-4 sm:px-8 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <img src="/logo.png" alt="Tracker" className="h-8 w-auto object-contain" />
            <div>
              <p className="text-xs font-black text-white uppercase font-mono">Tracker Platform</p>
              <p className="text-[10px] text-slate-500">Plataforma de Gestão & Inteligência Operacional</p>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-0.5">
            <p className="text-xs text-slate-400">Tracker Enterprise • Apresentação Executiva Corporativa</p>
            <p className="text-[10px] text-slate-600">Material confidencial para reuniões comerciais • Todos os direitos reservados</p>
          </div>
        </div>
      </footer>

    </div>
  );
};
