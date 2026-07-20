import React, { useState } from 'react';
import { X, CalendarPlus, Users, User } from '@phosphor-icons/react';
import { Team, UserProfile } from '../../types';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  collaborators: UserProfile[]; // Filtro de supervisors, operators, backoffice
  onSave: (
    title: string,
    date: string,
    targetType: 'team' | 'individual',
    targetId: string, // teamId se for 'team', ou array de collaboratorId se 'individual' (ou fazemos uma chamada por ID)
    selectedCollaboratorIds: string[]
  ) => void;
  theme: 'light' | 'dark';
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  teams,
  collaborators,
  onSave,
  theme
}) => {
  const [titleType, setTitleType] = useState<'presencial' | 'treinamento' | 'reuniao' | 'custom'>('presencial');
  const [customTitle, setCustomTitle] = useState('');
  const [date, setDate] = useState('');
  const [targetType, setTargetType] = useState<'team' | 'individual'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    let finalTitle = '';
    if (titleType === 'presencial') finalTitle = '🏢 Presencial';
    else if (titleType === 'treinamento') finalTitle = '🎓 Treinamento';
    else if (titleType === 'reuniao') finalTitle = '📅 Reunião Geral';
    else finalTitle = customTitle.trim() || '📅 Evento';

    if (targetType === 'team') {
      if (!selectedTeamId) return;
      onSave(finalTitle, date, 'team', selectedTeamId, []);
    } else {
      if (selectedCollaboratorIds.length === 0) return;
      // Salva para cada colaborador individualmente
      onSave(finalTitle, date, 'individual', '', selectedCollaboratorIds);
    }
    onClose();
    // Reset state
    setDate('');
    setSelectedTeamId('');
    setSelectedCollaboratorIds([]);
    setCustomTitle('');
  };

  const toggleCollaborator = (uid: string) => {
    setSelectedCollaboratorIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose}>
      <div 
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto cursor-default ${
          theme === 'dark'
            ? 'bg-slate-900 border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CalendarPlus className="text-sky-400" size={24} weight="duotone" />
              Agendar Evento no Calendário
            </h3>
            <p className="text-xs text-slate-400 mt-1">Crie marcações de dias presenciais, treinamentos ou reuniões.</p>
          </div>
          <button
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
          {/* Tipo do Evento */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Tipo do Evento</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTitleType('presencial')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                  titleType === 'presencial'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                🏢 Presencial
              </button>
              <button
                type="button"
                onClick={() => setTitleType('treinamento')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                  titleType === 'treinamento'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                🎓 Treinamento
              </button>
              <button
                type="button"
                onClick={() => setTitleType('reuniao')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                  titleType === 'reuniao'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                📅 Reunião
              </button>
              <button
                type="button"
                onClick={() => setTitleType('custom')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                  titleType === 'custom'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                ✏️ Outro
              </button>
            </div>

            {titleType === 'custom' && (
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Digite o título do evento"
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden mt-2 ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-purple-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                }`}
              />
            )}
          </div>

          {/* Data */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Data do Evento</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden ${
                theme === 'dark'
                  ? 'bg-slate-950/60 border-white/10 text-white focus:border-sky-500/60'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
              }`}
            />
          </div>

          {/* Destinatários Scope */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Enviar Para</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setTargetType('team')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  targetType === 'team'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-500'
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}
              >
                <Users size={16} />
                Uma Equipe Inteira
              </button>
              <button
                type="button"
                onClick={() => setTargetType('individual')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  targetType === 'individual'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-500'
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}
              >
                <User size={16} />
                Pessoas Específicas
              </button>
            </div>
          </div>

          {/* Destinatários Selection */}
          {targetType === 'team' ? (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Selecionar Equipe</label>
              <select
                required
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-sky-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                }`}
              >
                <option value="">-- Selecione uma Equipe --</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Selecionar Colaboradores ({selectedCollaboratorIds.length} selecionados)</label>
              <div className={`border rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 ${
                theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                {collaborators.map(collab => {
                  const roleLabel = collab.role === 'supervisor' ? 'Supervisor' : collab.role === 'backoffice' ? 'Back Office' : 'Operador';
                  const teamName = teams.find(t => t.id === collab.teamId)?.name || 'Sem Equipe';
                  return (
                    <label key={collab.uid} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={selectedCollaboratorIds.includes(collab.uid)}
                        onChange={() => toggleCollaborator(collab.uid)}
                        className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-white block">{collab.displayName || collab.email.split('@')[0]}</span>
                        <span className="text-[10px] text-slate-500">{roleLabel} • {teamName}</span>
                      </div>
                    </label>
                  );
                })}
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
              Confirmar e Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
