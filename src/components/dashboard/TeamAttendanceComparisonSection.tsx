import React, { useState, useMemo } from 'react';
import { Trophy, CaretLeft, CaretRight, Users, CheckCircle, XCircle } from '@phosphor-icons/react';
import { UserProfile, Team, CollaborationNote } from '../../types';

interface TeamAttendanceComparisonSectionProps {
  collaborators: UserProfile[];
  teams: Team[];
  notes: CollaborationNote[];
  theme: 'light' | 'dark';
  selectedTeamId?: string; // Se fornecido, destaca/filtra o modo Equipe Única
}

export const TeamAttendanceComparisonSection: React.FC<TeamAttendanceComparisonSectionProps> = ({
  collaborators,
  teams,
  notes,
  theme,
  selectedTeamId
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Cálculo das métricas de assiduidade por equipe
  const teamsMetrics = useMemo(() => {
    return teams.map(team => {
      const teamCollabs = collaborators.filter(c => c.teamId === team.id);
      const teamCollabIds = new Set(teamCollabs.map(c => c.uid));

      // Filtrar notas de frequência da equipe no mês selecionado
      const teamNotesInMonth = notes.filter(n => {
        if (!teamCollabIds.has(n.collaboratorId) || n.type !== 'attendance') return false;
        const noteDate = new Date(n.createdAt);
        return noteDate.getUTCFullYear() === year && noteDate.getUTCMonth() === month;
      });

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      teamNotesInMonth.forEach(n => {
        if (n.attendanceStatus === 'present') presentCount++;
        else if (n.attendanceStatus === 'absent') absentCount++;
        else if (n.attendanceStatus === 'late') lateCount++;
      });

      const totalRecorded = presentCount + absentCount + lateCount;
      const attendanceRate = totalRecorded > 0 
        ? Math.round(((presentCount + lateCount) / totalRecorded) * 1000) / 10 
        : 100.0;

      return {
        teamId: team.id,
        teamName: team.name,
        memberCount: teamCollabs.length,
        presentCount,
        absentCount,
        lateCount,
        totalRecorded,
        attendanceRate
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate);
  }, [teams, collaborators, notes, year, month]);

  // Equipe líder do mês
  const topTeam = teamsMetrics.length > 0 ? teamsMetrics[0] : null;

  // Dados da equipe única se filtrada
  const activeSingleTeamMetric = useMemo(() => {
    if (!selectedTeamId) return null;
    return teamsMetrics.find(t => t.teamId === selectedTeamId) || null;
  }, [teamsMetrics, selectedTeamId]);

  return (
    <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-md transition-all ${
      theme === 'dark' ? 'bg-slate-900/90 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            {selectedTeamId ? 'Saúde & Assiduidade da Equipe' : 'Comparativo de Assiduidade por Equipe'}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Taxa percentual de presenças e assiduidade dos colaboradores no mês.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <button
            type="button"
            onClick={handlePrevMonth}
            className={`p-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              theme === 'dark' ? 'border-white/5 hover:bg-white/5 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <CaretLeft size={14} />
          </button>
          <span className="text-xs font-bold capitalize px-2.5 py-0.5 min-w-[100px] text-center text-slate-300">
            {monthName}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className={`p-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              theme === 'dark' ? 'border-white/5 hover:bg-white/5 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <CaretRight size={14} />
          </button>
        </div>
      </div>

      {/* MODAL / CARD DE EQUIPE ÚNICA (quando uma equipe estiver selecionada/filtrada) */}
      {activeSingleTeamMetric && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Equipe Selecionada</span>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                  {activeSingleTeamMetric.memberCount} Membros
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">{activeSingleTeamMetric.teamName}</h4>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Assiduidade</span>
              <span className={`text-lg font-black ${
                activeSingleTeamMetric.attendanceRate >= 95 ? 'text-emerald-400' :
                activeSingleTeamMetric.attendanceRate >= 90 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {activeSingleTeamMetric.attendanceRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-[10px] space-y-0.5">
              <span className="text-emerald-400 font-bold block flex items-center gap-1">
                <CheckCircle size={10} /> {activeSingleTeamMetric.presentCount} Presenças
              </span>
              <span className="text-rose-400 font-bold block flex items-center gap-1">
                <XCircle size={10} /> {activeSingleTeamMetric.absentCount} Faltas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PÓDIO DA EQUIPE CAMPEÃ DO MÊS */}
      {topTeam && !selectedTeamId && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy size={18} weight="fill" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">🏆 Líder em Assiduidade</span>
              <h4 className="text-sm font-bold text-white leading-tight mt-0.5">{topTeam.teamName}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{topTeam.memberCount} colaboradores • {topTeam.presentCount} presenças no mês</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-emerald-400">{topTeam.attendanceRate.toFixed(1)}%</span>
            <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              🟢 Excelente
            </span>
          </div>
        </div>
      )}

      {/* LISTA COMPARATIVA DE BARRAS POR EQUIPE */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desempenho Geral de Frequência</h4>

        {teamsMetrics.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2 text-center">Nenhuma equipe cadastrada para comparação.</p>
        ) : (
          <div className="space-y-2">
            {teamsMetrics.map((team, idx) => {
              const isExcellent = team.attendanceRate >= 95;
              const isWarning = team.attendanceRate >= 90 && team.attendanceRate < 95;

              return (
                <div 
                  key={team.teamId}
                  className={`p-2.5 rounded-xl border transition-all ${
                    selectedTeamId === team.teamId 
                      ? 'border-emerald-500/50 bg-emerald-500/10' 
                      : theme === 'dark' ? 'border-white/5 bg-slate-950/30 hover:bg-slate-950/60' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 w-4 text-center">#{idx + 1}</span>
                      <span className="text-xs font-bold text-white">{team.teamName}</span>
                      <span className="text-[9px] text-slate-500">({team.memberCount} membros)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 hidden sm:inline">
                        Presenças: <strong className="text-emerald-400">{team.presentCount}</strong> | Faltas: <strong className="text-rose-400">{team.absentCount}</strong>
                      </span>
                      <span className={`text-xs font-black ${
                        isExcellent ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {team.attendanceRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Barra Visual de Progresso Percentual */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExcellent 
                          ? 'bg-emerald-400' 
                          : isWarning 
                            ? 'bg-amber-400' 
                            : 'bg-rose-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, team.attendanceRate))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
