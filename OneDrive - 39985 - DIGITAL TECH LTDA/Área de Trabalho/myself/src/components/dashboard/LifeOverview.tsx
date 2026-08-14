"use client";

import React, { useState } from "react";
import { 
  Compass, 
  Target, 
  Plus, 
  Flame, 
  Zap,
  Activity
} from "lucide-react";

interface LifeGoal {
  id: string;
  title: string;
  category: "Saúde" | "Conhecimento" | "Carreira" | "Finanças" | "Pessoal";
  progress: number;
  targetDate: string;
}

export default function LifeOverview() {
  const [goals, setGoals] = useState<LifeGoal[]>([
    { id: "1", title: "Ler 12 livros de desenvolvimento & negócios", category: "Conhecimento", progress: 65, targetDate: "Dez 2026" },
    { id: "2", title: "Manter consistência nos treinos 4x/semana", category: "Saúde", progress: 80, targetDate: "Ano Inteiro" },
    { id: "3", title: "Lançar o MVP do ecossistema MindVault", category: "Carreira", progress: 40, targetDate: "Set 2026" },
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
    <div className="space-y-6 text-white">
      {/* Top Banner / Presence Indicator */}
      <div className="glass-panel p-6 rounded-2xl border border-neutral-800 bg-neutral-950 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-neutral-400">
              <Compass className="w-4 h-4 text-white" />
              <span>MATRIZ DE VIDA & CLAREZA MENTAL</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Você está em 68.5% de Clareza Total</h2>
            <p className="text-xs text-neutral-400">
              Suas metas de saúde e leitura estão no ritmo ideal. Mantenha o foco nos projetos ativos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black p-3 rounded-xl border border-neutral-800 flex items-center gap-3">
              <Flame className="w-6 h-6 text-white" />
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-medium">Sequência Foco</span>
                <span className="text-sm font-bold text-white">14 Dias Seguidos</span>
              </div>
            </div>

            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-white hover:bg-neutral-200 text-black px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition"
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
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-white" />
              <span>Equilíbrio da Matriz</span>
            </h3>
            <span className="text-xs text-neutral-400 font-mono">5 Áreas</span>
          </div>

          <div className="space-y-4 font-sans">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">Saúde & Treinos</span>
                <span className="text-white font-mono font-bold">85%</span>
              </div>
              <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-neutral-800">
                <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: "85%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">Estudos & Conhecimento</span>
                <span className="text-white font-mono font-bold">75%</span>
              </div>
              <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-neutral-800">
                <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: "75%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">Carreira & MindVault</span>
                <span className="text-white font-mono font-bold">60%</span>
              </div>
              <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-neutral-800">
                <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: "60%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">Finanças</span>
                <span className="text-white font-mono font-bold">90%</span>
              </div>
              <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-neutral-800">
                <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: "90%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">Desenvolvimento Pessoal</span>
                <span className="text-white font-mono font-bold">70%</span>
              </div>
              <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-neutral-800">
                <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: "70%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Metas Principais do Ano */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-white" />
              <span>Metas & Objetivos em Andamento</span>
            </h3>
            <span className="text-xs text-neutral-400 font-mono">{goals.length} Ativas</span>
          </div>

          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-black p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{goal.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono">
                    {goal.category}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Alvo: {goal.targetDate}</span>
                  <span className="font-mono text-white font-bold">{goal.progress}%</span>
                </div>
                <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-white h-full rounded-full" 
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-neutral-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Criar Nova Meta na Matriz</h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Título da Meta</label>
                <input 
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Ex: Correr 5km sem parar"
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold"
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
