"use client";

import React, { useState } from "react";
import { 
  Puzzle, 
  Sparkles, 
  Check, 
  Plus, 
  Code, 
  ShieldCheck, 
  Zap, 
  Settings,
  Network,
  Kanban,
  Headphones,
  GitBranch
} from "lucide-react";
import { INITIAL_PLUGINS, MindVaultPlugin } from "@/lib/plugins";

export default function PluginsManager() {
  const [plugins, setPlugins] = useState<MindVaultPlugin[]>(INITIAL_PLUGINS);

  const togglePlugin = (id: string) => {
    setPlugins(plugins.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Network": return <Network className="w-5 h-5 text-purple-400" />;
      case "Kanban": return <Kanban className="w-5 h-5 text-indigo-400" />;
      case "Headphones": return <Headphones className="w-5 h-5 text-emerald-400" />;
      case "GitBranch": return <GitBranch className="w-5 h-5 text-cyan-400" />;
      default: return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-emerald-400" />
            <span>Ecossistema de Plugins & Extensões (MindVault Market)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Personalize seu MindVault com módulos criados por você ou pela comunidade.
          </p>
        </div>

        <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition self-start md:self-auto">
          <Code className="w-4 h-4" />
          <span>Criar Meu Plugin (API SDK)</span>
        </button>
      </div>

      {/* Grid of Plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map(plugin => (
          <div 
            key={plugin.id}
            className={`glass-panel p-5 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
              plugin.enabled ? "border-emerald-500/30 bg-slate-900/60" : "border-slate-800 opacity-75"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    {getIcon(plugin.icon)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{plugin.name}</h3>
                    <span className="text-[10px] text-slate-500">v{plugin.version} por {plugin.author}</span>
                  </div>
                </div>

                <button
                  onClick={() => togglePlugin(plugin.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
                    plugin.enabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  {plugin.enabled ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ativo</span>
                    </>
                  ) : (
                    <span>Ativar</span>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {plugin.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="capitalize px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                {plugin.category}
              </span>
              <span className="flex items-center gap-1 text-slate-400 cursor-pointer hover:text-white">
                <Settings className="w-3 h-3" /> Configurações
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
