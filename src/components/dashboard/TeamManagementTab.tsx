import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  User as UserIcon, 
  Check, 
  X as XIcon, 
  PencilSimple, 
  MagnifyingGlass, 
  CaretLeft, 
  CaretRight, 
  Link, 
  UserPlus, 
  BuildingOffice,
  Rocket,
  CheckSquare,
  Square,
  GraduationCap,
  CalendarCheck,
  Clock,
  Sparkle,
  ShieldCheck,
  Headphones,
  Laptop
} from '@phosphor-icons/react';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Agreement, AgreementStatus, UserProfile, Team } from '../../types';
import { formatCurrency } from '../../utils/masks';
import { CustomSelect } from '../ui/CustomSelect';
import { Avatar } from '../ui/Avatar';
import { assignUserToTeam, getUnassignedUsers } from '../../lib/teams';
import { calculateTenure, DEFAULT_ONBOARDING_CHECKLIST, TenureInfo } from '../../utils/tenure';

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
  
  // Sub-Aba Ativa
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'onboarding'>('members');
  
  // Limite configurável de dias de onboarding/rampa (30, 60 ou 90 dias)
  const [onboardingRampDays, setOnboardingRampDays] = useState<number>(90);

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

  // Lista de Colaboradores em Fase de Onboarding (com cálculo de tempo de casa e exclusão dos já graduados)
  const onboardingMembers = useMemo(() => {
    return currentTeamMembers
      .map(member => {
        const tenure = calculateTenure(member.startDate, member.createdAt, onboardingRampDays);
        return {
          member,
          tenure
        };
      })
      .filter(({ member, tenure }) => {
        // Se já tiver data de graduação manual ou tiver passado do limite de dias, não exibe
        if (member.onboardingGraduatedAt) return false;
        return tenure.isOnboarding;
      });
  }, [currentTeamMembers, onboardingRampDays]);

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

  // Alternar item do Checklist de Onboarding
  const handleToggleChecklist = async (memberUid: string, checkId: string, currentStatus: boolean) => {
    try {
      const member = currentTeamMembers.find(m => m.uid === memberUid);
      const currentList = member?.onboardingChecklist || {};
      const updatedList = {
        ...currentList,
        [checkId]: !currentStatus
      };

      const userRef = doc(db, 'users', memberUid);
      await updateDoc(userRef, {
        onboardingChecklist: updatedList
      });
    } catch (error) {
      console.error('[TeamManagementTab] Erro ao atualizar checklist de onboarding:', error);
    }
  };

  // Concluir / Graduar Colaborador Antecipadamente
  const handleGraduateMember = async (memberUid: string) => {
    try {
      const userRef = doc(db, 'users', memberUid);
      await updateDoc(userRef, {
        onboardingGraduatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[TeamManagementTab] Erro ao concluir onboarding:', error);
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
      
      {/* Header da Aba de Gestão com Navegação de Sub-Abas */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-3xl border gap-4 ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="space-y-3">
          <div>
            <h3 className={`text-lg font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Gestão de Pessoas & Operação
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Acompanhe a frequência da equipe, tempo de casa e o fluxo de integração de recém-chegados.
            </p>
          </div>

          {/* NAVEGAÇÃO DE SUB-ABAS */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setActiveSubTab('members')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                activeSubTab === 'members'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                  : 'bg-slate-900/40 text-slate-400 hover:text-white border-white/5 hover:bg-slate-900'
              }`}
            >
              <UserIcon size={15} weight="bold" />
              <span>Quadro de Colaboradores & Presença ({currentTeamMembers.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('onboarding')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                activeSubTab === 'onboarding'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/40 text-slate-400 hover:text-white border-white/5 hover:bg-slate-900'
              }`}
            >
              <Rocket size={15} weight="bold" className="text-emerald-400" />
              <span>Central de Onboarding & Recém-Chegados</span>
              {onboardingMembers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-slate-950">
                  {onboardingMembers.length}
                </span>
              )}
            </button>
          </div>
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

      {/* ========================================================================= */}
      {/* SUB-ABA 1: CENTRAL DE ONBOARDING & RECÉM-CHEGADOS */}
      {/* ========================================================================= */}
      {activeSubTab === 'onboarding' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* CABEÇALHO DO ONBOARDING & CONFIGURADOR DE DIAS DE RAMPA */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 border border-emerald-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Sparkle size={16} weight="fill" />
                <span>Integração e Acompanhamento de Rampa</span>
              </div>
              <h4 className="text-base font-black text-white">
                Recém-Contratados na Operação
              </h4>
              <p className="text-xs text-slate-400 max-w-xl">
                Acompanhe o checklist de integração de cada novato. Ao completar o período de rampa configurado, o colaborador é automaticamente graduado e sai desta lista.
              </p>
            </div>

            {/* SELETOR CONFIGURÁVEL DE DIAS DE RAMPA */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase pl-2">Período de Rampa:</span>
              {[30, 60, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setOnboardingRampDays(days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    onboardingRampDays === days
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {days} Dias
                </button>
              ))}
            </div>
          </div>

          {/* LISTAGEM DE COLABORADORES EM ONBOARDING */}
          {onboardingMembers.length === 0 ? (
            <div className="text-center py-16 border rounded-3xl bg-slate-900/20 border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <GraduationCap size={26} weight="bold" />
              </div>
              <h5 className="text-sm font-bold text-white">Nenhum Colaborador em Período de Onboarding</h5>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Todos os colaboradores da equipe já ultrapassaram a janela de {onboardingRampDays} dias de admissão ou concluíram sua integração com sucesso.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {onboardingMembers.map(({ member, tenure }) => {
                const checklist = member.onboardingChecklist || {};
                const completedCount = DEFAULT_ONBOARDING_CHECKLIST.filter(item => checklist[item.id]).length;
                const totalItems = DEFAULT_ONBOARDING_CHECKLIST.length;
                const progressPct = Math.round((completedCount / totalItems) * 100);

                return (
                  <div 
                    key={member.uid}
                    className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/30 transition-all space-y-6 shadow-md"
                  >
                    {/* TOPO DO CARD: DADOS DO NOVATO & DIAS DE CASA */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3.5">
                        <Avatar
                          displayName={member.displayName || member.email}
                          email={member.email}
                          avatarStyle={member.avatarStyle}
                          avatarSeed={member.avatarSeed}
                          photoURL={member.photoURL}
                          avatarType={member.avatarType}
                          theme={theme}
                          size="md"
                          className="rounded-2xl"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm text-white">
                              {member.displayName || member.email.split('@')[0]}
                            </h5>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${tenure.categoryBadgeClass}`}>
                              {tenure.categoryLabel} ({tenure.days} {tenure.days === 1 ? 'dia' : 'dias'})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {member.jobTitle || 'Operador'} • Admissão: {member.startDate ? new Date(member.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data não informada'}
                          </p>
                        </div>
                      </div>

                      {/* PROGRESSO DO CHECKLIST & BOTÃO DE GRADUAÇÃO */}
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Progresso da Integração</span>
                          <span className="text-xs font-black text-emerald-400 font-mono">
                            {completedCount} de {totalItems} concluídos ({progressPct}%)
                          </span>
                        </div>

                        {canManageAttendance && (
                          <button
                            onClick={() => handleGraduateMember(member.uid)}
                            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Concluir Onboarding e Graduar Operador"
                          >
                            <GraduationCap size={15} weight="bold" />
                            <span>Graduar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* BARRA DE PROGRESSO VISUAL */}
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* LISTA DE ITENS DO CHECKLIST INTERATIVO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {DEFAULT_ONBOARDING_CHECKLIST.map((item) => {
                        const isDone = !!checklist[item.id];
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => canManageAttendance && handleToggleChecklist(member.uid, item.id, isDone)}
                            disabled={!canManageAttendance}
                            className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                              isDone
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckSquare size={16} weight="fill" className="text-emerald-400" />
                              ) : (
                                <Square size={16} className="text-slate-500" />
                              )}
                            </div>
                            <span className="text-xs font-medium leading-snug">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: QUADRO DE COLABORADORES & FREQUÊNCIA (VISÃO CLÁSSICA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'members' && (
        <div className="space-y-6 animate-fadeIn">
          
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

          {/* Barra de Busca */}
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
                  const tenure = calculateTenure(member.startDate, member.createdAt, onboardingRampDays);

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
                          photoURL={member.photoURL}
                          avatarType={member.avatarType}
                          theme={theme}
                          size="lg"
                          className="rounded-2xl"
                        />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-bold text-base leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {member.displayName || member.email.split('@')[0]}
                            </h4>

                            {/* BADGE DE TEMPO DE CASA */}
                            <span 
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${tenure.categoryBadgeClass}`}
                              title={`Tempo de Casa: ${tenure.formatted} (Admissão: ${member.startDate || 'Não informada'})`}
                            >
                              {tenure.categoryLabel} • {tenure.formatted}
                            </span>
                          </div>

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
                                  placeholder="Cargo (Ex: Operador)"
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
                                  Prestação PJ: {member.monthlyServiceValue ? `R$ ${member.monthlyServiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido'}
                                </span>
                                {canManageAttendance && (
                                  <button
                                    onClick={() => {
                                      setEditingServiceValueUid(member.uid);
                                      setNewServiceValue(member.monthlyServiceValue || 0);
                                    }}
                                    className="p-1 opacity-60 hover:opacity-100 transition-opacity hover:text-purple-400 cursor-pointer"
                                    title="Editar Valor da Prestação PJ"
                                  >
                                    <PencilSimple size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mt-2 pt-2 border-t border-white/5">
                            <span className="text-xs">
                              Acordos: <strong className="text-sky-400 font-mono">{totalCount}</strong>
                            </span>
                            <span className="text-xs">
                              Recuperado: <strong className="text-emerald-400 font-mono">{formatCurrency(totalPaid)}</strong>
                            </span>
                            {qaScores[member.uid] !== undefined && (
                              <span className="text-xs">
                                QA Médio: <strong className="text-purple-400 font-mono">{qaScores[member.uid]} pts</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações de Presença & Histórico */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto justify-end">
                        {canManageAttendance && (
                          <div className="flex items-center gap-2">
                            <select
                              value={activeAttendance}
                              onChange={(e) => handleAttendanceChange(member.uid, member.displayName || member.email, e.target.value as any)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer ${
                                activeAttendance === 'present'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : activeAttendance === 'late'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  : activeAttendance === 'absent'
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                  : 'bg-slate-900 border-white/10 text-slate-300'
                              }`}
                            >
                              <option value="present">Presente</option>
                              <option value="late">Atrasado</option>
                              <option value="absent">Falta</option>
                              <option value="early_departure">Saída Antecipada</option>
                              <option value="day_off">Day Off</option>
                              <option value="vacation">Férias</option>
                            </select>
                          </div>
                        )}

                        <button
                          onClick={() => handleOpenHistory(member)}
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Clock size={14} />
                          <span>Histórico</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-400">
                  <span>Página {currentPage} de {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <CaretLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <CaretRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
