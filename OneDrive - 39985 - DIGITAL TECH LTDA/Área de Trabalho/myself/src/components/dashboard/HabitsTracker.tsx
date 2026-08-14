"use client";

import React, { useState } from "react";
import { 
  LayoutGrid, 
  BookOpen, 
  Dumbbell, 
  CheckSquare, 
  Star, 
  Check, 
  Flame
} from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  status: "Lendo" | "Lido" | "Quero Ler";
  rating: number;
  progress: number;
}

interface Workout {
  id: string;
  name: string;
  type: string;
  lastDone: string;
  status: "Concluído" | "Pendente";
}

interface HabitItem {
  id: string;
  title: string;
  streak: number;
  completedToday: boolean;
}

export default function HabitsTracker() {
  const [activeTab, setActiveTab] = useState<"books" | "workouts" | "habits">("books");

  // Books State
  const [books, setBooks] = useState<Book[]>([
    { id: "b1", title: "Essencialismo", author: "Greg McKeown", status: "Lido", rating: 5, progress: 100 },
    { id: "b2", title: "Hábitos Atômicos", author: "James Clear", status: "Lendo", rating: 5, progress: 72 },
    { id: "b3", title: "Deep Work (Trabalho Focado)", author: "Cal Newport", status: "Quero Ler", rating: 0, progress: 0 }
  ]);

  // Workouts State
  const [workouts, setWorkouts] = useState<Workout[]>([
    { id: "w1", name: "Ficha A: Peito + Tríceps", type: "Hipertrofia", lastDone: "Hoje", status: "Concluído" },
    { id: "w2", name: "Ficha B: Costas + BÍceps", type: "Hipertrofia", lastDone: "Ontem", status: "Concluído" },
    { id: "w3", name: "Ficha C: Pernas + Ombros", type: "Força", lastDone: "Amanhã", status: "Pendente" }
  ]);

  // Daily Habits State
  const [habits, setHabits] = useState<HabitItem[]>([
    { id: "h1", title: "Beber 3L de água", streak: 12, completedToday: true },
    { id: "h2", title: "Ler 20 páginas de livro", streak: 8, completedToday: true },
    { id: "h3", title: "Meditação / Imersão (10 min)", streak: 5, completedToday: false },
    { id: "h4", title: "Treino do dia realizado", streak: 14, completedToday: true }
  ]);

  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
        return {
          ...h,
          completedToday: !h.completedToday,
          streak: !h.completedToday ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-amber-400" />
            <span>Registros Orbitais: Leituras, Treinos & Frequência</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe a rotação das suas leituras ativas, fichas de treino físico e voltas orbitais de hábitos.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="glass-panel p-1 rounded-xl flex border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("books")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
              activeTab === "books" ? "bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/20" : "bg-space-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Acervo de Leituras</span>
          </button>

          <button
            onClick={() => setActiveTab("workouts")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
              activeTab === "workouts" ? "bg-sky-600 text-white border-sky-400 font-bold shadow-md shadow-sky-500/20" : "bg-space-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Fichas de Treino</span>
          </button>

          <button
            onClick={() => setActiveTab("habits")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border ${
              activeTab === "habits" ? "bg-purple-600 text-white border-purple-400 font-bold shadow-md shadow-purple-500/20" : "bg-space-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Frequência de Hábitos</span>
          </button>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
        
        {/* Tab 1: Books Database View */}
        {activeTab === "books" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Acervo Cósmico de Leituras</span>
              <span className="text-xs text-amber-300 font-mono">{books.length} Livros Registrados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium pb-2">
                    <th className="pb-3 font-semibold">Livro & Autor</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Progresso</th>
                    <th className="pb-3 font-semibold text-right">Avaliação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {books.map(b => (
                    <tr key={b.id} className="hover:bg-space-900 transition">
                      <td className="py-3 font-medium text-white">
                        <div>{b.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.author}</div>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                          b.status === "Lido" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                          b.status === "Lendo" ? "bg-purple-500/10 text-purple-300 border-purple-500/20" :
                          "bg-space-950 text-slate-400 border-slate-800"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-space-950 rounded-full h-1.5 border border-slate-800">
                            <div className="bg-gradient-to-r from-amber-500 to-purple-500 h-full rounded-full" style={{ width: `${b.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{b.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1 text-amber-400">
                          {b.rating > 0 ? (
                            <>
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span className="font-bold text-white font-mono">{b.rating}.0</span>
                            </>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Workouts View */}
        {activeTab === "workouts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Fichas de Gravidade Física</span>
              <span className="text-xs text-sky-300 font-mono">Foco: Hipertrofia & Força</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {workouts.map(w => (
                <div key={w.id} className="bg-space-950 p-4 rounded-xl border border-slate-800 hover:border-sky-500/40 transition space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">{w.type}</span>
                    <span className={`text-[10px] font-bold ${w.status === "Concluído" ? "text-emerald-400" : "text-amber-400"}`}>
                      {w.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{w.name}</h4>
                    <span className="text-[10px] text-slate-400">Última execução: {w.lastDone}</span>
                  </div>
                  <button className="w-full text-xs py-1.5 rounded-lg bg-space-900 hover:bg-sky-600 text-slate-200 hover:text-white transition font-bold border border-slate-800">
                    Iniciar Treino
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Habits Check-in */}
        {activeTab === "habits" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Voltas Orbitais Diárias</span>
              <span className="text-xs text-amber-300 font-mono font-bold">14 voltas seguidas</span>
            </div>

            <div className="space-y-2">
              {habits.map(h => (
                <div 
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    h.completedToday 
                      ? "bg-purple-950/30 border-purple-500/40 text-white" 
                      : "bg-space-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      h.completedToday ? "bg-purple-500 border-purple-400 text-black font-bold" : "border-slate-700"
                    }`}>
                      {h.completedToday && <Check className="w-3.5 h-3.5 font-bold" />}
                    </div>
                    <span className="text-xs font-medium">{h.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{h.streak} voltas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
