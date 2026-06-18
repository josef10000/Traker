import React from 'react';
import { Printer, User as UserIcon } from 'lucide-react';
import { Agreement, AgreementStatus, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/masks';

interface TeamManagementTabProps {
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  attendanceStatuses: Record<string, 'present' | 'late' | 'absent'>;
  quickNotesText: Record<string, string>;
  setQuickNotesText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAddNote: (uid: string, name: string) => void;
  handleAttendanceChange: (uid: string, name: string, status: 'present' | 'late' | 'absent') => void;
  handleOpenHistory: (member: UserProfile) => void;
  setIsPeopleReportOpen: (open: boolean) => void;
  agreements: Agreement[];
  selectedMonth: number;
  selectedYear: number;
  qaScores?: Record<string, number>;
}

export const TeamManagementTab: React.FC<TeamManagementTabProps> = ({
  profile,
  currentTeamMembers,
  attendanceStatuses,
  quickNotesText,
  setQuickNotesText,
  handleAddNote,
  handleAttendanceChange,
  handleOpenHistory,
  setIsPeopleReportOpen,
  agreements,
  selectedMonth,
  selectedYear,
  qaScores = {}
}) => {
  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Header da Aba de Gestão */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white leading-tight">Quadro de Ocorrências e Performance</h3>
          <p className="text-xs text-slate-400 mt-0.5">Registre presença diária, feedbacks e consulte históricos individuais.</p>
        </div>
        {profile.organizationId && (
          <button
            onClick={() => setIsPeopleReportOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 self-stretch sm:self-auto justify-center"
          >
            <Printer size={14} />
            Relatório Consolidado
          </button>
        )}
      </div>

      {/* Listagem de Colaboradores */}
      {currentTeamMembers.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 border border-white/5 rounded-3xl text-slate-500 italic text-sm">
          Nenhum colaborador encontrado para a equipe/empresa selecionada.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {currentTeamMembers.map((member) => {
            const collabAgreements = agreements.filter(a => 
              a.operatorId === member.uid &&
              new Date(a.createdAt).getMonth() === selectedMonth &&
              new Date(a.createdAt).getFullYear() === selectedYear
            );
            
            const totalCount = collabAgreements.length;
            const totalPaid = collabAgreements
              .filter(a => a.status === AgreementStatus.PAID && !a.isAdjustment)
              .reduce((acc, a) => acc + a.value, 0);

            const activeAttendance = attendanceStatuses[member.uid] || 'present';

            return (
              <div 
                key={member.uid} 
                className="glass-card p-6 rounded-3xl border border-white/5 hover:border-slate-800 transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
              >
                {/* Info Colaborador e Performance */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3.5 bg-slate-950 border border-slate-800 text-slate-400 rounded-2xl shrink-0">
                    <UserIcon size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base leading-tight">
                      {member.displayName || member.email.split('@')[0]}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                      <span>{member.jobTitle || 'Operador'}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span className="font-mono">{member.email}</span>
                    </div>
                    
                    {/* Mini KPIs Individuais */}
                    <div className="flex items-center gap-6 mt-3 bg-slate-950/40 px-4 py-2 rounded-xl border border-white/[0.02] w-fit">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Acordos</div>
                        <div className="text-xs font-black text-slate-200">{totalCount}</div>
                      </div>
                      <div className="w-[1px] h-4 bg-slate-800" />
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Recuperado</div>
                        <div className="text-xs font-black text-emerald-400">{formatCurrency(totalPaid)}</div>
                      </div>
                      <div className="w-[1px] h-4 bg-slate-800" />
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Qualidade QA</div>
                        <div className="text-xs font-black text-sky-400">
                          {qaScores[member.uid] !== undefined ? `${qaScores[member.uid].toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gestão Operacional (Presença + Notas) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                  
                  {/* Seletor de Presença */}
                  <div className="flex bg-slate-950/80 border border-slate-800 p-1 rounded-xl self-start sm:self-auto shrink-0">
                    <button
                      onClick={() => handleAttendanceChange(member.uid, member.displayName || member.email.split('@')[0], 'present')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeAttendance === 'present' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-lg' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Registrar Presente"
                    >
                      Pres.
                    </button>
                    <button
                      onClick={() => handleAttendanceChange(member.uid, member.displayName || member.email.split('@')[0], 'late')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeAttendance === 'late' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20 shadow-lg' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Registrar Atraso"
                    >
                      Atr.
                    </button>
                    <button
                      onClick={() => handleAttendanceChange(member.uid, member.displayName || member.email.split('@')[0], 'absent')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeAttendance === 'absent' 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-lg' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Registrar Falta"
                    >
                      Falta
                    </button>
                  </div>

                  {/* Campo de Anotação Privada */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex-1 sm:flex-initial sm:w-64 shrink-0">
                    <input 
                      type="text"
                      placeholder="Anotação privada..."
                      value={quickNotesText[member.uid] || ''}
                      onChange={(e) => setQuickNotesText(prev => ({ ...prev, [member.uid]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNote(member.uid, member.displayName || member.email.split('@')[0]);
                        }
                      }}
                      className="bg-transparent text-xs text-white outline-none border-none w-full placeholder-slate-600 focus:placeholder-slate-400 transition-colors"
                    />
                    <button
                      onClick={() => handleAddNote(member.uid, member.displayName || member.email.split('@')[0])}
                      className="text-[10px] text-emerald-400 font-bold ml-2 hover:text-emerald-300 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>

                  {/* Botão de Histórico */}
                  <button
                    onClick={() => handleOpenHistory(member)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] border border-slate-700/50 shrink-0"
                  >
                    Histórico
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
