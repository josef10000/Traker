"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Vault, 
  Sparkles, 
  Brain, 
  Network, 
  LayoutGrid, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Mail, 
  BookOpen, 
  Dumbbell, 
  Compass, 
  Puzzle,
  ShieldCheck
} from "lucide-react";

export default function AuthShowcase() {
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState<"overview" | "graph" | "databases" | "plugins">("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 600);
  };

  const handleDemoAccess = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-4 border-b border-slate-800/80 mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-400 shadow-lg shadow-indigo-500/20">
            <Vault className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              MindVault <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Versão Alfa</span>
            </h1>
            <p className="text-xs text-slate-400">O melhor do Notion + Obsidian para sua clareza de vida</p>
          </div>
        </div>

        <button 
          onClick={handleDemoAccess}
          className="hidden md:flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg glass-panel hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <span>Entrar no modo Demo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Grid: Interactive Showcase + Login Box */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch my-auto">
        
        {/* Left Side (8 Cols): Interactive Product Tour */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Seu Sistema Operacional de Vida Definitivo</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Saiba exatamente <br />
              <span className="gradient-text">onde você está e onde quer chegar.</span>
            </h2>

            <p className="mt-4 text-sm md:text-base text-slate-300 leading-relaxed">
              O **MindVault** une a flexibilidade de bancos de dados relacionais do Notion com a velocidade, grafos de rede e links bidirecionais do Obsidian. Tudo em uma experiência sem ruído.
            </p>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 overflow-x-auto gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Explore a ferramenta:</span>
              
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveFeature("overview")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeFeature === "overview" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Clareza de Vida</span>
                </button>

                <button
                  onClick={() => setActiveFeature("graph")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeFeature === "graph" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Grafo Obsidian</span>
                </button>

                <button
                  onClick={() => setActiveFeature("databases")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeFeature === "databases" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Bancos Notion</span>
                </button>

                <button
                  onClick={() => setActiveFeature("plugins")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeFeature === "plugins" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  <span>Plugins</span>
                </button>
              </div>
            </div>

            {/* Feature Content Demo Box */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-indigo-500/20 min-h-[190px] flex flex-col justify-between">
              {activeFeature === "overview" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      <Compass className="w-4 h-4" /> Módulo 1: Visão Geral & Clareza
                    </span>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Foco Ativo: 85%</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Acompanhe suas 5 áreas principais de vida em tempo real. Saiba quais metas estão em progresso e onde investir sua energia hoje.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Saúde & Treino</span>
                      <span className="font-semibold text-slate-200">4/5 Semanal</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Livro do Mês</span>
                      <span className="font-semibold text-indigo-300">Capítulo 7</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Projetos Ativos</span>
                      <span className="font-semibold text-purple-300">3 Principais</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === "graph" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                      <Network className="w-4 h-4" /> Módulo 2: Grafo de Notas à lá Obsidian
                    </span>
                    <span className="text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">42 Conexões Ativas</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Conecte pensamentos usando links bidirecionais <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">[[Nome da Nota]]</code>. Suas ideias deixam de ser pastas isoladas e viram uma rede viva de conhecimento.
                  </p>
                  <div className="bg-slate-900/90 rounded-lg p-3 border border-purple-500/20 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      <span className="text-slate-200">Ideia: Arquitetura MindVault</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Conectada com [[React 19]] e [[Notion DB]]</span>
                  </div>
                </div>
              )}

              {activeFeature === "databases" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      <LayoutGrid className="w-4 h-4" /> Módulo 3: Bancos de Dados Flexíveis estilo Notion
                    </span>
                    <span className="text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">Tabelas & Kanban</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Organize seus livros lidos, fichamentos de cursos, treinos e projetos em tabelas inteligentes com status, metadados e progresso visual.
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="flex items-center gap-2 text-slate-200">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Essencialismo (Greg McKeown)
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">Lido ★ 5.0</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="flex items-center gap-2 text-slate-200">
                        <Dumbbell className="w-3.5 h-3.5 text-indigo-400" /> Treino de Hipertrofia A/B
                      </span>
                      <span className="text-[11px] text-indigo-300">Hoje às 18h</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === "plugins" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Puzzle className="w-4 h-4" /> Módulo 4: Ecossistema de Plugins Extensível
                    </span>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Arquitetura Aberta</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Crie e ative extensões personalizadas. Adicione reprodutores de som Lo-Fi, conectores de IA, sincronização remota com GitHub e novos widgets.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Pronto para extensões da comunidade e plugins customizados</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
                <span>Clique acima para testar os 4 módulos</span>
                <span className="text-indigo-400 font-medium cursor-pointer hover:underline" onClick={handleDemoAccess}>
                  Acessar Demonstração Grátis →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (5 Cols): Clean Authentication Form */}
        <div className="lg:col-span-5">
          <div className="glass-panel rounded-2xl p-6 md:p-8 border border-slate-800 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">
                {isRegistering ? "Criar sua conta MindVault" : "Acesse seu MindVault"}
              </h3>
              <p className="text-xs text-slate-400">
                {isRegistering 
                  ? "Comece agora a organizar seu conhecimento e vida" 
                  : "Seu lugar de clareza mental e foco te espera"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">E-mail pessoal</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Senha secreta</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white text-xs font-semibold py-3 rounded-xl hover:opacity-95 shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegistering ? "Criar meu Vault Pessoal" : "Entrar no MindVault"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider absolute">ou</span>
            </div>

            <button
              onClick={handleDemoAccess}
              type="button"
              className="w-full glass-panel hover:bg-slate-800/80 text-slate-200 text-xs font-medium py-2.5 rounded-xl border border-slate-700/80 transition flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Experimentar em Modo Demonstração</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-slate-400 hover:text-indigo-400 transition"
              >
                {isRegistering ? "Já tem uma conta? Clique aqui para entrar" : "Primeira vez? Crie sua conta grátis"}
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dados protegidos via Firebase Security Rules</span>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-800/60 mt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} MindVault - Sistema Operacional de Vida & Segundo Cérebro</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-300 cursor-pointer">Privacidade</span>
          <span>•</span>
          <span className="hover:text-slate-300 cursor-pointer">Documentação</span>
          <span>•</span>
          <span className="hover:text-slate-300 cursor-pointer">Plugins API</span>
        </div>
      </footer>
    </div>
  );
}
