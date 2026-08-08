"use client";

import React, { useState } from "react";
import { 
  Network, 
  FileText, 
  Plus, 
  Link2, 
  Sparkles, 
  Search, 
  Hash, 
  Share2, 
  Edit3,
  Layers
} from "lucide-react";

interface VaultNote {
  id: string;
  title: string;
  category: string;
  content: string;
  links: string[];
  updatedAt: string;
}

export default function KnowledgeGraphVault() {
  const [notes, setNotes] = useState<VaultNote[]>([
    {
      id: "n1",
      title: "Arquitetura MindVault",
      category: "Projetos",
      content: "O MindVault une o melhor do Notion com o [[Obsidian Graph]]. Usamos Next.js 15 e [[Firebase SDK]] para garantir sincronização.",
      links: ["Obsidian Graph", "Firebase SDK"],
      updatedAt: "Hoje, 14:30"
    },
    {
      id: "n2",
      title: "Obsidian Graph",
      category: "Tecnologia",
      content: "Links bidirecionais permitem conectar ideias como um grafo neural. Conectado a [[Arquitetura MindVault]] e [[Resumo do Livro Essencialismo]].",
      links: ["Arquitetura MindVault", "Resumo do Livro Essencialismo"],
      updatedAt: "Ontem"
    },
    {
      id: "n3",
      title: "Resumo do Livro Essencialismo",
      category: "Livros",
      content: "Focar no que importa verdadeiramente. Conecta com a meta de [[Clareza de Vida 2026]].",
      links: ["Clareza de Vida 2026"],
      updatedAt: "04 Ago"
    },
    {
      id: "n4",
      title: "Firebase SDK",
      category: "Tecnologia",
      content: "Autenticação rápida com Auth e banco NoSQL flexível com Cloud Firestore.",
      links: ["Arquitetura MindVault"],
      updatedAt: "01 Ago"
    }
  ]);

  const [activeNoteId, setActiveNoteId] = useState<string>("n1");
  const [searchTerm, setSearchTerm] = useState("");
  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const handleContentChange = (newContent: string) => {
    // Extract [[links]] from text automatically
    const extractedLinks = Array.from(newContent.matchAll(/\[\[(.*?)\]\]/g)).map(match => match[1]);
    setNotes(notes.map(n => n.id === activeNote.id ? { ...n, content: newContent, links: extractedLinks } : n));
  };

  const handleCreateNote = () => {
    const newNote: VaultNote = {
      id: Date.now().toString(),
      title: "Nova Nota Sem Título",
      category: "Geral",
      content: "Comece a escrever em Markdown aqui... Conecte com [[Outra Nota]]",
      links: [],
      updatedAt: "Agora"
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-400" />
            <span>Vault de Conhecimento & Grafo Neural</span>
          </h2>
          <p className="text-xs text-slate-400">
            Escreva em Markdown fluido e conecte suas notas usando links bidirecionais <code className="text-purple-300">[[Nome]]</code>.
          </p>
        </div>

        <button
          onClick={handleCreateNote}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nota</span>
        </button>
      </div>

      {/* Main Split Grid: Notes Explorer + Editor (Left 7) vs Interactive Canvas Graph (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side (7 Cols): Notes List + Active Note Editor */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-4 space-y-4">
          
          {/* Note Selection & Search Bar */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar nota ou [[link]]..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <span className="text-[11px] text-slate-500">{notes.length} notas no vault</span>
          </div>

          {/* Notes Pills Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {notes
              .filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(n => (
                <button
                  key={n.id}
                  onClick={() => setActiveNoteId(n.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 border ${
                    activeNoteId === n.id
                      ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{n.title}</span>
                </button>
              ))}
          </div>

          {/* Active Note Title & Content Editor */}
          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => setNotes(notes.map(n => n.id === activeNote.id ? { ...n, title: e.target.value } : n))}
              className="text-lg font-bold text-white bg-transparent border-b border-slate-800 pb-1 w-full focus:outline-none focus:border-purple-500"
            />

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300">
                {activeNote.category}
              </span>
              <span>• Atualizado: {activeNote.updatedAt}</span>
              {activeNote.links.length > 0 && (
                <span className="text-indigo-400 flex items-center gap-1 ml-auto">
                  <Link2 className="w-3 h-3" /> {activeNote.links.length} conexões ativas
                </span>
              )}
            </div>

            <textarea
              rows={8}
              value={activeNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-purple-500/80 resize-none"
            />
          </div>
        </div>

        {/* Right Side (5 Cols): Obsidian Graph Interactive Visualization */}
        <div className="lg:col-span-5 glass-panel rounded-2xl border border-purple-500/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-400" />
              <span>Grafo de Conexões Neural</span>
            </h3>
            <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">Visualização Obsidian</span>
          </div>

          {/* Interactive Graph Simulation Canvas */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 min-h-[290px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />
            
            <div className="relative z-10 space-y-4">
              <span className="text-[11px] text-slate-400 block">Nós conectados em tempo real:</span>

              <div className="grid grid-cols-2 gap-2">
                {notes.map(n => (
                  <div
                    key={n.id}
                    onClick={() => setActiveNoteId(n.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      activeNoteId === n.id 
                        ? "bg-purple-900/50 border-purple-400 text-white shadow-lg shadow-purple-500/20"
                        : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-purple-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[11px] truncate">{n.title}</span>
                      <div className={`w-2 h-2 rounded-full ${activeNoteId === n.id ? "bg-purple-400 animate-ping" : "bg-indigo-500"}`} />
                    </div>
                    {n.links.length > 0 && (
                      <span className="text-[10px] text-purple-300 block truncate">
                        → {n.links.join(", ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Dica: Use [[Nome]] para conectar notas</span>
              <span className="text-purple-400 font-medium cursor-pointer hover:underline">Ver Grafo Fullscreen</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
