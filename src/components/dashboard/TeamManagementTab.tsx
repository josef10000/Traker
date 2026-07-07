import React, { useState } from 'react';
import { Printer, User as UserIcon, Check, X as XIcon, PencilSimple } from '@phosphor-icons/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  MONTHS: string[];
  getYearRange: () => number[];
  qaScores?: Record<string, number>;
  theme?: 'light' | 'dark';
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
  setSelectedMonth,
  setSelectedYear,
  MONTHS,
  getYearRange,
  qaScores = {},
  theme = 'dark'
}) => {
  const canManageAttendance = profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor';
  const [editingMemberUid, setEditingMemberUid] = useState<string | null>(null);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveJobTitle = async (uid: string) => {
    if (!newJobTitle.trim()) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { jobTitle: newJobTitle.trim() });
      setEditingMemberUid(null);
      setNewJobTitle('');
    } catch (error) {
      console.error('[TeamManagementTab] Erro ao salvar cargo:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Header da Aba de Gestão */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-3xl border gap-4 ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h3 className={`text-lg font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Quadro de Ocorrências e Performance</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Registre presença diária, feedbacks e consulte históricos individuais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Seletor Compacto de Período */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Período:</span>
            <div className={`flex p-1 rounded-xl border shadow-sm ${
              theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className={`bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer px-3 py-1.5 transition-colors ${
                  theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index} className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{month}</option>
                ))}
              </select>
              <div className={`w-[1px] h-3.5 my-auto ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={`bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer px-3 py-1.5 transition-colors ${
                  theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {getYearRange().map(year => (
                  <option key={year} value={year} className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {profile.organizationId && (
            <button
              onClick={() => setIsPeopleReportOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 self-stretch md:self-auto justify-center cursor-pointer"
            >
              <Printer size={14} />
              Relatório Consolidado
            </button>
          )}
        </div>
      </div>

      {/* Listagem de Colaboradores */}
      {currentTeamMembers.length === 0 ? (
        <div className={`text-center py-20 border rounded-3xl italic text-sm ${
          theme === 'dark' ? 'bg-slate-900/20 border-white/5 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
        }`}>
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
                className={`glass-card p-6 rounded-3xl border transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${
                  theme === 'dark' 
                    ? 'border-white/5 hover:border-slate-800' 
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Info Colaborador e Performance */}
                <div className="flex items-start gap-4 flex-1 w-full">
                  <div className={`p-3.5 border rounded-2xl shrink-0 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <UserIcon size={24} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className={`font-bold text-base leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {member.displayName || member.email.split('@')[0]}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-550 dark:text-slate-500 font-medium">
                      {editingMemberUid === member.uid ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input 
                            type="text"
                            value={newJobTitle}
                            onChange={(e) => setNewJobTitle(e.target.value)}
                            className={`px-2 py-0.5 rounded text-xs outline-none border ${
                              theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                            placeholder="Cargo (Ex: Tratador)"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveJobTitle(member.uid);
                              if (e.key === 'Escape') {
                                setEditingMemberUid(null);
                                setNewJobTitle('');
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSaveJobTitle(member.uid)}
                            disabled={isSaving}
                            className="p-1 hover:text-emerald-400 cursor-pointer disabled:opacity-50"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMemberUid(null);
                              setNewJobTitle('');
                            }}
                            className="p-1 hover:text-rose-400 cursor-pointer"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{member.jobTitle || 'Operador'}</span>
                          <button
                            onClick={() => {
                              setEditingMemberUid(member.uid);
                              setNewJobTitle(member.jobTitle || 'Operador');
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-sky-400 cursor-pointer"
                            title="Editar Cargo"
                          >
                            <PencilSimple size={12} />
                          </button>
                        </div>
                      )}
                      <span className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
                      <span className="font-mono">{member.email}</span>
                    </div>
                    
                    {/* Mini KPIs Individuais */}
                    <div className={`flex items-center gap-6 mt-3 px-4 py-2 rounded-xl border w-fit ${
                      theme === 'dark' ? 'bg-slate-950/40 border-white/[0.02]' : 'bg-slate-50 border-slate-200/60'
                    }`}>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Acordos</div>
                        <div className={`text-xs font-black ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{totalCount}</div>
                      </div>
                      <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Recuperado</div>
                        <div className="text-xs font-black text-emerald-500 dark:text-emerald-400">{formatCurrency(totalPaid)}</div>
                      </div>
                      <div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Qualidade QA</div>
                        <div className="text-xs font-black text-sky-500 dark:text-sky-400">
                          {qaScores[member.uid] !== undefined ? `${qaScores[member.uid].toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gestão Operacional (Presença + Notas) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                  
                  {/* Seletor de Presença ou Indicador de Frequência Estático */}
                  {canManageAttendance ? (
                    <div className={`flex p-1 rounded-xl border self-start sm:self-auto shrink-0 ${
                      theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        onClick={() => handleAttendanceChange(member.uid, member.displayName || member.email.split('@')[0], 'present')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          activeAttendance === 'present' 
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                        title="Registrar Presente"
                      >
                        Pres.
                      </button>
                      <button
                        onClick={() => handleAttendanceChange(member.uid, member.displayName || member.email.split('@')[0], 'late')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          activeAttendance === 'late' 
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                        title="Registrar Atraso"
                      >
                        Atr.
                      </button>
                      <button
                        onClick={() => handleAttendanceChange(member.uid, member.displayName || member.email.split('@')[0], 'absent')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          activeAttendance === 'absent' 
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                        title="Registrar Falta"
                      >
                        Falta
                      </button>
                    </div>
                  ) : (
                    <div className="shrink-0">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        activeAttendance === 'present'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : activeAttendance === 'late'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-455 text-amber-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {activeAttendance === 'present' ? 'Presente' : activeAttendance === 'late' ? 'Atrasado' : 'Falta'}
                      </span>
                    </div>
                  )}

                  {/* Campo de Anotação Privada */}
                  {canManageAttendance && (
                    <div className={`flex items-center px-3 py-1.5 rounded-xl border flex-1 sm:flex-initial sm:w-64 shrink-0 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
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
                        className={`bg-transparent text-xs outline-none border-none w-full transition-colors ${
                          theme === 'dark' 
                            ? 'text-white placeholder-slate-600 focus:placeholder-slate-400' 
                            : 'text-slate-800 placeholder-slate-400 focus:placeholder-slate-500'
                        }`}
                      />
                      <button
                        onClick={() => handleAddNote(member.uid, member.displayName || member.email.split('@')[0])}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-2 hover:text-emerald-500 transition-colors cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  )}

                  {/* Botão de Histórico */}
                  <button
                    onClick={() => handleOpenHistory(member)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] border shrink-0 cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200'
                    }`}
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
