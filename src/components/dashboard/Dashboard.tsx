import React, { useState, useMemo, useEffect } from 'react';
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
  QaEvaluation
} from '../../types';
import { removeTeamMember, getTeamMembers } from '../../lib/teams';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { logAudit } from '../../lib/audit';
import { parseLocalDate, getMonthName, getWorkingDaysInMonth, getRemainingWorkingDays, MONTHS, getYearRange } from '../../utils/date';
import { triggerWebhook } from '../../utils/webhook';
import { addCollaborationNote, getCollaborationNotes, getAttendanceStatusForDay } from '../../lib/notes';
import { CheckSquare } from 'lucide-react';

// Hooks customizados
import { useAgreements } from '../../hooks/useAgreements';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useDashboardStats } from '../../hooks/useDashboardStats';

// Componentes extraídos
import { DashboardHeader } from './DashboardHeader';
import { StatsGrid } from './StatsGrid';
import { AdvancedInsights } from './AdvancedInsights';
import { AgreementsTable } from './AgreementsTable';
import { TeamManagementTab } from './TeamManagementTab';
import { DailyAgendaSection } from './DailyAgendaSection';
import { RecoveryPoolTab } from './RecoveryPoolTab';
import { QaDashboard } from './QaDashboard';

// Modais do sistema
import { AgreementModal } from '../modals/AgreementModal';
import { GoalModal } from '../modals/GoalModal';
import { HistoryModal } from '../modals/HistoryModal';
import { ExportCpfModal } from '../modals/ExportCpfModal';
import { TermsModal } from '../modals/TermsModal';
import { ImportCsvModal } from '../modals/ImportCsvModal';
import { WebhookSettingsModal } from '../modals/WebhookSettingsModal';
import { DashboardPreferencesModal } from '../modals/DashboardPreferencesModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { CollaboratorHistoryModal } from '../modals/CollaboratorHistoryModal';
import { PeopleReportModal } from '../modals/PeopleReportModal';
import { ReconciliationModal } from '../modals/ReconciliationModal';
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
  // Configurações e Filtros de Data/Status/Busca
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<'all' | AgreementStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Abas do Dashboard
  const [dashboardTab, setDashboardTab] = useState<'financial' | 'people' | 'recovery' | 'qa' | 'bi'>('financial');
  
  // Visualização e Seleção de Equipes
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all'>(profile.teamId || 'all');
  const [viewMode, setViewMode] = useState<'personal' | 'team'>((profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'monitor') ? 'team' : 'personal');
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

  // Seleção reativa de aba padrão para monitores
  useEffect(() => {
    if (profile?.role === 'monitor') {
      setDashboardTab('qa');
    }
  }, [profile?.role]);

  // 1. CARREGAMENTO DOS DADOS DE EQUIPES E MEMBROS VIA CUSTOM HOOK
  const {
    currentTeamMembers,
    setCurrentTeamMembers,
    managedTeamsData,
    selectedMemberId,
    setSelectedMemberId,
    loading: teamLoading
  } = useTeamMembers({ profile, selectedTeamId });

  // Lista de Equipes para monitorar acordos
  const teamsToWatch = useMemo(() => {
    if (selectedTeamId === 'all') {
      return managedTeamsData.map(t => t.id);
    }
    return [selectedTeamId];
  }, [selectedTeamId, managedTeamsData]);

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

  const operatorIdForAgreements = viewMode === 'personal' ? profile.uid : selectedMemberId;

  // 2. CARREGAMENTO DOS ACORDOS DA PÁGINA ATUAL E ESTATÍSTICAS DO MÊS VIA CUSTOM HOOK
  const {
    monthAgreements,
    paginatedAgreements,
    loading: agreementsLoading,
    currentPage,
    totalPages,
    nextPage,
    prevPage
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
    operatorId: operatorIdForAgreements
  });

  const isLoading = teamLoading || agreementsLoading;

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
    const settingsRef = doc(db, 'settings', selectedTeamId);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMonthlyGoal(data.monthlyGoal || 50000);
        setEffectivenessGoal(data.effectivenessGoal || 85);
      }
    });
    return () => unsubscribe();
  }, [selectedTeamId]);

  // Carrega informações da organização
  useEffect(() => {
    if (profile.organizationId) {
      getDoc(doc(db, 'organizations', profile.organizationId)).then(snap => {
        if (snap.exists()) {
          setWebhookUrl(snap.data().webhookUrl || '');
          setOrganizationName(snap.data().name || '');
          setOrganizationCnpj(snap.data().cnpj || '');
        }
      });
    }
  }, [profile.organizationId]);

  // Escuta presenças diárias na aba de colaboradores
  useEffect(() => {
    const loadAttendances = async () => {
      if (dashboardTab === 'people' && currentTeamMembers.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const statuses: Record<string, 'present' | 'late' | 'absent'> = {};
        
        await Promise.all(currentTeamMembers.map(async (m) => {
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
  }, [dashboardTab, currentTeamMembers]);

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

  // Exibe tour interativo se for primeiro login
  useEffect(() => {
    if (profile && !profile.hasSeenTour) {
      const timer = setTimeout(() => {
        startTour(profile.role, async () => {
          try {
            await updateDoc(doc(db, 'users', profile.uid), { hasSeenTour: true });
          } catch (e) {
            console.error("Erro ao salvar estado do tour:", e);
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile?.hasSeenTour]);

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
      await updateDoc(doc(db, 'users', profile.uid), { acceptedTermsAt: now });
      await logAudit('ACCEPT_TERMS', {}, profile.displayName || '');
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
    try {
      const agreementRef = doc(db, 'agreements', id);
      const now = new Date().toISOString();
      await updateDoc(agreementRef, { 
        status: AgreementStatus.PAID,
        paidAt: now
      });
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
        showToast('Acordo marcado como quebrado (conferência após o vencimento).', 'info');
      } else {
        await updateDoc(doc(db, 'agreements', id), {
          lastCheckedAt: isCurrentlyChecked ? null : new Date().toISOString()
        });
        showToast(isCurrentlyChecked ? 'Marcação de conferência removida.' : 'Acordo marcado como conferido!', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar conferência.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este acordo?')) return;
    try {
      await deleteDoc(doc(db, 'agreements', id));
      showToast('Acordo excluído com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao excluir acordo.', 'error');
    }
  };

  const handleClientClick = (cpf: string) => {
    setSelectedClientCpf(cpf);
  };

  const handleUpdateGoal = async (newGoal: number, newEffGoal: number) => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;
    
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

  const saveAgreement = async (data: any, targetTeamId: string, forced = false) => {
    try {
      const payload = forced ? { ...data, forcedCollision: true } : data;
      if (editingAgreement) {
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

        if (webhookUrl) {
          triggerWebhook(webhookUrl, 'agreement.created', agreementData, profile.organizationId);
          if (agreementData.status === AgreementStatus.PAID) {
            triggerWebhook(webhookUrl, 'agreement.paid', agreementData, profile.organizationId);
          }
        }

        if (forced) {
          await logAudit('FORCE_COLLISION', { cpf: data.clientCpf, agreementId: id }, profile.displayName || '');
        }
      }
      setIsModalOpen(false);
      setEditingAgreement(null);
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
      profile.displayName || ''
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
      showToast('Dados de conciliação atualizados com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar conciliação.', 'error');
    }
  };

  const handleDeleteReconciliation = async () => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

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
    } catch (error) {
      console.error(error);
      showToast('Erro ao apagar conciliação.', 'error');
    }
  };

  const handleDeleteAdjustment = async (agreementId: string) => {
    try {
      await deleteDoc(doc(db, 'agreements', agreementId));
      showToast('Ajuste de saldo apagado com sucesso! O saldo foi recalculado.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao apagar ajuste técnico.', 'error');
    }
  };

  const handleNormalizeSaldo = async (difference: number, officialEffectiveness?: number | null) => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

    try {
      const adjustmentData = {
        clientName: "Ajuste de Saldo Oficial",
        clientCpf: "000.000.000-00",
        value: difference,
        dueDate: new Date().toISOString().split('T')[0],
        status: AgreementStatus.PAID,
        origin: AgreementOrigin.SALESFORCE,
        type: AgreementType.QUITACAO,
        category: AgreementCategory.FIXA,
        operatorId: profile.uid,
        teamId: targetTeamId,
        organizationId: profile.organizationId,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        isAdjustment: true
      };

      await setDoc(doc(collection(db, 'agreements')), adjustmentData);
      
      const reconId = `${targetTeamId}_${selectedMonth}_${selectedYear}_${profile.uid}`;
      const reconUpdate: any = {
        trackerValue: stats.totalPaid + difference,
        difference: 0,
        updatedAt: new Date().toISOString()
      };

      if (officialEffectiveness !== undefined && officialEffectiveness !== null) {
        const trackerEff = stats.totalProjected > 0 ? ((stats.totalPaid + difference) / stats.totalProjected) * 100 : 0;
        reconUpdate.officialEffectiveness = officialEffectiveness;
        reconUpdate.trackerEffectiveness = trackerEff;
        reconUpdate.differenceEffectiveness = officialEffectiveness - trackerEff;
      }

      await updateDoc(doc(db, 'reconciliations', reconId), reconUpdate);
      showToast('Saldo normalizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao normalizar saldo.', 'error');
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
    if (!window.confirm('Tem certeza que deseja aplicar o Direito ao Esquecimento? Isso anonimizará permanentemente o nome do cliente e deletará dados pessoais sob a LGPD.')) {
      return;
    }
    
    try {
      const agreementsToAnon = monthAgreements.filter(a => a.clientCpf === cpf);
      for (const a of agreementsToAnon) {
        await updateDoc(doc(db, 'agreements', a.id), {
          clientName: 'Cliente Anonimizado (LGPD)',
          clientCpf: '000.000.000-00'
        });
      }
      await logAudit('ANONIMIZE_CLIENT', { clientCpf: cpf }, profile.displayName || '');
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

    // Atualização otimista imediata
    setLocalHiddenCards(newHiddenCards);

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
    const members = viewMode === 'personal' ? [profile] : currentTeamMembers;
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
  }, [selectedTeamId, viewMode, profile, currentTeamMembers, monthFilteredAgreements]);

  // 6. RENDERIZAÇÃO PRINCIPAL DO LAYOUT
  const revealedCpfs: Record<string, boolean> = {}; // Gerenciado localmente se necessário ou herdado por props
  const toggleRevealCpf = (id: string, cpf: string) => {
    // Implementação mock simples para re-uso na AgreementsTable
  };

  return (
    <div className="min-h-screen font-sans pb-20">
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
          />
        )}

        <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8 no-print">
          {/* Barra Superior Executiva (Abas, Meta, Filtros, Seletores) */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-900/20 p-6 rounded-[2rem] border border-white/5">
            {/* Abas e Meta Diária */}
            <div className="flex flex-wrap items-center gap-6">
              {(() => {
                const isSuperUser = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'super_admin' || profile.role === 'monitor';
                
                return (
                  <div className="flex flex-wrap bg-slate-950 p-1 rounded-2xl border border-white/5 gap-1">
                    {profile.role !== 'monitor' && (
                      <button
                        onClick={() => setDashboardTab('financial')}
                        className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          dashboardTab === 'financial' 
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Painel Financeiro
                      </button>
                    )}
                    {isSuperUser && profile.role !== 'monitor' && (
                      <button
                        onClick={() => setDashboardTab('people')}
                        className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          dashboardTab === 'people' 
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Gestão de Equipe
                      </button>
                    )}
                    {profile.role !== 'monitor' && (
                      <button
                        onClick={() => setDashboardTab('recovery')}
                        className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          dashboardTab === 'recovery' 
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Balcão de Recuperação
                      </button>
                    )}
                    <button
                      onClick={() => setDashboardTab('qa')}
                      className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        dashboardTab === 'qa' 
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Qualidade (QA)
                    </button>
                    <button
                      onClick={() => setDashboardTab('bi')}
                      className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        dashboardTab === 'bi' 
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      BI & Analytics
                    </button>
                  </div>
                );
              })()}
              
              {dashboardTab === 'financial' && (
                <div className="flex items-center gap-3 bg-slate-950 px-5 py-3 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meta do Dia</span>
                  <span className="text-base font-black text-emerald-400 tabular-nums">{formatCurrency(dailyGoal)}</span>
                </div>
              )}
            </div>

            {/* Controles do Painel Financeiro e Seletores de Data */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Seletores de Mês e Ano */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 shadow-2xl mr-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none border-none cursor-pointer px-3 py-2 hover:text-white transition-colors"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index} className="bg-slate-900 text-white">{month}</option>
                  ))}
                </select>
                <div className="w-[1px] h-4 bg-slate-800 my-auto" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none border-none cursor-pointer px-3 py-2 hover:text-white transition-colors"
                >
                  {getYearRange().map(year => (
                    <option key={year} value={year} className="bg-slate-900 text-white">{year}</option>
                  ))}
                </select>
              </div>

              {dashboardTab === 'financial' && (
                <>
                  <button
                    onClick={() => setIsPreferencesModalOpen(true)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/50"
                  >
                    Personalizar
                  </button>
                  <button
                    onClick={togglePresentMode}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/50"
                  >
                    {isPresentMode ? 'Sair do Modo TV' : 'Modo TV'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* CONTEÚDO DA ABA FINANCEIRA */}
          {dashboardTab === 'financial' && (
            <div className="space-y-8">
              {/* Agenda do Dia */}
              {!localHiddenCards.includes('agendaDoDia') && (
                <DailyAgendaSection
                  scheduledAgreements={filteredScheduledAgreements}
                  isLoading={isLoadingScheduled}
                  profile={profile}
                  currentTeamMembers={currentTeamMembers}
                  selectedMemberId={selectedMemberId}
                  setSelectedMemberId={setSelectedMemberId}
                  viewMode={viewMode}
                  onAttend={(agreement) => {
                    setEditingAgreement(agreement);
                    setIsModalOpen(true);
                  }}
                  showToast={showToast}
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
              />

              {/* Tabela de Liderança de Equipes se estiver no modo Macro */}
              {viewMode === 'team' && selectedTeamId === 'all' && managedTeamsData.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest pl-2">Performance Geral de Equipes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {printTeamPerformance.map((teamData) => (
                      <div key={teamData.id} className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-white text-base">{teamData.name}</h4>
                          <span className="text-xs text-sky-400 font-bold">{teamData.effectiveness.toFixed(1)}% Efetividade</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Recuperado: {formatCurrency(teamData.totalPaid)}</span>
                            <span>Meta: {formatCurrency(teamData.monthlyGoal)}</span>
                          </div>
                          <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, teamData.pctGoal)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Tabela Analítica de Acordos com Filtro de Busca */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex items-center bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl w-full sm:max-w-md">
                    <input 
                      type="text" 
                      placeholder="Pesquisar por cliente ou CPF..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent text-sm text-white outline-none border-none w-full placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => setIsChecklistMode(!isChecklistMode)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                        isChecklistMode 
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:text-sky-400 hover:border-sky-500/30'
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
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        filterStatus === AgreementStatus.PAID 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700/50'
                      }`}
                    >
                      Pagos
                    </button>
                    <button
                      onClick={() => setFilterStatus(filterStatus === 'all' ? AgreementStatus.WAITING : 'all')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        filterStatus === AgreementStatus.WAITING 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700/50'
                      }`}
                    >
                      Aguardando
                    </button>
                    <button
                      onClick={() => setFilterStatus(filterStatus === 'all' ? AgreementStatus.BROKEN : 'all')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        filterStatus === AgreementStatus.BROKEN 
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700/50'
                      }`}
                    >
                      Quebrados
                    </button>
                    <button
                      onClick={handleExportClick}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/50"
                    >
                      Exportar CSV
                    </button>
                  </div>
                </div>

                <AgreementsTable 
                  paginatedAgreements={paginatedAgreements}
                  isLoading={isLoading}
                  revealedCpfs={revealedCpfs}
                  toggleRevealCpf={toggleRevealCpf}
                  handleClientClick={handleClientClick}
                  handleEfetivar={handleEfetivar}
                  handleToggleChecked={handleToggleChecked}
                  setEditingAgreement={setEditingAgreement}
                  setIsModalOpen={setIsModalOpen}
                  handleDelete={handleDelete}
                  profile={profile}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  nextPage={nextPage}
                  prevPage={prevPage}
                  showToast={showToast}
                />
              </section>
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
              qaScores={qaScores}
            />
          )}

          {/* CONTEÚDO DA ABA BALCÃO DE RECUPERAÇÃO (Fase 3) */}
          {dashboardTab === 'recovery' && (
            <RecoveryPoolTab
              profile={profile}
              managedTeamsData={managedTeamsData}
              showToast={showToast}
              onAttend={(agreement) => {
                setEditingAgreement(agreement);
                setIsModalOpen(true);
              }}
            />
          )}

          {/* CONTEÚDO DA ABA DE GESTÃO DE QUALIDADE (QA) */}
          {dashboardTab === 'qa' && (
            <QaDashboard
              profile={profile}
              currentTeamMembers={currentTeamMembers}
              managedTeamsData={managedTeamsData}
              showToast={showToast}
            />
          )}

          {/* CONTEÚDO DA ABA DE BI & ANALYTICS (Fase 5 - Aba Separada) */}
          {dashboardTab === 'bi' && (
            <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-900/10 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">BI & Analytics Avançado</h2>
                  <p className="text-xs text-slate-400 mt-1">Estatísticas, Sazonalidades e Projeções de Cobrança</p>
                </div>
              </div>
              <AdvancedInsights 
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
                qaScores={qaScores}
              />
            </div>
          )}
        </main>
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
            <p><strong>Operador:</strong> {selectedMemberId === 'all' ? 'Todos' : (currentTeamMembers.find(m => m.uid === selectedMemberId)?.displayName || 'Selecionado')}</p>
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
      <AgreementModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgreement(null);
        }}
        onSubmit={handleAddOrEditAgreement}
        editingAgreement={editingAgreement}
        currentUserProfile={profile}
      />

      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSubmit={handleUpdateGoal}
        monthlyGoal={monthlyGoal}
        effectivenessGoal={effectivenessGoal}
      />

      <HistoryModal 
        isOpen={!!selectedClientCpf}
        onClose={() => setSelectedClientCpf(null)}
        clientCpf={selectedClientCpf}
        history={clientHistory}
        isLoading={isLoadingHistory}
        userName={profile.displayName}
        isSupervisor={profile.role === 'supervisor'}
        onAnonimize={handleAnonimizeClient}
      />

      <ExportCpfModal
        isOpen={isExportCpfModalOpen}
        onClose={() => setIsExportCpfModalOpen(false)}
        onExport={executeExport}
      />

      <TermsModal
        isOpen={isTermsModalOpen}
        onAccept={handleAcceptTerms}
      />

      <ImportCsvModal 
        isOpen={isImportCsvOpen} 
        onClose={() => setIsImportCsvOpen(false)} 
        profile={profile} 
        selectedTeamId={selectedTeamId} 
        onImportSuccess={() => setIsImportCsvOpen(false)} 
        showToast={showToast} 
      />

      {profile.role === 'super_admin' && (
        <WebhookSettingsModal 
          isOpen={isWebhookSettingsOpen} 
          onClose={() => setIsWebhookSettingsOpen(false)} 
          organizationId={profile.organizationId || ''} 
          currentWebhookUrl={webhookUrl} 
          onSaveSuccess={setWebhookUrl} 
          showToast={showToast} 
        />
      )}

      <DashboardPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        hiddenCards={localHiddenCards}
        onToggleCard={handleToggleCard}
      />

      <ConfirmModal
        isOpen={isCollisionModalOpen}
        onClose={() => setIsCollisionModalOpen(false)}
        onConfirm={async () => {
          if (collisionData) {
            await saveAgreement(collisionData.data, collisionData.targetTeamId, true);
            setIsCollisionModalOpen(false);
            setCollisionData(null);
          }
        }}
        title="Colisão de CPF Detectada"
        message="Este cliente possui outra negociação ativa (Pendente ou Retorno Agendado). Deseja forçar a criação deste acordo? Esta ação será registrada no histórico de auditoria."
        variant="warning"
        confirmText="Forçar Criação"
        cancelText="Voltar"
      />

      <ConfirmModal
        isOpen={isConfirmLogoutOpen}
        onClose={() => setIsConfirmLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Encerrar Sessão"
        message="Tem certeza que deseja sair do sistema? Suas alterações salvas não serão perdidas."
        variant="danger"
      />

      <ReconciliationModal 
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        trackerValue={stats.totalPaid}
        trackerProjected={stats.totalProjected}
        currentOfficialValue={reconciliation?.officialValue || 0}
        currentOfficialEffectiveness={reconciliation?.officialEffectiveness || 0}
        onSave={handleSaveReconciliation}
        onNormalize={handleNormalizeSaldo}
        onClear={handleDeleteReconciliation}
        adjustments={monthAdjustments}
        onDeleteAdjustment={handleDeleteAdjustment}
      />

      <CollaboratorHistoryModal 
        isOpen={selectedCollabForHistory !== null}
        onClose={() => setSelectedCollabForHistory(null)}
        collaboratorName={selectedCollabForHistory ? (selectedCollabForHistory.displayName || selectedCollabForHistory.email.split('@')[0]) : ''}
        notes={collabNotesHistory}
        isLoading={isLoadingCollabHistory}
      />

      <PeopleReportModal 
        isOpen={isPeopleReportOpen}
        onClose={() => setIsPeopleReportOpen(false)}
        orgId={profile.organizationId || ''}
        collaborators={currentTeamMembers}
      />
    </div>
  );
};

export default Dashboard;
