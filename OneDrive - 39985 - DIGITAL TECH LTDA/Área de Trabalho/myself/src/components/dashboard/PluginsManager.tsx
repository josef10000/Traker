"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Check, 
  Code, 
  Settings,
  Compass,
  Layout,
  Volume2,
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
      case "Compass": return <Compass className="w-5 h-5 text-white" />;
      case "Layout": return <Layout className="w-5 h-5 text-white" />;
      case "Volume2": return <Volume2 className="w-5 h-5 text-white" />;
      case "GitBranch": return <GitBranch className="w-5 h-5 text-white" />;
      default: return <Sparkles className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <span>Extensões Autorais do MindVault</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Personalize seu acervo ativando módulos de radar, som silencioso e integrações personalizadas.
          </p>
        </div>

        <button className="bg-white hover:bg-neutral-200 text-black text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition self-start md:self-auto">
          <Code className="w-4 h-4" />
          <span>Criar Extensão (API SDK)</span>
        </button>
      </div>

      {/* Grid of Plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map(plugin => (
          <div 
            key={plugin.id}
            className={`glass-panel p-5 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
              plugin.enabled ? "border-white bg-neutral-950" : "border-neutral-800 opacity-60"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-black border border-neutral-800">
                    {getIcon(plugin.icon)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{plugin.name}</h3>
                    <span className="text-[10px] text-neutral-500 font-mono">v{plugin.version} • {plugin.author}</span>
                  </div>
                </div>

                <button
                  onClick={() => togglePlugin(plugin.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    plugin.enabled
                      ? "bg-white text-black border border-white"
                      : "bg-black text-neutral-400 border border-neutral-800 hover:text-white"
                  }`}
                >
                  {plugin.enabled ? (
                    <>
                      <Check className="w-3.5 h-3.5 font-bold" />
                      <span>Ativo</span>
                    </>
                  ) : (
                    <span>Ativar</span>
                  )}
                </button>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                {plugin.description}
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <span className="uppercase px-2 py-0.5 rounded bg-black border border-neutral-800 text-white">
                {plugin.category}
              </span>
              <span className="flex items-center gap-1 text-neutral-400 cursor-pointer hover:text-white">
                <Settings className="w-3 h-3" /> Ajustes
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
