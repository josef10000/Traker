"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  BookOpen, 
  Smile, 
  Zap, 
  Save,
  Clock
} from "lucide-react";

export default function FocusJournal() {
  // Pomodoro State
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");

  // Journal State
  const [journalText, setJournalText] = useState(
    "O que está na minha mente hoje? Quais são minhas 3 prioridades essenciais?"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => setSecondsLeft(prev => prev - 1), 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, secondsLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = (newMinutes: number, newMode: "focus" | "break") => {
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(newMinutes * 60);
  };

  const handleSaveJournal = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Title */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <span>Modo Foco & Diário de Descarrego Mental (Brain Dump)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Combine sessões de trabalho focado com limpa mental para manter sua energia em alto nível.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side (5 Cols): Pomodoro Timer */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-indigo-500/30 flex flex-col justify-between items-center text-center space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <Clock className="w-4 h-4" />
            <span>Sessão de Foco Pomodoro</span>
          </div>

          {/* Big Digital Timer Display */}
          <div className="space-y-2">
            <div className="text-5xl font-mono font-extrabold text-white tracking-widest gradient-text">
              {formatTime(secondsLeft)}
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block">
              {mode === "focus" ? "🔥 Estado de Foco Ativo" : "☕ Pausa para Descanso"}
            </span>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTimer}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full font-bold shadow-lg shadow-indigo-600/40 transition"
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              onClick={() => resetTimer(25, "focus")}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-3 rounded-full border border-slate-800 transition"
              title="Resetar 25min"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2 text-xs pt-2">
            <button 
              onClick={() => resetTimer(25, "focus")} 
              className={`px-3 py-1 rounded-lg border ${mode === 'focus' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
            >
              25m Foco
            </button>
            <button 
              onClick={() => resetTimer(5, "break")} 
              className={`px-3 py-1 rounded-lg border ${mode === 'break' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
            >
              5m Pausa
            </button>
          </div>
        </div>

        {/* Right Side (7 Cols): Journal & Brain Dump Textarea */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Diário do Dia & Reflexão Matinal</span>
            </h3>
            {savedSuccess && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-fade-in">
                Salvo com sucesso!
              </span>
            )}
          </div>

          <textarea
            rows={7}
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-sans"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">Gravado localmente no MindVault</span>
            <button
              onClick={handleSaveJournal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Diário</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
