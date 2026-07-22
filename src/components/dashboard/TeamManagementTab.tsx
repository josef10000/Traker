import React, { useState, useEffect } from 'react';
import { Printer, User as UserIcon, Check, X as XIcon, PencilSimple, MagnifyingGlass, CaretLeft, CaretRight, Link, UserPlus, BuildingOffice } from '@phosphor-icons/react';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Agreement, AgreementStatus, UserProfile, Team } from '../../types';
import { formatCurrency } from '../../utils/masks';
import { CustomSelect } from '../ui/CustomSelect';
import { Avatar } from '../ui/Avatar';
import { assignUserToTeam, getUnassignedUsers } from '../../lib/teams';

interface TeamManagementTabProps {
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  attendanceStatuses: Record<string, 'present' | 'late' | 'absent' | 'early_departure' | 'day_off' | 'vacation' | ''>;
  quickNotesText: Record<string, string>;
  setQuickNotesText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAddNote: (uid: string, name: string) => void;
  handleAttendanceChange: (uid: string, name: string, status: 'present' | 'late' | 'absent' | 'early_departure' | 'day_off' | 'vacation' | '') => void;
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

  // Edição do Valor da Prestação de Serviços
  const [editingServiceValueUid, setEditingServiceValueUid] = useState<string | null>(null);
  const [newServiceValue, setNewServiceValue] = useState<number | string>('');

  // Estados de busca e paginação
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Estados para Colaboradores sem Time e Vinculação Rápida
  const [unassignedMembers, setUnassignedMembers] = useState<UserProfile[]>([]);
  const [orgTeams, setOrgTeams] = useState<Team[]>([]);
  const [selectedTeamForUser, setSelectedTeamForUser] = useState<Record<string, string>>({});
  const [assigningUid, setAssigningUid] = useState<string | null>(null);

  // Ouvinte em tempo real de membros sem time e times da empresa
  useEffect(() => {
    if (!profile.organizationId) return;

    // Buscar Times da Organização
    const teamsQ = query(collection(db, 'teams'), where('organizationId', '==', profile.organizationId));
    const unsubTeams = onSnapshot(teamsQ, (snap) => {
      const list: Team[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
      setOrgTeams(list);
    });

    // Buscar Usuários sem Time
    const usersQ = query(collection(db, 'users'), where('organizationId', '==', profile.organizationId));
    const unsubUsers = onSnapshot(usersQ, (snap) => {
      const list: UserProfile[] = snap.docs
        .map(d => d.data() as UserProfile)
        .filter(u => !u.teamId && u.role !== 'super_admin' && u.role !== 'manager');
      setUnassignedMembers(list);
    });

    return () => {
      unsubTeams();
      unsubUsers();
    };
  }, [profile.organizationId]);

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

  const handleSaveServiceValue = async (uid: string) => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', uid);
      const val = Number(newServiceValue) || 0;
      await updateDoc(userRef, { monthlyServiceValue: val });
      setEditingServiceValueUid(null);
      setNewServiceValue('');
    } catch (error) {
      console.error('[TeamManagementTab] Erro ao salvar valor da prestação de serviços:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Executar vinculação de colaborador a um time em 1 clique
  const handleAssignToTeam = async (uid: string) => {
    const targetTeamId = selectedTeamForUser[uid];
    if (!targetTeamId) return;

    setAssigningUid(uid);
    try {
      await assignUserToTeam(uid, targetTeamId);
      // Limpa a seleção
      setSelectedTeamForUser(prev => {
        const copy = { ...prev };
        delete copy[uid];
        return copy;
      });
    } catch (error) {
      console.error('[TeamManagementTab] Erro ao vincular membro ao time:', error);
    } finally {
      setAssigningUid(null);
    }
  };

  // Filtragem de membros por busca
  const filteredMembers = currentTeamMembers.filter(member => {
    const name = (member.displayName || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return name.includes(query) || email.includes(query);
  });

  // Paginação: 5 por página
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Header da Aba de Gestão */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-3xl border gap-4 ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h3 className={`text-lg font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Quadro de Ocorrências e Performance</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Registre presença diária, feedbacks, atribua equipes e consulte históricos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Seletor Compacto de Período */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Período:</span>
            <div className="flex gap-2">
              <div className="w-32">
                <CustomSelect 
                  value={String(selectedMonth)}
                  onChange={(val) => setSelectedMonth(parseInt(val, 10))}
                  className="py-1 px-2.5 text-[10px] font-black uppercase tracking-widest"
                  options={MONTHS.map((month, index) => ({ value: String(index), label: month }))}
                />
              </div>
              <div className="w-24">
                <CustomSelect 
                  value={String(selectedYear)}
                  onChange={(val) => setSelectedYear(parseInt(val, 10))}
                  className="py-1 px-2.5 text-[10px] font-black uppercase tracking-widest"
                  options={getYearRange().map(year => ({ value: String(year), label: String(year) }))}
                />
              </div>
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

      {/* SEÇÃO: COLABORADORES SEM TIME ATRIBUÍDO */}
      {unassignedMembers.length > 0 && canManageAttendance && (
        <div className={`p-6 rounded-3xl border space-y-4 ${
          theme === 'dark' ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UserPlus size={20} weight="bold" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                  <span>📥 Colaboradores sem Time Atribuído ({unassignedMembers.length})</span>
                </h4>
                <p className="text-xs text-amber-200/80">
                  Estes colaboradores já aceitaram o convite mas ainda não pertencem a um time. Selecione uma equipe abaixo para vinculá-los em 1 clique:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unassignedMembers.map(u => (
              <div key={u.uid} className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <strong className="text-white font-bold block">{u.displayName || u.email.split('@')[0]}</strong>
                  <span className="text-[10px] text-slate-400 font-mono block">{u.email} • Cargo: {u.jobTitle || u.role}</span>
                </div>

                <div className="flex items-center gap-2">
                  {orgTeams.length > 0 ? (
                    <>
                      <select
                        value={selectedTeamForUser[u.uid] || ''}
                        onChange={(e) => setSelectedTeamForUser(prev => ({ ...prev, [u.uid]: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white font-bold text-xs outline-none focus:border-amber-500"
                      >
                        <option value="">Selecione o Time...</option>
                        {orgTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleAssignToTeam(u.uid)}
                        disabled={!selectedTeamForUser[u.uid] || assigningUid === u.uid}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Link size={14} weight="bold" />
                        {assigningUid === u.uid ? 'Vinculando...' : 'Vincular'}
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-amber-300 italic">Crie um time na empresa para vincular</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Busca (Exibida caso o time tenha membros) */}
      {currentTeamMembers.length > 0 && (
        <div className={`flex items-center px-4 py-3 rounded-2xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/20 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <MagnifyingGlass size={16} className="text-slate-500 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Buscar colaborador por nome ou email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`bg-transparent text-xs outline-none border-none w-full ${
              theme === 'dark' ? 'text-white placeholder-slate-600 focus:placeholder-slate-400' : 'text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>
      )}

      {/* Listagem de Colaboradores */}
      {filteredMembers.length === 0 ? (
        <div className={`text-center py-20 border rounded-3xl italic text-sm ${
          theme === 'dark' ? 'bg-slate-900/20 border-white/5 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
        }`}>
          {currentTeamMembers.length === 0
            ? 'Nenhum colaborador encontrado para a equipe/empresa selecionada.'
            : 'Nenhum colaborador corresponde à busca.'}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {paginatedMembers.map((member) => {
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
                    <Avatar
                      displayName={member.displayName || member.email}
                      email={member.email}
                      avatarStyle={member.avatarStyle}
                      avatarSeed={member.avatarSeed}
                      theme={theme}
                      size="lg"
                      className="rounded-2xl"
                    />
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

                        {/* VALOR DA PRESTAÇÃO DE SERVIÇOS */}
                        <span className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
                        {editingServiceValueUid === member.uid ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-purple-400">Prestação R$:</span>
                            <input 
                              type="number"
                              min={0}
                              value={newServiceValue}
                              onChange={(e) => setNewServiceValue(e.target.value)}
                              className={`w-24 px-2 py-0.5 rounded text-xs outline-none border font-mono ${
                                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                              placeholder="0,00"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveServiceValue(member.uid);
                                if (e.key === 'Escape') {
                                  setEditingServiceValueUid(null);
                                  setNewServiceValue('');
                                }
                              }}
                            />
                            <button
                              onClick={() => handleSaveServiceValue(member.uid)}
                              disabled={isSaving}
                              className="p-1 hover:text-emerald-400 cursor-pointer disabled:opacity-50"
                              title="Salvar Valor da Prestação de Serviços"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingServiceValueUid(null);
                                setNewServiceValue('');
                              }}
                              className="p-1 hover:text-rose-400 cursor-pointer"
                            >
                              <XIcon size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-emerald-500 dark:text-emerald-400 font-bold">
                              Valor Prestação Serviços: {member.monthlyServiceValue ? `R$ ${member.monthlyServiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido'}
                            </span>
                            {canManageAttendance && (
                              <button
                                onClick={() => {
                                  setEditingServiceValueUid(member.uid);
                                  setNewServiceValue(member.monthlyServiceValue || 0);
                                }}
                                className="p-1 text-slate-400 hover:text-purple-400 cursor-pointer transition-colors"
                                title="Editar Valor da Prestação de Serviços"
                              >
                                <PencilSimple size={12} />
                              </button>
                            )}
                          </div>
                        )}
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

          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 ${
                  theme === 'dark'
                    ? 'border-white/5 hover:bg-white/5 text-slate-300 disabled:bg-transparent'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <CaretLeft size={14} />
                Anterior
              </button>

              <span className={`font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Página <strong className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>{currentPage}</strong> de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 ${
                  theme === 'dark'
                    ? 'border-white/5 hover:bg-white/5 text-slate-300 disabled:bg-transparent'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Próximo
                <CaretRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
