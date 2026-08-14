"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Vault, 
  Sparkles, 
  Brain, 
  Orbit, 
  LayoutGrid, 
  ArrowRight, 
  Lock, 
  Mail, 
  BookOpen, 
  Dumbbell, 
  ShieldCheck,
  CheckCircle2,
  Sun,
  Star,
  Globe
} from "lucide-react";

export default function AuthShowcase() {
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState<"nexus" | "registers" | "focus">("nexus");
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
    }, 500);
  };

  const handleDemoAccess = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 300);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 md:p-8 max-w-7xl mx-auto text-white">
      {/* Top Header */}
      <header className="flex items-center justify-between py-4 border-b border-gray-800 mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-black font-bold star-glow-gold">
            <Vault className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              MindVault Cosmos <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">Edição Estelar</span>
            </h1>
            <p className="text-xs text-slate-400">Seu Universo Pessoal de Conhecimento & Clareza</p>
          </div>
        </div>

        <button 
          onClick={handleDemoAccess}
          className="hidden md:flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 hover:text-white transition border border-slate-700"
        >
          <span>Entrar no modo Demo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch my-auto">
        
        {/* Left Side (7 Cols): Interactive Tour */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-medium px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-4">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>SISTEMA OPERACIONAL CÓSMICO</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Sua mente como um <br />
              <span className="bg-gradient-to-r from-amber-300 via-purple-300 to-sky-300 bg-clip-text text-transparent">Universo em Expansão.</span>
            </h2>

            <p className="mt-4 text-sm md:text-base text-slate-300 leading-relaxed">
              Organize seus estudos, projetos, livros e treinos como **Estrelas Pulsantes e Planetas Orbitando** em um acervo celestial de alta clareza.
            </p>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 overflow-x-auto gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Conheça o sistema:</span>
              
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveFeature("nexus")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                    activeFeature === "nexus" 
                      ? "bg-purple-600 text-white border-purple-400 font-bold shadow-md shadow-purple-500/30" 
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <Orbit className="w-3.5 h-3.5 text-purple-300" />
                  <span>Nexo Cósmico</span>
                </button>

                <button
                  onClick={() => setActiveFeature("registers")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                    activeFeature === "registers" 
                      ? "bg-amber-600 text-white border-amber-400 font-bold shadow-md shadow-amber-500/30" 
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-300" />
                  <span>Registros Orbitais</span>
                </button>

                <button
                  onClick={() => setActiveFeature("focus")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                    activeFeature === "focus" 
                      ? "bg-sky-600 text-white border-sky-400 font-bold shadow-md shadow-sky-500/30" 
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 text-sky-300" />
                  <span>Câmara de Foco</span>
                </button>
              </div>
            </div>

            {/* Feature Content Demo Box */}
            <div className="bg-space-950 rounded-xl p-4 border border-slate-800 min-h-[190px] flex flex-col justify-between">
              {activeFeature === "nexus" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                      <Orbit className="w-4 h-4 text-purple-400" /> Módulo 1: Nexo Cósmico & Estrelas Pulsantes
                    </span>
                    <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                      4 Estrelas Mestre
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Projetos e temas mestres tornam-se **Estrelas Pulsantes** com auras de cores próprias (Dourado, Roxo, Cyan, Esmeralda). Notas e resumos viram **Planetas** que giram ao redor delas.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-space-900 p-2.5 rounded-lg border border-purple-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-400 star-glow-purple animate-pulse" />
                        <span className="font-semibold text-slate-200">Sistema Conhecimento</span>
                      </div>
                      <span className="text-[10px] text-purple-300">5 Planetas</span>
                    </div>
                    <div className="bg-space-900 p-2.5 rounded-lg border border-amber-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400 star-glow-gold animate-pulse" />
                        <span className="font-semibold text-slate-200">Sistema Vitalidade</span>
                      </div>
                      <span className="text-[10px] text-amber-300">3 Planetas</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === "registers" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <LayoutGrid className="w-4 h-4 text-amber-400" /> Módulo 2: Registros Orbitais (Leituras & Treinos)
                    </span>
                    <span className="text-[11px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-mono">Grades Inteligentes</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Acompanhe suas leituras celestes, fichas de exercício físico e rotinas diárias com medidores de frequência e voltas orbitais.
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between bg-space-900 p-2 rounded border border-slate-800">
                      <span className="flex items-center gap-2 text-slate-200">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Essencialismo (Greg McKeown)
                      </span>
                      <span className="text-[11px] text-amber-300 font-semibold font-mono">Concluído ★ 5.0</span>
                    </div>
                    <div className="flex items-center justify-between bg-space-900 p-2 rounded border border-slate-800">
                      <span className="flex items-center gap-2 text-slate-200">
                        <Dumbbell className="w-3.5 h-3.5 text-sky-400" /> Ficha de Gravidade Física A
                      </span>
                      <span className="text-[11px] text-slate-400">Executado hoje</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === "focus" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-sky-400" /> Módulo 3: Câmara de Imersão Espacial
                    </span>
                    <span className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Foco Absoluto</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Entre em estado de imersão profunda com o Timer de Imersão e descarregue suas ideias no Diário Espacial sem ruídos.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Ambiente silencioso projetado para máxima velocidade cognitiva</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                <span>Explore os 3 módulos do MindVault Cosmos</span>
                <span className="text-amber-400 font-medium cursor-pointer hover:underline" onClick={handleDemoAccess}>
                  Acessar Demonstração Grátis →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (5 Cols): Authentication Form */}
        <div className="lg:col-span-5">
          <div className="glass-panel rounded-2xl p-6 md:p-8 border border-slate-800 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">
                {isRegistering ? "Criar seu Universo no MindVault" : "Acessar seu MindVault Cosmos"}
              </h3>
              <p className="text-xs text-slate-400">
                {isRegistering 
                  ? "Comece agora a organizar seu conhecimento e vida" 
                  : "Seu universo pessoal de clareza te espera"}
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
                    className="w-full bg-space-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
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
                    className="w-full bg-space-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegistering ? "Criar meu Cosmos Pessoal" : "Entrar no MindVault"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-space-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider absolute">ou</span>
            </div>

            <button
              onClick={handleDemoAccess}
              type="button"
              className="w-full bg-space-900 hover:bg-slate-800 text-white text-xs font-medium py-2.5 rounded-xl border border-slate-800 transition flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Experimentar em Modo Demonstração</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-slate-400 hover:text-amber-400 transition"
              >
                {isRegistering ? "Já tem uma conta? Clique aqui para entrar" : "Primeira vez? Crie sua conta grátis"}
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Segurança e criptografia end-to-end</span>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-800 mt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} MindVault Cosmos - Universo Pessoal de Clareza</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-white cursor-pointer">Privacidade</span>
          <span>•</span>
          <span className="hover:text-white cursor-pointer">Documentação</span>
          <span>•</span>
          <span className="hover:text-white cursor-pointer">Visão Celular</span>
        </div>
      </footer>
    </div>
  );
}
