import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { signOut, User } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDoc,
  onSnapshot,
  deleteField,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { CustomSelect } from '../ui/CustomSelect';
import { markStatsStale } from '../../lib/statsCache';
import { 
  Agreement, 
  AgreementStatus, 
  AgreementOrigin, 
  AgreementType,
  AgreementCategory,
  UserProfile, 
  Team,
  Reconciliation,
  CollaborationNote,
  QaEvaluation,
  CalendarEvent
} from '../../types';
import { removeTeamMember, getTeamMembers } from '../../lib/teams';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { logAudit } from '../../lib/audit';
import { parseLocalDate, getMonthName, getWorkingDaysInMonth, getRemainingWorkingDays, MONTHS, getYearRange } from '../../utils/date';
import { triggerWebhook } from '../../utils/webhook';
import { addCollaborationNote, getCollaborationNotes, getAttendanceStatusForDay } from '../../lib/notes';
import { CheckSquare, ShieldWarning, Trash, Users, Handshake, ArrowRight, Calendar, UserMinus, UserSwitch, ArrowLeft, CalendarPlus } from '@phosphor-icons/react';
import { sandboxService } from '../../lib/sandboxService';

import { Avatar } from '../ui/Avatar';
import { AttendanceModal } from '../modals/AttendanceModal';
import { CalendarEventModal } from '../modals/CalendarEventModal';
import { AttendanceCalendarSection } from './AttendanceCalendarSection';

// Hooks customizados
import { useAgreements } from '../../hooks/useAgreements';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useDashboardStats } from '../../hooks/useDashboardStats';

// Componentes extraídos
import { DashboardHeader } from './DashboardHeader';
import { SupportTab } from './SupportTab';
import { StatsGrid } from './StatsGrid';
import { BackOfficeTab } from './BackOfficeTab';
import { PortfolioGoalsPanel } from './PortfolioGoalsPanel';
import { AdvancedInsights } from './AdvancedInsights';
import { AgreementsTable } from './AgreementsTable';
import { TeamManagementTab } from './TeamManagementTab';
import { DailyAgendaSection } from './DailyAgendaSection';
import { RecoveryPoolTab } from './RecoveryPoolTab';
import { QaDashboard } from './QaDashboard';
import { TeamPerformance } from './TeamPerformance';
import { FinancialPerformanceInsights } from './FinancialPerformanceInsights';

// Modais do sistema
import { DashboardModals } from './DashboardModals';
import { HelpDrawer } from './HelpDrawer';
import { startTour } from '../../utils/tour';

interface DashboardProps {
  user: User;
  profile: UserProfile;
  onSettingsClick: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  profile, 
  onSettingsClick, 
  showToast 
}) => {
  // Modo escuro fixo
  const theme = 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);


  // Configurações e Filtros de Data/Status/Busca
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<'all' | AgreementStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Abas do Dashboard
  const [dashboardTab, setDashboardTab] = useState<'financial' | 'people' | 'recovery' | 'qa' | 'bi' | 'support' | 'backoffice' | 'portfolio' | 'carga_acordos' | 'coordination'>(() => {
    if (profile.role === 'backoffice') return 'backoffice';
    if (profile.role === 'monitor') return 'qa';
    return 'financial';
  });
  
  // Visualização e Seleção de Equipes
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all'>(profile.teamId || 'all');
  const [viewMode, setViewMode] = useState<'personal' | 'team'>((profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'monitor') ? 'team' : 'personal');
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);

  // Metas Gerais
  const [monthlyGoal, setMonthlyGoal] = useState<number>(50000);
  const [effectivenessGoal, setEffectivenessGoal] = useState<number>(85);

  // Preferências Visuais
  const [localHiddenCards, setLocalHiddenCards] = useState<string[]>(profile.dashboardPreferences?.hiddenCards || []);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [isChecklistMode, setIsChecklistMode] = useState(false);

  // Organização e Webhooks
  const [organizationName, setOrganizationName] = useState<string>('');
  const [organizationCnpj, setOrganizationCnpj] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [crmOrgId, setCrmOrgId] = useState<string>('');
  const [crmClientId, setCrmClientId] = useState<string>('');
  const [crmPublicToken, setCrmPublicToken] = useState<string>('');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [isExportCpfModalOpen, setIsExportCpfModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isWebhookSettingsOpen, setIsWebhookSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Dados de Colaboradores e Ocorrências
  const [isPeopleReportOpen, setIsPeopleReportOpen] = useState(false);
  const [selectedCollabForHistory, setSelectedCollabForHistory] = useState<UserProfile | null>(null);
  const [collabNotesHistory, setCollabNotesHistory] = useState<CollaborationNote[]>([]);
  const [isLoadingCollabHistory, setIsLoadingCollabHistory] = useState(false);
  const [quickNotesText, setQuickNotesText] = useState<Record<string, string>>({});
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, 'present' | 'late' | 'absent'>>({});

  // Histórico de Cliente CPF e Conciliações
  const [selectedClientCpf, setSelectedClientCpf] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<Agreement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);

  // Estados dos novos módulos (Fases 1, 2, 4)
  const [scheduledAgreements, setScheduledAgreements] = useState<Agreement[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [qaEvaluations, setQaEvaluations] = useState<QaEvaluation[]>([]);
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);
  const [collisionData, setCollisionData] = useState<any>(null);

  // Controle de Revelação/Cópia de CPF (LGPD) e Confirmação de Exclusão Customizados
  const [revealedCpfs, setRevealedCpfs] = useState<Record<string, boolean>>({});
  const [cpfToConfirm, setCpfToConfirm] = useState<{ id: string; cpf: string; actionType: 'reveal' | 'copy' } | null>(null);
  const [agreementIdToDelete, setAgreementIdToDelete] = useState<string | null>(null);
  const [dontShowLgpdAgain, setDontShowLgpdAgain] = useState(false);

  // Novos estados para Coordenação e Calendários
  const [activeTeamDrillDown, setActiveTeamDrillDown] = useState<string | null>(null);
  const [allCollaborationNotes, setAllCollaborationNotes] = useState<CollaborationNote[]>([]);
  const [allCalendarEvents, setAllCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceModalData, setAttendanceModalData] = useState<{ collab: UserProfile; dateStr: string; note?: CollaborationNote } | null>(null);
  const [isCalendarEventModalOpen, setIsCalendarEventModalOpen] = useState(false);

  // Escuta todas as anotações/presenças da organização
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const handleSandboxUpdate = () => {
        const notes = sandboxService.getCollaborationNotesReport('sandbox-test');
        setAllCollaborationNotes(notes);
      };
      const unsubscribe = sandboxService.subscribe(handleSandboxUpdate);
      handleSandboxUpdate();
      return () => unsubscribe();
    } else {
      const q = query(
        collection(db, 'collaboration_notes'),
        where('organizationId', '==', profile.organizationId)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => doc.data() as CollaborationNote);
        setAllCollaborationNotes(notes);
      });
      return () => unsubscribe();
    }
  }, [profile.organizationId]);

  // Escuta todos os eventos de calendário da organização
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const handleSandboxUpdate = () => {
        const events = sandboxService.getCalendarEvents('sandbox-test');
        setAllCalendarEvents(events);
      };
      const unsubscribe = sandboxService.subscribe(handleSandboxUpdate);
      handleSandboxUpdate();
      return () => unsubscribe();
    } else {
      const q = query(
        collection(db, 'calendar_events'),
        where('organizationId', '==', profile.organizationId)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => doc.data() as CalendarEvent);
        setAllCalendarEvents(events);
      });
      return () => unsubscribe();
    }
  }, [profile.organizationId]);

  // Seleção reativa de aba padrão para monitores e backoffice
  useEffect(() => {
    if (profile?.role === 'monitor') {
      setDashboardTab('qa');
    } else if (profile?.role === 'backoffice') {
      setDashboardTab('backoffice');
    } else if (profile?.role) {
      // Se trocou para um cargo comum e a aba atual é restrita a monitor/backoffice, força a ida para 'financial'
      setDashboardTab(prev => (prev === 'backoffice' || prev === 'qa' ? 'financial' : prev));
    }
  }, [profile?.role]);

  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [selectedOperatorToTransfer, setSelectedOperatorToTransfer] = useState<string>('');
  const [selectedTargetTeamForTransfer, setSelectedTargetTeamForTransfer] = useState<string>('');

  // Carrega supervisores da organização (para gerente e coordenador)
  useEffect(() => {
    if ((profile.role !== 'manager' && profile.role !== 'coordinator') || !profile.organizationId) return;

    const loadSupervisors = async () => {
      if (profile.organizationId === 'sandbox-test') {
        let sups = sandboxService.getUsers(profile.organizationId).filter(u => u.role === 'supervisor');
        if (profile.role === 'manager') {
          sups = sups.filter(s => s.managerId === profile.uid);
        }
        setSupervisors(sups);
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('organizationId', '==', profile.organizationId),
          where('role', '==', 'supervisor')
        );
        const snap = await getDocs(q);
        let sups = snap.docs.map(doc => doc.data() as UserProfile);
        if (profile.role === 'manager') {
          sups = sups.filter(s => s.managerId === profile.uid);
        }
        setSupervisors(sups);
      } catch (err) {
        console.error("Erro ao carregar supervisores:", err);
      }
    };

    loadSupervisors();
  }, [profile.role, profile.organizationId, profile.uid]);

  // Carrega gerentes da organização (para coordenador)
  useEffect(() => {
    if (profile.role !== 'coordinator' || !profile.organizationId) return;

    const loadManagers = async () => {
      if (profile.organizationId === 'sandbox-test') {
        const mans = sandboxService.getUsers(profile.organizationId).filter(u => u.role === 'manager');
        setManagers(mans);
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('organizationId', '==', profile.organizationId),
          where('role', '==', 'manager')
        );
        const snap = await getDocs(q);
        const mans = snap.docs.map(doc => doc.data() as UserProfile);
        setManagers(mans);
      } catch (err) {
        console.error("Erro ao carregar gerentes:", err);
      }
    };

    loadManagers();
  }, [profile.role, profile.organizationId]);

  // 1. CARREGAMENTO DOS DADOS DE EQUIPES E MEMBROS VIA CUSTOM HOOK
  const {
    currentTeamMembers,
    setCurrentTeamMembers,
    managedTeamsData,
    selectedMemberId,
    setSelectedMemberId,
    loading: teamLoading
  } = useTeamMembers({ 
    profile, 
    selectedTeamId: (selectedTeamId.startsWith('supervisor-') || selectedTeamId.startsWith('manager-')) ? 'all' : selectedTeamId 
  });

  // Lista de Equipes para monitorar acordos
  const teamsToWatch = useMemo(() => {
    if (selectedTeamId === 'all') {
      return managedTeamsData.map(t => t.id);
    }
    if (selectedTeamId.startsWith('manager-')) {
      const targetManagerId = selectedTeamId.replace('manager-', '');
      return managedTeamsData
        .filter(t => t.managerId === targetManagerId)
        .map(t => t.id);
    }
    if (selectedTeamId.startsWith('supervisor-')) {
      const targetSupervisorId = selectedTeamId.replace('supervisor-', '');
      return managedTeamsData
        .filter(t => t.supervisorId === targetSupervisorId)
        .map(t => t.id);
    }
    return [selectedTeamId];
  }, [selectedTeamId, managedTeamsData]);

  // Filtra operadores/membros da equipe de acordo com a seleção ativa (gerente, supervisor ou equipe)
  const filteredTeamMembers = useMemo(() => {
    if (selectedTeamId === 'all') {
      return currentTeamMembers;
    }
    if (selectedTeamId.startsWith('manager-')) {
      const targetManagerId = selectedTeamId.replace('manager-', '');
      return currentTeamMembers.filter(m => {
        const team = managedTeamsData.find(t => t.id === m.teamId);
        return team?.managerId === targetManagerId;
      });
    }
    if (selectedTeamId.startsWith('supervisor-')) {
      const targetSupervisorId = selectedTeamId.replace('supervisor-', '');
      return currentTeamMembers.filter(m => {
        const team = managedTeamsData.find(t => t.id === m.teamId);
        return team?.supervisorId === targetSupervisorId;
      });
    }
    return currentTeamMembers.filter(m => m.teamId === selectedTeamId);
  }, [selectedTeamId, currentTeamMembers, managedTeamsData]);

  // Escuta o histórico do cliente selecionado (LGPD e histórico global)
  useEffect(() => {
    if (!selectedClientCpf || !profile.organizationId) {
      setClientHistory([]);
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    const q = query(
      collection(db, 'agreements'), 
      where('organizationId', '==', profile.organizationId),
      where('clientCpf', '==', selectedClientCpf),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      setClientHistory(history);
      setIsLoadingHistory(false);
    }, (error) => {
      console.error("Erro ao escutar histórico do cliente:", error);
      setIsLoadingHistory(false);
    });
    return () => unsubscribe();
  }, [selectedClientCpf, profile.organizationId]);

  // Escuta agendamentos da organização
  useEffect(() => {
    if (!profile.organizationId || teamsToWatch.length === 0) {
      setScheduledAgreements([]);
      setIsLoadingScheduled(false);
      return;
    }

    setIsLoadingScheduled(true);

    const qScheduled = query(
      collection(db, 'agreements'),
      where('organizationId', '==', profile.organizationId),
      where('teamId', 'in', teamsToWatch),
      where('status', '==', AgreementStatus.SCHEDULED)
    );

    const unsubscribe = onSnapshot(qScheduled, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      
      // Ordenação por data do retorno
      data.sort((a, b) => {
        const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return dateA - dateB;
      });

      setScheduledAgreements(data);
      setIsLoadingScheduled(false);
    }, (error) => {
      console.error("Erro ao escutar agendamentos:", error);
      setIsLoadingScheduled(false);
    });

    return () => unsubscribe();
  }, [profile.organizationId, teamsToWatch]);

  // Escuta avaliações de QA para calcular as médias reativas
  useEffect(() => {
    if (!profile.organizationId) return;

    const qQa = query(
      collection(db, 'qa_evaluations'),
      where('organizationId', '==', profile.organizationId)
    );

    const unsubscribe = onSnapshot(qQa, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QaEvaluation));
      setQaEvaluations(data);
    });

    return () => unsubscribe();
  }, [profile.organizationId]);

  // Filtragem local de agendamentos por operador
  const filteredScheduledAgreements = useMemo(() => {
    return scheduledAgreements.filter(a => {
      if (viewMode === 'personal') {
        return a.operatorId === profile.uid;
      } else {
        if (selectedMemberId === 'all') return true;
        return a.operatorId === selectedMemberId;
      }
    });
  }, [scheduledAgreements, viewMode, profile.uid, selectedMemberId]);

  // Cálculo das notas médias de QA
  const qaScores = useMemo(() => {
    const scores: Record<string, { total: number; count: number }> = {};
    qaEvaluations.forEach(e => {
      if (!scores[e.operatorId]) {
        scores[e.operatorId] = { total: 0, count: 0 };
      }
      scores[e.operatorId].total += e.score;
      scores[e.operatorId].count += 1;
    });
    const result: Record<string, number> = {};
    Object.entries(scores).forEach(([opId, stats]) => {
      result[opId] = stats.total / stats.count;
    });
    return result;
  }, [qaEvaluations]);

  const operatorQaScore = useMemo(() => {
    return qaScores[profile.uid];
  }, [qaScores, profile.uid]);

  // Filtragem de acordos por cargo:
  // - member (operador): sempre os seus próprios
  // - supervisor: pode ver por membro selecionado ou toda a equipe
  // - demais cargos: não relevante (lista não é renderizada)
  const operatorIdForAgreements =
    profile.role === 'member'
      ? profile.uid
      : profile.role === 'supervisor'
        ? selectedMemberId
        : 'all';

  // 2. CARREGAMENTO DOS ACORDOS DA PÁGINA ATUAL E ESTATÍSTICAS DO MÊS VIA CUSTOM HOOK
  const {
    monthAgreements,
    paginatedAgreements,
    loading: agreementsLoading,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    refreshAgreements,
    lastRefreshed,
    isRefreshing
  } = useAgreements({
    organizationId: profile.organizationId || '',
    teamsToWatch,
    selectedMonth,
    selectedYear,
    filterStatus,
    dateFilter,
    customStartDate,
    customEndDate,
    searchTerm,
    isChecklistMode,
    operatorId: operatorIdForAgreements,
    userId: profile.uid
  });

  const isLoading = teamLoading || agreementsLoading;

  const doMarkStale = React.useCallback(() => {
    markStatsStale(
      profile.organizationId || '', teamsToWatch, selectedMonth, selectedYear
    ).catch(err => console.error('[Dashboard] Erro ao marcar cache stale:', err));
    refreshAgreements();
  }, [profile.organizationId, teamsToWatch, selectedMonth, selectedYear, refreshAgreements]);

  // Atualiza metas reativamente com base na seleção de equipes gerenciadas do hook
  useEffect(() => {
    if (selectedTeamId === 'all') {
      const totalMonthly = managedTeamsData.reduce((acc, t) => acc + (t.monthlyGoal || 0), 0);
      const avgEff = managedTeamsData.length > 0 
        ? managedTeamsData.reduce((acc, t) => acc + (t.effectivenessGoal || 85), 0) / managedTeamsData.length
        : 85;
      setMonthlyGoal(totalMonthly || 50000);
      setEffectivenessGoal(Math.round(avgEff));
    } else {
      const currentTeam = managedTeamsData.find(t => t.id === selectedTeamId);
      if (currentTeam) {
        setMonthlyGoal(currentTeam.monthlyGoal || 50000);
        setEffectivenessGoal(currentTeam.effectivenessGoal || 85);
      }
    }
  }, [selectedTeamId, managedTeamsData]);

  // Escuta configurações do time selecionado para manter metas em tempo real
  useEffect(() => {
    if (selectedTeamId === 'all') return;
    if (profile.organizationId === 'sandbox-test') {
      const syncSandboxTeamMeta = () => {
        const team = sandboxService.getTeam(selectedTeamId);
        if (team) {
          setMonthlyGoal(team.monthlyGoal || 80000);
          setEffectivenessGoal(team.effectivenessGoal || 85);
        }
      };
      syncSandboxTeamMeta();
      return sandboxService.subscribe(syncSandboxTeamMeta);
    }
    const settingsRef = doc(db, 'settings', selectedTeamId);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMonthlyGoal(data.monthlyGoal || 50000);
        setEffectivenessGoal(data.effectivenessGoal || 85);
      }
    });
    return () => unsubscribe();
  }, [selectedTeamId, profile.organizationId]);

  // Carrega informações da organização em tempo real
  useEffect(() => {
    if (!profile.organizationId) return;
    if (profile.organizationId === 'sandbox-test') {
      const org = sandboxService.getOrganization(profile.organizationId);
      if (org) {
        setWebhookUrl('');
        setOrganizationName(org.name || 'Empresa de Teste (Sandbox)');
        setOrganizationCnpj('00.000.000/0001-00');
        setCrmOrgId('');
        setCrmClientId('');
        setCrmPublicToken('');
      }
      return;
    }
    const orgRef = doc(db, 'organizations', profile.organizationId);
    const unsubscribe = onSnapshot(orgRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWebhookUrl(data.webhookUrl || '');
        setOrganizationName(data.name || '');
        setOrganizationCnpj(data.cnpj || '');
        setCrmOrgId(data.crmOrgId || '');
        setCrmClientId(data.crmClientId || '');
        setCrmPublicToken(data.crmPublicToken || '');
      }
    });
    return () => unsubscribe();
  }, [profile.organizationId]);

  useEffect(() => {
    const loadAttendances = async () => {
      if (dashboardTab === 'people' && filteredTeamMembers.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const statuses: Record<string, 'present' | 'late' | 'absent'> = {};
        
        await Promise.all(filteredTeamMembers.map(async (m) => {
          const att = await getAttendanceStatusForDay(m.uid, todayStr);
          if (att && att.attendanceStatus) {
            statuses[m.uid] = att.attendanceStatus;
          } else {
            statuses[m.uid] = 'present';
          }
        }));
        
        setAttendanceStatuses(statuses);
      }
    };
    loadAttendances();
  }, [dashboardTab, filteredTeamMembers]);

  // Escuta conciliações financeiras
  useEffect(() => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

    const reconId = `${targetTeamId}_${selectedMonth}_${selectedYear}_${profile.uid}`;
    const reconRef = doc(db, 'reconciliations', reconId);

    const unsubscribe = onSnapshot(reconRef, (snapshot) => {
      if (snapshot.exists()) {
        setReconciliation({ id: snapshot.id, ...snapshot.data() } as Reconciliation);
      } else {
        setReconciliation(null);
      }
    });

    return () => unsubscribe();
  }, [selectedTeamId, selectedMonth, selectedYear, profile.uid, profile.teamId]);

  // Verifica aceite de termos
  useEffect(() => {
    if (profile && !profile.acceptedTermsAt) {
      setIsTermsModalOpen(true);
    }
  }, [profile?.acceptedTermsAt]);

  // Sincroniza preferências locais com preferências do banco
  useEffect(() => {
    if (profile.dashboardPreferences?.hiddenCards) {
      setLocalHiddenCards(profile.dashboardPreferences.hiddenCards);
    }
  }, [profile.dashboardPreferences?.hiddenCards]);

  // Gerencia Fullscreen Mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsPresentMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Exibe tour interativo se for primeiro login (somente após aceitar os termos de uso)
  useEffect(() => {
    if (profile && !profile.hasSeenTour && profile.acceptedTermsAt) {
      const timer = setTimeout(() => {
        startTour(profile.role, async () => {
          try {
            if (profile.organizationId === 'sandbox-test') {
              sandboxService.setProfile({ ...profile, hasSeenTour: true });
            } else {
              await updateDoc(doc(db, 'users', profile.uid), { hasSeenTour: true });
            }
          } catch (e) {
            console.error("Erro ao salvar estado do tour:", e);
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile?.hasSeenTour, profile?.acceptedTermsAt]);

  // 3. CÁLCULO DAS FILTRAGENS LOCAIS E ESTATÍSTICAS FINANCEIRAS
  // Ajustes técnicos do usuário no time selecionado para o faturamento
  const monthAdjustments = useMemo(() => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return [];

    return monthAgreements.filter(a => {
      if (!a.isAdjustment) return false;
      if (a.operatorId !== profile.uid) return false;
      if (a.teamId !== targetTeamId) return false;
      return true;
    });
  }, [monthAgreements, profile.uid, selectedTeamId, profile.teamId]);

  // Lista consolidada de acordos (excluindo ajustes técnicos)
  const monthFilteredAgreements = useMemo(() => {
    return monthAgreements.filter(a => !a.isAdjustment);
  }, [monthAgreements]);

  // Acordos filtrados de acordo com modo de visualização (Pessoal vs Equipe/Colaborador)
  const memberFilteredAgreements = useMemo(() => {
    let filtered = monthFilteredAgreements;
    if (viewMode === 'personal') {
      filtered = filtered.filter(a => a.operatorId === profile.uid);
    } else if (selectedMemberId !== 'all') {
      filtered = filtered.filter(a => a.operatorId === selectedMemberId);
    }
    return filtered;
  }, [monthFilteredAgreements, viewMode, profile.uid, selectedMemberId]);

  // Acordos filtrados por filtros temporais (Hoje / Ontem / Customizado)
  const timeFilteredAgreements = useMemo(() => {
    let filtered = memberFilteredAgreements;
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0,0,0,0);
      filtered = filtered.filter(a => new Date(a.createdAt) >= today);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      filtered = filtered.filter(a => {
        const d = new Date(a.createdAt);
        return d >= yesterday && d < today;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate + 'T00:00:00');
      const end = new Date(customEndDate + 'T23:59:59');
      filtered = filtered.filter(a => {
        const d = new Date(a.createdAt);
        return d >= start && d <= end;
      });
    }
    return filtered;
  }, [memberFilteredAgreements, dateFilter, customStartDate, customEndDate]);

  // Executa o cálculo de estatísticas (faturamento total, projeção, turnos, heatmap, meta diária)
  const stats = useDashboardStats({
    monthAgreements: memberFilteredAgreements,
    filteredAgreements: timeFilteredAgreements,
    monthlyGoal,
    selectedMonth,
    selectedYear
  });

  const totalPaidMonth = useMemo(() => {
    return memberFilteredAgreements
      .filter(a => a.status === AgreementStatus.PAID)
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [memberFilteredAgreements]);

  // Meta diária baseada nos dias úteis restantes
  const workingDays = useMemo(() => getWorkingDaysInMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const remainingWorkingDays = useMemo(() => getRemainingWorkingDays(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const dailyGoal = useMemo(() => Math.max(0, (monthlyGoal || 0) - totalPaidMonth) / (remainingWorkingDays || 1), [monthlyGoal, totalPaidMonth, remainingWorkingDays]);

  // Tendência estatística para mini-gráficos de cada StatCard
  const statTrends = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const trendData: Record<number, { projected: number; paid: number; overdue: number }> = {};
    
    // Inicializa todos os dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      trendData[i] = { projected: 0, paid: 0, overdue: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    memberFilteredAgreements.forEach(a => {
      const d = new Date(a.createdAt);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        const day = d.getDate();
        if (trendData[day]) {
          trendData[day].projected += a.value;
          if (a.status === AgreementStatus.PAID) {
            trendData[day].paid += a.value;
          }
          if (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today) {
            trendData[day].overdue += a.value;
          }
        }
      }
    });

    return {
      projected: Object.keys(trendData).map(day => ({ name: `${day}/${selectedMonth + 1}`, value: trendData[Number(day)].projected })),
      paid: Object.keys(trendData).map(day => ({ name: `${day}/${selectedMonth + 1}`, value: trendData[Number(day)].paid })),
      overdue: Object.keys(trendData).map(day => ({ name: `${day}/${selectedMonth + 1}`, value: trendData[Number(day)].overdue }))
    };
  }, [memberFilteredAgreements, selectedMonth, selectedYear]);

  // Acordos consolidados de filtro completo para fins de Exportação CSV e Relatório de Impressão Executiva
  const filteredAgreements = useMemo(() => {
    let filtered = memberFilteredAgreements;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0,0,0,0);
      filtered = filtered.filter(a => new Date(a.createdAt) >= today);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      filtered = filtered.filter(a => {
        const d = new Date(a.createdAt);
        return d >= yesterday && d < today;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate + 'T00:00:00');
      const end = new Date(customEndDate + 'T23:59:59');
      filtered = filtered.filter(a => {
        const d = new Date(a.createdAt);
        return d >= start && d <= end;
      });
    }

    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.clientName.toLowerCase().includes(lowerSearch) ||
        a.clientCpf.includes(searchTerm)
      );
    }

    return filtered;
  }, [memberFilteredAgreements, filterStatus, dateFilter, customStartDate, customEndDate, searchTerm]);

  // 4. HANDLERS E FUNÇÕES OPERACIONAIS (CRUD e Regras de Negócio)
  const handleAcceptTerms = async () => {
    try {
      const now = new Date().toISOString();
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.setProfile({
          ...profile,
          acceptedTermsAt: now
        });
        setIsTermsModalOpen(false);
        showToast('Termos de Uso do Sandbox aceitos com sucesso!', 'success');
        return;
      }

      await updateDoc(doc(db, 'users', profile.uid), { acceptedTermsAt: now });
      await logAudit('ACCEPT_TERMS', {}, profile.displayName || '', profile.organizationId);
      setIsTermsModalOpen(false);
      showToast('Termos de Uso aceitos com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar aceite dos termos.', 'error');
    }
  };

  const handleAttendanceChange = async (collaboratorId: string, collaboratorName: string, status: 'present' | 'late' | 'absent') => {
    if (!profile.organizationId) return;
    
    setAttendanceStatuses(prev => ({ ...prev, [collaboratorId]: status }));

    try {
      const dateFormatted = new Date().toLocaleDateString('pt-BR');
      const statusLabels = { present: 'Presente', late: 'Atrasado', absent: 'Falta' };
      
      await addCollaborationNote({
        organizationId: profile.organizationId,
        collaboratorId,
        creatorId: profile.uid,
        creatorName: profile.displayName || profile.email.split('@')[0],
        type: 'attendance',
        content: `Registro de presença do dia ${dateFormatted}: ${statusLabels[status]}`,
        attendanceStatus: status
      });
      
      showToast(`Presença de ${collaboratorName} atualizada para ${statusLabels[status]}!`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao registrar presença.', 'error');
    }
  };

  const handleCellClick = (collab: UserProfile, dateStr: string, currentNote?: CollaborationNote) => {
    setAttendanceModalData({ collab, dateStr, note: currentNote });
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async (
    status: 'present' | 'late' | 'absent' | '',
    lateDuration: string,
    absenceReason: string
  ) => {
    if (!attendanceModalData || !profile.organizationId) return;
    const { collab, dateStr } = attendanceModalData;

    try {
      const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
      const statusLabels = { present: 'Presente', late: 'Atrasado', absent: 'Falta', '': 'Limpar' };

      let existingNotes: CollaborationNote[] = [];
      if (profile.organizationId === 'sandbox-test') {
        existingNotes = sandboxService.getCollaborationNotes(collab.uid);
      } else {
        const q = query(
          collection(db, 'collaboration_notes'),
          where('collaboratorId', '==', collab.uid),
          where('type', '==', 'attendance')
        );
        const querySnapshot = await getDocs(q);
        existingNotes = querySnapshot.docs.map(doc => doc.data() as CollaborationNote);
      }

      const targetDate = new Date(dateStr);
      const dayNotes = existingNotes.filter(note => {
        const noteDate = new Date(note.createdAt);
        return (
          noteDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
          noteDate.getUTCMonth() === targetDate.getUTCMonth() &&
          noteDate.getUTCDate() === targetDate.getUTCDate()
        );
      });

      if (profile.organizationId === 'sandbox-test') {
        dayNotes.forEach(dn => {
          sandboxService.deleteCollaborationNote(dn.id);
        });
      } else {
        const batch = writeBatch(db);
        dayNotes.forEach(dn => {
          batch.delete(doc(db, 'collaboration_notes', dn.id));
        });
        await batch.commit();
      }

      if (status !== '') {
        let content = `Registro de presença do dia ${dateFormatted}: ${statusLabels[status]}`;
        if (status === 'late' && lateDuration) {
          content += ` (${lateDuration} de atraso)`;
        } else if (status === 'absent' && absenceReason) {
          content += ` (Motivo: ${absenceReason})`;
        }

        const targetDateObj = new Date(dateStr + 'T12:00:00');

        await addCollaborationNote({
          organizationId: profile.organizationId,
          collaboratorId: collab.uid,
          creatorId: profile.uid,
          creatorName: profile.displayName || profile.email.split('@')[0],
          type: 'attendance',
          content,
          attendanceStatus: status,
          lateDuration: status === 'late' ? lateDuration : undefined,
          absenceReason: status === 'absent' ? absenceReason : undefined,
          createdAt: targetDateObj.toISOString()
        });
      }

      showToast(`Presença de ${collab.displayName || collab.email.split('@')[0]} salva para o dia ${dateFormatted}!`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar presença.', 'error');
    }
  };

  const handleSaveCalendarEvent = async (
    title: string,
    date: string,
    targetType: 'team' | 'individual',
    targetId: string,
    selectedCollaboratorIds: string[]
  ) => {
    if (!profile.organizationId) return;

    try {
      const now = new Date().toISOString();

      if (targetType === 'team') {
        const eventId = `event-${Math.random().toString(36).substring(2, 11)}`;
        const event: CalendarEvent = {
          id: eventId,
          organizationId: profile.organizationId,
          title,
          date,
          targetType: 'team',
          targetId,
          createdBy: profile.uid,
          createdAt: now
        };

        if (profile.organizationId === 'sandbox-test') {
          sandboxService.addCalendarEvent(event);
        } else {
          await setDoc(doc(db, 'calendar_events', eventId), event);
        }
      } else {
        if (profile.organizationId === 'sandbox-test') {
          selectedCollaboratorIds.forEach(collabId => {
            const eventId = `event-${Math.random().toString(36).substring(2, 11)}`;
            const event: CalendarEvent = {
              id: eventId,
              organizationId: profile.organizationId,
              title,
              date,
              targetType: 'individual',
              targetId: collabId,
              createdBy: profile.uid,
              createdAt: now
            };
            sandboxService.addCalendarEvent(event);
          });
        } else {
          const batch = writeBatch(db);
          selectedCollaboratorIds.forEach(collabId => {
            const eventId = `event-${Math.random().toString(36).substring(2, 11)}`;
            const event: CalendarEvent = {
              id: eventId,
              organizationId: profile.organizationId,
              title,
              date,
              targetType: 'individual',
              targetId: collabId,
              createdBy: profile.uid,
              createdAt: now
            };
            batch.set(doc(db, 'calendar_events', eventId), event);
          });
          await batch.commit();
        }
      }

      showToast('Evento agendado com sucesso no calendário!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao agendar evento.', 'error');
    }
  };

  const handleAddNote = async (collaboratorId: string, collaboratorName: string) => {
    const text = quickNotesText[collaboratorId]?.trim();
    if (!text) return;
    if (!profile.organizationId) return;

    try {
      await addCollaborationNote({
        organizationId: profile.organizationId,
        collaboratorId,
        creatorId: profile.uid,
        creatorName: profile.displayName || profile.email.split('@')[0],
        type: 'note',
        content: text
      });

      setQuickNotesText(prev => ({ ...prev, [collaboratorId]: '' }));
      showToast(`Anotação registrada para ${collaboratorName}!`, 'success');
      
      if (selectedCollabForHistory && selectedCollabForHistory.uid === collaboratorId) {
        const updatedNotes = await getCollaborationNotes(collaboratorId);
        setCollabNotesHistory(updatedNotes);
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar anotação.', 'error');
    }
  };

  const handleOpenHistory = async (collab: UserProfile) => {
    setSelectedCollabForHistory(collab);
    setIsLoadingCollabHistory(true);
    try {
      const historyNotes = await getCollaborationNotes(collab.uid);
      setCollabNotesHistory(historyNotes);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar histórico.', 'error');
    } finally {
      setIsLoadingCollabHistory(false);
    }
  };

  const handleDismissUser = async (uid: string, displayName: string, role: string) => {
    const isSandbox = profile.organizationId === 'sandbox-test';
    if (isSandbox) {
      sandboxService.deleteUser(uid);
      showToast(`Colaborador ${displayName} (${role === 'supervisor' ? 'Supervisor' : 'Operador'}) desligado com sucesso no Sandbox!`, 'success');
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'users', uid));
      showToast(`Colaborador ${displayName} desligado com sucesso!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao desligar colaborador.', 'error');
    }
  };

  const handleTransferOperator = async (operatorId: string, targetTeamId: string) => {
    const isSandbox = profile.organizationId === 'sandbox-test';
    const targetTeam = managedTeamsData.find(t => t.id === targetTeamId);
    if (!targetTeam) return;
    
    if (isSandbox) {
      sandboxService.updateUser(operatorId, { teamId: targetTeamId });
      showToast(`Operador transferido com sucesso para a equipe ${targetTeam.name}!`, 'success');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', operatorId), { teamId: targetTeamId });
      showToast(`Operador transferido com sucesso para a equipe ${targetTeam.name}!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao transferir operador.', 'error');
    }
  };

  const togglePresentMode = () => {
    if (!isPresentMode) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
      setIsPresentMode(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((e) => console.log(e));
      }
      setIsPresentMode(false);
    }
  };

  const handleEfetivar = async (id: string) => {
    if (profile.organizationId === 'sandbox-test') {
      const now = new Date().toISOString();
      sandboxService.updateAgreement(id, { 
        status: AgreementStatus.PAID,
        paidAt: now
      });
      showToast('Acordo do Sandbox efetivado na memória!', 'success');
      return;
    }

    try {
      const agreementRef = doc(db, 'agreements', id);
      const now = new Date().toISOString();
      await updateDoc(agreementRef, { 
        status: AgreementStatus.PAID,
        paidAt: now
      });
      doMarkStale();
      showToast('Acordo efetivado com sucesso!', 'success');

      if (webhookUrl) {
        const found = monthAgreements.find(a => a.id === id);
        if (found) {
          triggerWebhook(webhookUrl, 'agreement.paid', {
            ...found,
            status: AgreementStatus.PAID,
            paidAt: now
          }, profile.organizationId);
        }
      }
    } catch (error) {
      showToast('Erro ao efetivar acordo.', 'error');
    }
  };

  const handleToggleChecked = async (id: string, currentStatus: string | undefined) => {
    if (profile.organizationId === 'sandbox-test') {
      const agreement = monthAgreements.find(a => a.id === id);
      if (!agreement) return;

      const dueDate = parseLocalDate(agreement.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isCurrentlyChecked = currentStatus && new Date(currentStatus).toLocaleDateString() === new Date().toLocaleDateString();
      const isAfterDueDate = today > dueDate;

      if (!isCurrentlyChecked && isAfterDueDate) {
        sandboxService.updateAgreement(id, {
          status: AgreementStatus.BROKEN,
          lastCheckedAt: new Date().toISOString()
        });
        showToast('Acordo do Sandbox marcado como quebrado (conferência após o vencimento).', 'info');
      } else {
        sandboxService.updateAgreement(id, {
          lastCheckedAt: isCurrentlyChecked ? null : new Date().toISOString()
        });
        showToast(isCurrentlyChecked ? 'Marcação de conferência removida do Sandbox.' : 'Acordo do Sandbox marcado como conferido!', 'success');
      }
      return;
    }

    try {
      const agreement = monthAgreements.find(a => a.id === id);
      if (!agreement) return;

      const dueDate = parseLocalDate(agreement.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isCurrentlyChecked = currentStatus && new Date(currentStatus).toLocaleDateString() === new Date().toLocaleDateString();
      const isAfterDueDate = today > dueDate;

      if (!isCurrentlyChecked && isAfterDueDate) {
        await updateDoc(doc(db, 'agreements', id), {
          status: AgreementStatus.BROKEN,
          lastCheckedAt: new Date().toISOString()
        });
        doMarkStale();
        showToast('Acordo marcado como quebrado (conferência após o vencimento).', 'info');
      } else {
        await updateDoc(doc(db, 'agreements', id), {
          lastCheckedAt: isCurrentlyChecked ? null : new Date().toISOString()
        });
        doMarkStale();
        showToast(isCurrentlyChecked ? 'Marcação de conferência removida.' : 'Acordo marcado como conferido!', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar conferência.', 'error');
    }
  };

  const handleDeleteRequest = (id: string) => {
    setAgreementIdToDelete(id);
  };

  const executeDeleteAgreement = async () => {
    if (!agreementIdToDelete) return;

    if (profile.organizationId === 'sandbox-test') {
      sandboxService.deleteAgreement(agreementIdToDelete);
      showToast('Acordo do Sandbox excluído da memória!', 'success');
      setAgreementIdToDelete(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'agreements', agreementIdToDelete));
      doMarkStale();
      showToast('Acordo excluído com sucesso!', 'success');
      setAgreementIdToDelete(null);
    } catch (error) {
      console.error(error);
      showToast('Erro ao excluir acordo.', 'error');
    }
  };

  const handleCopyCpfRequest = (id: string, cpf: string) => {
    const skipWarning = localStorage.getItem('tracker-skip-lgpd-warning') === 'true';
    if (skipWarning) {
      navigator.clipboard.writeText(cpf.replace(/\D/g, ''));
      showToast('CPF copiado para a área de transferência!', 'success');
      setRevealedCpfs(prev => ({ ...prev, [id]: true }));
      logAudit('REVEAL_CPF', { agreementId: id, cpf, context: 'CopyToClipboard' }, profile.displayName || '', profile.organizationId);
    } else {
      setDontShowLgpdAgain(false); // Reseta a checkbox ao abrir
      setCpfToConfirm({ id, cpf, actionType: 'copy' });
    }
  };

  const executeConfirmCpf = async () => {
    if (!cpfToConfirm) return;
    const { id, cpf, actionType } = cpfToConfirm;
    
    try {
      if (dontShowLgpdAgain) {
        localStorage.setItem('tracker-skip-lgpd-warning', 'true');
      }

      if (actionType === 'copy') {
        await navigator.clipboard.writeText(cpf.replace(/\D/g, ''));
        showToast('CPF copiado para a área de transferência!', 'success');
        setRevealedCpfs(prev => ({ ...prev, [id]: true }));
        logAudit('REVEAL_CPF', { agreementId: id, cpf, context: 'CopyToClipboard' }, profile.displayName || '', profile.organizationId);
      } else {
        setRevealedCpfs(prev => ({ ...prev, [id]: true }));
        logAudit('REVEAL_CPF', { agreementId: id, cpf, context: 'RevealOnScreen' }, profile.displayName || '', profile.organizationId);
        showToast('CPF revelado!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao acessar a área de transferência.', 'error');
    } finally {
      setCpfToConfirm(null);
    }
  };

  const handleClientClick = (cpf: string) => {
    setSelectedClientCpf(cpf);
  };

  const handleUpdateGoal = async (newGoal: number, newEffGoal: number) => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

    if (profile.organizationId === 'sandbox-test') {
      sandboxService.setTeamGoal(targetTeamId, newGoal, newEffGoal);
      setMonthlyGoal(newGoal);
      setEffectivenessGoal(newEffGoal);
      setIsGoalModalOpen(false);
      showToast('Metas do Sandbox atualizadas na memória!', 'success');
      return;
    }
    
    try {
      await setDoc(doc(db, 'settings', targetTeamId), { 
        monthlyGoal: newGoal,
        effectivenessGoal: newEffGoal,
        organizationId: profile.organizationId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await updateDoc(doc(db, 'teams', targetTeamId), {
        monthlyGoal: newGoal,
        effectivenessGoal: newEffGoal
      });
      setMonthlyGoal(newGoal);
      setEffectivenessGoal(newEffGoal);
      setIsGoalModalOpen(false);
      showToast('Metas atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar metas', 'error');
    }
  };

  const resolveBrokenAgreementsForCpf = async (clientCpf: string) => {
    if (!clientCpf || !profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      sandboxService.resolveBrokenAgreements(profile.organizationId, clientCpf);
      return;
    }

    try {
      const q = query(
        collection(db, 'agreements'),
        where('organizationId', '==', profile.organizationId),
        where('clientCpf', '==', clientCpf),
        where('status', '==', AgreementStatus.BROKEN)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const batch = writeBatch(db);
        querySnap.docs.forEach(docSnap => {
          batch.update(docSnap.ref, {
            status: AgreementStatus.RECOVERED,
            recoveredAt: new Date().toISOString(),
            recoveredBy: profile.uid
          });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Erro ao resolver acordos quebrados anteriores:", err);
    }
  };

  const saveAgreement = async (data: any, targetTeamId: string, forced = false) => {
    if (profile.organizationId === 'sandbox-test') {
      try {
        const payload = forced ? { ...data, forcedCollision: true } : data;
        const now = new Date().toISOString();

        if (editingAgreement && editingAgreement.id) {
          const updatedFields = {
            ...payload,
            status: data.status || editingAgreement.status,
            organizationId: profile.organizationId,
            operatorId: profile.uid,
            teamId: targetTeamId
          };
          sandboxService.updateAgreement(editingAgreement.id, updatedFields);
          showToast('Acordo do Sandbox atualizado na memória!', 'success');
        } else {
          const id = `sandbox-agree-manual-${Date.now()}`;
          const agreementData = {
            id,
            ...payload,
            status: data.status || AgreementStatus.WAITING,
            operatorId: profile.uid,
            teamId: targetTeamId,
            organizationId: profile.organizationId,
            createdAt: now,
            paidAt: data.status === AgreementStatus.PAID ? now : null
          };
          sandboxService.setAgreement(agreementData);
          showToast('Acordo do Sandbox registrado na memória!', 'success');

          if (payload.backOfficeClientIdRef) {
            sandboxService.updateBackofficeClientStatus(payload.backOfficeClientIdRef, 'treated');
          }
        }

        const targetStatus = data.status || (editingAgreement ? editingAgreement.status : AgreementStatus.WAITING);
        if (targetStatus !== AgreementStatus.BROKEN) {
          const clientCpf = data.clientCpf || (editingAgreement && editingAgreement.clientCpf);
          if (clientCpf) {
            resolveBrokenAgreementsForCpf(clientCpf);
          }
        }

        setIsModalOpen(false);
        setEditingAgreement(null);
        doMarkStale();
      } catch (error) {
        showToast('Erro ao salvar no Sandbox.', 'error');
      }
      return;
    }

    try {
      const payload = forced ? { ...data, forcedCollision: true } : data;
      if (editingAgreement && editingAgreement.id) {
        const agreementRef = doc(db, 'agreements', editingAgreement.id);
        const updatedFields = {
          ...payload,
          status: data.status || editingAgreement.status,
          organizationId: profile.organizationId,
          operatorId: profile.uid, // Assume posse do acordo ao editar/atender
          teamId: targetTeamId
        };
        await updateDoc(agreementRef, updatedFields);
        showToast('Acordo atualizado com sucesso!', 'success');

        if (webhookUrl) {
          const fullAgreement = { ...editingAgreement, ...updatedFields };
          const eventType = updatedFields.status === AgreementStatus.PAID ? 'agreement.paid' : 'agreement.updated';
          triggerWebhook(webhookUrl, eventType, fullAgreement, profile.organizationId);
        }
      } else {
        const id = doc(collection(db, 'agreements')).id;
        const now = new Date().toISOString();
        const agreementData = {
          id,
          ...payload,
          status: data.status || AgreementStatus.WAITING,
          operatorId: profile.uid,
          teamId: targetTeamId,
          organizationId: profile.organizationId,
          createdAt: now,
          paidAt: data.status === AgreementStatus.PAID ? now : null
        };
        await setDoc(doc(db, 'agreements', id), agreementData);
        showToast('Acordo registrado com sucesso!', 'success');

        // Se este acordo veio do Back Office, atualiza o status correspondente do cliente da planilha
        if (payload.backOfficeClientIdRef) {
          const clientRef = doc(db, 'backoffice_clients', payload.backOfficeClientIdRef);
          await updateDoc(clientRef, {
            status: 'treated',
            updatedAt: now
          });
        }

        if (webhookUrl) {
          triggerWebhook(webhookUrl, 'agreement.created', agreementData, profile.organizationId);
          if (agreementData.status === AgreementStatus.PAID) {
            triggerWebhook(webhookUrl, 'agreement.paid', agreementData, profile.organizationId);
          }
        }

        if (forced) {
          await logAudit('FORCE_COLLISION', { cpf: data.clientCpf, agreementId: id }, profile.displayName || '', profile.organizationId);
        }
      }

      const targetStatus = data.status || (editingAgreement ? editingAgreement.status : AgreementStatus.WAITING);
      if (targetStatus !== AgreementStatus.BROKEN) {
        const clientCpf = data.clientCpf || (editingAgreement && editingAgreement.clientCpf);
        if (clientCpf) {
          await resolveBrokenAgreementsForCpf(clientCpf);
        }
      }

      setIsModalOpen(false);
      setEditingAgreement(null);
      doMarkStale();
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar acordo.', 'error');
    }
  };

  const handleAddOrEditAgreement = async (data: any) => {
    const targetTeamId = profile.teamId || (selectedTeamId !== 'all' ? selectedTeamId : null);
    if (!targetTeamId) {
      showToast('Nenhuma equipe selecionada para registrar o acordo.', 'error');
      return;
    }
    if (!profile.organizationId) {
      showToast('Organização não identificada.', 'error');
      return;
    }

    // Novos agendamentos e edições sem alteração de CPF passam direto
    if (data.status === AgreementStatus.SCHEDULED || (editingAgreement && editingAgreement.clientCpf === data.clientCpf)) {
      await saveAgreement(data, targetTeamId);
      return;
    }

    try {
      const q = query(
        collection(db, 'agreements'),
        where('organizationId', '==', profile.organizationId),
        where('clientCpf', '==', data.clientCpf)
      );
      const querySnap = await getDocs(q);
      const activeCollision = querySnap.docs.find(docSnap => {
        const status = docSnap.data().status;
        return status === AgreementStatus.WAITING || status === AgreementStatus.SCHEDULED;
      });

      if (activeCollision) {
        setCollisionData({ data, targetTeamId });
        setIsCollisionModalOpen(true);
        return;
      }

      await saveAgreement(data, targetTeamId);
    } catch (err) {
      console.error("Erro ao verificar colisão:", err);
      await saveAgreement(data, targetTeamId);
    }
  };

  const handleSearchCpf = (cpf: string) => {
    handleClientClick(cpf);
  };

  const handleExportClick = () => {
    setIsExportCpfModalOpen(true);
  };

  const executeExport = async (complete: boolean) => {
    const headers = ['Nome', 'CPF', 'Valor', 'Vencimento', 'Status', 'Origem', 'Tipo', 'Data Registro'];
    
    const csvContent = [
      headers.join(';'),
      ...filteredAgreements.map(a => [
        a.clientName,
        complete ? a.clientCpf : maskCPF(a.clientCpf),
        a.value.toString().replace('.', ','),
        (a.dueDate || '').split('-').reverse().join('/'),
        (() => {
          const today = new Date();
          today.setHours(0,0,0,0);
          if (a.status === AgreementStatus.PAID) return 'Pago';
          if (a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)) {
            return (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today) ? 'Quebrado (Vencido)' : 'Quebrado';
          }
          return 'Aguardando';
        })(),
        a.origin,
        a.type === 'quitacao' ? 'Quitação' : 
        a.type === 'parcelamento' ? 'Parcelamento' :
        a.type === 'parcela_atrasada' ? 'Parc. Atrasada' :
        a.type === 'antecipacao' ? 'Antecipação' :
        a.type === 'parcela_atual' ? 'Parcela Atual' : a.type,
        new Date(a.createdAt).toLocaleDateString('pt-BR')
      ].join(';'))
    ].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `acordos_${getMonthName(selectedMonth).toLowerCase()}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    await logAudit(
      complete ? 'EXPORT_CSV_COMPLETE' : 'EXPORT_CSV_MASKED', 
      { count: filteredAgreements.length }, 
      profile.displayName || '',
      profile.organizationId
    );
    showToast('Exportação concluída!', 'success');
  };

  const handleSaveReconciliation = async (officialValue: number | null, officialEffectiveness: number | null) => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

    if (officialValue === null && officialEffectiveness === null) {
      await handleDeleteReconciliation();
      return;
    }

    const reconId = `${targetTeamId}_${selectedMonth}_${selectedYear}_${profile.uid}`;

    if (profile.organizationId === 'sandbox-test') {
      const trackerEff = stats.totalProjected > 0 ? (stats.totalPaid / stats.totalProjected) * 100 : 0;
      const reconData: any = {
        id: reconId,
        userId: profile.uid,
        teamId: targetTeamId,
        organizationId: profile.organizationId,
        month: selectedMonth,
        year: selectedYear,
        updatedAt: new Date().toISOString()
      };

      if (officialValue === null) {
        const adjustmentsToDelete = monthAgreements.filter(a => a.isAdjustment && a.operatorId === profile.uid && a.teamId === targetTeamId);
        adjustmentsToDelete.forEach(a => sandboxService.deleteAgreement(a.id));
      } else {
        reconData.officialValue = officialValue;
        reconData.trackerValue = stats.totalPaid;
        reconData.difference = officialValue - stats.totalPaid;
      }

      if (officialEffectiveness !== null) {
        reconData.officialEffectiveness = officialEffectiveness;
        reconData.trackerEffectiveness = trackerEff;
        reconData.differenceEffectiveness = officialEffectiveness - trackerEff;
      }

      setReconciliation(reconData);
      showToast('Dados de conciliação do Sandbox atualizados na memória!', 'success');
      return;
    }

    const reconRef = doc(db, 'reconciliations', reconId);
    const trackerEff = stats.totalProjected > 0 ? (stats.totalPaid / stats.totalProjected) * 100 : 0;

    const reconData: any = {
      userId: profile.uid,
      teamId: targetTeamId,
      organizationId: profile.organizationId,
      month: selectedMonth,
      year: selectedYear,
      updatedAt: new Date().toISOString()
    };

    if (officialValue === null) {
      reconData.officialValue = deleteField();
      reconData.difference = deleteField();
      
      try {
        const adjustmentsToDelete = monthAgreements.filter(a => {
          if (!a.isAdjustment) return false;
          if (a.operatorId !== profile.uid) return false;
          if (a.teamId !== targetTeamId) return false;
          return true;
        });

        for (const adj of adjustmentsToDelete) {
          await deleteDoc(doc(db, 'agreements', adj.id));
        }
      } catch (e) {
        console.error("Erro ao remover adjustments ao apagar saldo:", e);
      }
    } else {
      reconData.officialValue = officialValue;
      reconData.trackerValue = stats.totalPaid;
      reconData.difference = officialValue - stats.totalPaid;
    }

    if (officialEffectiveness === null) {
      reconData.officialEffectiveness = deleteField();
      reconData.trackerEffectiveness = deleteField();
      reconData.differenceEffectiveness = deleteField();
    } else {
      const diffEff = officialEffectiveness - trackerEff;
      reconData.officialEffectiveness = officialEffectiveness;
      reconData.trackerEffectiveness = trackerEff;
      reconData.differenceEffectiveness = diffEff;
    }

    try {
      await setDoc(reconRef, reconData, { merge: true });
      doMarkStale();
      showToast('Dados de conciliação atualizados com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar conciliação.', 'error');
    }
  };

  const handleDeleteReconciliation = async () => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

    if (profile.organizationId === 'sandbox-test') {
      setReconciliation(null);
      const adjustmentsToDelete = monthAgreements.filter(a => a.isAdjustment && a.operatorId === profile.uid && a.teamId === targetTeamId);
      adjustmentsToDelete.forEach(a => sandboxService.deleteAgreement(a.id));
      showToast('Conciliação do Sandbox apagada da memória!', 'success');
      return;
    }

    const reconId = `${targetTeamId}_${selectedMonth}_${selectedYear}_${profile.uid}`;
    const reconRef = doc(db, 'reconciliations', reconId);

    try {
      await deleteDoc(reconRef);
      const adjustmentsToDelete = monthAgreements.filter(a => {
        if (!a.isAdjustment) return false;
        if (a.operatorId !== profile.uid) return false;
        if (a.teamId !== targetTeamId) return false;
        return true;
      });

      for (const adj of adjustmentsToDelete) {
        await deleteDoc(doc(db, 'agreements', adj.id));
      }

      showToast('Conciliação e ajustes de saldo apagados com sucesso! O saldo voltou ao normal.', 'success');
      doMarkStale();
    } catch (error) {
      console.error(error);
      showToast('Erro ao apagar conciliação.', 'error');
    }
  };

  const handleDeleteAdjustment = async (agreementId: string) => {
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.deleteAgreement(agreementId);
      showToast('Ajuste de saldo do Sandbox apagado da memória!', 'success');
      return;
    }

    try {
      await deleteDoc(doc(db, 'agreements', agreementId));
      doMarkStale();
      showToast('Ajuste de saldo apagado com sucesso! O saldo foi recalculado.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao apagar ajuste técnico.', 'error');
    }
  };

  const handleUpdateAgreementStatus = async (agreementId: string, status: AgreementStatus, optionalData?: Partial<Agreement>) => {
    if (profile.organizationId === 'sandbox-test') {
      const agreement = sandboxService.getAgreements(profile.organizationId, selectedMonth, selectedYear).find(a => a.id === agreementId);
      if (agreement) {
        sandboxService.setAgreement({
          ...agreement,
          status,
          paidAt: status === AgreementStatus.PAID ? new Date().toISOString() : null,
          ...optionalData
        });
        showToast('Acordo do Sandbox atualizado na memória!', 'success');
        doMarkStale();
      }
      return;
    }

    try {
      const agreementRef = doc(db, 'agreements', agreementId);
      const updateData: any = {
        status,
        paidAt: status === AgreementStatus.PAID ? new Date().toISOString() : null,
        ...optionalData
      };
      await updateDoc(agreementRef, updateData);
      showToast('Acordo atualizado com sucesso!', 'success');
      doMarkStale();
    } catch (error) {
      console.error("Erro ao atualizar acordo:", error);
      showToast('Erro ao atualizar acordo.', 'error');
    }
  };

  const handleCreateAgreementFromReconciliation = async (agreementData: Omit<Agreement, 'id' | 'operatorId' | 'teamId' | 'organizationId' | 'createdAt'>) => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

    if (profile.organizationId === 'sandbox-test') {
      const id = 'sandbox-adj-' + Math.random().toString(36).substr(2, 9);
      const now = new Date().toISOString();
      const payload: Agreement = {
        id,
        ...agreementData,
        operatorId: profile.uid,
        teamId: targetTeamId,
        organizationId: profile.organizationId,
        createdAt: now,
        paidAt: agreementData.status === AgreementStatus.PAID ? now : null
      } as Agreement;
      sandboxService.setAgreement(payload);
      showToast('Acordo simulado registrado!', 'success');
      doMarkStale();
      return;
    }

    try {
      const id = doc(collection(db, 'agreements')).id;
      const now = new Date().toISOString();
      const payload = {
        id,
        ...agreementData,
        operatorId: profile.uid,
        teamId: targetTeamId,
        organizationId: profile.organizationId,
        createdAt: now,
        paidAt: agreementData.status === AgreementStatus.PAID ? now : null
      };
      await setDoc(doc(db, 'agreements', id), payload);
      showToast('Acordo registrado com sucesso!', 'success');
      doMarkStale();
    } catch (error) {
      console.error("Erro ao criar acordo:", error);
      showToast('Erro ao registrar acordo.', 'error');
    }
  };



  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeamId || selectedTeamId === 'all') return;
    try {
      await removeTeamMember(memberId);
      showToast('Membro removido com sucesso!', 'success');
      const members = await getTeamMembers(selectedTeamId);
      setCurrentTeamMembers(members.filter(m => m.role === 'member'));
      if (selectedMemberId === memberId) setSelectedMemberId('all');
    } catch (error) {
      console.error(error);
      showToast('Erro ao remover membro.', 'error');
    }
  };

  const handleAnonimizeClient = async (cpf: string) => {
    try {
      const agreementsToAnon = monthAgreements.filter(a => a.clientCpf === cpf);
      for (const a of agreementsToAnon) {
        await updateDoc(doc(db, 'agreements', a.id), {
          clientName: 'Cliente Anonimizado (LGPD)',
          clientCpf: '000.000.000-00'
        });
      }
      await logAudit('ANONIMIZE_CLIENT', { clientCpf: cpf }, profile.displayName || '', profile.organizationId);
      setSelectedClientCpf(null);
      showToast('Direito ao esquecimento aplicado com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao anonimizar cliente:", error);
      showToast('Erro ao aplicar direito ao esquecimento.', 'error');
    }
  };

  const handleToggleCard = async (cardId: string) => {
    const isHidden = localHiddenCards.includes(cardId);
    
    const newHiddenCards = isHidden 
      ? localHiddenCards.filter(id => id !== cardId)
      : [...localHiddenCards, cardId];

    // Otimista
    setLocalHiddenCards(newHiddenCards);

    if (profile.organizationId === 'sandbox-test') {
      sandboxService.setProfile({
        ...profile,
        dashboardPreferences: {
          hiddenCards: newHiddenCards
        }
      });
      return;
    }

    try {
      await setDoc(doc(db, 'users', profile.uid), {
        dashboardPreferences: {
          hiddenCards: newHiddenCards
        }
      }, { merge: true });
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar preferências', 'error');
      // Reverter estado caso dê erro
      setLocalHiddenCards(localHiddenCards);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      showToast('Erro ao sair do sistema.', 'error');
    }
  };

  const getEffectivenessColor = (rate: number, goal: number) => {
    if (rate >= goal) return 'text-emerald-400';
    if (rate >= goal * 0.75) return 'text-amber-400';
    return 'text-rose-400';
  };

  // 5. CÁLCULO DE DADOS COMPLEMENTARES PARA IMPRESSÃO DO RELATÓRIO
  const printTeamPerformance = useMemo(() => {
    if (selectedTeamId !== 'all') return [];
    return managedTeamsData.map(t => {
      const teamAgreements = monthAgreements.filter(a => {
        return a.teamId === t.id && !a.isAdjustment;
      });
      const totalProjected = teamAgreements.reduce((acc, curr) => acc + curr.value, 0);
      const totalPaid = teamAgreements.filter(a => a.status === AgreementStatus.PAID).reduce((acc, curr) => acc + curr.value, 0);
      const effectiveness = totalProjected > 0 ? (totalPaid / totalProjected) * 100 : 0;
      const goal = t.monthlyGoal || 0;
      const pctGoal = goal > 0 ? (totalPaid / goal) * 100 : 0;
      
      return {
        id: t.id,
        name: t.name,
        monthlyGoal: goal,
        totalProjected,
        totalPaid,
        effectiveness,
        pctGoal
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [managedTeamsData, monthAgreements, selectedTeamId]);

  const printOperatorRanking = useMemo(() => {
    if (selectedTeamId === 'all') return [];
    const members = viewMode === 'personal' ? [profile] : filteredTeamMembers;
    if (members.length === 0) return [];
    
    return members.map(m => {
      const opAgreements = monthFilteredAgreements.filter(a => a.operatorId === m.uid);
      const totalProjected = opAgreements.reduce((acc, curr) => acc + curr.value, 0);
      const totalPaid = opAgreements.filter(a => a.status === AgreementStatus.PAID).reduce((acc, curr) => acc + curr.value, 0);
      const countTotal = opAgreements.length;
      const countPaid = opAgreements.filter(a => a.status === AgreementStatus.PAID).length;
      const effectiveness = totalProjected > 0 ? (totalPaid / totalProjected) * 100 : 0;
      
      return {
        uid: m.uid,
        displayName: m.displayName || m.email.split('@')[0],
        jobTitle: m.jobTitle,
        totalProjected,
        totalPaid,
        countTotal,
        countPaid,
        effectiveness
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [selectedTeamId, viewMode, profile, filteredTeamMembers, monthFilteredAgreements]);

  // 6. RENDERIZAÇÃO PRINCIPAL DO LAYOUT
  const toggleRevealCpf = (id: string, cpf: string) => {
    const isRevealed = !!revealedCpfs[id];
    if (isRevealed) {
      setRevealedCpfs(prev => ({ ...prev, [id]: false }));
    } else {
      const skipWarning = localStorage.getItem('tracker-skip-lgpd-warning') === 'true';
      if (skipWarning) {
        setRevealedCpfs(prev => ({ ...prev, [id]: true }));
        logAudit('REVEAL_CPF', { agreementId: id, cpf, context: 'RevealOnScreen' }, profile.displayName || '', profile.organizationId);
        showToast('CPF revelado!', 'success');
      } else {
        setDontShowLgpdAgain(false); // Reseta a checkbox ao abrir
        setCpfToConfirm({ id, cpf, actionType: 'reveal' });
      }
    }
  };

  return (
    <div className="flex min-h-screen font-sans bg-slate-950 text-slate-100">
      {/* Sidebar de Navegação */}
      {!isPresentMode && (
        <Sidebar
          profile={profile}
          activeTab={dashboardTab}
          setActiveTab={(tab: any) => setDashboardTab(tab)}
          organizationName={organizationName}
          onLogoutClick={() => setIsConfirmLogoutOpen(true)}
        />
      )}

      {/* Área de Conteúdo Principal (Direita) */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar relative">
        <div className="no-print">
          {!isPresentMode && (
            <DashboardHeader 
              profile={profile}
              selectedTeamId={selectedTeamId}
              managedTeamsData={managedTeamsData}
              isPresentMode={isPresentMode}
              onSettingsClick={onSettingsClick}
              setIsTeamSelectorOpen={setIsTeamSelectorOpen}
              setIsConfirmLogoutOpen={setIsConfirmLogoutOpen}
              setIsWebhookSettingsOpen={setIsWebhookSettingsOpen}
              setIsImportCsvOpen={setIsImportCsvOpen}
              setIsReconciliationModalOpen={setIsReconciliationModalOpen}
              setIsModalOpen={setIsModalOpen}
              showToast={showToast}
              onSearchCpf={handleSearchCpf}
              onRefreshData={refreshAgreements}
              lastRefreshed={lastRefreshed}
              isRefreshing={isRefreshing}
              organizationName={organizationName}
              onSupportTabClick={() => setDashboardTab('support')}
              theme={theme}
              supervisors={supervisors}
              onLogoClick={() => {
                if (profile.role === 'backoffice') setDashboardTab('backoffice');
                else if (profile.role === 'monitor') setDashboardTab('qa');
                else setDashboardTab('financial');
              }}
            />
          )}

          <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-8 no-print">
            {/* Barra Superior Executiva (Meta, Filtros, Seletores) */}
            {dashboardTab === 'financial' && (
              <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 rounded-[2rem] border ${
                theme === 'dark' ? 'bg-slate-900/20 border-white/5' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Total do Mês e Meta Mensal */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
                    theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total do Mês (Pago)</span>
                    <span className="text-base font-black text-emerald-500 tabular-nums">{formatCurrency(stats.totalPaid)}</span>
                  </div>

                  <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
                    theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meta do Mês</span>
                    <span className="text-base font-black text-sky-500 tabular-nums">{formatCurrency(monthlyGoal)}</span>
                  </div>
                </div>

                {/* Controles do Painel Financeiro e Seletores de Data */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Seletores de Mês e Ano */}
                  <div className="flex gap-2 mr-2">
                    <div className="w-32">
                      <CustomSelect 
                        value={String(selectedMonth)}
                        onChange={(val) => setSelectedMonth(parseInt(val, 10))}
                        className="py-1.5 px-3 text-[10px] font-black uppercase tracking-widest"
                        options={MONTHS.map((month, index) => ({ value: String(index), label: month }))}
                      />
                    </div>
                    <div className="w-24">
                      <CustomSelect 
                        value={String(selectedYear)}
                        onChange={(val) => setSelectedYear(parseInt(val, 10))}
                        className="py-1.5 px-3 text-[10px] font-black uppercase tracking-widest"
                        options={getYearRange().map(year => ({ value: String(year), label: String(year) }))}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPreferencesModalOpen(true)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    Personalizar
                  </button>
                  <button
                    onClick={togglePresentMode}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isPresentMode ? 'Sair do Modo TV' : 'Modo TV'}
                  </button>
                </div>
              </div>
            )}

          <AnimatePresence mode="wait">
            <motion.div
              key={dashboardTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-8"
            >
              {/* CONTEÚDO DA ABA FINANCEIRA */}
              {dashboardTab === 'financial' && (
                <div className="space-y-8">
                  {/* Notificação de Visão Individual Filtrada */}
                  {selectedMemberId !== 'all' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                      <div className="flex items-center gap-3.5">
                        {(() => {
                          const m = filteredTeamMembers.find(member => member.uid === selectedMemberId);
                          return (
                            <Avatar
                              displayName={m?.displayName || 'Operador'}
                              email={m?.email}
                              avatarStyle={m?.avatarStyle}
                              avatarSeed={m?.avatarSeed}
                              theme={theme}
                              size="sm"
                              className="w-9 h-9 border-sky-500/30 text-sky-400 bg-sky-500/20"
                            />
                          );
                        })()}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-sky-500">Modo de Visualização Individual</p>
                          <p className="text-sm font-bold text-white mt-0.5">
                            Você está verificando os resultados de: <span className="text-sky-400">{filteredTeamMembers.find(m => m.uid === selectedMemberId)?.displayName || 'Operador'}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMemberId('all')}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-lg shadow-sky-500/20 transition-all uppercase tracking-wider"
                      >
                        Voltar para Visão de Equipe
                      </button>
                    </div>
                  )}
                  {/* Agenda do Dia */}
                  {!localHiddenCards.includes('agendaDoDia') && (profile.role === 'member' || profile.role === 'backoffice') && (
                    <DailyAgendaSection
                      scheduledAgreements={filteredScheduledAgreements}
                      isLoading={isLoadingScheduled}
                      profile={profile}
                      currentTeamMembers={filteredTeamMembers}
                      selectedMemberId={selectedMemberId}
                      setSelectedMemberId={setSelectedMemberId}
                      viewMode={viewMode}
                      onAttend={(agreement) => {
                        setEditingAgreement(agreement);
                        setIsModalOpen(true);
                      }}
                      showToast={showToast}
                      theme={theme}
                    />
                  )}

                  {/* KPIs de Monitoramento */}
                  <StatsGrid 
                    stats={stats}
                    statTrends={statTrends}
                    monthlyGoal={monthlyGoal}
                    localHiddenCards={localHiddenCards}
                    formatCurrency={formatCurrency}
                    operatorQaScore={operatorQaScore}
                    onHelpClick={() => setIsHelpOpen(true)}
                  />

                  {/* Informações Financeiras, Metas e Ritmo da Organização */}
                  <FinancialPerformanceInsights
                    stats={stats}
                    monthlyGoal={monthlyGoal}
                    effectivenessGoal={effectivenessGoal}
                    workingDays={workingDays}
                    dailyGoal={dailyGoal}
                    viewMode={viewMode}
                    selectedTeamId={selectedTeamId}
                    currentTeamMembers={currentTeamMembers}
                    monthAgreements={monthAgreements}
                    profile={profile}
                    reconciliation={reconciliation}
                    setIsGoalModalOpen={setIsGoalModalOpen}
                    formatCurrency={formatCurrency}
                    getEffectivenessColor={getEffectivenessColor}
                  />

                  {/* Tabela de Liderança de Equipes se estiver no modo Macro */}
                  {viewMode === 'team' && selectedTeamId === 'all' && managedTeamsData.length > 0 && (
                    <section className="space-y-4">
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest pl-2">Performance Geral de Equipes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {printTeamPerformance.map((teamData) => (
                          <div key={teamData.id} className={`glass-card p-6 rounded-3xl border ${
                            theme === 'dark' ? 'border-white/5 bg-slate-900/10' : 'border-slate-200 bg-white'
                          } space-y-4`}>
                            <div className="flex justify-between items-center">
                              <h4 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{teamData.name}</h4>
                              <span className="text-xs text-sky-500 font-bold">{teamData.effectiveness.toFixed(1)}% Efetividade</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>Recuperado: {formatCurrency(teamData.totalPaid)}</span>
                                <span>Meta: {formatCurrency(teamData.monthlyGoal)}</span>
                              </div>
                              <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
                                <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, teamData.pctGoal)}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {viewMode === 'team' && selectedTeamId !== 'all' && filteredTeamMembers.length > 0 && (
                    <TeamPerformance 
                      agreements={monthFilteredAgreements.filter(a => teamsToWatch.includes(a.teamId))}
                      members={filteredTeamMembers}
                      dailyGoal={dailyGoal}
                      qaScores={qaScores}
                      selectedMemberId={selectedMemberId}
                      onSelectMember={setSelectedMemberId}
                    />
                  )}

                  {viewMode === 'personal' && (
                    <TeamPerformance 
                      agreements={memberFilteredAgreements}
                      members={[profile]}
                      dailyGoal={dailyGoal}
                      showRanking={false}
                      qaScores={qaScores}
                    />
                  )}

                  {/* Tabela Analítica de Acordos — visível apenas para operador e supervisor */}
                  {(profile.role === 'member' || profile.role === 'supervisor') && (
                  <section className="space-y-4">
                    <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-6 rounded-3xl border ${
                      theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className={`flex border px-4 py-3 rounded-2xl w-full sm:max-w-md ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <input 
                          type="text" 
                          placeholder="Pesquisar por cliente ou CPF..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`bg-transparent text-sm outline-none border-none w-full ${
                            theme === 'dark' ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          onClick={() => setIsChecklistMode(!isChecklistMode)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                            isChecklistMode 
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' 
                              : theme === 'dark'
                                ? 'bg-slate-800 text-slate-400 border-slate-700/50 hover:text-sky-400 hover:border-sky-500/30'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-sky-600 hover:border-sky-500/30'
                          }`}
                          title="Modo Conferência: Mostra apenas acordos vencendo hoje ou atrasados que ainda não foram conferidos."
                        >
                          <CheckSquare size={16} />
                          <span>{isChecklistMode ? 'Conferindo' : 'Verificar'}</span>
                          {stats.counts.checklist > 0 && !isChecklistMode && (
                            <span className="bg-sky-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold animate-pulse">
                              {stats.counts.checklist}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setFilterStatus(filterStatus === 'all' ? AgreementStatus.PAID : 'all')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            filterStatus === AgreementStatus.PAID 
                              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' 
                              : theme === 'dark'
                                ? 'bg-slate-800 text-slate-400 border-slate-700/50'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          Pagos
                        </button>
                        <button
                          onClick={() => setFilterStatus(filterStatus === 'all' ? AgreementStatus.WAITING : 'all')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            filterStatus === AgreementStatus.WAITING 
                              ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' 
                              : theme === 'dark'
                                ? 'bg-slate-800 text-slate-400 border-slate-700/50'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          Aguardando
                        </button>
                        <button
                          onClick={() => setFilterStatus(filterStatus === 'all' ? AgreementStatus.BROKEN : 'all')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            filterStatus === AgreementStatus.BROKEN 
                              ? 'bg-rose-500/20 text-rose-500 border-rose-500/20' 
                              : theme === 'dark'
                                ? 'bg-slate-800 text-slate-400 border-slate-700/50'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          Quebrados
                        </button>

                      </div>
                    </div>

                    <AgreementsTable 
                      paginatedAgreements={paginatedAgreements}
                      isLoading={isLoading}
                      revealedCpfs={revealedCpfs}
                      toggleRevealCpf={toggleRevealCpf}
                      onCopyCpf={handleCopyCpfRequest}
                      handleClientClick={handleClientClick}
                      handleEfetivar={handleEfetivar}
                      handleToggleChecked={handleToggleChecked}
                      setEditingAgreement={setEditingAgreement}
                      setIsModalOpen={setIsModalOpen}
                      handleDelete={handleDeleteRequest}
                      profile={profile}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      nextPage={nextPage}
                      prevPage={prevPage}
                      showToast={showToast}
                      theme={theme}
                    />
                  </section>
                  )}
                </div>
              )}

              {/* CONTEÚDO DA ABA DE GESTÃO DE EQUIPE */}
              {dashboardTab === 'people' && (
                <TeamManagementTab 
                  profile={profile}
                  currentTeamMembers={currentTeamMembers}
                  attendanceStatuses={attendanceStatuses}
                  quickNotesText={quickNotesText}
                  setQuickNotesText={setQuickNotesText}
                  handleAddNote={handleAddNote}
                  handleAttendanceChange={handleAttendanceChange}
                  handleOpenHistory={handleOpenHistory}
                  setIsPeopleReportOpen={setIsPeopleReportOpen}
                  agreements={monthAgreements}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  setSelectedMonth={setSelectedMonth}
                  setSelectedYear={setSelectedYear}
                  MONTHS={MONTHS}
                  getYearRange={getYearRange}
                  qaScores={qaScores}
                  theme={theme}
                />
              )}

              {/* CONTEÚDO DA ABA BALCÃO DE RECUPERAÇÃO */}
              {dashboardTab === 'recovery' && (
                <RecoveryPoolTab
                  profile={profile}
                  managedTeamsData={managedTeamsData}
                  showToast={showToast}
                  onAttend={(agreement) => {
                    setEditingAgreement(agreement);
                    setIsModalOpen(true);
                  }}
                  onTakeOverSuccess={() => {
                    doMarkStale();
                    refreshAgreements();
                  }}
                  theme={theme}
                />
              )}

              {/* CONTEÚDO DA ABA DE GESTÃO DE QUALIDADE (QA) */}
              {dashboardTab === 'qa' && (
                <QaDashboard
                  profile={profile}
                  currentTeamMembers={currentTeamMembers}
                  managedTeamsData={managedTeamsData}
                  agreements={monthAgreements}
                  attendanceStatuses={attendanceStatuses}
                  showToast={showToast}
                  theme={theme}
                />
              )}

              {/* CONTEÚDO DA ABA DE BI & ANALYTICS */}
              {dashboardTab === 'bi' && (
                <div className={`glass-card p-6 rounded-[2rem] border ${
                  theme === 'dark' ? 'border-white/5 bg-slate-900/10' : 'border-slate-200 bg-white shadow-sm'
                } space-y-6`}>
                  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4 ${
                    theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                  }`}>
                    <div>
                      <h2 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>BI & Analytics Avançado</h2>
                      <p className="text-xs text-slate-400 mt-1">Estatísticas, Sazonalidades e Projeções de Cobrança</p>
                    </div>
                    {/* Filtro Compacto de Período */}
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
                  </div>
                  <AdvancedInsights 
                    stats={stats}
                    formatCurrency={formatCurrency}
                  />
                </div>
              )}

              {/* CONTEÚDO DA ABA DE SUPORTE */}
              {dashboardTab === 'support' && (profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'supervisor') && (
                <SupportTab
                  profile={profile}
                  organizationId={profile.organizationId || ''}
                  organizationName={organizationName}
                  crmOrgId={crmOrgId}
                  crmClientId={crmClientId}
                  crmPublicToken={crmPublicToken}
                  showToast={showToast}
                  theme={theme}
                />
              )}

              {/* CONTEÚDO DA ABA DE BACK OFFICE / CARGA DE ACORDOS */}
              {(dashboardTab === 'backoffice' || dashboardTab === 'carga_acordos') && (
                <div className="space-y-8">
                  {/* Agenda do Dia para o Back Office */}
                  {!localHiddenCards.includes('agendaDoDia') && (profile.role === 'member' || profile.role === 'backoffice') && (
                    <DailyAgendaSection
                      scheduledAgreements={filteredScheduledAgreements}
                      isLoading={isLoadingScheduled}
                      profile={profile}
                      currentTeamMembers={filteredTeamMembers}
                      selectedMemberId={selectedMemberId}
                      setSelectedMemberId={setSelectedMemberId}
                      viewMode={viewMode}
                      onAttend={(agreement) => {
                        setEditingAgreement(agreement);
                        setIsModalOpen(true);
                      }}
                      showToast={showToast}
                      theme={theme}
                    />
                  )}

                  <BackOfficeTab 
                    profile={profile}
                    showToast={showToast}
                    theme={theme}
                    selectedTeamId={selectedTeamId}
                    onAttend={(agreement) => {
                      setEditingAgreement(agreement);
                      setIsModalOpen(true);
                    }}
                  />
                </div>
              )}

              {/* CONTEÚDO DA ABA DE METAS E CARTEIRAS */}
              {dashboardTab === 'portfolio' && (
                <PortfolioGoalsPanel 
                  profile={profile}
                  monthAgreements={monthAgreements}
                  currentTeamMembers={filteredTeamMembers}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  showToast={showToast}
                  selectedTeamId={selectedTeamId}
                  supervisors={supervisors}
                  managedTeamsData={managedTeamsData}
                />
              )}

              {/* CONTEÚDO DA ABA DE COORDENAÇÃO (COORDENADOR) */}
              {dashboardTab === 'coordination' && profile.role === 'coordinator' && (
                <div className="space-y-8">
                  {/* Cabeçalho */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-xl animate-fadeIn">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Handshake className="text-sky-400" size={24} weight="duotone" />
                        {activeTeamDrillDown ? `Detalhamento: ${managedTeamsData.find(t => t.id === activeTeamDrillDown)?.name}` : 'Painel de Coordenação Geral'}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        {activeTeamDrillDown 
                          ? 'Visualização individual de metas, faturamento e calendário mensal da equipe.' 
                          : 'Gerenciamento consolidado de performance, escalas diárias e movimentações organizacionais.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeTeamDrillDown && (
                        <button
                          onClick={() => setActiveTeamDrillDown(null)}
                          className="flex items-center gap-1.5 py-2 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/5"
                        >
                          <ArrowLeft size={16} />
                          Voltar para Equipes
                        </button>
                      )}
                      <button
                        onClick={() => setIsCalendarEventModalOpen(true)}
                        className="flex items-center gap-1.5 py-2 px-4 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                      >
                        <CalendarPlus size={16} />
                        Agendar Evento/Presença
                      </button>
                    </div>
                  </div>

                  {activeTeamDrillDown ? (
                    // --- VISÃO DRILL-DOWN DA EQUIPE ---
                    <>
                      {/* Performance dos Colaboradores */}
                      <div className="space-y-4 animate-fadeIn">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Performance dos Colaboradores</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {(() => {
                            const team = managedTeamsData.find(t => t.id === activeTeamDrillDown);
                            if (!team) return null;

                            const teamOps = filteredTeamMembers.filter(m => m.teamId === team.id && (m.role === 'member' || m.role === 'backoffice' || m.role === 'supervisor'));
                            const activeOps = teamOps.filter(m => m.role === 'member');
                            const teamGoal = team.monthlyGoal || 0;
                            // Dividir a meta igualmente entre os operadores ativos
                            const individualGoal = activeOps.length > 0 ? teamGoal / activeOps.length : teamGoal;

                            return teamOps.map(op => {
                              const opAgreements = monthAgreements.filter(a => a.createdBy === op.uid);
                              const paidAgreements = opAgreements.filter(a => a.status === AgreementStatus.PAID);
                              const totalProjected = opAgreements.reduce((acc, curr) => acc + curr.value, 0);
                              const totalPaid = paidAgreements.reduce((acc, curr) => acc + curr.value, 0);
                              
                              const effectiveness = totalProjected > 0 ? (totalPaid / totalProjected) * 100 : 0;
                              const goal = op.role === 'member' ? individualGoal : 0;
                              const goalPercent = goal > 0 ? Math.min((totalPaid / goal) * 100, 100) : 0;
                              const roleLabel = op.role === 'supervisor' ? 'Supervisor' : op.role === 'backoffice' ? 'Back Office' : 'Operador';

                              return (
                                <div key={op.uid} className="glass-card p-6 border border-white/5 hover:border-sky-500/30 transition-all group flex flex-col justify-between">
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-3">
                                        <Avatar
                                          displayName={op.displayName}
                                          email={op.email}
                                          avatarStyle={op.avatarStyle}
                                          avatarSeed={op.avatarSeed}
                                          theme={theme}
                                          size="sm"
                                        />
                                        <div>
                                          <h4 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">{op.displayName || op.email.split('@')[0]}</h4>
                                          <p className="text-[10px] text-slate-500 mt-0.5">{roleLabel}</p>
                                        </div>
                                      </div>
                                      <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${
                                        effectiveness >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      }`}>
                                        {effectiveness.toFixed(0)}% Efet.
                                      </span>
                                    </div>

                                    {op.role === 'member' && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-slate-400">Progresso da Meta</span>
                                          <span className="text-white font-bold">{goalPercent.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-white/5">
                                          <div 
                                            className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${goalPercent}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 text-xs">
                                    <div>
                                      <span className="text-[9px] uppercase tracking-widest text-slate-500 block">Recuperado</span>
                                      <span className="font-bold text-white block mt-0.5">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase tracking-widest text-slate-500 block">{op.role === 'member' ? 'Meta Individual' : 'Papel'}</span>
                                      <span className="font-bold text-slate-300 block mt-0.5">
                                        {op.role === 'member' 
                                          ? `R$ ${goal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                          : roleLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Calendário Mensal da Equipe */}
                      {(() => {
                        const team = managedTeamsData.find(t => t.id === activeTeamDrillDown);
                        if (!team) return null;
                        const teamOps = filteredTeamMembers.filter(m => m.teamId === team.id && (m.role === 'member' || m.role === 'supervisor' || m.role === 'backoffice'));
                        
                        return (
                          <AttendanceCalendarSection
                            collaborators={teamOps}
                            notes={allCollaborationNotes}
                            calendarEvents={allCalendarEvents}
                            onCellClick={handleCellClick}
                            theme={theme}
                          />
                        );
                      })()}
                    </>
                  ) : (
                    // --- VISÃO CONSOLIDADA DE TODAS AS EQUIPES ---
                    <>
                      {/* Painel Comparativo de Equipes */}
                      <div className="space-y-4 animate-fadeIn">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Painel Comparativo de Equipes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {managedTeamsData.map(team => {
                            const teamAgreements = monthAgreements.filter(a => a.teamId === team.id);
                            const paidAgreements = teamAgreements.filter(a => a.status === AgreementStatus.PAID);
                            const totalProjected = teamAgreements.reduce((acc, curr) => acc + curr.value, 0);
                            const totalPaid = paidAgreements.reduce((acc, curr) => acc + curr.value, 0);
                            
                            const effectiveness = totalProjected > 0 ? (totalPaid / totalProjected) * 100 : 0;
                            const goal = team.monthlyGoal || 0;
                            const goalPercent = goal > 0 ? Math.min((totalPaid / goal) * 100, 100) : 0;
                            const supervisor = supervisors.find(s => s.uid === team.supervisorId);

                            return (
                              <div 
                                key={team.id} 
                                onClick={() => setActiveTeamDrillDown(team.id)}
                                className="glass-card p-6 border border-white/5 hover:border-sky-500/40 hover:bg-white/[0.02] transition-all group flex flex-col justify-between cursor-pointer"
                              >
                                <div className="space-y-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">{team.name}</h4>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Supervisor: <span className="text-slate-300 font-medium">{supervisor?.displayName || supervisor?.email.split('@')[0] || 'Não atribuído'}</span>
                                      </p>
                                    </div>
                                    <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${
                                      effectiveness >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {effectiveness.toFixed(0)}% Efet.
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-400">Progresso da Meta</span>
                                      <span className="text-white font-bold">{goalPercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-white/5">
                                      <div 
                                        className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${goalPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 text-xs">
                                  <div>
                                    <span className="text-[9px] uppercase tracking-widest text-slate-500 block">Recuperado</span>
                                    <span className="font-bold text-white block mt-0.5">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase tracking-widest text-slate-500 block">Meta Mensal</span>
                                    <span className="font-bold text-slate-300 block mt-0.5">R$ {goal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* 3. Central de Transferências & Desligamentos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Transferências */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Central de Transferências</h3>
                      <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Selecionar Operador</label>
                          <CustomSelect 
                            value={selectedOperatorToTransfer}
                            onChange={(val) => setSelectedOperatorToTransfer(val)}
                            placeholder="-- Selecionar Operador --"
                            options={filteredTeamMembers.filter(m => m.role === 'member').map(op => {
                              const team = managedTeamsData.find(t => t.id === op.teamId);
                              return {
                                value: op.uid,
                                label: `${op.displayName || op.email.split('@')[0]} (Equipe atual: ${team?.name || 'Nenhuma'})`
                              };
                            })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Selecionar Equipe Destino</label>
                          <CustomSelect 
                            value={selectedTargetTeamForTransfer}
                            onChange={(val) => setSelectedTargetTeamForTransfer(val)}
                            placeholder="-- Selecionar Equipe --"
                            options={managedTeamsData.map(team => ({
                              value: team.id,
                              label: team.name
                            }))}
                          />
                        </div>

                        <button
                          disabled={!selectedOperatorToTransfer || !selectedTargetTeamForTransfer}
                          onClick={() => {
                            handleTransferOperator(selectedOperatorToTransfer, selectedTargetTeamForTransfer);
                            setSelectedOperatorToTransfer('');
                            setSelectedTargetTeamForTransfer('');
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                        >
                          <UserSwitch size={16} />
                          Transferir Operador
                        </button>
                      </div>
                    </div>

                    {/* Desligamentos */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Opção de Desligamento (Offboarding)</h3>
                      <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                          <ShieldWarning size={20} className="text-rose-400 shrink-0 mt-0.5" />
                          <div className="text-[11px] text-rose-300">
                            <strong className="block font-bold">Atenção Coordenador:</strong>
                            O desligamento removerá o colaborador do time e da organização. Esta ação é definitiva na simulação e na produção.
                          </div>
                        </div>

                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {/* Lista de Supervisores */}
                          {supervisors.map(sup => (
                            <div key={sup.uid} className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-white/5 rounded-xl text-xs">
                              <div>
                                <span className="font-bold text-white block">{sup.displayName || sup.email.split('@')[0]}</span>
                                <span className="text-[9px] text-purple-400 uppercase tracking-wider font-extrabold">Supervisor</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja desligar o Supervisor ${sup.displayName || sup.email}?`)) {
                                    handleDismissUser(sup.uid, sup.displayName || sup.email.split('@')[0], 'supervisor');
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-[9px] uppercase tracking-wider font-extrabold border border-rose-500/20 transition-all cursor-pointer"
                              >
                                Desligar
                              </button>
                            </div>
                          ))}

                          {/* Lista de Operadores */}
                          {filteredTeamMembers.filter(m => m.role === 'member').map(op => {
                            const team = managedTeamsData.find(t => t.id === op.teamId);
                            return (
                              <div key={op.uid} className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-white/5 rounded-xl text-xs">
                                <div>
                                  <span className="font-bold text-white block">{op.displayName || op.email.split('@')[0]}</span>
                                  <span className="text-[9px] text-slate-500">Operador • Equipe: {team?.name || 'Nenhuma'}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    if (confirm(`Tem certeza que deseja desligar o Operador ${op.displayName || op.email}?`)) {
                                      handleDismissUser(op.uid, op.displayName || op.email.split('@')[0], 'member');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-[9px] uppercase tracking-wider font-extrabold border border-rose-500/20 transition-all cursor-pointer"
                                >
                                  Desligar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      </div>

      {/* DEDICATED PRINT-ONLY LAYOUT (RELATÓRIO PDF EXECUTIVO) */}
      <div className="print-only p-8 bg-white text-slate-900 font-sans min-h-screen">
        {/* Cabeçalho Executivo */}
        <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-1">
              Relatório Executivo de Performance
            </h1>
            <p className="text-sm font-bold text-slate-700">
              {organizationName || 'Noverde'} {organizationCnpj && `| CNPJ: ${organizationCnpj}`}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-1">
            <p><strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Período:</strong> {getMonthName(selectedMonth)} de {selectedYear}</p>
            <p><strong>Emissor:</strong> {profile.displayName} ({profile.role === 'manager' ? 'Gerente' : profile.role === 'supervisor' ? 'Supervisor' : profile.role === 'monitor' ? 'Monitor' : 'Operador'})</p>
          </div>
        </div>

        {/* Filtros Ativos */}
        <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
          <p className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[10px]">Filtros Aplicados no Painel</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-600">
            <p><strong>Visão:</strong> {viewMode === 'personal' ? 'Pessoal' : 'Equipe'}</p>
            <p><strong>Equipe:</strong> {selectedTeamId === 'all' ? 'Todas' : (managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Equipe Selecionada')}</p>
            <p><strong>Operador:</strong> {selectedMemberId === 'all' ? 'Todos' : (filteredTeamMembers.find(m => m.uid === selectedMemberId)?.displayName || 'Selecionado')}</p>
            <p><strong>Filtro Status:</strong> {filterStatus === 'all' ? 'Todos' : filterStatus === 'paid' ? 'Pago' : filterStatus === 'waiting' ? 'Aguardando' : 'Quebrado'}</p>
          </div>
        </div>

        {/* Resumo Financeiro (KPIs) */}
        <div className="print-section mb-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-2 mb-4">
            Resumo Financeiro (Período)
          </h2>
          <table className="min-w-full text-xs text-slate-950">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="px-4 py-2 text-left">Indicador</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2 text-right">Acordos</th>
                <th className="px-4 py-2 text-left">Observações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2.5 font-bold">Meta Definida</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(monthlyGoal || 0)}</td>
                <td className="px-4 py-2.5 text-right">-</td>
                <td className="px-4 py-2.5 text-slate-600">Meta estipulada para o período de faturamento</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2.5 font-bold">Total Recuperado (Pago)</td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-bold">{formatCurrency(stats.totalPaid)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{stats.counts.month.paid}</td>
                <td className="px-4 py-2.5 text-slate-600">Acordos efetivamente quitados / pagos no mês</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2.5 font-bold">Total Aguardando</td>
                <td className="px-4 py-2.5 text-right text-amber-700 font-semibold">{formatCurrency(Math.max(0, stats.totalProjected - stats.totalPaid - stats.totalOverdue))}</td>
                <td className="px-4 py-2.5 text-right">{stats.counts.month.waiting}</td>
                <td className="px-4 py-2.5 text-slate-600">Acordos pendentes dentro do prazo de vencimento</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2.5 font-bold">Total Quebrado (Vencido)</td>
                <td className="px-4 py-2.5 text-right text-rose-700 font-semibold">{formatCurrency(stats.totalOverdue)}</td>
                <td className="px-4 py-2.5 text-right">{stats.counts.month.broken}</td>
                <td className="px-4 py-2.5 text-slate-600">Acordos não pagos até a data do vencimento</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2.5 font-bold">Total Projetado (Carteira)</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(stats.totalProjected)}</td>
                <td className="px-4 py-2.5 text-right">{stats.counts.month.total}</td>
                <td className="px-4 py-2.5 text-slate-600">Soma geral de todos os acordos cadastrados</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 font-bold">Atingimento da Meta (%)</td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900">{((stats.totalPaid / (monthlyGoal || 1)) * 100).toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right">-</td>
                <td className="px-4 py-2.5 text-slate-600">Percentual de cumprimento da meta mensal</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 font-bold">Taxa de Efetividade (%)</td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900">{((stats.totalPaid / (stats.totalProjected || 1)) * 100).toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right">-</td>
                <td className="px-4 py-2.5 text-slate-600">Percentual de conversão de acordos (Pago / Projetado)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabela de Rankings / Equipes ou Operadores */}
        {selectedTeamId === 'all' && printTeamPerformance.length > 0 && (
          <div className="print-section mb-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-2 mb-4">
              Ranking de Performance por Equipe
            </h2>
            <table className="min-w-full text-xs text-slate-950">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="px-4 py-2 text-left">Pos.</th>
                  <th className="px-4 py-2 text-left">Equipe</th>
                  <th className="px-4 py-2 text-right">Meta</th>
                  <th className="px-4 py-2 text-right">Recuperado</th>
                  <th className="px-4 py-2 text-right">Projetado</th>
                  <th className="px-4 py-2 text-right">Atingimento %</th>
                  <th className="px-4 py-2 text-right">Efetividade %</th>
                </tr>
              </thead>
              <tbody>
                {printTeamPerformance.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="px-4 py-2 font-bold">#{index + 1}</td>
                    <td className="px-4 py-2 font-semibold">{item.name}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.monthlyGoal)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700 font-bold">{formatCurrency(item.totalPaid)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.totalProjected)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{item.pctGoal.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right">{item.effectiveness.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedTeamId !== 'all' && printOperatorRanking.length > 0 && (
          <div className="print-section mb-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-2 mb-4">
              Ranking de Performance de Operadores (Equipe: {managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Selecionada'})
            </h2>
            <table className="min-w-full text-xs text-slate-950">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="px-4 py-2 text-left">Pos.</th>
                  <th className="px-4 py-2 text-left">Operador</th>
                  <th className="px-4 py-2 text-right">Acordos Pagos</th>
                  <th className="px-4 py-2 text-right">Valor Pago</th>
                  <th className="px-4 py-2 text-right">Acordos Projetados</th>
                  <th className="px-4 py-2 text-right">Valor Projetado</th>
                  <th className="px-4 py-2 text-right">Efetividade %</th>
                </tr>
              </thead>
              <tbody>
                {printOperatorRanking.map((item, index) => (
                  <tr key={item.uid} className="border-b border-slate-200">
                    <td className="px-4 py-2 font-bold">#{index + 1}</td>
                    <td className="px-4 py-2 font-semibold">
                      {item.displayName} {item.jobTitle && <span className="text-[10px] text-slate-500 font-normal">({item.jobTitle})</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{item.countPaid}</td>
                    <td className="px-4 py-2 text-right text-emerald-700 font-bold">{formatCurrency(item.totalPaid)}</td>
                    <td className="px-4 py-2 text-right">{item.countTotal}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.totalProjected)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{item.effectiveness.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabela Geral de Acordos */}
        <div className="print-section mb-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-2 mb-4">
            Demonstrativo Analítico de Acordos
          </h2>
          {filteredAgreements.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nenhum acordo cadastrado para os filtros selecionados.</p>
          ) : (
            <table className="min-w-full text-xs text-slate-950">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="px-4 py-2 text-left">Data Reg.</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">CPF</th>
                  <th className="px-4 py-2 text-left">Origem</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Vencimento</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.map((agreement) => {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const dueDate = parseLocalDate(agreement.dueDate);
                  const isBroken = agreement.status === AgreementStatus.BROKEN || 
                    (agreement.status === AgreementStatus.WAITING && dueDate < today);
                  
                  return (
                    <tr key={agreement.id} className="border-b border-slate-200">
                      <td className="px-4 py-2 text-slate-600">
                        {new Date(agreement.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {agreement.clientName}
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-600">
                        {maskCPF(agreement.clientCpf)}
                      </td>
                      <td className="px-4 py-2 uppercase tracking-tighter font-semibold text-[10px]">
                        {agreement.origin}
                      </td>
                      <td className="px-4 py-2">
                        {agreement.type === 'quitacao' ? 'Quitação' : 
                         agreement.type === 'parcelamento' ? 'Parcelamento' :
                         agreement.type === 'parcela_atrasada' ? 'Parc. Atrasada' : 
                         agreement.type === 'antecipacao' ? 'Antecipação' :
                         agreement.type === 'parcela_atual' ? 'Parc. Atual' : agreement.type}
                      </td>
                      <td className="px-4 py-2">
                        {(agreement.dueDate || '').split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatCurrency(agreement.value)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          agreement.status === AgreementStatus.PAID
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isBroken
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {agreement.status === AgreementStatus.PAID ? 'Pago' : isBroken ? 'Quebrado' : 'Aguardando'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Parecer Técnico e Bloco de Assinatura */}
        <div className="print-section mt-12 pt-8 border-t border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
          <div>
            <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[10px]">Observações / Parecer da Gestão</h3>
            <div className="border border-slate-200 rounded p-4 h-24 text-slate-400 italic">
              Espaço reservado para anotações manuais, justificativas ou parecer técnico da supervisão.
            </div>
          </div>
          <div className="flex flex-col justify-end items-center text-center">
            <div className="w-64 border-b border-slate-400 mb-2"></div>
            <p className="font-bold text-slate-800">{profile.displayName}</p>
            <p className="text-slate-600 text-[10px] uppercase tracking-wider">
              {profile.role === 'manager' ? 'Gerente Geral' : profile.role === 'supervisor' ? 'Supervisor de Equipe' : profile.role === 'monitor' ? 'Monitor de Qualidade' : 'Operador'}
            </p>
          </div>
        </div>
      </div>

      {/* Modais de Controle */}
      <DashboardModals
        profile={profile}
        selectedTeamId={selectedTeamId}
        showToast={showToast}
        supervisors={supervisors}
        managers={managers}

        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        editingAgreement={editingAgreement}
        setEditingAgreement={setEditingAgreement}
        handleAddOrEditAgreement={handleAddOrEditAgreement}

        isGoalModalOpen={isGoalModalOpen}
        setIsGoalModalOpen={setIsGoalModalOpen}
        handleUpdateGoal={handleUpdateGoal}
        monthlyGoal={monthlyGoal}
        effectivenessGoal={effectivenessGoal}

        selectedClientCpf={selectedClientCpf}
        setSelectedClientCpf={setSelectedClientCpf}
        clientHistory={clientHistory}
        isLoadingHistory={isLoadingHistory}
        handleAnonimizeClient={handleAnonimizeClient}

        isExportCpfModalOpen={isExportCpfModalOpen}
        setIsExportCpfModalOpen={setIsExportCpfModalOpen}
        executeExport={executeExport}

        isTermsModalOpen={isTermsModalOpen}
        handleAcceptTerms={handleAcceptTerms}

        isImportCsvOpen={isImportCsvOpen}
        setIsImportCsvOpen={setIsImportCsvOpen}
        onImportSuccess={() => {
          doMarkStale();
          refreshAgreements();
          setIsImportCsvOpen(false);
        }}

        isWebhookSettingsOpen={isWebhookSettingsOpen}
        setIsWebhookSettingsOpen={setIsWebhookSettingsOpen}
        webhookUrl={webhookUrl}
        setWebhookUrl={setWebhookUrl}

        isPreferencesModalOpen={isPreferencesModalOpen}
        setIsPreferencesModalOpen={setIsPreferencesModalOpen}
        localHiddenCards={localHiddenCards}
        handleToggleCard={handleToggleCard}

        isCollisionModalOpen={isCollisionModalOpen}
        setIsCollisionModalOpen={setIsCollisionModalOpen}
        collisionData={collisionData}
        setCollisionData={setCollisionData}
        saveAgreement={saveAgreement}

        isConfirmLogoutOpen={isConfirmLogoutOpen}
        setIsConfirmLogoutOpen={setIsConfirmLogoutOpen}
        handleLogout={handleLogout}

        isReconciliationModalOpen={isReconciliationModalOpen}
        setIsReconciliationModalOpen={setIsReconciliationModalOpen}
        stats={stats}
        reconciliation={reconciliation}
        handleSaveReconciliation={handleSaveReconciliation}
        handleDeleteReconciliation={handleDeleteReconciliation}
        monthAdjustments={monthAdjustments}
        handleDeleteAdjustment={handleDeleteAdjustment}
        monthAgreements={monthAgreements}
        handleUpdateAgreementStatus={handleUpdateAgreementStatus}
        handleCreateAgreementFromReconciliation={handleCreateAgreementFromReconciliation}

        selectedCollabForHistory={selectedCollabForHistory}
        setSelectedCollabForHistory={setSelectedCollabForHistory}
        collabNotesHistory={collabNotesHistory}
        isLoadingCollabHistory={isLoadingCollabHistory}

        isPeopleReportOpen={isPeopleReportOpen}
        setIsPeopleReportOpen={setIsPeopleReportOpen}
        currentTeamMembers={filteredTeamMembers}

        isTeamSelectorOpen={isTeamSelectorOpen}
        setIsTeamSelectorOpen={setIsTeamSelectorOpen}
        managedTeamsData={managedTeamsData}
        setSelectedTeamId={setSelectedTeamId}
      />

      {/* Modal Personalizado de Confirmação de Exclusão de Acordo */}
      {agreementIdToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setAgreementIdToDelete(null)} />
          <div className={`relative glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl border text-center space-y-4 ${
            theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash size={24} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Excluir Acordo</h3>
              <p className={`text-xs mt-1.5 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Você tem certeza que deseja excluir permanentemente este acordo? Esta ação não poderá ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAgreementIdToDelete(null)}
                className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  theme === 'dark' ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteAgreement}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {isAttendanceModalOpen && attendanceModalData && (
        <AttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setAttendanceModalData(null);
          }}
          collaboratorName={attendanceModalData.collab.displayName || attendanceModalData.collab.email.split('@')[0]}
          dateStr={attendanceModalData.dateStr}
          currentStatus={attendanceModalData.note?.attendanceStatus || ''}
          currentLateDuration={attendanceModalData.note?.lateDuration || ''}
          currentAbsenceReason={attendanceModalData.note?.absenceReason || ''}
          onSave={handleSaveAttendance}
          theme={theme}
        />
      )}

      {isCalendarEventModalOpen && (
        <CalendarEventModal
          isOpen={isCalendarEventModalOpen}
          onClose={() => setIsCalendarEventModalOpen(false)}
          teams={managedTeamsData}
          collaborators={filteredTeamMembers.filter(m => m.role === 'member' || m.role === 'supervisor' || m.role === 'backoffice')}
          onSave={handleSaveCalendarEvent}
          theme={theme}
        />
      )}
      {/* Modal Personalizado de Consentimento LGPD para Revelação/Cópia de CPF */}
      {cpfToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setCpfToConfirm(null)} />
          <div className={`relative glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl border text-center space-y-5 ${
            theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
              <ShieldWarning size={24} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Acesso a Dados Pessoais (LGPD)</h3>
              <p className={`text-xs mt-1.5 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Você está prestes a {cpfToConfirm.actionType === 'copy' ? 'copiar' : 'revelar'} o CPF completo do cliente. 
                Esta operação de acesso a informações sensíveis é rastreada e auditada no sistema para fins de conformidade jurídica.
              </p>
            </div>
            
            {/* Checkbox para não exibir aviso novamente */}
            <div className="flex items-center justify-center gap-2 select-none py-1">
              <input
                type="checkbox"
                id="dont-show-lgpd-again"
                checked={dontShowLgpdAgain}
                onChange={(e) => setDontShowLgpdAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500/20 cursor-pointer"
              />
              <label 
                htmlFor="dont-show-lgpd-again" 
                className={`text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                Não mostrar este aviso novamente
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCpfToConfirm(null)}
                className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  theme === 'dark' ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirmCpf}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                Confirmar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpDrawer 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        theme={theme}
        userRole={profile?.role}
      />
    </div>
  );
};

export default Dashboard;
