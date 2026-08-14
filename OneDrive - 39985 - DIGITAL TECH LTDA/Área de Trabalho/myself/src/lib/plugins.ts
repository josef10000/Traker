export interface MindVaultPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: "matriz" | "nexo" | "registros" | "integracao" | "ia";
  hooks?: {
    onNoteCreate?: (noteId: string, content: string) => void;
    onHabitCompleted?: (habitId: string) => void;
    onFocusSessionEnd?: (minutes: number) => void;
  };
}

export const INITIAL_PLUGINS: MindVaultPlugin[] = [
  {
    id: "nexo-constelacao",
    name: "Nexo por Radar & Constelação",
    version: "2.0.0",
    author: "MindVault Core",
    description: "Mapeia pensamentos e projetos em um radar monocromático de órbitas de conhecimento e fios de associação.",
    icon: "Compass",
    enabled: true,
    category: "nexo"
  },
  {
    id: "matriz-comando",
    name: "Visão Matriz de Clareza 360°",
    version: "2.1.0",
    author: "MindVault Core",
    description: "Unifica seu estado mental, treinos, leituras e progresso diário em um centro de comando minimalista.",
    icon: "Layout",
    enabled: true,
    category: "matriz"
  },
  {
    id: "camara-audio-silence",
    name: "Câmara de Som Silencioso & Foco",
    version: "1.0.0",
    author: "MindVault Sound",
    description: "Sons marrons e frequências binaurais para indução instantânea ao estado de flow.",
    icon: "Volume2",
    enabled: true,
    category: "matriz"
  },
  {
    id: "github-sync-backup",
    name: "Sincronizador Pessoal GitHub Vault",
    version: "1.5.0",
    author: "DevTools",
    description: "Exporta automaticamente seu acervo de ideias para um repositório privado no GitHub.",
    icon: "GitBranch",
    enabled: false,
    category: "integracao"
  },
  {
    id: "copilot-clareza-ai",
    name: "Copilot de Clareza Mental",
    version: "2.0.0-beta",
    author: "MindVault AI",
    description: "Sintetiza os destaques do seu dia em recomendações acionáveis para o seu desenvolvimento.",
    icon: "Sparkles",
    enabled: true,
    category: "ia"
  }
];
