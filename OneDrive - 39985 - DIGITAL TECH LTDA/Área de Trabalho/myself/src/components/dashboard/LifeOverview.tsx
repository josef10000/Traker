"use client";

import React, { useState } from "react";
import { 
  Compass, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Plus, 
  Calendar, 
  Sparkles, 
  Flame, 
  Award,
  Zap
} from "lucide-react";

interface LifeGoal {
  id: string;
  title: string;
  category: "Saúde" | "Conhecimento" | "Carreira" | "Finanças" | "Pessoal";
  progress: number; // 0 to 100
  targetDate: string;
}

export default function LifeOverview() {
  const [goals, setGoals] = useState<LifeGoal[]>([
    { id: "1", title: "Ler 12 livros de desenvolvimento & negócios", category: "Conhecimento", progress: 65, targetDate: "Dez 2026" },
    { id: "2", title: "Manter consistência nos treinos 4x/semana", category: "Saúde", progress: 80, targetDate: "Ano Inteiro" },
    { id: "3", title: "Lançar o MVP da plataforma MindVault", category: "Carreira", progress: 40, targetDate: "Set 2026" },
    { id: "4", title: "Construir Reserva de Emergência", category: "Finanças", progress: 90, targetDate: "Nov 2026" }
  ]);

  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    const newGoal: LifeGoal = {
      id: Date.now().toString(),
      title: newGoalTitle,
      category: "Pessoal",
      progress: 10,
      targetDate: "Dez 2026"
    };
    setGoals([...goals, newGoal]);
    setNewGoalTitle("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Presence Indicator */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <Compass className="w-4 h-4" />
              <span>Painel de Clareza Mental • Hoje</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Você está em 68.5% de Clareza Total</h2>
            <p className="text-xs text-slate-300">
              Suas metas de saúde e leitura estão no ritmo ideal. Mantenha o foco nos projetos ativos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Sequência Foco</span>
                <span className="text-sm font-bold text-white">14 Dias Seguidos</span>
              </div>
            </div>

            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 md:px-4 md:py-3 rounded-xl font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Nova Meta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 5 Life Pillar Meters + Goals List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Áreas de Vida */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Equilíbrio de Vida</span>
            </h3>
            <span className="text-xs text-slate-400">5 Áreas</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Saúde & Treinos</span>
                <span className="text-emerald-400 font-semibold">85%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: "85%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Estudos & Conhecimento</span>
                <span className="text-indigo-400 font-semibold">75%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: "75%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Carreira & MindVault</span>
                <span className="text-purple-400 font-semibold">60%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: "60%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Finanças</span>
                <span className="text-amber-400 font-semibold">90%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: "90%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Desenvolvimento Pessoal</span>
                <span className="text-cyan-400 font-semibold">70%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: "70%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Metas Principais do Ano */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <span>Metas & Objetivos em Andamento</span>
            </h3>
            <span className="text-xs text-indigo-400 font-medium">{goals.length} Ativas</span>
          </div>

          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 hover:border-indigo-500/30 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">{goal.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {goal.category}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Alvo: {goal.targetDate}</span>
                  <span className="font-semibold text-slate-300">{goal.progress}% Concluído</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" 
                    style={{ width: `${goal.progress}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modal Add Goal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Criar Nova Meta de Vida</h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título da Meta</label>
                <input 
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Ex: Correr 5km sem parar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
