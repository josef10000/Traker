"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Vault, 
  Compass, 
  Network, 
  LayoutGrid, 
  Brain, 
  Puzzle, 
  LogOut, 
  User, 
  Bell, 
  Sparkles,
  Search
} from "lucide-react";

import LifeOverview from "@/components/dashboard/LifeOverview";
import KnowledgeGraphVault from "@/components/dashboard/KnowledgeGraphVault";
import HabitsTracker from "@/components/dashboard/HabitsTracker";
import FocusJournal from "@/components/dashboard/FocusJournal";
import PluginsManager from "@/components/dashboard/PluginsManager";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"life" | "graph" | "databases" | "focus" | "plugins">("life");

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Top Main Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/30 cursor-pointer" onClick={() => setActiveTab("life")}>
              <Vault className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                MindVault <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Workspace</span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 glass-panel p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("life")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === "life" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Clareza de Vida</span>
            </button>

            <button
              onClick={() => setActiveTab("graph")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === "graph" ? "bg-purple-600 text-white shadow-md shadow-purple-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Grafo Obsidian</span>
            </button>

            <button
              onClick={() => setActiveTab("databases")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === "databases" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bancos Notion</span>
            </button>

            <button
              onClick={() => setActiveTab("focus")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === "focus" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Modo Foco</span>
            </button>

            <button
              onClick={() => setActiveTab("plugins")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === "plugins" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span>Plugins</span>
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                U
              </div>
              <span className="text-xs font-medium text-slate-300 hidden md:inline">Usuário MindVault</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-900 transition"
              title="Sair do MindVault"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden flex items-center justify-between overflow-x-auto gap-1 pt-3 border-t border-slate-800/80 mt-2">
          <button onClick={() => setActiveTab("life")} className={`text-[11px] px-2.5 py-1 rounded-lg ${activeTab === 'life' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Clareza</button>
          <button onClick={() => setActiveTab("graph")} className={`text-[11px] px-2.5 py-1 rounded-lg ${activeTab === 'graph' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Grafo</button>
          <button onClick={() => setActiveTab("databases")} className={`text-[11px] px-2.5 py-1 rounded-lg ${activeTab === 'databases' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Notion DB</button>
          <button onClick={() => setActiveTab("focus")} className={`text-[11px] px-2.5 py-1 rounded-lg ${activeTab === 'focus' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Foco</button>
          <button onClick={() => setActiveTab("plugins")} className={`text-[11px] px-2.5 py-1 rounded-lg ${activeTab === 'plugins' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Plugins</button>
        </div>
      </header>

      {/* Main Workspace Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {activeTab === "life" && <LifeOverview />}
        {activeTab === "graph" && <KnowledgeGraphVault />}
        {activeTab === "databases" && <HabitsTracker />}
        {activeTab === "focus" && <FocusJournal />}
        {activeTab === "plugins" && <PluginsManager />}
      </main>

    </div>
  );
}
