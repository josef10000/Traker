import React, { useState, useMemo } from 'react';
import { X, CalendarPlus, Users, User, CheckSquare, Square, CalendarCheck, Sparkle } from '@phosphor-icons/react';
import { Team, UserProfile } from '../../types';

export interface CustomEventItem {
  collaboratorId: string;
  date: string;
  title: string;
}

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  collaborators: UserProfile[]; // Filtro de supervisors, operators, backoffice
  onSave: (
    title: string,
    date: string,
    targetType: 'team' | 'individual' | 'multi_custom',
    targetId: string,
    selectedCollaboratorIds: string[],
    customEvents?: CustomEventItem[]
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
  const [generalDate, setGeneralDate] = useState('');
  const [targetType, setTargetType] = useState<'team' | 'individual'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  
  // Modo de agendamento: 'same_day' (todos no mesmo dia) ou 'different_days' (dia diferente para cada)
  const [scheduleMode, setScheduleMode] = useState<'same_day' | 'different_days'>('same_day');

  // Membros selecionados e mapa de datas individuais por colaborador
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);
  const [individualDates, setIndividualDates] = useState<Record<string, string>>({});

  // Membros pertencentes à equipe selecionada
  const teamMembers = useMemo(() => {
    if (!selectedTeamId) return [];
    return collaborators.filter(c => c.teamId === selectedTeamId);
  }, [selectedTeamId, collaborators]);

  // Ao selecionar ou trocar de equipe, inicializa todos os membros como selecionados
  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    const membersOfTeam = collaborators.filter(c => c.teamId === teamId);
    const allIds = membersOfTeam.map(m => m.uid);
    setSelectedCollaboratorIds(allIds);

    // Inicializa datas com a data geral se houver
    const initialDates: Record<string, string> = {};
    allIds.forEach(id => {
      initialDates[id] = generalDate || '';
    });
    setIndividualDates(initialDates);
  };

  const toggleCollaborator = (uid: string) => {
    setSelectedCollaboratorIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAllTeam = () => {
    setSelectedCollaboratorIds(teamMembers.map(m => m.uid));
  };

  const handleDeselectAllTeam = () => {
    setSelectedCollaboratorIds([]);
  };

  const handleSetIndividualDate = (uid: string, dateVal: string) => {
    setIndividualDates(prev => ({
      ...prev,
      [uid]: dateVal
    }));
  };

  const handleApplyGeneralDateToAll = () => {
    if (!generalDate) return;
    const updated: Record<string, string> = {};
    const list = targetType === 'team' ? teamMembers : collaborators;
    list.forEach(c => {
      updated[c.uid] = generalDate;
    });
    setIndividualDates(updated);
  };

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let finalTitle = '';
    if (titleType === 'presencial') finalTitle = '🏢 Presencial';
    else if (titleType === 'treinamento') finalTitle = '🎓 Treinamento';
    else if (titleType === 'reuniao') finalTitle = '📅 Reunião Geral';
    else finalTitle = customTitle.trim() || '📅 Evento';

    if (targetType === 'team') {
      if (!selectedTeamId) return;

      if (scheduleMode === 'same_day') {
        if (!generalDate) return;
        if (selectedCollaboratorIds.length === 0) return;

        // Se todos os membros da equipe estão selecionados, podemos salvar direto para o time ou individualmente
        // Para máxima precisão de escala, salvamos para cada membro selecionado
        onSave(finalTitle, generalDate, 'individual', '', selectedCollaboratorIds);
      } else {
        // Dias diferentes para cada membro da equipe
        const customEvents: CustomEventItem[] = [];
        selectedCollaboratorIds.forEach(collabId => {
          const mDate = individualDates[collabId] || generalDate;
          if (mDate) {
            customEvents.push({
              collaboratorId: collabId,
              date: mDate,
              title: finalTitle
            });
          }
        });

        if (customEvents.length === 0) return;
        onSave(finalTitle, generalDate || customEvents[0].date, 'multi_custom', '', selectedCollaboratorIds, customEvents);
      }
    } else {
      // Destinatários Individuais
      if (selectedCollaboratorIds.length === 0) return;

      if (scheduleMode === 'same_day') {
        if (!generalDate) return;
        onSave(finalTitle, generalDate, 'individual', '', selectedCollaboratorIds);
      } else {
        const customEvents: CustomEventItem[] = [];
        selectedCollaboratorIds.forEach(collabId => {
          const mDate = individualDates[collabId] || generalDate;
          if (mDate) {
            customEvents.push({
              collaboratorId: collabId,
              date: mDate,
              title: finalTitle
            });
          }
        });

        if (customEvents.length === 0) return;
        onSave(finalTitle, generalDate || customEvents[0].date, 'multi_custom', '', selectedCollaboratorIds, customEvents);
      }
    }

    onClose();
    // Reset state
    setGeneralDate('');
    setSelectedTeamId('');
    setSelectedCollaboratorIds([]);
    setIndividualDates({});
    setCustomTitle('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer" onClick={onClose}>
      <div 
        className={`w-full max-w-xl rounded-3xl border p-6 transition-all max-h-[90vh] overflow-y-auto cursor-default ${
          theme === 'dark'
            ? 'bg-slate-900 border-white/10 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CalendarPlus className="text-sky-400" size={24} weight="duotone" />
              Agendar Presença / Evento no Calendário
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Organize a escala presencial por equipe ou defina datas personalizadas para cada colaborador.
            </p>
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
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-sm'
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
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40 shadow-sm'
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
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                📅 Reunião Geral
              </button>
              <button
                type="button"
                onClick={() => setTitleType('custom')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                  titleType === 'custom'
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/40 shadow-sm'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-400'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                ✏️ Personalizado
              </button>
            </div>

            {titleType === 'custom' && (
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ex: Treinamento de Scripts Noverde, Alinhamento Quinzenal..."
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden mt-2 ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-purple-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                }`}
              />
            )}
          </div>

          {/* Destinatários Scope */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Forma de Seleção</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTargetType('team')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  targetType === 'team'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-sm'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-500'
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}
              >
                <Users size={18} />
                <span>Por Equipe</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('individual')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  targetType === 'individual'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-sm'
                    : theme === 'dark'
                      ? 'bg-slate-950/40 border-white/5 text-slate-500'
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}
              >
                <User size={18} />
                <span>Pessoas Específicas</span>
              </button>
            </div>
          </div>

          {/* Selecionar Equipe se targetType === 'team' */}
          {targetType === 'team' && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Selecione a Equipe</label>
              <select
                required
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-medium border transition-all outline-hidden cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/10 text-white focus:border-sky-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                }`}
              >
                <option value="">-- Escolha uma Equipe --</option>
                {teams.map(team => {
                  const mCount = collaborators.filter(c => c.teamId === team.id).length;
                  return (
                    <option key={team.id} value={team.id}>
                      {team.name} ({mCount} colaboradores)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* SELEÇÃO DO MODO DE AGENDAMENTO (TODOS NO MESMO DIA OU DIAS DIFERENTES) */}
          {(targetType === 'individual' || selectedTeamId) && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Sparkle size={14} className="text-amber-400" />
                  Modo de Escala de Presença
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setScheduleMode('same_day')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      scheduleMode === 'same_day'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👥 Todos no Mesmo Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode('different_days')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      scheduleMode === 'different_days'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🗓️ Dias Diferentes por Membro
                  </button>
                </div>
              </div>

              {/* Data Geral / Base */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                    {scheduleMode === 'same_day' ? 'Data do Evento para Todos' : 'Data Base / Sugestão'}
                  </label>
                  {scheduleMode === 'different_days' && generalDate && (
                    <button
                      type="button"
                      onClick={handleApplyGeneralDateToAll}
                      className="text-[10px] font-bold text-sky-400 hover:underline cursor-pointer"
                    >
                      ⚡ Aplicar esta data a todos os membros
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  required={scheduleMode === 'same_day'}
                  value={generalDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGeneralDate(val);
                    if (scheduleMode === 'different_days' && Object.keys(individualDates).length === 0) {
                      const updated: Record<string, string> = {};
                      const list = targetType === 'team' ? teamMembers : collaborators;
                      list.forEach(c => { updated[c.uid] = val; });
                      setIndividualDates(updated);
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border transition-all outline-hidden ${
                    theme === 'dark'
                      ? 'bg-slate-950/80 border-white/10 text-white focus:border-sky-500/60'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              {/* LISTAGEM DOS MEMBROS COM CHECKBOX E/OU DATA INDIVIDUAL */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Membros da Equipe ({selectedCollaboratorIds.length} de {(targetType === 'team' ? teamMembers : collaborators).length} selecionados)
                  </label>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={targetType === 'team' ? handleSelectAllTeam : () => setSelectedCollaboratorIds(collaborators.map(c => c.uid))}
                      className="text-sky-400 hover:underline cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={targetType === 'team' ? handleDeselectAllTeam : () => setSelectedCollaboratorIds([])}
                      className="text-slate-400 hover:underline cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div className={`border rounded-2xl p-2 max-h-56 overflow-y-auto space-y-2 ${
                  theme === 'dark' ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-100'
                }`}>
                  {(targetType === 'team' ? teamMembers : collaborators).length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      Nenhum colaborador encontrado para esta seleção.
                    </div>
                  ) : (
                    (targetType === 'team' ? teamMembers : collaborators).map(collab => {
                      const isSelected = selectedCollaboratorIds.includes(collab.uid);
                      const roleLabel = collab.role === 'supervisor' ? 'Supervisor' : collab.role === 'backoffice' ? 'Back Office' : 'Operador';
                      const memberDate = individualDates[collab.uid] || generalDate;

                      return (
                        <div 
                          key={collab.uid}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                            isSelected 
                              ? 'bg-white/5 border-sky-500/30' 
                              : 'bg-transparent border-transparent opacity-60'
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCollaborator(collab.uid)}
                              className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500 cursor-pointer w-4 h-4"
                            />
                            <div className="truncate">
                              <span className="font-bold text-xs text-white block truncate">
                                {collab.displayName || collab.email.split('@')[0]}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {roleLabel} {collab.teamId && targetType === 'individual' ? `• ${teams.find(t => t.id === collab.teamId)?.name || ''}` : ''}
                              </span>
                            </div>
                          </label>

                          {/* Seletor de data individual por membro quando scheduleMode === 'different_days' */}
                          {scheduleMode === 'different_days' && isSelected && (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                required
                                value={memberDate || ''}
                                onChange={(e) => handleSetIndividualDate(collab.uid, e.target.value)}
                                className={`px-2.5 py-1 text-xs rounded-lg border outline-hidden font-mono ${
                                  theme === 'dark'
                                    ? 'bg-slate-900 border-white/10 text-white focus:border-amber-500'
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
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
              disabled={selectedCollaboratorIds.length === 0}
              className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer text-center"
            >
              Confirmar Agendamento ({selectedCollaboratorIds.length})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
