import React, { useState } from 'react';
import { Calendar, CaretLeft, CaretRight, Info } from '@phosphor-icons/react';
import { UserProfile, CollaborationNote, CalendarEvent } from '../../types';
import { Avatar } from '../ui/Avatar';

interface AttendanceCalendarSectionProps {
  collaborators: UserProfile[];
  notes: CollaborationNote[];
  calendarEvents: CalendarEvent[];
  onCellClick: (collab: UserProfile, dateStr: string, currentNote?: CollaborationNote) => void;
  theme: 'light' | 'dark';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const AttendanceCalendarSection: React.FC<AttendanceCalendarSectionProps> = ({
  collaborators,
  notes,
  calendarEvents,
  onCellClick,
  theme
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalDays = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Auxiliar para gerar o array de dias
  const daysArray = Array.from({ length: totalDays }, (_, i) => {
    const dayNum = i + 1;
    const dateObj = new Date(year, month, dayNum);
    const dayOfWeek = WEEKDAYS[dateObj.getDay()];
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6; // 0 = Dom, 6 = Sáb
    
    // Formatar data em string local YYYY-MM-DD segura
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    return { dayNum, dayOfWeek, isWeekend, dateStr };
  });

  // Auxiliar para buscar a anotação do dia para um colaborador
  const getDayNote = (collabId: string, dateStr: string) => {
    const targetDate = new Date(dateStr);
    
    return notes.find(n => {
      if (n.collaboratorId !== collabId || n.type !== 'attendance') return false;
      const noteDate = new Date(n.createdAt);
      return (
        noteDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
        noteDate.getUTCMonth() === targetDate.getUTCMonth() &&
        noteDate.getUTCDate() === targetDate.getUTCDate()
      );
    });
  };

  // Auxiliar para buscar eventos do dia para o colaborador/equipe
  const getDayEvents = (collab: UserProfile, dateStr: string) => {
    return calendarEvents.filter(e => {
      if (e.date !== dateStr) return false;
      if (e.targetType === 'team') {
        return e.targetId === collab.teamId;
      }
      return e.targetId === collab.uid;
    });
  };

  return (
    <div className={`border rounded-3xl p-6 space-y-6 shadow-xl ${
      theme === 'dark'
        ? 'bg-slate-900 border-white/5 text-white'
        : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Cabeçalho de Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1">Escala diária de plantão e faltas</h3>
          <p className="text-[10px] text-slate-500 mt-1">Navegue pelos meses para lançar e gerenciar a presença da equipe.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handlePrevMonth}
            className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CaretLeft size={16} />
          </button>
          <span className="text-xs font-bold capitalize px-3 py-1 min-w-[120px] text-center">
            {monthName}
          </span>
          <button
            onClick={handleNextMonth}
            className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      {/* Matriz Horizontal Grid */}
      <div className="w-full overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full border-collapse min-w-[800px] text-left">
          <thead>
            <tr className={theme === 'dark' ? 'bg-slate-950/40' : 'bg-slate-50'}>
              <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-widest sticky left-0 z-10 w-64 border-r border-white/5 min-w-[200px]" style={{
                backgroundColor: theme === 'dark' ? '#0b0f19' : '#ffffff'
              }}>
                Colaborador
              </th>
              {daysArray.map(day => (
                <th
                  key={day.dayNum}
                  className={`p-2 text-center text-[10px] font-black border-r border-white/5 min-w-[40px] ${
                    day.isWeekend 
                      ? theme === 'dark' ? 'bg-slate-950/60 text-slate-600' : 'bg-slate-100 text-slate-400' 
                      : 'text-slate-400'
                  }`}
                >
                  <span className="block leading-none">{day.dayNum}</span>
                  <span className="block text-[8px] mt-1 font-semibold uppercase opacity-60 leading-none">{day.dayOfWeek}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {collaborators.map(collab => {
              const roleLabel = collab.role === 'supervisor' ? 'Supervisor' : collab.role === 'backoffice' ? 'Back Office' : 'Operador';
              return (
                <tr key={collab.uid} className={`border-t border-white/5 hover:${theme === 'dark' ? 'bg-white/[0.01]' : 'bg-slate-50/50'}`}>
                  {/* Nome do Colaborador (Coluna Fixa) */}
                  <td className="p-3 flex items-center gap-3 sticky left-0 z-10 border-r border-white/5" style={{
                    backgroundColor: theme === 'dark' ? '#0b0f19' : '#ffffff'
                  }}>
                    <Avatar
                      displayName={collab.displayName}
                      email={collab.email}
                      avatarStyle={collab.avatarStyle}
                      avatarSeed={collab.avatarSeed}
                      theme={theme}
                      size="xs"
                    />
                    <div className="truncate max-w-[150px]">
                      <span className={`font-bold text-xs block leading-tight truncate ${theme === 'dark' ? 'text-white' : 'text-slate-850'}`}>{collab.displayName || collab.email.split('@')[0]}</span>
                      <span className="text-[9px] text-slate-500">{roleLabel}</span>
                    </div>
                  </td>

                  {/* Dias do Mês */}
                  {daysArray.map(day => {
                    const note = getDayNote(collab.uid, day.dateStr);
                    const events = getDayEvents(collab, day.dateStr);
                    
                    const hasEvent = events.length > 0;
                    const isPresentialEvent = events.some(e => 
                      e.type === 'presential' || 
                      (e.title && e.title.toLowerCase().includes('presencial')) || 
                      (e.title && e.title.toLowerCase().includes('plantão'))
                    );

                    const getAutomaticStatus = (dateStr: string) => {
                      const parts = dateStr.split('-');
                      const year = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const dayVal = parseInt(parts[2], 10);
                      const dateObj = new Date(year, month, dayVal);
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      if (isWeekend) {
                        return '';
                      }

                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const dd = String(today.getDate()).padStart(2, '0');
                      const todayStr = `${yyyy}-${mm}-${dd}`;

                      // Se o dia já passou ou é hoje
                      if (dateStr <= todayStr) {
                        // Se tem agendamento presencial específico ou nota de presença
                        if (isPresentialEvent) {
                          return 'present';
                        }
                        // Dia normal sem agendamento presencial -> Home Office (Sem falta)
                        return 'home_office';
                      }
                      return '';
                    };

                    const status = note?.attendanceStatus || getAutomaticStatus(day.dateStr);
                    const eventTitle = hasEvent ? events.map(e => e.title).join(', ') : '';

                    return (
                      <td
                        key={day.dayNum}
                        onClick={() => onCellClick(collab, day.dateStr, note)}
                        className={`p-2 text-center border-r border-white/5 cursor-pointer hover:${
                          theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
                        } transition-colors group relative ${
                          day.isWeekend
                            ? theme === 'dark' ? 'bg-slate-950/20' : 'bg-slate-50/40'
                            : ''
                        }`}
                      >
                        {/* Indicador de Status de Presença */}
                        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                          <div className="relative flex items-center justify-center">
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black border transition-all ${
                              status === 'present'
                                ? 'bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-500/40 font-black scale-110'
                                : status === 'home_office'
                                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-black'
                                  : status === 'late'
                                    ? 'bg-amber-500 text-white border-amber-400'
                                    : status === 'absent'
                                      ? 'bg-rose-500 text-white border-rose-400'
                                      : status === 'early_departure'
                                        ? 'bg-purple-500 text-white border-purple-400'
                                        : status === 'day_off'
                                          ? 'bg-slate-500/30 text-slate-400 border-slate-500/50'
                                          : status === 'vacation'
                                            ? 'bg-blue-500 text-white border-blue-400'
                                            : 'bg-slate-800/40 border-slate-700/30 text-transparent hover:border-slate-500'
                            }`}>
                              {status === 'present' ? 'P' : status === 'home_office' ? 'H' : status === 'late' ? 'A' : status === 'absent' ? 'F' : status === 'early_departure' ? 'S' : status === 'day_off' ? 'D' : status === 'vacation' ? 'V' : ''}
                            </span>
                            {status === 'present' && note?.attendanceConfirmed && (
                              <span className="absolute -top-1 -right-1.5 text-[8px] font-extrabold text-emerald-400 leading-none bg-slate-950 rounded-full px-0.5 border border-emerald-500/50 shadow-sm" title="Presença Confirmada pelo Colaborador">
                                ✓
                              </span>
                            )}
                          </div>

                          {/* Selo visual de Evento Agendado */}
                          {hasEvent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 border border-sky-300 animate-pulse" title={eventTitle} />
                          )}
                        </div>

                        {/* Tooltip Dinâmico */}
                        {(note || hasEvent || status === 'present' || status === 'home_office') && (
                          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 p-2.5 rounded-xl border text-[9px] leading-relaxed shadow-xl w-48 pointer-events-none transition-all ${
                            theme === 'dark'
                              ? 'bg-slate-950 border-white/10 text-slate-300'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}>
                            {hasEvent && (
                              <div className="mb-1">
                                <span className="font-bold text-sky-400 block">📅 Agendamento:</span>
                                <span className="text-white block font-medium">{eventTitle}</span>
                              </div>
                            )}
                            {(note || status === 'present' || status === 'home_office') && (
                              <div>
                                <span className="font-bold text-slate-400 block">Status:</span>
                                <span className={`font-extrabold ${
                                  status === 'present' ? 'text-emerald-400' :
                                  status === 'home_office' ? 'text-cyan-400' :
                                  status === 'late' ? 'text-amber-400' :
                                  status === 'absent' ? 'text-rose-400' :
                                  status === 'early_departure' ? 'text-purple-400' :
                                  status === 'day_off' ? 'text-slate-400' : 'text-blue-400'
                                }`}>
                                  {status === 'present' && 'Presencial Agendado'}
                                  {status === 'home_office' && 'Home Office (Sem Falta)'}
                                  {status === 'late' && 'Atrasado'}
                                  {status === 'absent' && 'Falta'}
                                  {status === 'early_departure' && 'Saída Antecipada'}
                                  {status === 'day_off' && 'Day Off'}
                                  {status === 'vacation' && 'Férias'}
                                </span>
                                {status === 'present' && (
                                  <span className={`block mt-1 font-semibold ${note?.attendanceConfirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {note?.attendanceConfirmed ? '✓ Confirmado pelo Colaborador' : '⏳ Aceite Pendente na Agenda'}
                                  </span>
                                )}
                                {status === 'late' && note && note.lateDuration && (
                                  <span className="block text-white font-medium mt-0.5">Tempo: {note.lateDuration}</span>
                                )}
                                {status === 'early_departure' && note && note.lateDuration && (
                                  <span className="block text-white font-medium mt-0.5">Saída: {note.lateDuration}</span>
                                )}
                                {(status === 'absent' || status === 'early_departure' || status === 'day_off') && note && note.absenceReason && (
                                  <span className="block text-white font-medium mt-0.5">Motivo: {note.absenceReason}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda de Marcações */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5 text-[10px] text-slate-400 font-medium">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-cyan-400 inline-block" />
            <strong className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>H</strong> - Home Office
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 inline-block" />
            <strong className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>P</strong> - Presencial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-black text-xs leading-none">✓</span>
            <strong className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>✓</strong> - Presença Confirmada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400 inline-block" />
            <strong className="text-slate-300">A</strong> - Atrasado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-400 inline-block" />
            <strong className="text-slate-300">F</strong> - Falta (Justificada)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-400 inline-block" />
            <strong className="text-slate-300">S</strong> - Saída Antecipada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500/50 border border-slate-500/50 inline-block" />
            <strong className="text-slate-300">D</strong> - Day Off
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-400 inline-block" />
            <strong className="text-slate-300">V</strong> - Férias
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 border border-sky-300 inline-block" />
            Evento Agendado
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Info size={12} className="text-slate-500" />
          <span>Clique em qualquer dia para registrar ou alterar a escala do colaborador.</span>
        </div>
      </div>
    </div>
  );
};
