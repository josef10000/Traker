export interface MindVaultPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: "productivity" | "knowledge" | "tracking" | "integration" | "ai";
  hooks?: {
    onNoteCreate?: (noteId: string, content: string) => void;
    onHabitCompleted?: (habitId: string) => void;
    onFocusSessionEnd?: (minutes: number) => void;
  };
}

export const INITIAL_PLUGINS: MindVaultPlugin[] = [
  {
    id: "obsidian-graph-viewer",
    name: "Grafo 2.0 (Estilo Obsidian)",
    version: "1.2.0",
    author: "Comunidade MindVault",
    description: "Renderiza um gráfico de rede tridimensional e interativo conectando notas e ideias por semelhança e hashtags.",
    icon: "Network",
    enabled: true,
    category: "knowledge"
  },
  {
    id: "notion-database-views",
    name: "Visão Tabela & Kanban Relacional",
    version: "2.0.1",
    author: "MindVault Core",
    description: "Cria tabelas dinâmicas com campos personalizados, barra de progresso de projetos e visão de quadros estilo Kanban.",
    icon: "Kanban",
    enabled: true,
    category: "productivity"
  },
  {
    id: "lofi-focus-audio",
    name: "Sons de Foco & Binaural Beat",
    version: "0.9.4",
    author: "FocoStudio",
    description: "Gerador de ruído marrom, chuva e música Lo-Fi sintonizada para estado de Flow durante suas anotações.",
    icon: "Headphones",
    enabled: true,
    category: "productivity"
  },
  {
    id: "github-sync-backup",
    name: "Sincronização com GitHub / Vault local",
    version: "1.1.0",
    author: "DevTools",
    description: "Exporta automaticamente suas notas no formato .md para o seu repositório pessoal do GitHub.",
    icon: "GitBranch",
    enabled: false,
    category: "integration"
  },
  {
    id: "ai-clarity-copilot",
    name: "MindVault AI Assistant",
    version: "1.0.0-beta",
    author: "MindVault AI",
    description: "Analisa suas anotações do dia e gera um resumo executivo com próximos passos para a sua clareza de vida.",
    icon: "Sparkles",
    enabled: true,
    category: "ai"
  }
];
