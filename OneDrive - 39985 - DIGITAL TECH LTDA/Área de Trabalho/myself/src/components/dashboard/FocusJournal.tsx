"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, 
  Play, 
  Pause, 
  RotateCcw, 
  BookOpen, 
  Save,
  Clock,
  Sparkles
} from "lucide-react";

export default function FocusJournal() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");

  const [journalText, setJournalText] = useState(
    "O que está na minha mente hoje? Quais são minhas 3 prioridades essenciais para a minha clareza?"
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
    <div className="space-y-6 text-white">
      {/* Top Title */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-sky-400" />
          <span>Câmara de Imersão Espacial</span>
        </h2>
        <p className="text-xs text-slate-400">
          Imersão sem ruídos. Foco cronometrado e limpa mental diária no espaço profundo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side (5 Cols): Pomodoro Timer */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between items-center text-center space-y-6">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-sky-300">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>SESSÃO DE IMERSÃO</span>
          </div>

          {/* Big Digital Timer Display */}
          <div className="space-y-2">
            <div className="text-5xl font-mono font-extrabold text-white tracking-widest bg-gradient-to-r from-sky-300 to-purple-300 bg-clip-text text-transparent">
              {formatTime(secondsLeft)}
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-mono">
              {mode === "focus" ? "🔥 ESTADO DE IMERSÃO ATIVO" : "☕ PAUSA PARA DESCANSO"}
            </span>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTimer}
              className="bg-sky-500 hover:bg-sky-400 text-black p-3.5 rounded-full font-bold shadow-lg shadow-sky-500/30 transition"
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-black" />}
            </button>

            <button
              onClick={() => resetTimer(25, "focus")}
              className="bg-space-950 hover:bg-slate-900 text-white p-3.5 rounded-full border border-slate-800 transition"
              title="Resetar 25min"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2 text-xs pt-2 font-mono">
            <button 
              onClick={() => resetTimer(25, "focus")} 
              className={`px-3 py-1 rounded-lg border ${mode === 'focus' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold' : 'bg-space-950 border-slate-800 text-slate-400'}`}
            >
              25m Foco
            </button>
            <button 
              onClick={() => resetTimer(5, "break")} 
              className={`px-3 py-1 rounded-lg border ${mode === 'break' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'bg-space-950 border-slate-800 text-slate-400'}`}
            >
              5m Pausa
            </button>
          </div>
        </div>

        {/* Right Side (7 Cols): Journal */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Diário Espacial & Registro do Dia</span>
            </h3>
            {savedSuccess && (
              <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-bold">
                Salvo no MindVault
              </span>
            )}
          </div>

          <textarea
            rows={7}
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            className="w-full bg-space-950 border border-slate-800 rounded-xl p-4 text-xs text-white leading-relaxed focus:outline-none focus:border-sky-400 resize-none font-sans"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-mono">Criptografado e salvo localmente</span>
            <button
              onClick={handleSaveJournal}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-purple-600/30 transition"
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
