import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  BookOpen, 
  Calculator, 
  TrendUp, 
  ShieldCheck, 
  CheckCircle, 
  WarningCircle,
  Clock,
  Calendar,
  Coins,
  Percent,
  DownloadSimple,
  Users,
  Globe,
  EyeSlash,
  Trash,
  PencilSimple,
  Bell,
  Handshake,
  MagnifyingGlass,
  Book,
  Tag,
  CheckSquare
} from '@phosphor-icons/react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  userRole?: string;
}

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  category: 'kpis' | 'status' | 'features' | 'icons';
  categoryLabel: string;
  roles: string[];
  icon: React.ComponentType<any>;
  badge?: string;
  keywords?: string[];
}

export const HelpDrawer = ({ isOpen, onClose, theme, userRole = 'member' }: HelpDrawerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Normaliza o cargo (role) do banco para as roles explicativas internas do manual de ajuda
  const normalizedRole = useMemo(() => {
    if (userRole === 'member') return 'operator';
    if (userRole === 'super_admin' || userRole === 'manager') return 'supervisor';
    return userRole; // 'supervisor', 'backoffice', 'monitor'
  }, [userRole]);

  // Termos de busca recomendados com base no cargo normalizado
  const recommendedSearches = useMemo(() => {
    if (normalizedRole === 'supervisor') {
      return ['Verificar', 'Metas', 'Webhooks', 'LGPD', 'Back Office'];
    }
    if (normalizedRole === 'backoffice') {
      return ['Importar', 'Colunas', 'Planilha', 'Renomear', 'Acordo'];
    }
    if (normalizedRole === 'monitor') {
      return ['QA', 'Verificar', 'LGPD', 'Gravação', 'Scorecard'];
    }
    return ['Meta', 'Verificar', 'Revelar CPF', 'Status', 'Acordo'];
  }, [normalizedRole]);

  // Dicionário completo de tópicos de ajuda com visibilidade baseada na role e palavras-chave para busca inteligente
  const helpTopics: HelpTopic[] = useMemo(() => [
    // --- CATEGORIA: KPIS ---
    {
      id: 'total-projected',
      title: 'Total Projetado',
      description: 'Soma total do valor nominal de todos os acordos cadastrados no sistema dentro do mês corrente, independentemente de estarem pagos ou pendentes.',
      category: 'kpis',
      categoryLabel: 'Métricas e KPIs',
      roles: ['operator', 'backoffice', 'monitor', 'supervisor'],
      icon: Calculator,
      keywords: ['projetado', 'valor', 'financeiro', 'estimado', 'bruto', 'soma']
    },
    {
      id: 'daily-productivity',
      title: 'Produtividade Diária',
      description: 'Total financeiro de acordos que você efetivou como "Pago" no dia atual. Mostra sua produtividade em tempo real para o atingimento das campanhas do dia.',
      category: 'kpis',
      categoryLabel: 'Métricas e KPIs',
      roles: ['operator', 'supervisor'],
      icon: Coins,
      badge: 'Operacional',
      keywords: ['produtividade', 'hoje', 'dia', 'pago', 'reais', 'efetivado', 'diário']
    },
    {
      id: 'lack-for-goal',
      title: 'Falta para Meta',
      description: 'O valor residual em Reais necessário para que seu time atinja a meta mensal definida pelo supervisor. Acompanha o percentual atual de progresso.',
      category: 'kpis',
      categoryLabel: 'Métricas e KPIs',
      roles: ['operator', 'supervisor'],
      icon: Percent,
      badge: 'Operacional',
      keywords: ['meta', 'falta', 'objetivo', 'atingimento', 'percentual', 'restante']
    },
    {
      id: 'monthly-projection',
      title: 'Projeção para o Mês',
      description: 'Cálculo estatístico que estima a arrecadação final com base na média diária de pagamentos já efetuados e os dias úteis restantes no mês.',
      category: 'kpis',
      categoryLabel: 'Métricas e KPIs',
      roles: ['operator', 'supervisor'],
      icon: TrendUp,
      keywords: ['projeção', 'tendência', 'estimativa', 'previsão', 'calculo']
    },

    // --- CATEGORIA: STATUS ---
    {
      id: 'status-paid',
      title: 'Status: Pago',
      description: 'Acordo financeiro liquidado e confirmado. Atinge diretamente a produtividade do operador e soma na meta coletiva da equipe.',
      category: 'status',
      categoryLabel: 'Status de Acordos',
      roles: ['operator', 'backoffice', 'monitor', 'supervisor'],
      icon: CheckCircle,
      keywords: ['pago', 'liquidado', 'quitado', 'baixado', 'recebido', 'confirmado', 'verificar']
    },
    {
      id: 'status-waiting',
      title: 'Status: Aguardando',
      description: 'Acordo registrado com sucesso e guia de pagamento (Boleto/PIX) enviada ao cliente. O sistema monitora até o vencimento.',
      category: 'status',
      categoryLabel: 'Status de Acordos',
      roles: ['operator', 'backoffice', 'monitor', 'supervisor'],
      icon: Clock,
      keywords: ['aguardando', 'pendente', 'vence', 'espera', 'boleto', 'pix', 'aberto']
    },
    {
      id: 'status-broken',
      title: 'Status: Quebrado',
      description: 'Acordo que ultrapassou a data de vencimento sem identificação do pagamento. Entra automaticamente no Balcão de Recuperação.',
      category: 'status',
      categoryLabel: 'Status de Acordos',
      roles: ['operator', 'backoffice', 'monitor', 'supervisor'],
      icon: WarningCircle,
      keywords: ['quebrado', 'atrasado', 'vencido', 'inadimplente', 'não pago', 'recuperação']
    },
    {
      id: 'status-scheduled',
      title: 'Status: Agendado (Retorno)',
      description: 'Lembrete de ligação ou renegociação agendada com data e hora. O painel avisa o operador no momento correto para retornar a ligação.',
      category: 'status',
      categoryLabel: 'Status de Acordos',
      roles: ['operator', 'backoffice', 'monitor', 'supervisor'],
      icon: Calendar,
      keywords: ['agendado', 'retorno', 'ligar', 'agenda', 'ligação', 'lembrete', 'retornar']
    },

    // --- CATEGORIA: FEATURES ---
    {
      id: 'feature-import',
      title: 'Importação de Clientes (Excel/CSV)',
      description: 'Módulo para carregar listas de devedores. Aceita arquivos XLSX, XLS e CSV. Corrige automaticamente datas seriais do Excel e cria registros sob demanda.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['backoffice', 'supervisor'],
      icon: DownloadSimple,
      badge: 'Back Office',
      keywords: ['importar', 'subir', 'carregar', 'planilha', 'excel', 'csv', 'xls', 'xlsx', 'arquivo', 'verificar']
    },
    {
      id: 'feature-rename',
      title: 'Renomeação Dinâmica de Colunas',
      description: 'Ao importar planilhas, colunas extras podem ser renomeadas na própria tabela clicando no cabeçalho. O sistema atualiza em lote todos os clientes vinculados.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['backoffice', 'supervisor'],
      icon: Tag,
      badge: 'Back Office',
      keywords: ['renomear', 'coluna', 'cabeçalho', 'tabela', 'nome', 'editar coluna', 'customizado']
    },
    {
      id: 'feature-action-handshake',
      title: 'Registrar Acordo (🤝)',
      description: 'Botão de ação rápida na tabela de clientes do Back Office que abre o formulário pré-preenchido para fechar o acordo na hora com o devedor.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['operator', 'backoffice', 'supervisor'],
      icon: Handshake,
      keywords: ['acordo', 'negociar', 'fechar', 'registrar', 'salvar', 'cadastrar', 'tratar', 'handshake']
    },
    {
      id: 'feature-history',
      title: 'Gaveta de Histórico e Linha do Tempo',
      description: 'Clique no CPF de qualquer cliente para ver todas as negociações passadas, datas, quem atendeu e as anotações inseridas por outros operadores.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['operator', 'backoffice', 'monitor', 'supervisor'],
      icon: Clock,
      keywords: ['histórico', 'timeline', 'passado', 'anotações', 'observações', 'tempo', 'verificar']
    },
    {
      id: 'feature-check-agreement',
      title: 'Conferência de Acordos (Verificar/Check)',
      description: 'Caixa de seleção (checkbox) na tabela de acordos que permite aos operadores, monitores e supervisores marcarem um acordo como verificado/conferido. Grava a marcação temporal no histórico.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['operator', 'monitor', 'supervisor'],
      icon: CheckSquare,
      keywords: ['verificar', 'conferir', 'check', 'validar', 'auditar', 'checkbox', 'conferido', 'verificado']
    },
    {
      id: 'feature-qa-scorecard',
      title: 'Scorecard de Avaliação (QA)',
      description: 'Módulo exclusivo para auditar ligações. Monitores de qualidade atribuem notas de 0 a 100 baseadas em script, tom de voz e registro correto.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['monitor', 'supervisor'],
      icon: ShieldCheck,
      badge: 'Monitoria',
      keywords: ['qa', 'avaliação', 'monitoria', 'ligação', 'postura', 'gravação', 'áudio', 'nota', 'verificar']
    },
    {
      id: 'feature-team-mgmt',
      title: 'Gestão de Times e Nomenclaturas',
      description: 'Supervisores criam equipes, distribuem operadores e podem renomear o setor de "Back Office" para qualquer termo organizacional customizado.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['supervisor'],
      icon: Users,
      badge: 'Gestão',
      keywords: ['equipe', 'time', 'membros', 'colaboradores', 'supervisor', 'cargo', 'back office', 'nome']
    },
    {
      id: 'feature-webhooks',
      title: 'Integrações de Webhook',
      description: 'Dispare notificações instantâneas no Slack, Discord ou Telegram de sua empresa sempre que um operador fechar ou liquidar um acordo.',
      category: 'features',
      categoryLabel: 'Ferramentas do Sistema',
      roles: ['supervisor'],
      icon: Globe,
      badge: 'Integração',
      keywords: ['webhook', 'discord', 'telegram', 'slack', 'integração', 'notificação', 'alerta']
    },

    // --- CATEGORIA: ICONS ---
    {
      id: 'icon-eye',
      title: 'Ícone de Olho Riscado (👁️ / 🙈)',
      description: 'Indica que o CPF completo do cliente está oculto por privacidade. Clique no ícone para confirmar consentimento da LGPD e revelar os dados.',
      category: 'icons',
      categoryLabel: 'Guia de Ícones e Ações',
      roles: ['operator', 'backoffice', 'monitor', 'supervisor'],
      icon: EyeSlash,
      keywords: ['revelar', 'olho', 'olhar', 'ver', 'visualizar', 'copiar', 'cpf', 'oculto', 'lgpd', 'privacidade', 'verificar']
    },
    {
      id: 'icon-trash',
      title: 'Ícone de Lixeira (🗑️)',
      description: 'Exclui permanentemente o acordo do banco de dados. Abre um modal de confirmação para prevenir cliques acidentais.',
      category: 'icons',
      categoryLabel: 'Guia de Ícones e Ações',
      roles: ['operator', 'supervisor'],
      icon: Trash,
      keywords: ['excluir', 'apagar', 'deletar', 'remover', 'lixeira', 'limpar']
    },
    {
      id: 'icon-pencil',
      title: 'Ícone de Lápis (✏️)',
      description: 'Abre o modal de edição de acordo para corrigir valores, datas de vencimento ou adicionar novos comentários na negociação.',
      category: 'icons',
      categoryLabel: 'Guia de Ícones e Ações',
      roles: ['operator', 'supervisor'],
      icon: PencilSimple,
      keywords: ['editar', 'lápis', 'corrigir', 'alterar', 'atualizar', 'modificar']
    },
    {
      id: 'icon-bell',
      title: 'Ícone de Sino (🔔)',
      description: 'Alerta sobre agendamento ativo ou colisão de CPF. Indica que o cliente já está em tratativa recente por outro colega da equipe.',
      category: 'icons',
      categoryLabel: 'Guia de Ícones e Ações',
      roles: ['operator', 'backoffice', 'supervisor'],
      icon: Bell,
      keywords: ['sino', 'alerta', 'colisão', 'aviso', 'notificação', 'ativo']
    }
  ], []);

  // Filtra os tópicos com base na role normalizada e nos termos de busca
  const filteredTopics = useMemo(() => {
    return helpTopics.filter(topic => {
      // 1. Filtrar pelo cargo normalizado
      const hasRole = topic.roles.includes(normalizedRole);
      if (!hasRole) return false;

      // 2. Filtrar pela aba/categoria selecionada
      if (activeCategory !== 'all' && topic.category !== activeCategory) return false;

      // 3. Filtrar pelo termo de pesquisa
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesTitle = topic.title.toLowerCase().includes(query);
        const matchesDesc = topic.description.toLowerCase().includes(query);
        const matchesCat = topic.categoryLabel.toLowerCase().includes(query);
        const matchesKeywords = topic.keywords?.some(kw => kw.toLowerCase().includes(query));
        return matchesTitle || matchesDesc || matchesCat || matchesKeywords;
      }

      return true;
    });
  }, [helpTopics, normalizedRole, activeCategory, searchTerm]);

  // Agrupar os tópicos filtrados por categoria para melhor exibição
  const groupedTopics = useMemo(() => {
    const groups: Record<string, HelpTopic[]> = {};
    filteredTopics.forEach(topic => {
      if (!groups[topic.categoryLabel]) {
        groups[topic.categoryLabel] = [];
      }
      groups[topic.categoryLabel].push(topic);
    });
    return groups;
  }, [filteredTopics]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay de fundo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Lateral */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className={`fixed right-0 top-0 bottom-0 w-full max-w-md border-l z-[95] flex flex-col shadow-2xl ${
              theme === 'dark'
                ? 'bg-slate-950 border-white/10 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Header do Drawer */}
            <div className={`p-6 border-b flex flex-col shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-slate-900/20' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    theme === 'dark' ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-500/5 text-orange-600'
                  }`}>
                    <Book size={20} weight="duotone" />
                  </div>
                  <div>
                    <h2 className={`font-black text-sm uppercase tracking-wider leading-none ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      Manual do Usuário
                    </h2>
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mt-0.5">
                      Visualização de {normalizedRole === 'supervisor' ? 'Supervisor' : normalizedRole === 'backoffice' ? 'Back Office' : normalizedRole === 'monitor' ? 'Monitor' : 'Operador'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Barra de Pesquisa */}
              <div className="relative w-full">
                <MagnifyingGlass 
                  size={16} 
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`} 
                />
                <input
                  type="text"
                  placeholder="Pesquisar métricas, ícones, status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 transition-all ${
                    theme === 'dark' 
                      ? 'bg-white/5 border border-white/10 text-white focus:ring-orange-500/20 focus:border-orange-500' 
                      : 'bg-slate-100 border border-slate-200 text-slate-900 focus:ring-orange-500/10 focus:border-orange-500'
                  }`}
                />
              </div>

              {/* Sugestões de Busca Rápidas */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 select-none">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Sugestões:
                </span>
                {recommendedSearches.map(term => (
                  <button
                    key={term}
                    onClick={() => setSearchTerm(term)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Filtro de Categorias */}
              <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 shrink-0 custom-scrollbar select-none">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 ${
                    activeCategory === 'all'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                      : theme === 'dark'
                        ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Todos
                </button>
                {[
                  { id: 'kpis', label: 'Métricas' },
                  { id: 'status', label: 'Status' },
                  { id: 'features', label: 'Ferramentas' },
                  { id: 'icons', label: 'Ícones' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 ${
                      activeCategory === cat.id
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                        : theme === 'dark'
                          ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo Explicativo */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {Object.keys(groupedTopics).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <WarningCircle size={32} className="mx-auto text-slate-500" />
                  <h4 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Nenhum resultado encontrado</h4>
                  <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                    Tente buscar por termos mais genéricos como "meta", "pago", "olho" ou "importar".
                  </p>
                </div>
              ) : (
                Object.entries(groupedTopics).map(([groupName, topics]) => {
                  const typedTopics = topics as HelpTopic[];
                  return (
                    <section key={groupName} className="space-y-3">
                      <h3 className={`text-[10px] font-black uppercase tracking-widest ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`}>
                        {groupName}
                      </h3>
                      
                      <div className="grid gap-3">
                        {typedTopics.map(topic => {
                        const IconComponent = topic.icon;
                        return (
                          <div 
                            key={topic.id}
                            className={`p-4 rounded-2xl border flex gap-3 transition-colors ${
                              theme === 'dark' 
                                ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className={`p-2 rounded-xl self-start ${
                              theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-200 text-slate-700'
                            }`}>
                              <IconComponent size={18} weight="bold" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {topic.title}
                                </h4>
                                {topic.badge && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-widest">
                                    {topic.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                                {topic.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
            </div>

            {/* Rodapé do Drawer */}
            <div className={`p-4 border-t text-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-slate-950' : 'border-slate-100 bg-slate-50'
            }`}>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Tracker SaaS © {new Date().getFullYear()} — Todos os direitos reservados
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
