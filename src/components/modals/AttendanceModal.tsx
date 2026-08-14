import React, { useState, useEffect } from 'react';
import { X, Clock, Check, UserMinus, SignOut, Coffee, Airplane } from '@phosphor-icons/react';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string;
  dateStr: string; // Formato YYYY-MM-DD
  currentStatus?: 'present' | 'late' | 'absent' | 'early_departure' | 'day_off' | 'vacation' | '';
  currentLateDuration?: string;
  currentAbsenceReason?: string;
  onSave: (
    status: 'present' | 'late' | 'absent' | 'early_departure' | 'day_off' | 'vacation' | '',
    lateDuration: string,
    absenceReason: string,
    dateRange?: { startDate: string; endDate: string }
  ) => void;
  theme: 'light' | 'dark';
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
  dateStr,
  currentStatus = '',
  currentLateDuration = '',
  currentAbsenceReason = '',
  onSave,
  theme
}) => {
  const [status, setStatus] = useState<'present' | 'late' | 'absent' | 'early_departure' | 'day_off' | 'vacation' | ''>(currentStatus);
  const [lateDuration, setLateDuration] = useState(currentLateDuration);
  const [absenceReason, setAbsenceReason] = useState(currentAbsenceReason);
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);

  // Estados de Intervalo de Datas para Férias em Lote
  const [isRangeMode, setIsRangeMode] = useState(true);
  const [startDate, setStartDate] = useState(dateStr);
  const [endDate, setEndDate] = useState(dateStr);

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus);
      setLateDuration(currentLateDuration);
      setAbsenceReason(currentAbsenceReason);

      setStartDate(dateStr);
      // Calcular padrão de +14 dias (15 dias no total) se for férias
      if (dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + 14);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setEndDate(`${y}-${m}-${day}`);
      }

      let hrs = 0;
      let mins = 0;
      if (currentLateDuration) {
        const matchHhMm = currentLateDuration.match(/^(\d{1,2}):(\d{2})$/);
        if (matchHhMm) {
          hrs = parseInt(matchHhMm[1], 10);
          mins = parseInt(matchHhMm[2], 10);
        } else {
          const matchH = currentLateDuration.match(/(\d+)\s*h/i);
          const matchM = currentLateDuration.match(/(\d+)\s*m/i);
          if (matchH) hrs = parseInt(matchH[1], 10);
          if (matchM) mins = parseInt(matchM[1], 10);
        }
      }
      setSelectedHours(hrs);
      setSelectedMinutes(mins);
    }
  }, [isOpen, dateStr, currentStatus, currentLateDuration, currentAbsenceReason]);

  if (!isOpen) return null;

  const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const getFormattedTime = (h: number, m: number, currentStatus: string) => {
    if (currentStatus === 'late') {
      if (h === 0) return `${m}m`;
      return `${h}h ${m}m`;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDuration = (status === 'late' || status === 'early_departure')
      ? getFormattedTime(selectedHours, selectedMinutes, status)
      : '';
    
    onSave(
      status,
      finalDuration,
      (status === 'absent' || status === 'early_departure' || status === 'day_off' || status === 'late' || status === 'vacation') ? absenceReason : '',
      (status === 'vacation' && isRangeMode && startDate && endDate) ? { startDate, endDate } : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md cursor-pointer" onClick={onClose}>
      <div 
        className={`w-full max-w-md rounded-3xl border p-6 transition-all cursor-default ${
          theme === 'dark'
            ? 'bg-slate-900 border-white/10 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Registrar Escala / Presença</h3>
            <p className="text-xs text-slate-400 mt-1">{collaboratorName} • {dateFormatted}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              theme === 'dark'
                ? 'border-white/5 hover:bg-white/5 text-slate-400'
                : 'border-slate-100 hover:bg-slate-50 text-slate-500'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Status Buttons */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Status da Presença</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('present')}
                className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  status === 'present' || status === ''
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-black shadow-lg shadow-emerald-500/5'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Check size={16} />
                Presente (Padrão)
              </button>

              <button
                type="button"
                onClick={() => setStatus('late')}
                className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  status === 'late'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-black shadow-lg shadow-amber-500/5'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock size={16} />
                Atrasado
              </button>

              <button
                type="button"
                onClick={() => setStatus('absent')}
                className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  status === 'absent'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-black shadow-lg shadow-rose-500/5'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserMinus size={16} />
                Falta
              </button>

              <button
                type="button"
                onClick={() => setStatus('early_departure')}
                className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  status === 'early_departure'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-black shadow-lg shadow-purple-500/5'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <SignOut size={16} />
                Saída Antecipada
              </button>

              <button
                type="button"
                onClick={() => setStatus('day_off')}
                className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  status === 'day_off'
                    ? 'bg-slate-500/15 text-slate-400 border-slate-550/30 font-black shadow-lg shadow-slate-500/5'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Coffee size={16} />
                Day Off
              </button>

              <button
                type="button"
                onClick={() => setStatus('vacation')}
                className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  status === 'vacation'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-black shadow-lg shadow-blue-500/5'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Airplane size={16} />
                Férias
              </button>
            </div>
          </div>

          {/* Conditional Inputs */}
          {status === 'late' && (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-4 rounded-2xl border flex flex-col items-center gap-4 ${
                theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 self-start">
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Tempo de Atraso
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Horas */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedHours(prev => (prev + 1) % 24)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      +
                    </button>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black border font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {String(selectedHours).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedHours(prev => (prev - 1 + 24) % 24)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      -
                    </button>
                  </div>

                  <span className="text-2xl font-black text-slate-500 animate-pulse">:</span>

                  {/* Minutos */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMinutes(prev => (prev + 5) % 60)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      +
                    </button>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black border font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {String(selectedMinutes).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMinutes(prev => (prev - 5 + 60) % 60)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Ajustes rápidos */}
                <div className="flex gap-2 justify-center mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const total = selectedHours * 60 + selectedMinutes + 15;
                      setSelectedHours(Math.floor(total / 60) % 24);
                      setSelectedMinutes(total % 60);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:scale-105 transition-all ${
                      theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const total = selectedHours * 60 + selectedMinutes + 30;
                      setSelectedHours(Math.floor(total / 60) % 24);
                      setSelectedMinutes(total % 60);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:scale-105 transition-all ${
                      theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHours(prev => (prev + 1) % 24)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:scale-105 transition-all ${
                      theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHours(0);
                      setSelectedMinutes(0);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-rose-500/20 bg-rose-500/5 text-rose-400 cursor-pointer hover:scale-105 transition-all"
                  >
                    Zerar
                  </button>
                </div>
              </div>

              {/* Justificativa */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Observação / Motivo do Atraso</label>
                <textarea
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Ex: Trânsito intenso, problema de conexão, etc."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-amber-500/60'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>
          )}

          {status === 'absent' && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Justificativa / Motivo da Falta</label>
              <textarea
                required
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="Ex: Atestado médico, Problemas de conexão, Motivos pessoais"
                rows={3}
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden resize-none ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-rose-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500'
                }`}
              />
            </div>
          )}

          {status === 'early_departure' && (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-4 rounded-2xl border flex flex-col items-center gap-4 ${
                theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 self-start">
                  <Clock size={16} className="text-purple-400" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Horário de Saída
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Horas */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedHours(prev => (prev + 1) % 24)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      +
                    </button>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black border font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {String(selectedHours).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedHours(prev => (prev - 1 + 24) % 24)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      -
                    </button>
                  </div>

                  <span className="text-2xl font-black text-slate-500 animate-pulse">:</span>

                  {/* Minutos */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMinutes(prev => (prev + 5) % 60)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      +
                    </button>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black border font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {String(selectedMinutes).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMinutes(prev => (prev - 5 + 60) % 60)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:scale-105 active:scale-95 transition-all text-sm font-bold cursor-pointer ${
                        theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Ajustes rápidos */}
                <div className="flex gap-2 justify-center mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHours(12);
                      setSelectedMinutes(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:scale-105 transition-all ${
                      theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    12:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHours(14);
                      setSelectedMinutes(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:scale-105 transition-all ${
                      theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    14:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHours(16);
                      setSelectedMinutes(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:scale-105 transition-all ${
                      theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    16:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHours(17);
                      setSelectedMinutes(30);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:scale-105 transition-all ${
                      theme === 'dark' ? 'border-white/5 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    17:30
                  </button>
                </div>
              </div>

              {/* Justificativa */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Observação / Motivo da Saída</label>
                <textarea
                  required
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Ex: Consulta médica, mal estar, etc."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-purple-500/60'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                  }`}
                />
              </div>
            </div>
          )}

          {status === 'day_off' && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Justificativa do Day Off (Opcional)</label>
              <textarea
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="Ex: Folga de feriado trabalhado, folga de banco de horas, etc."
                rows={2}
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden resize-none ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-slate-550'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                }`}
              />
            </div>
          )}

          {status === 'vacation' && (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-sky-400 block">
                    📅 Período de Férias (Lançamento em Lote)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={isRangeMode}
                      onChange={(e) => setIsRangeMode(e.target.checked)}
                      className="rounded border-white/10 text-sky-500 focus:ring-0"
                    />
                    Aplicar em Período
                  </label>
                </div>

                {isRangeMode ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Data de Início</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Data Término</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Férias aplicadas apenas para o dia selecionado ({dateFormatted}). Marque &quot;Aplicar em Período&quot; para definir o intervalo.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Observação / Período (Opcional)</label>
                <textarea
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Ex: Férias regulamentares de 15 dias"
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-blue-500/60'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer border text-center ${
                theme === 'dark'
                  ? 'border-white/5 bg-slate-950/30 text-slate-400 hover:bg-slate-950/60'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/10 transition-all cursor-pointer text-center"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
