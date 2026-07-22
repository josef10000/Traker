import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Info, 
  CaretUp, 
  CaretDown, 
  Sparkle, 
  CheckCircle,
  FileCsv as FileSpreadsheet,
  ChartLine,
  Target,
  ArrowUUpLeft as RecoveryIcon,
  ShieldCheck as QaIcon,
  Users as TeamIcon,
  ChartBar as BiIcon,
  ShieldCheck,
  Building
} from '@phosphor-icons/react';
import { UserRole } from '../../types';

interface DemoFeatureBannerProps {
  activeTab: string;
  role: UserRole;
  theme?: 'dark' | 'light';
}

interface FeatureDetail {
  title: string;
  icon: any;
  whatItDoes: string;
  benefitByRole: Record<string, string>;
  highlights: string[];
}

const FEATURE_DETAILS: Record<string, FeatureDetail> = {
  financial: {
    title: 'Painel Financeiro',
    icon: ChartLine,
    whatItDoes: 'Acompanhamento diário e mensal de faturamento, acordos fechados, valores recebidos e projeção do atingimento da meta.',
    benefitByRole: {
      member: 'Visualização transparente do seu faturamento acumulado no mês e de quanto falta para atingir a sua meta individual.',
      supervisor: 'Acompanhe em tempo real o desempenho de vendas e recuperação de crédito dos colaboradores sob sua supervisão.',
      manager: 'Visão executiva consolida dos recebimentos da empresa e projeção do faturamento mensal.',
      coordinator: 'Monitoramento estratégico das metas e liquidações operacionais da empresa.',
      monitor: 'Acompanhe como o faturamento se relaciona com os atendimentos auditados.'
    },
    highlights: ['📊 Metas Automáticas', '⚡ Atualização em Tempo Real', '💰 Extrato de Acordos']
  },
  carga_acordos: {
    title: 'Carga de Acordos (Planilhas Externas)',
    icon: FileSpreadsheet,
    whatItDoes: 'Importação e gestão de planilhas externas no sistema. Carregue suas planilhas de trabalho direto na plataforma para fazer edições, acompanhamento centralizado e reexportações a qualquer momento, eliminando a necessidade de controle manual fora do sistema.',
    benefitByRole: {
      member: 'Carregue sua planilha externa de atendimento, edite status diretamente na tela e exporte o arquivo atualizado quando precisar.',
      supervisor: 'Audite a carga de planilhas da sua equipe e garanta que todas as carteiras externas estejam atualizadas.',
      manager: 'Padronize a entrada de dados operacionais sem depender de arquivos soltos ou desatualizados.',
      coordinator: 'Controle o fluxo de entrada e saída de planilhas de trabalho dos times.'
    },
    highlights: ['📁 Planilhas Externas', '✏️ Edição & Reexportação', '🔒 Centralização de Dados']
  },
  portfolio: {
    title: 'Metas & Carteiras (Análises Aprofundadas)',
    icon: Target,
    whatItDoes: 'Análises aprofundadas da operação. Verificação detalhada do desempenho individual de cada operador, notas de Qualidade (QA) cruzadas por colaborador, faturamento por carteira e dados comparativos de performance de todos os times.',
    benefitByRole: {
      supervisor: 'Identifique quais operadores precisam de apoio individual, analise notas de QA cruzadas com vendas e acompanhe o batimento de metas do time.',
      manager: 'Avalie a rentabilidade de cada carteira de cobrança e o rendimento comparativo das equipes.',
      coordinator: 'Monitore o equilíbrio de faturamento e qualidade técnica de toda a operação.',
      monitor: 'Cruze as notas de monitoria técnica com a conversão de cada operador.'
    },
    highlights: ['🎯 Performance Individual', '📊 Qualidade & Carteiras', '📈 Diagnóstico de Time']
  },
  recovery: {
    title: 'Recuperação & Renegociação',
    icon: RecoveryIcon,
    whatItDoes: 'Gestão de acordos quebrados e resgate automático de clientes inadimplentes através da consulta por CPF.',
    benefitByRole: {
      member: 'Consulte CPFs que quebraram acordos anteriores e ofereça novas condições de renegociação instantaneamente.',
      supervisor: 'Reduza o índice de inadimplência da equipe resgatando acordos vencidos.',
      manager: 'Acompanhe a taxa de recuperação sobre carteiras de dívida vencida.'
    },
    highlights: ['🔄 Resgate por CPF', '📉 Redução de Inadimplência', '⚡ Renegociação Rápida']
  },
  qa: {
    title: 'Qualidade (QA) & Monitoria',
    icon: QaIcon,
    whatItDoes: 'Avaliação de monitoria de ligações com base em critérios técnicos, fichas de escuta ativa e Planos de Desenvolvimento Individual (PDI).',
    benefitByRole: {
      monitor: 'Realize monitorias com fichas personalizadas, atribua notas por competência e abra PDIs de acompanhamento.',
      member: 'Acesse seus feedbacks de atendimento e confira as orientações do seu PDI para evolução profissional.',
      supervisor: 'Acompanhe a nota média de qualidade da equipe e o cumprimento dos PDIs dos seus operadores.'
    },
    highlights: ['🎧 Ficha de Escuta', '📈 PDI Automatizado', '⭐ Fator de Eficiência']
  },
  coordination: {
    title: 'Gestão & Coordenação Geral',
    icon: TeamIcon,
    whatItDoes: 'Controle de metas globais, escalas presenciais, registro de presenças e visualização total de todos os times e operadores.',
    benefitByRole: {
      manager: 'Gerencie todas as equipes da empresa, acompanhe presenças, contratações e aprove fechamentos de pagamentos PJ.',
      coordinator: 'Supervisione escalas diárias, gerencie o headcount dos times e monitore o batimento de metas em tempo real.',
      supervisor: 'Garanta o registro de presenças da sua equipe e consulte a escala de trabalho diária.'
    },
    highlights: ['👥 Visão Total dos Times', '📅 Escalas & Presenças', '💳 Fechamento PJ']
  },
  bi: {
    title: 'BI & Analytics',
    icon: BiIcon,
    whatItDoes: 'Gráficos estratégicos, inteligência de carteiras e relatórios executivos de desempenho.',
    benefitByRole: {
      manager: 'Tome decisões estratégicas com base em gráficos visuais de faturamento por período e por produto.',
      coordinator: 'Analise tendências operacionais e gargalos de conversão.',
      supervisor: 'Compare a curva de faturamento do seu time com o histórico de meses anteriores.'
    },
    highlights: ['📈 Gráficos 360°', '📊 Análise de Tendências', '📤 Exportação em Excel']
  },
  audit: {
    title: 'Auditoria & Compliance LGPD',
    icon: ShieldCheck,
    whatItDoes: 'Trilha histótica e auditável de todas as consultas, revelações e cópias de CPFs realizadas no sistema.',
    benefitByRole: {
      manager: 'Garantia total de segurança jurídica e compliance com a LGPD contra vazamentos de dados.',
      supervisor: 'Monitore o histórico de acessos da equipe a informações sensíveis dos clientes.'
    },
    highlights: ['🛡️ Compliance LGPD', '📜 Trilha Auditável', '🔒 Proteção de Dados']
  },
  people: {
    title: 'Gestão de Equipe & Usuários',
    icon: TeamIcon,
    whatItDoes: 'Administração de colaboradores, vinculação de times e disparo de convites por e-mail.',
    benefitByRole: {
      manager: 'Convide novos supervisores ou colaboradores e defina suas estruturas de equipe.',
      supervisor: 'Vincule operadores sem time à sua equipe com 1 clique.'
    },
    highlights: ['✉️ Convites Automatizados', '🔗 Vinculação Rápida', '👥 Gestão de Time']
  },
  backoffice: {
    title: 'Back Office & Conciliação',
    icon: FileSpreadsheet,
    whatItDoes: 'Importação em massa de planilhas financeiras e conciliação bancária automatizada.',
    benefitByRole: {
      backoffice: 'Processe grandes volumes de contratos e valide os extratos financeiros do sistema.'
    },
    highlights: ['📂 Carga em Massa', '🏦 Conciliação Bancária', '⚡ Processamento Rápido']
  }
};

export const DemoFeatureBanner: React.FC<DemoFeatureBannerProps> = ({ activeTab, role, theme = 'dark' }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const detail = FEATURE_DETAILS[activeTab] || {
    title: 'Módulo da Plataforma',
    icon: Info,
    whatItDoes: 'Funcionalidade do sistema Tracker.',
    benefitByRole: {
      default: 'Acompanhe e gerencie as operações da sua empresa.'
    },
    highlights: ['⚡ Tracker Platform']
  };

  const IconComp = detail.icon;
  const benefitText = detail.benefitByRole[role] || detail.benefitByRole['default'] || 'Acompanhe as operações da empresa em tempo real.';

  return (
    <div className="w-full mb-6 z-20">
      <div className="p-4 rounded-3xl border bg-slate-900/90 border-purple-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Efeito de Luz */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* CABEÇALHO DO BANNER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <IconComp size={22} weight="bold" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 flex items-center gap-1">
                  <Sparkle size={10} weight="bold" /> Guia da Demonstração
                </span>
                <span className="text-xs font-black text-white">{detail.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                {detail.whatItDoes}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <span>{isExpanded ? 'Recolher' : 'Entender Tela'}</span>
            {isExpanded ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
          </button>
        </div>

        {/* DETALHES EXPANDIDOS */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* O QUE FAZ */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                    🎯 O que esta tela faz
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {detail.whatItDoes}
                  </p>
                </div>

                {/* BENEFÍCIO PARA O CARGO */}
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                    🚀 Benefício para {role === 'member' ? 'Operador' : role === 'supervisor' ? 'Supervisor' : role === 'manager' ? 'Gerente' : role === 'coordinator' ? 'Coordenador' : role === 'monitor' ? 'Monitor' : 'Back Office'}
                  </span>
                  <p className="text-xs text-purple-100 leading-relaxed font-medium">
                    {benefitText}
                  </p>
                </div>

                {/* PÍLULAS DE DESTAQUE */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                    💡 Destaques Principais
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {detail.highlights.map((item, idx) => (
                      <span key={idx} className="text-[10px] font-bold text-slate-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
