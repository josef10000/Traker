"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Vault, 
  Orbit, 
  LayoutGrid, 
  Brain, 
  LogOut,
  Sun
} from "lucide-react";

import KnowledgeGraphVault from "@/components/dashboard/KnowledgeGraphVault";
import HabitsTracker from "@/components/dashboard/HabitsTracker";
import FocusJournal from "@/components/dashboard/FocusJournal";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"graph" | "databases" | "focus">("graph");

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-space-950 text-white">
      
      {/* Top Main Navigation Bar */}
      <header className="border-b border-slate-800 bg-space-950/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-black font-bold cursor-pointer star-glow-gold" onClick={() => setActiveTab("graph")}>
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                MindVault <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" /> Cosmos
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 glass-panel p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("graph")}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                activeTab === "graph" ? "bg-purple-600 text-white border-purple-400 font-bold shadow-md shadow-purple-500/20" : "bg-space-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <Orbit className="w-3.5 h-3.5 text-purple-300" />
              <span>Nexo Cósmico</span>
            </button>

            <button
              onClick={() => setActiveTab("databases")}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                activeTab === "databases" ? "bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/20" : "bg-space-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-950" />
              <span>Registros Orbitais</span>
            </button>

            <button
              onClick={() => setActiveTab("focus")}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
                activeTab === "focus" ? "bg-sky-600 text-white border-sky-400 font-bold shadow-md shadow-sky-500/20" : "bg-space-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-sky-300" />
              <span>Câmara de Foco</span>
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-space-900 border border-slate-800 p-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold text-xs">
                U
              </div>
              <span className="text-xs font-medium text-slate-300 hidden md:inline">Usuário Cosmos</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-space-900 transition"
              title="Sair do MindVault"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto gap-1 pt-3 border-t border-slate-800 mt-2 font-mono">
          <button onClick={() => setActiveTab("graph")} className={`text-[11px] px-3 py-1 rounded ${activeTab === 'graph' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'}`}>Nexo</button>
          <button onClick={() => setActiveTab("databases")} className={`text-[11px] px-3 py-1 rounded ${activeTab === 'databases' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}>Registros</button>
          <button onClick={() => setActiveTab("focus")} className={`text-[11px] px-3 py-1 rounded ${activeTab === 'focus' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}>Foco</button>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {activeTab === "graph" && <KnowledgeGraphVault />}
        {activeTab === "databases" && <HabitsTracker />}
        {activeTab === "focus" && <FocusJournal />}
      </main>

    </div>
  );
}
