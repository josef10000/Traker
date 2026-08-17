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
  WhatsappLogo, 
  ArrowRight, 
  FilePdf, 
  CurrencyDollar, 
  ChartLineUp, 
  Play, 
  Cpu, 
  Star, 
  Crown, 
  Funnel, 
  Database,
  Lock,
  CaretDown,
  Info,
  CalendarCheck,
  Check
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/masks';
import { jsPDF } from 'jspdf';

interface SalesPresentationPageProps {
  onStartDemo?: (role: any) => void;
}

export const SalesPresentationPage: React.FC<SalesPresentationPageProps> = ({ onStartDemo }) => {
  const navigate = useNavigate();

  // Estados do Simulador de ROI
  const [operatorCount, setOperatorCount] = useState<number>(20);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(1500000);
  const [breakRate, setBreakRate] = useState<number>(25);

  // Estado do Preview Interativo do Hero
  const [activePreviewRole, setActivePreviewRole] = useState<'director' | 'supervisor' | 'operator' | 'qa'>('supervisor');

  // Estado do FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Estado do Modal de Proposta Comercial em PDF
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [leadCompanyName, setLeadCompanyName] = useState('');
  const [leadContactName, setLeadContactName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Cálculos do Simulador de ROI
  const roiCalculations = useMemo(() => {
    // Estimativa conservadora: recuperação de 18% a 25% dos acordos que quebrariam
    const brokenVolume = (monthlyVolume * (breakRate / 100));
    const recoveredWithRiskCockpit = brokenVolume * 0.22; // 22% de resgate
    const efficiencyGain = (monthlyVolume * 0.05); // +5% de ganho de pacing
    const totalExtraRecovery = Math.round(recoveredWithRiskCockpit + efficiencyGain);

    const trackerInvestment = 3200;
    const netProfitGain = totalExtraRecovery - trackerInvestment;
    const roiMultiplier = Math.round(totalExtraRecovery / trackerInvestment);

    // Custo na concorrência tradicional que cobra por licença de operador (R$ 180/operador)
    const competitorCost = operatorCount * 180;
    const monthlySavingsVsCompetitor = Math.max(0, competitorCost - trackerInvestment);

    return {
      totalExtraRecovery,
      netProfitGain,
      roiMultiplier,
      competitorCost,
      monthlySavingsVsCompetitor
    };
  }, [operatorCount, monthlyVolume, breakRate]);

  // Ação de navegar para a Demo interativa
  const handleGoToDemo = (role: string = 'supervisor') => {
    if (onStartDemo) {
      onStartDemo(role);
    } else {
      navigate(`/demo?role=${role}`);
    }
  };

  // Disparo de conversa no WhatsApp Comercial
  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Gostaria de agendar uma apresentação executiva da Plataforma Tracker para a minha operação de ${operatorCount} operadores.`
    );
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  };

  // Gerador de Proposta Comercial Formal em PDF
  const handleGenerateProposalPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const company = leadCompanyName.trim() || 'Sua Empresa';
      const contact = leadContactName.trim() || 'Diretoria / Gestão';

      // Cabeçalho
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(56, 189, 248); // Sky-400
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('TRACKER PLATFORM', 15, 20);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Proposta Comercial & Solução de Gestão de Cobrança de Alta Performance', 15, 28);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Validade: 15 dias`, 15, 35);

      // Destinatário
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`Apresentado para: ${company}`, 15, 58);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`A/C: ${contact}`, 15, 64);
      if (leadEmail) doc.text(`E-mail: ${leadEmail}`, 15, 70);

      // Resumo da Oferta
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 78, 180, 48, 4, 4, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PLANO ALL-INCLUSIVE ENTERPRISE', 20, 88);

      doc.setTextColor(16, 185, 129); // Emerald
      doc.setFontSize(16);
      doc.text('R$ 3.200,00 / mês', 20, 98);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('• Usuários, Operadores e Equipes ILIMITADOS (sem cobrança por assento)', 20, 106);
      doc.text('• Suporte Técnico Prioritário de Segunda a Sexta-feira', 20, 112);
      doc.text('• Todas as Novas Melhorias, Atualizações e Roadmap de IA Preditiva Inclusos', 20, 118);

      // Pilares Tecnológicos
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Principais Módulos & Benefícios Inclusos:', 15, 138);

      const items = [
        '1. Cockpit de Risco no Dia com acionamento WhatsApp em 1 clique (resgate de quebras);',
        '2. BI & Analytics Preditivo com Heatmaps e Previsão de Liquidez;',
        '3. Biblioteca de Ouro no Monitor de Qualidade (Gravações e Treinamento);',
        '4. Comparador Multi-Nível (Benchmark entre Equipes, Supervisores e Operadores);',
        '5. Módulo Back Office com Higienização e Deduplicação Inteligente de CPFs;',
        '6. Segurança Enterprise com Criptografia SHA-256 e Conformidade LGPD & PJ.'
      ];

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      let y = 146;
      items.forEach(it => {
        doc.text(it, 18, y);
        y += 8;
      });

      // Simulação de Retorno
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(15, 200, 180, 42, 4, 4, 'F');

      doc.setTextColor(67, 56, 202);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Projeção Financeira & ROI Estimado:', 20, 210);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`• Tamanho da Operação Simulado: ${operatorCount} operadores`, 20, 218);
      doc.text(`• Recuperação Adicional Projetada: ~ ${formatCurrency(roiCalculations.totalExtraRecovery)} / mês`, 20, 225);
      doc.text(`• Múltiplo de Retorno sobre o Investimento: ~ ${roiCalculations.roiMultiplier}x o valor da mensalidade`, 20, 232);

      // Rodapé
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Tracker Platform • Tecnologia de Ponta em Recuperação de Crédito • www.trackerplatform.com.br', 15, 280);

      doc.save(`Proposta_Comercial_Tracker_${company.replace(/\s+/g, '_')}.pdf`);
      setIsProposalModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-sky-500 selection:text-white relative overflow-x-hidden">
      {/* Luz de Fundo e Gradientes Decorativos */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-sky-600/15 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-emerald-600/10 blur-[130px] pointer-events-none -z-10" />

      {/* NAVBAR FLUTUANTE */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/10 px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 border border-white/20">
              <Rocket size={22} weight="fill" className="text-white" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                TRACKER <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">Enterprise</span>
              </span>
            </div>
          </div>

          {/* Links Rápidos Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            <a href="#roi-calculator" className="hover:text-sky-400 transition-colors">Simulador de ROI</a>
            <a href="#features" className="hover:text-sky-400 transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-sky-400 transition-colors">Plano & Valores</a>
            <a href="#comparison" className="hover:text-sky-400 transition-colors">Comparativo</a>
            <a href="#faq" className="hover:text-sky-400 transition-colors">Dúvidas Frequentes</a>
          </nav>

          {/* CTAs do Topo */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsProposalModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              <FilePdf size={15} className="text-rose-400" />
              <span>Gerar Proposta PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handleGoToDemo('supervisor')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-500/25 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Play size={14} weight="fill" />
              <span>Testar Demonstração</span>
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto text-center space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-black uppercase tracking-widest shadow-inner">
            <Sparkle size={15} weight="fill" className="text-amber-400" />
            Plano All-Inclusive • Usuários Ilimitados • Sem Taxa por Operador
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            A Máquina Definitiva de Gestão e <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Recuperação de Crédito</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
            Acompanhe sua carteira em tempo real, resgate acordos em risco de vencimento no dia pelo WhatsApp e escale sua operação de cobrança sem travar seu orçamento com licenças individuais.
          </p>
        </motion.div>

        {/* Botões de Ação do Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <button
            type="button"
            onClick={() => handleGoToDemo('supervisor')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-black text-sm uppercase tracking-wider shadow-2xl shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Play size={18} weight="fill" />
            <span>Experimentar Demonstração Gratuita</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 font-bold text-sm transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <WhatsappLogo size={20} weight="fill" />
            <span>Falar com Consultor no WhatsApp</span>
          </button>
        </motion.div>

        {/* Badges de Confiança */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> Usuários Ilimitados</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> Suporte Seg a Sex Incluso</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> IA & Analytics Preditivo</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> Conformidade LGPD & PJ</span>
        </div>

        {/* Preview Interativo com Alternância de Cargos */}
        <div className="pt-8 max-w-5xl mx-auto">
          <div className="p-3 bg-slate-950/80 rounded-3xl border border-white/10 shadow-2xl space-y-3">
            {/* Seletor de Visão do Cargo */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-white/5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Crown size={15} className="text-amber-400" />
                Selecione a Visão da Operação:
              </span>

              <div className="flex p-1 rounded-xl bg-slate-900 border border-white/5 gap-1">
                <button
                  type="button"
                  onClick={() => setActivePreviewRole('supervisor')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePreviewRole === 'supervisor' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Supervisão
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewRole('director')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePreviewRole === 'director' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Diretoria / BI
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewRole('operator')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePreviewRole === 'operator' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Operador
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewRole('qa')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePreviewRole === 'qa' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Qualidade (QA)
                </button>
              </div>
            </div>

            {/* Simulação Visual do Cockpit */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 text-left space-y-4">
              {activePreviewRole === 'supervisor' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Visão da Supervisão</span>
                      <h4 className="text-lg font-black text-white">Cockpit de Risco de Vencimento no Dia</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                      🔥 8 Acordos em Risco (Hoje)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-300">Marcos Oliveira</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">🔥 Alto Valor</span>
                      </div>
                      <p className="text-xl font-mono font-black text-emerald-400">R$ 4.500,00</p>
                      <button 
                        type="button"
                        onClick={() => handleGoToDemo('supervisor')}
                        className="w-full py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                      >
                        <WhatsappLogo size={14} /> Acionar no WhatsApp
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-300">Renata Silva</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">1ª Parcela</span>
                      </div>
                      <p className="text-xl font-mono font-black text-emerald-400">R$ 1.850,00</p>
                      <button 
                        type="button"
                        onClick={() => handleGoToDemo('supervisor')}
                        className="w-full py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                      >
                        <WhatsappLogo size={14} /> Acionar no WhatsApp
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-300">Carlos Eduardo</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">Quitação</span>
                      </div>
                      <p className="text-xl font-mono font-black text-emerald-400">R$ 3.200,00</p>
                      <button 
                        type="button"
                        onClick={() => handleGoToDemo('supervisor')}
                        className="w-full py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                      >
                        <WhatsappLogo size={14} /> Acionar no WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewRole === 'director' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Visão Executiva & Diretoria</span>
                      <h4 className="text-lg font-black text-white">BI & Analytics Preditivo em Tempo Real</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      Taxa de Efetividade: 88.4%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Recuperado no Mês</span>
                      <span className="text-lg font-black font-mono text-emerald-400">R$ 1.480.250</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Previsão de Maturação</span>
                      <span className="text-lg font-black font-mono text-sky-400">R$ 2.150.000</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Ticket Médio</span>
                      <span className="text-lg font-black font-mono text-amber-300">R$ 1.640</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Taxa de Quebra</span>
                      <span className="text-lg font-black font-mono text-rose-400">11.6%</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewRole === 'operator' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Visão do Operador</span>
                      <h4 className="text-lg font-black text-white">Tabulação Ágil & Auto-Registro sem Retrabalho</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold">
                      Meta Pessoal: 114% Atingida
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Ao fechar o acordo, o sistema tabula automaticamente a negociação sem exigir digitação duplicada.
                  </p>
                </div>
              )}

              {activePreviewRole === 'qa' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Visão do Monitor de Qualidade</span>
                      <h4 className="text-lg font-black text-white">Biblioteca de Ouro & Treinamento Contínuo</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1">
                      ⭐ Melhores Áudios Gravados
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Player de áudio nativo integrado para acelerar o onboarding de novos operadores com as melhores ligações da equipe.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. SIMULADOR INTERATIVO DE ROI */}
      <section id="roi-calculator" className="py-16 px-6 bg-slate-900/40 border-y border-white/10 relative">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-widest">
              Calculadora de Retorno Financeiro
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Descubra quanto sua operação vai lucrar com o Tracker
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              Simule os números reais da sua empresa e compare o ganho em recuperação contra a mensalidade fixa de R$ 3.200/mês.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sliders Interativos */}
            <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-white/10 space-y-6 shadow-xl">
              {/* Slider 1: Operadores */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Users size={16} className="text-sky-400" /> Quantidade de Operadores:
                  </span>
                  <span className="font-mono text-base text-sky-400 font-black">{operatorCount} operadores</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="150" 
                  step="1"
                  value={operatorCount}
                  onChange={(e) => setOperatorCount(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Slider 2: Faturamento Mensal */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <CurrencyDollar size={16} className="text-emerald-400" /> Volume Mensal Negociado (R$):
                  </span>
                  <span className="font-mono text-base text-emerald-400 font-black">{formatCurrency(monthlyVolume)}</span>
                </div>
                <input 
                  type="range" 
                  min="200000" 
                  max="10000000" 
                  step="50000"
                  value={monthlyVolume}
                  onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Slider 3: Taxa de Quebra */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <TrendUp size={16} className="text-rose-400" /> Taxa de Quebra de Acordos Atual (%):
                  </span>
                  <span className="font-mono text-base text-rose-400 font-black">{breakRate}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="45" 
                  step="1"
                  value={breakRate}
                  onChange={(e) => setBreakRate(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-300 flex items-center gap-1">
                  <Info size={14} className="text-sky-400" /> Como calculamos?
                </p>
                <p>
                  Consideramos o resgate conservador de 22% dos acordos em risco de vencimento no dia através do Cockpit da Supervisão + ganho de 5% de pacing e produtividade.
                </p>
              </div>
            </div>

            {/* Resultado do ROI */}
            <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Retorno Estimado Mensal
                </span>
                <h3 className="text-3xl sm:text-4xl font-black font-mono text-white">
                  + {formatCurrency(roiCalculations.totalExtraRecovery)}
                </h3>
                <span className="text-xs text-slate-400 block font-medium">Recuperação extra todo mês</span>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Investimento Tracker:</span>
                  <span className="font-mono font-black text-white text-sm">R$ 3.200,00 / mês</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Lucro Líquido Adicional:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    + {formatCurrency(roiCalculations.netProfitGain)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Múltiplo de Retorno (ROI):</span>
                  <span className="font-mono font-black text-amber-300 text-base">
                    {roiCalculations.roiMultiplier}x o investimento
                  </span>
                </div>

                {operatorCount > 17 && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300">
                    💡 Em um software tradicional com {operatorCount} licenças você pagaria ~{formatCurrency(roiCalculations.competitorCost)}/mês. Com o Tracker você economiza <strong>{formatCurrency(roiCalculations.monthlySavingsVsCompetitor)}/mês só em licenças</strong>!
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsProposalModalOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <FilePdf size={16} weight="bold" />
                <span>Gerar Proposta com essa Simulação</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VITRINE DE FUNCIONALIDADES */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-black uppercase tracking-widest">
            Poder Tecnológico Completo
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Tudo o que sua operação precisa para bater metas todos os meses
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-amber-500/40 transition-all space-y-4 shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lightning size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-black text-white">Cockpit de Risco no Dia</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Carrossel horizontal exclusivo para supervisores com acordos vencendo hoje, filtro de "Alto Valor", cópia em 1 clique e disparo direto no WhatsApp.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 transition-all space-y-4 shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Cpu size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-black text-white">Roadmap de IA & BI Preditivo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Algoritmos preditivos de maturação de acordos, heatmaps de horários de liquidez e score de risco de quebra para antecipar perdas.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4 shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Star size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-black text-white">Biblioteca de Ouro (QA)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Galeria de melhores ligações gravadas para treinamento contínuo e acelerar o onboarding de novos operadores na esteira de alta performance.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-sky-500/40 transition-all space-y-4 shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Crown size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-black text-white">Comparador Multi-Nível</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Benchmark lado a lado entre Equipes, Supervisores e Operadores com ranking de efetividade %, volume pago e ticket médio em tempo real.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-teal-500/40 transition-all space-y-4 shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-black text-white">Higienização no Back Office</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Importador inteligente de planilhas com diagnóstico prévio e deduplicação atômica de CPFs repetidos, garantindo base 100% limpa.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 transition-all space-y-4 shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-black text-white">Segurança & Conformidade PJ</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trilha de auditoria criptográfica com hash SHA-256, mascaramento dinâmico de CPF e estrutura aderente a contratos de prestação de serviços PJ.
            </p>
          </div>
        </div>
      </section>

      {/* 4. PLANO & VALORES (O PLANO ÚNICO) */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 border-t border-white/10">
        <div className="max-w-4xl mx-auto space-y-10 text-center">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-widest">
              Investimento Transparente & Sem Surpresas
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Um único plano. Acesso ilimitado.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Sem cobrança por usuário ou taxa oculta. Sua operação pode ter 10 ou 100 operadores pelo mesmo valor fixo.
            </p>
          </div>

          {/* Card da Oferta Imponente */}
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-sky-500/50 shadow-2xl shadow-sky-500/15 space-y-8 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 px-6 py-2 bg-gradient-to-l from-sky-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-bl-2xl shadow-md">
              Plano All-Inclusive
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-sky-400">
                Acesso Total à Plataforma Tracker
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-6xl font-black font-mono text-white">R$ 3.200</span>
                <span className="text-slate-400 font-bold text-base">/ mês</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Valor fixo mensal. Cancele quando quiser, sem multas contratuais abusivas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/10 text-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Usuários e Operadores Ilimitados</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Equipes e Supervisores Ilimitados</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Suporte Prioritário de Segunda a Sexta</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Todas as Novas Melhorias e Releases Inclusas</strong></span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Roadmap de IA & Previsões Preditivas</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Onboarding e Treinamento da Equipe</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Infraestrutura Nuvem de Alta Velocidade</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                  <span><strong>Segurança & Criptografia SHA-256 (LGPD)</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full sm:flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <WhatsappLogo size={18} weight="fill" />
                <span>Contratar ou Agendar Apresentação VIP</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoToDemo('supervisor')}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play size={15} />
                <span>Ver Demonstração Ao Vivo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TABELA COMPARATIVA */}
      <section id="comparison" className="py-20 px-6 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-black uppercase tracking-widest">
            Comparativo de Mercado
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Por que o Tracker é a escolha mais inteligente?
          </h2>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 uppercase font-black tracking-wider text-[11px] border-b border-white/10">
              <tr>
                <th className="p-5">Critério de Avaliação</th>
                <th className="p-5 text-center">Softwares Legados (Por Assento)</th>
                <th className="p-5 text-center bg-sky-950/40 text-sky-300 border-x border-sky-500/30">🚀 Tracker Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="p-5 font-bold text-slate-200">Modelo de Cobrança</td>
                <td className="p-5 text-center text-rose-400">R$ 150 a R$ 250 por operador (caro em escala)</td>
                <td className="p-5 text-center font-bold text-emerald-400 bg-sky-950/20 border-x border-sky-500/30">R$ 3.200 Fixo (Usuários Ilimitados)</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-200">Cockpit de Risco de Vencimento no Dia</td>
                <td className="p-5 text-center text-slate-500">❌ Inexistente (visão retroativa)</td>
                <td className="p-5 text-center font-bold text-emerald-400 bg-sky-950/20 border-x border-sky-500/30">✅ Resgate no WhatsApp em 1 clique</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-200">Biblioteca de Áudios de Treinamento (QA)</td>
                <td className="p-5 text-center text-slate-500">❌ Não possui</td>
                <td className="p-5 text-center font-bold text-emerald-400 bg-sky-950/20 border-x border-sky-500/30">✅ Player Nativo Integrado</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-200">Roadmap de IA & Previsões Preditivas</td>
                <td className="p-5 text-center text-slate-500">⚠️ Cobrado como módulo extra caro</td>
                <td className="p-5 text-center font-bold text-emerald-400 bg-sky-950/20 border-x border-sky-500/30">✅ Incluso no Plano</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-200">Suporte Técnico Especializado</td>
                <td className="p-5 text-center text-slate-500">⚠️ Burocrático via tickets lentos</td>
                <td className="p-5 text-center font-bold text-emerald-400 bg-sky-950/20 border-x border-sky-500/30">✅ Segunda a Sexta Direto com Time</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. FAQ & DÚVIDAS FREQUENTES */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-widest">
            Tire Suas Dúvidas
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Perguntas Frequentes de Diretores & Gestores
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'Existe algum limite de operadores ou equipes cadastradas no plano de R$ 3.200?',
              a: 'Não! O plano é 100% all-inclusive. Você pode cadastrar 10, 50 ou 200 operadores e gerenciar quantas equipes e filiais quiser sem pagar nenhum centavo a mais por assento.'
            },
            {
              q: 'Como funciona o suporte técnico?',
              a: 'Nosso suporte funciona de segunda a sexta-feira, em horário comercial, com atendimento ágil direto com nossa equipe de especialistas em tecnologia e operações de cobrança.'
            },
            {
              q: 'O que está contemplado no Roadmap de IA e novas funcionalidades?',
              a: 'Todas as melhorias contínuas, novos relatórios, modelos preditivos de maturação de carteira e algoritmos de score de risco de quebra são disponibilizados automaticamente sem cobrança de taxa de upgrade.'
            },
            {
              q: 'Como é feito o onboarding e a implantação na minha equipe?',
              a: 'Nossa equipe realiza o setup inicial da organização e o treinamento completo dos supervisores, operadores e coordenadores para que a operação comece a produzir com alta performance desde o primeiro dia.'
            },
            {
              q: 'Como posso testar o sistema antes de contratar?',
              a: 'Você pode clicar no botão "Testar Demonstração" no topo da página para experimentar as visões reais de cada cargo (/demo) de forma imediata e sem burocracia.'
            }
          ].map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 cursor-pointer transition-all hover:border-white/20"
                onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
              >
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>{item.q}</span>
                  <CaretDown size={16} className={`transition-transform text-slate-400 ${isOpen ? 'rotate-180 text-sky-400' : ''}`} />
                </div>
                {isOpen && (
                  <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-white/5">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/10 text-center text-xs text-slate-500 space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center text-white">
            <Rocket size={14} weight="fill" />
          </div>
          <span className="font-black text-slate-300">TRACKER PLATFORM</span>
        </div>
        <p>
          Tecnologia Enterprise em Gestão e Recuperação de Crédito • Todos os direitos reservados.
        </p>
      </footer>

      {/* MODAL DE GERAÇÃO DE PROPOSTA EM PDF */}
      {isProposalModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          onClick={() => setIsProposalModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl space-y-5 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FilePdf size={22} className="text-rose-400" />
                Gerar Proposta Comercial (PDF)
              </h3>
              <p className="text-xs text-slate-400">
                Preencha os dados da sua empresa para baixar o documento formal em PDF na hora.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Nome da Empresa</label>
                <input 
                  type="text" 
                  value={leadCompanyName}
                  onChange={(e) => setLeadCompanyName(e.target.value)}
                  placeholder="Ex: Cobrança Alpha Ltda"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Nome do Responsável / Cargo</label>
                <input 
                  type="text" 
                  value={leadContactName}
                  onChange={(e) => setLeadContactName(e.target.value)}
                  placeholder="Ex: João da Silva (Diretor)"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">E-mail Corporativo (Opcional)</label>
                <input 
                  type="email" 
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="joao@cobrancaalpha.com.br"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsProposalModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateProposalPdf}
                disabled={isGeneratingPdf}
                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 cursor-pointer transition-all"
              >
                <FilePdf size={16} />
                <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar Proposta em PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
