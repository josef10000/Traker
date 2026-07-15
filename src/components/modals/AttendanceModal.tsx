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
  onSave: (status: 'present' | 'late' | 'absent' | 'early_departure' | 'day_off' | 'vacation' | '', lateDuration: string, absenceReason: string) => void;
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

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus);
      setLateDuration(currentLateDuration);
      setAbsenceReason(currentAbsenceReason);
    }
  }, [isOpen, currentStatus, currentLateDuration, currentAbsenceReason]);

  if (!isOpen) return null;

  const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      status,
      status === 'late' ? lateDuration : '',
      (status === 'absent' || status === 'early_departure' || status === 'day_off') ? absenceReason : ''
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all ${
        theme === 'dark'
          ? 'bg-slate-900 border-white/10 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold">Registrar Escala / Presença</h3>
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
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Tempo de Atraso</label>
              <input
                type="text"
                required
                value={lateDuration}
                onChange={(e) => setLateDuration(e.target.value)}
                placeholder="Ex: 1 hora, 30 minutos, 2h 15m"
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-amber-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                }`}
              />
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
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Motivo / Horário de Saída</label>
              <textarea
                required
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="Ex: Consulta médica às 14h, mal estar, etc."
                rows={3}
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden resize-none ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-purple-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                }`}
              />
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
