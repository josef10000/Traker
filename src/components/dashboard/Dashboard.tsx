import React, { useState, useMemo, useEffect } from 'react';
import { 
  PieChart as PieIcon, 
  LogOut, 
  Plus, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  Target, 
  Loader2, 
  Edit3, 
  Trash2, 
  Check,
  User as UserIcon,
  UserPlus,
  Users,
  X,
  AlertCircle,
  Trophy,
  TrendingUp,
  Link as LinkIcon,
  History,
  ArrowLeftRight,
  Clock,
  FileDown,
  ArrowUpDown,
  Sun,
  Moon,
  AlertTriangle,
  Zap,
  Clock3,
  BarChart3,
  CalendarDays,
  MousePointer2,
  Settings,
  Tv,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  where,
  getDocFromServer
} from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { auth, db } from '../../lib/firebase';
import { 
  Agreement, 
  AgreementStatus, 
  AgreementOrigin, 
  AgreementType,
  DashboardStats, 
  UserProfile, 
  Team 
} from '../../types';
import { getTeamData, getTeamMembers, removeTeamMember } from '../../lib/teams';
import { formatCurrency } from '../../utils/masks';
import { StatCard } from './StatCard';
import { FilterButton } from './FilterButton';
import { ConfirmModal } from '../modals/ConfirmModal';
import { TeamPerformance } from './TeamPerformance';
import { OriginBadge } from './OriginBadge';
import { AgreementModal } from '../modals/AgreementModal';
import { startTour } from '../../utils/tour';
import { GoalModal } from '../modals/GoalModal';
import { HistoryModal } from '../modals/HistoryModal';
import { DashboardPreferencesModal } from '../modals/DashboardPreferencesModal';
import { MONTHS, getMonthName, getYearRange } from '../../utils/date';
import { ToastType } from '../ui/Toast';
import { Celebration } from './Celebration';
interface DashboardProps {
  user: User;
  profile: UserProfile;
  onSettingsClick: () => void;
  showToast: (message: string, type?: ToastType) => void;
}
export const Dashboard = ({ user, profile, onSettingsClick, showToast }: DashboardProps) => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(50000);
  const [effectivenessGoal, setEffectivenessGoal] = useState<number>(85);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | AgreementStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [localHiddenCards, setLocalHiddenCards] = useState<string[]>(profile.dashboardPreferences?.hiddenCards || []);
  const [transferringMember, setTransferringMember] = useState<UserProfile | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'personal' | 'team'>(profile.role === 'supervisor' ? 'team' : 'personal');
  const [team, setTeam] = useState<Team | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ uid: string; name: string } | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all'>(profile.teamId || 'all');
  const [managedTeamsData, setManagedTeamsData] = useState<Team[]>([]);
  
  const [selectedMemberId, setSelectedMemberId] = useState<string | 'all'>('all');
  const [currentTeamMembers, setCurrentTeamMembers] = useState<UserProfile[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClientCpf, setSelectedClientCpf] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<Agreement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTVView, setActiveTVView] = useState<'stats' | 'ranking' | 'insights'>('stats');
  const [isCarouselActive, setIsCarouselActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (profile.dashboardPreferences?.hiddenCards) {
      setLocalHiddenCards(profile.dashboardPreferences.hiddenCards);
    }
  }, [profile.dashboardPreferences?.hiddenCards]);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsPresentMode(false);
      }
    }
  }, []);

  // Carousel Effect for TV Mode
  useEffect(() => {
    if (!isPresentMode || !isCarouselActive) {
      setActiveTVView('stats');
      return;
    }

    const views: ('stats' | 'ranking' | 'insights')[] = ['stats', 'ranking', 'insights'];
    const interval = setInterval(() => {
      setActiveTVView(prev => {
        const currentIndex = views.indexOf(prev);
        return views[(currentIndex + 1) % views.length];
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isPresentMode, isCarouselActive]);

  // Load Members when team changes
  useEffect(() => {
    if (selectedTeamId !== 'all') {
      getTeamMembers(selectedTeamId).then(setCurrentTeamMembers);
      setSelectedMemberId('all');
    } else {
      setCurrentTeamMembers([]);
      setSelectedMemberId('all');
    }
  }, [selectedTeamId]);
  // Load Managed Teams Info
  useEffect(() => {
    if (!profile.managedTeams || profile.managedTeams.length === 0) return;
    const loadTeamsData = async () => {
      const teams = await Promise.all(
        profile.managedTeams.map(id => getTeamData(id))
      );
      const validTeams = teams.filter((t): t is Team => t !== null);
      setManagedTeamsData(validTeams);
      // Atualiza metas baseado na seleção
      if (selectedTeamId === 'all') {
        const totalMonthly = validTeams.reduce((acc, t) => acc + (t.monthlyGoal || 0), 0);
        const avgEff = validTeams.length > 0 
          ? validTeams.reduce((acc, t) => acc + (t.effectivenessGoal || 85), 0) / validTeams.length
          : 85;
        setMonthlyGoal(totalMonthly || 50000);
        setEffectivenessGoal(Math.round(avgEff));
      } else {
        const currentTeam = validTeams.find(t => t.id === selectedTeamId);
        if (currentTeam) {
          setMonthlyGoal(currentTeam.monthlyGoal || 50000);
          setEffectivenessGoal(currentTeam.effectivenessGoal || 85);
        }
      }
    };
    loadTeamsData();
  }, [profile.managedTeams, selectedTeamId]);
  // Load Data based on selected team(s)
  useEffect(() => {
    const loadData = async () => {
      const teamsToWatch = selectedTeamId === 'all' 
        ? (profile.managedTeams || []) 
        : [selectedTeamId];
      if (teamsToWatch.length === 0) {
        setIsLoading(false);
        return;
      }
      // Load Settings (if single team)
      let unsubscribeSettings = () => {};
      if (selectedTeamId !== 'all') {
        const settingsRef = doc(db, 'settings', selectedTeamId);
        unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setMonthlyGoal(data.monthlyGoal || 50000);
            setEffectivenessGoal(data.effectivenessGoal || 85);
          }
        });
      }
      // Firestore Subscription for Agreements
      const q = query(
        collection(db, 'agreements'), 
        where('teamId', 'in', teamsToWatch),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribeAgreements = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
        setAgreements(data);
        setIsLoading(false);
      });
      return () => {
        unsubscribeSettings();
        unsubscribeAgreements();
      };
    };
    
    loadData();
  }, [selectedTeamId, profile.managedTeams]);
  // Handle Tour
  useEffect(() => {
    if (profile && !profile.hasSeenTour) {
      // Pequeno delay para garantir que o layout renderizou
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
  // Stats calculation
  const stats: DashboardStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Fonte Mensal (Sempre o mês selecionado)
    const monthAgreements = agreements.filter(a => {
      const d = new Date(a.createdAt);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    
    // Fonte Filtrada (Tabela e Gráfico)
    let filtered = monthAgreements;
    // Filter by View Mode
    if (viewMode === 'personal') {
      filtered = filtered.filter(a => a.operatorId === profile.uid);
    } else if (selectedMemberId !== 'all') {
      filtered = filtered.filter(a => a.operatorId === selectedMemberId);
    }

    const timeFiltered = (() => {
      let f = filtered;
      if (dateFilter === 'today') {
        const t = new Date();
        t.setHours(0,0,0,0);
        f = f.filter(a => new Date(a.createdAt) >= t);
      } else if (dateFilter === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        y.setHours(0,0,0,0);
        const t = new Date();
        t.setHours(0,0,0,0);
        f = f.filter(a => {
          const d = new Date(a.createdAt);
          return d >= y && d < t;
        });
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const s = new Date(customStartDate + 'T00:00:00');
        const e = new Date(customEndDate + 'T23:59:59');
        f = f.filter(a => {
          const d = new Date(a.createdAt);
          return d >= s && d <= e;
        });
      }
      return f;
    })();

    // Cálculos Mensais
    const totalProjected = monthAgreements.reduce((acc, curr) => acc + curr.value, 0);
    const paidAgreementsMonth = monthAgreements.filter(a => a.status === AgreementStatus.PAID);
    const totalPaidMonth = paidAgreementsMonth.reduce((acc, curr) => acc + curr.value, 0);
    
    const overdueAgreementsMonth = monthAgreements.filter(a => 
      a.status === AgreementStatus.WAITING && 
      parseLocalDate(a.dueDate) < today
    );
    const totalOverdueMonth = overdueAgreementsMonth.reduce((acc, curr) => acc + curr.value, 0);
    const pendingTodayAgreementsMonth = monthAgreements.filter(a => 
      a.status === AgreementStatus.WAITING && 
      parseLocalDate(a.dueDate).getTime() === today.getTime()
    );
    const totalPendingTodayMonth = pendingTodayAgreementsMonth.reduce((acc, curr) => acc + curr.value, 0);

    // Cálculos Filtrados (Produtividade Diária)
    const paidAgreementsFiltered = timeFiltered.filter(a => a.status === AgreementStatus.PAID);
    const totalPaidFiltered = paidAgreementsFiltered.reduce((acc, curr) => acc + curr.value, 0);
    const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
    
    const agreementsToday = isCurrentMonth 
      ? monthAgreements.filter(a => new Date(a.createdAt) >= today)
      : [];

    return {
      totalProjected,
      totalPaid: totalPaidMonth,
      filteredPaidValue: totalPaidFiltered,
      totalOverdue: totalOverdueMonth,
      totalPendingToday: totalPendingTodayMonth,
      effectivenessRate: (totalPaidMonth / (totalProjected || 1)) * 100,
      counts: {
        month: {
          total: monthAgreements.length,
          paid: paidAgreementsMonth.length,
          waiting: monthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today).length,
          broken: monthAgreements.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)).length,
          overdue: overdueAgreementsMonth.length,
          pendingToday: pendingTodayAgreementsMonth.length,
        },
        filtered: {
          total: timeFiltered.length,
          paid: paidAgreementsFiltered.length,
          waiting: timeFiltered.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today).length,
          broken: timeFiltered.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)).length,
          overdue: timeFiltered.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today).length,
        },
        today: agreementsToday.length,
      },
      ticketAverage: monthAgreements.length > 0 ? totalProjected / monthAgreements.length : 0,
      remainingToGoal: Math.max(0, (monthlyGoal || 0) - totalPaidMonth),
      projection: (() => {
        if (!isCurrentMonth) return totalPaidMonth;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const dailyAvg = totalPaidMonth / currentDay;
        return dailyAvg * daysInMonth;
      })()
    };
  }, [agreements, selectedMonth, selectedYear, viewMode, profile.uid, selectedMemberId, dateFilter, customStartDate, customEndDate, monthlyGoal]);

  // Filtering Logic
  const monthFilteredAgreements = useMemo(() => {
    return agreements.filter(a => {
      const d = new Date(a.createdAt);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [agreements, selectedMonth, selectedYear]);
  const memberFilteredAgreements = useMemo(() => {
    let filtered = monthFilteredAgreements;
    
    // Filter by View Mode
    if (viewMode === 'personal') {
      filtered = filtered.filter(a => a.operatorId === profile.uid);
    } else if (selectedMemberId !== 'all') {
      filtered = filtered.filter(a => a.operatorId === selectedMemberId);
    }
    
    return filtered;
  }, [monthFilteredAgreements, viewMode, profile.uid, selectedMemberId]);
  const timeFilteredAgreements = useMemo(() => {
    let filtered = memberFilteredAgreements;
    
    // Filtro por Data
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
  const displayAgreements = useMemo(() => {
    let filtered = timeFilteredAgreements;
    
    // Filter by Search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const searchDigits = searchTerm.replace(/\D/g, '');
      
      filtered = filtered.filter(agreement => {
        const cpfDigits = agreement.clientCpf.replace(/\D/g, '');
        return (
          agreement.clientName.toLowerCase().includes(searchLower) ||
          agreement.clientCpf.includes(searchTerm) ||
          (searchDigits !== '' && cpfDigits.includes(searchDigits))
        );
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Filter by Status
    if (filterStatus !== 'all') {
      if (filterStatus === AgreementStatus.BROKEN) {
        filtered = filtered.filter(a => 
          a.status === AgreementStatus.BROKEN || 
          (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)
        );
      } else if (filterStatus === AgreementStatus.WAITING) {
        filtered = filtered.filter(a => 
          a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today
        );
      } else {
        filtered = filtered.filter(a => a.status === filterStatus);
      }
    }
    
    // Sort by createdAt
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    return filtered;
  }, [timeFilteredAgreements, searchTerm, filterStatus, sortOrder]);

  // Leaderboard Calculation
  const leaderboardData = useMemo(() => {
    const operatorStats: Record<string, { value: number; count: number }> = {};
    
    monthFilteredAgreements.forEach(a => {
      if (a.status === AgreementStatus.PAID) {
        if (!operatorStats[a.operatorId]) {
          operatorStats[a.operatorId] = { value: 0, count: 0 };
        }
        operatorStats[a.operatorId].value += a.value;
        operatorStats[a.operatorId].count += 1;
      }
    });

    return Object.entries(operatorStats)
      .map(([id, opStats]) => {
        const member = currentTeamMembers.find(m => m.uid === id);
        return {
          name: member?.displayName || 'Operador Externo',
          value: opStats.value,
          count: opStats.count
        };
      })
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [monthFilteredAgreements, currentTeamMembers]);

  // Check for Celebration
  useEffect(() => {
    if (stats.effectivenessRate >= 100 && !showCelebration) {
      setShowCelebration(true);
      // Reset after 10s to allow multiple celebrations if meta changes/updates
      const timer = setTimeout(() => setShowCelebration(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [stats.effectivenessRate, showCelebration]);

  // Chart Data
  const chartData = useMemo(() => [
    { name: 'Meta', value: monthlyGoal, color: 'url(#colorMeta)' },
    { name: 'Pago', value: stats.totalPaid, color: 'url(#colorPaid)' },
    { name: 'Vencido', value: stats.totalOverdue, color: 'url(#colorOverdue)' },
    { name: 'Pendente', value: Math.max(0, stats.totalProjected - stats.totalPaid - stats.totalOverdue), color: 'url(#colorPending)' }
  ], [monthlyGoal, stats]);
  const filteredAgreements = displayAgreements;
  const paginatedAgreements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAgreements.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAgreements, currentPage]);
  const totalPages = Math.ceil(filteredAgreements.length / itemsPerPage);
  const handleEfetivar = async (id: string) => {
    try {
      const agreementRef = doc(db, 'agreements', id);
      await updateDoc(agreementRef, { 
        status: AgreementStatus.PAID,
        paidAt: new Date().toISOString()
      });
      showToast('Acordo efetivado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao efetivar acordo.', 'error');
    }
  };
  const handleRemoveOperator = async (operatorId: string, operatorName: string) => {
    if (!window.confirm(`Deseja remover ${operatorName} da equipe?`)) return;
    try {
      await updateDoc(doc(db, 'users', operatorId), {
        teamId: null
      });
      showToast('Operador removido da equipe com sucesso!');
      setTransferringMember(null);
    } catch (error) {
      console.error(error);
      showToast('Erro ao remover operador.', 'error');
    }
  };
  const handleTransferOperator = async (operatorId: string, newTeamId: string, teamName: string) => {
    try {
      await updateDoc(doc(db, 'users', operatorId), {
        teamId: newTeamId
      });
      showToast(`Operador transferido para a equipe ${teamName}!`, 'success');
      setTransferringMember(null);
    } catch (error) {
      console.error(error);
      showToast('Erro ao transferir operador.', 'error');
    }
  };
  const confirmRemoveOperator = async () => {
    if (!memberToRemove) return;
    try {
      await removeTeamMember(memberToRemove.uid);
      setCurrentTeamMembers(prev => prev.filter(m => m.uid !== memberToRemove.uid));
      if (selectedMemberId === memberToRemove.uid) setSelectedMemberId('all');
      showToast('Membro removido com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao remover membro.', 'error');
    }
  };
  const handleToggleChecked = async (id: string, currentStatus: string | undefined) => {
    try {
      const isCurrentlyChecked = currentStatus && new Date(currentStatus).toLocaleDateString() === new Date().toLocaleDateString();
      await updateDoc(doc(db, 'agreements', id), {
        lastCheckedAt: isCurrentlyChecked ? null : new Date().toISOString()
      });
      showToast(isCurrentlyChecked ? 'Marcação de conferência removida.' : 'Acordo marcado como conferido hoje!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar conferência.', 'error');
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este acordo?')) return;
    try {
      await deleteDoc(doc(db, 'agreements', id));
    } catch (error) {
      console.error(error);
    }
  };
  const handleClientClick = (cpf: string) => {
    setSelectedClientCpf(cpf);
    setIsLoadingHistory(true);
    
    const q = query(
      collection(db, 'agreements'), 
      where('clientCpf', '==', cpf),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      setClientHistory(history);
      setIsLoadingHistory(false);
    });
    return () => unsubscribe();
  };
  const handleUpdateGoal = async (newGoal: number, newEffGoal: number) => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;
    
    try {
      await setDoc(doc(db, 'settings', targetTeamId), { 
        monthlyGoal: newGoal,
        effectivenessGoal: newEffGoal,
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

  const handleAddOrEditAgreement = async (data: any) => {
    if (!profile.teamId) return;
    
    try {
      if (editingAgreement) {
        const agreementRef = doc(db, 'agreements', editingAgreement.id);
        await updateDoc(agreementRef, {
          ...data,
          status: data.status || editingAgreement.status
        });
        showToast('Acordo atualizado com sucesso!', 'success');
      } else {
        const id = Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();
        const agreementData = {
          id,
          ...data,
          status: data.status || AgreementStatus.WAITING,
          operatorId: profile.uid,
          teamId: profile.teamId,
          createdAt: now,
          paidAt: data.status === AgreementStatus.PAID ? now : null
        };
        await setDoc(doc(db, 'agreements', id), agreementData);
        showToast('Acordo registrado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      setEditingAgreement(null);
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar acordo.', 'error');
    }
  };
  const handleExport = () => {
    const headers = ['Nome', 'CPF', 'Valor', 'Vencimento', 'Status', 'Origem', 'Tipo', 'Data Registro'];
    
    const csvContent = [
      headers.join(';'),
      ...filteredAgreements.map(a => [
        a.clientName,
        a.clientCpf,
        a.value.toString().replace('.', ','),
        a.dueDate.split('-').reverse().join('/'),
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
    
    showToast('Exportação concluída!', 'success');
  };
  const getEffectivenessColor = (rate: number, goal: number) => {
    if (rate >= goal) return 'text-emerald-400';
    if (rate >= goal * 0.75) return 'text-amber-400';
    return 'text-rose-400';
  };
  return (
    <div className="min-h-screen font-sans pb-20">
      {!isPresentMode && (
        <header className="glass-card sticky top-0 z-30 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-primary text-white p-2 rounded-lg shadow-lg shadow-primary/20 cursor-pointer" onClick={onSettingsClick}>
              <PieIcon size={24} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">RNV Gestão</h1>
              {profile.managedTeams && profile.managedTeams.length > 1 ? (
                <select 
                  id="team-selector"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="bg-transparent text-[10px] text-sky-400 uppercase tracking-widest font-bold mt-1 outline-none border-none cursor-pointer hover:text-sky-300 transition-colors"
                >
                  <option value="all" className="bg-slate-900 text-white">Visão Macro (Todas)</option>
                  {managedTeamsData.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">
                  {managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Dashboard Operacional'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            
            <div 
              id="user-profile-menu"
              className="flex items-center gap-3 px-3 py-1.5 glass-card rounded-xl cursor-pointer transition-all group"
              onClick={onSettingsClick}
            >
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">{profile.displayName}</span>
                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">{profile.jobTitle || 'Operador'}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <UserIcon size={16} />
              </div>
            </div>
            {profile.role === 'supervisor' && selectedTeamId !== 'all' && (
              <button 
                onClick={() => {
                  const currentTeam = managedTeamsData.find(t => t.id === selectedTeamId);
                    if (currentTeam) {
                      navigator.clipboard.writeText(currentTeam.inviteToken);
                      showToast(`Código de convite para ${currentTeam.name} copiado!`, 'success');
                    }
                }}
                className="p-2.5 text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-xl transition-all border border-transparent"
                title="Copiar Convite"
              >
                <UserPlus size={20} />
              </button>
            )}
            <button 
              onClick={() => signOut(auth)}
              className="p-2.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
            <button 
              id="new-agreement-btn"
              onClick={() => setIsModalOpen(true)}
              disabled={selectedTeamId === 'all'}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-400 transition-all shadow-lg shadow-primary/10 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Acordo</span>
            </button>
          </div>
        </div>
      </header>
      )}
      <main className={`flex-1 transition-all duration-700 relative ${isPresentMode ? 'p-12 bg-slate-950 min-h-screen' : 'p-4 md:p-6 pb-24 md:pb-6'}`}>
        <AnimatePresence>
          {isPresentMode && (
            <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
              <button
                onClick={() => setIsCarouselActive(!isCarouselActive)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all shadow-2xl ${
                  isCarouselActive 
                    ? 'bg-amber-500/80 border-amber-400 text-white animate-pulse' 
                    : 'bg-slate-900/80 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <RefreshCw size={16} className={isCarouselActive ? 'animate-spin' : ''} />
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  Carrossel: {isCarouselActive ? 'ON' : 'OFF'}
                </span>
              </button>

              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={togglePresentMode}
                className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-slate-300 px-4 py-2 rounded-full hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 transition-all shadow-2xl"
              >
                <X size={16} />
                <span className="text-[10px] uppercase tracking-widest font-bold">Sair da TV</span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showCelebration && <Celebration />}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {(!isPresentMode || activeTVView === 'stats') && (
            <motion.div
              key="stats-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto space-y-6"
            >
              <>
                {/* Header com Toggle de Visão (Apenas para Supervisores) */}
                {!isPresentMode && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                          {viewMode === 'personal' ? 'Meu Desempenho' : 'Gestão de Equipe'}
                        </h2>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setIsPreferencesModalOpen(true)}
                            className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors border border-transparent hover:border-sky-500/20"
                            title="Personalizar Visão"
                          >
                            <Settings size={20} />
                          </button>

                          <button
                            onClick={togglePresentMode}
                            className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20"
                            title="Modo Apresentação (TV)"
                          >
                            <Tv size={20} />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        {viewMode === 'personal' 
                          ? 'Acompanhe suas metas e acordos em tempo real' 
                          : 'Visão macro e detalhada da performance do time'}
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      <div className="flex glass-card p-1 rounded-xl shadow-2xl">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="bg-transparent text-xs font-bold text-slate-300 px-3 py-1.5 border-none outline-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                        >
                          {MONTHS.map((month, idx) => (
                            <option key={month} value={idx} className="bg-slate-900">{month}</option>
                          ))}
                        </select>
                        <div className="w-px h-4 bg-slate-800 self-center" />
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="bg-transparent text-xs font-bold text-slate-300 px-3 py-1.5 border-none outline-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                        >
                          {getYearRange().map(year => (
                            <option key={year} value={year} className="bg-slate-900">{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <section id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Total Projetado" 
                    value={formatCurrency(stats.totalProjected)} 
                    icon={DollarSign} 
                    color="primary"
                  />
                  <StatCard 
                    title="Produtividade" 
                    value={`${stats.effectivenessRate.toFixed(1)}%`} 
                    icon={TrendingUp} 
                    trend={stats.effectivenessRate >= effectivenessGoal ? "No Alvo" : ""}
                    color={stats.effectivenessRate >= effectivenessGoal ? "emerald" : "amber"}
                  />
                  <StatCard 
                    title="Falta p/ Meta" 
                    value={formatCurrency(stats.remainingToGoal)} 
                    icon={Target} 
                    color="rose"
                  />
                  <StatCard 
                    title="Projeção" 
                    value={formatCurrency(stats.projection)} 
                    icon={BarChart3} 
                    subtitle="Estimativa Mensal"
                    color="sky"
                  />
                </section>

                <section id="stats-grid-2" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Vencidos" 
                    value={formatCurrency(stats.totalOverdue)} 
                    icon={AlertTriangle} 
                    color="rose"
                  />
                  <StatCard 
                    title="Vencendo Hoje" 
                    value={formatCurrency(stats.totalPendingToday)} 
                    icon={Clock} 
                    color="amber"
                  />
                  <StatCard 
                    title="Volume" 
                    value={stats.counts.month.total} 
                    icon={Users} 
                    subtitle="Acordos Totais"
                    color="indigo"
                  />
                  <StatCard 
                    title="Ticket Médio" 
                    value={formatCurrency(stats.ticketAverage)} 
                    icon={Zap} 
                    color="emerald"
                  />
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 grid grid-cols-1 gap-4">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-6 rounded-2xl shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Meta de recuperação</h3>
                        <div className="flex items-end justify-between mb-4">
                          <span className="text-4xl font-black text-emerald-400">
                            {formatCurrency(stats.totalPaid)}
                          </span>
                          <span className="text-slate-500 font-bold text-sm mb-1">
                            de {formatCurrency(monthlyGoal)}
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="h-4 bg-slate-900 rounded-full overflow-hidden p-1">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(stats.effectivenessRate, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`h-full rounded-full ${stats.effectivenessRate >= 100 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-primary'}`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <span>Progresso</span>
                            <span className={stats.effectivenessRate >= 100 ? 'text-emerald-400' : ''}>
                              {stats.effectivenessRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <StatCard 
                      title="Recuperado (Filtro)" 
                      value={formatCurrency(stats.filteredPaidValue)} 
                      icon={CheckCircle2} 
                      subtitle={dateFilter === 'all' ? "Neste Mês" : "No Período"}
                      color="emerald"
                    />
                  </div>

                  <div className="lg:col-span-2 glass-card p-6 rounded-2xl shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    <TeamPerformance agreements={monthFilteredAgreements} members={currentTeamMembers} />
                  </div>
                </section>

                {!isPresentMode && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-2">
                        <FilterButton 
                          active={filterStatus === 'all'} 
                          onClick={() => setFilterStatus('all')}
                          label="Todos"
                          count={stats.counts.filtered.total}
                          colorClass="bg-slate-800 text-slate-400"
                        />
                        <FilterButton 
                          active={filterStatus === AgreementStatus.PAID} 
                          onClick={() => setFilterStatus(AgreementStatus.PAID)}
                          label="Pagos"
                          colorClass="bg-emerald-500/10 text-emerald-400"
                          count={stats.counts.filtered.paid}
                        />
                        <FilterButton 
                          active={filterStatus === AgreementStatus.WAITING} 
                          onClick={() => setFilterStatus(AgreementStatus.WAITING)}
                          label="Pendentes"
                          colorClass="bg-sky-500/10 text-sky-400"
                          count={stats.counts.filtered.waiting}
                        />
                        <FilterButton 
                          active={filterStatus === AgreementStatus.BROKEN} 
                          onClick={() => setFilterStatus(AgreementStatus.BROKEN)}
                          label="Vencidos"
                          colorClass="bg-rose-500/10 text-rose-400"
                          count={stats.counts.filtered.overdue}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            {stats.counts.filtered.total} Registros Encontrados
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'team' && selectedTeamId !== 'all' && selectedMemberId === 'all' && (
          <div className="mb-12">
            <TeamPerformance agreements={monthFilteredAgreements} members={currentTeamMembers} />
          </div>
        )}
        {viewMode === 'team' && selectedTeamId === 'all' && managedTeamsData.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-sky-400" />
                Resumo por Equipe
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {managedTeamsData.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-white group-hover:text-sky-400 transition-colors">{t.name}</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Meta: {formatCurrency(t.monthlyGoal)}</p>
                    </div>
                    {profile.teamId === t.id ? (
                      <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-emerald-500/20 flex items-center gap-1">
                        <Check size={12} />
                        Minha Equipe
                      </div>
                    ) : (
                      <div className="bg-primary/10 text-sky-400 p-2 rounded-lg">
                        <Target size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '0%' }} /> 
                    </div>
                    <span className="text-xs font-bold text-slate-300">0%</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Hoje</p>
                      <p className="text-sm font-bold text-sky-400">
                        {agreements.filter(a => a.teamId === t.id && new Date(a.createdAt).getTime() >= new Date().setHours(0,0,0,0)).length}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Mês</p>
                      <p className="text-sm font-bold text-white">
                        {agreements.filter(a => a.teamId === t.id && new Date(a.createdAt).getTime() >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()).length}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(t.inviteToken);
                        showToast(`Código de convite para ${t.name} copiado!`);
                      }}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <UserPlus size={12} />
                      Convite
                    </button>
                    
                    {profile.role === 'supervisor' && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newTeamId = profile.teamId === t.id ? null : t.id;
                          try {
                            await updateDoc(doc(db, 'users', profile.uid), { teamId: newTeamId });
                            showToast(newTeamId ? `Você agora faz parte da equipe ${t.name}!` : 'Vínculo com a equipe removido.');
                          } catch (error) {
                            showToast('Erro ao atualizar vínculo.', 'error');
                          }
                        }}
                        className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1 ${
                          profile.teamId === t.id 
                            ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' 
                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {profile.teamId === t.id ? (
                          <>
                            <X size={12} />
                            Desvincular
                          </>
                        ) : (
                          <>
                            <LinkIcon size={12} />
                            Vincular-me
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {selectedTeamId !== 'all' && viewMode === 'team' && currentTeamMembers.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtrar por Operador</h3>
              {selectedMemberId !== 'all' && (
                <button 
                  onClick={() => setSelectedMemberId('all')}
                  className="text-[10px] font-black text-sky-400 uppercase tracking-tighter hover:text-sky-300 transition-colors"
                >
                  Limpar Filtro
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-4">
              <button
                onClick={() => setSelectedMemberId('all')}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  selectedMemberId === 'all' 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Users size={14} />
                <span className="text-xs font-bold">Toda a Equipe</span>
              </button>
              {currentTeamMembers.map(member => (
                <div key={member.uid} className="relative group/member">
                  <button
                    onClick={() => setSelectedMemberId(member.uid)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                      selectedMemberId === member.uid 
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      selectedMemberId === member.uid ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {member.displayName[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold whitespace-nowrap">{member.displayName.split(' ')[0]}</span>
                  </button>
                  
                  {profile.role === 'supervisor' && member.uid !== profile.uid && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferringMember(member);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/member:opacity-100 transition-all hover:bg-sky-600 shadow-lg z-10"
                      title="Gerenciar Membro"
                    >
                      <ArrowLeftRight size={10} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {!isPresentMode && (
          <>
            <section className="mt-12 mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="relative group flex-1 w-full">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-400 transition-colors">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por Nome ou CPF..." 
              className="w-full bg-slate-950 border border-slate-800 pl-12 pr-6 py-4 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all text-slate-200 placeholder:text-slate-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-6 py-4 rounded-2xl hover:border-sky-500/50 transition-all group shrink-0 w-full md:w-auto"
            title={sortOrder === 'desc' ? 'Mudar para Mais Antigos' : 'Mudar para Mais Recentes'}
          >
            <ArrowUpDown size={18} className={sortOrder === 'desc' ? 'text-sky-400' : 'text-amber-400 rotate-180 transition-transform'} />
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Ordem de Lançamento</span>
              <span className="text-xs font-bold text-slate-200 mt-1">
                {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigos'}
              </span>
            </div>
          </button>
        </section>
        <section className="glass-card rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-500">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Origem</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Vencimento</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <span>Carregando acordos...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAgreements.map((agreement) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdue = agreement.status === AgreementStatus.WAITING && parseLocalDate(agreement.dueDate) < today;
                    const isBroken = agreement.status === AgreementStatus.BROKEN || isOverdue;
                    // Lógica de Ciclo (Manhã até 12:00, Tarde após 12:00)
                    const regDate = new Date(agreement.createdAt);
                    const isMorning = regDate.getHours() < 12;
                    const isCheckedToday = agreement.lastCheckedAt && 
                      new Date(agreement.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
                    // Lógica de Prioridade (Qualquer acordo criado antes de hoje que ainda esteja aguardando)
                    const isPriorityOntem = regDate < today && agreement.status === AgreementStatus.WAITING;
                    
                    // Lógica de Quebrado Ontem (Vencimento antes de hoje e ainda esperando)
                    const isBrokenOntem = isOverdue;
                    return (
                      <motion.tr 
                          key={agreement.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`group transition-colors relative border-l-4 ${
                            agreement.status === AgreementStatus.PAID 
                              ? 'bg-emerald-500/5 border-l-emerald-500/50' 
                              : isBroken
                                ? 'bg-rose-500/5 border-l-rose-500/50' 
                                : isCheckedToday
                                  ? 'bg-sky-500/5 border-l-sky-500/50'
                                  : isMorning 
                                    ? 'hover:bg-sky-500/5 border-l-sky-500/40 bg-slate-900/20' 
                                    : 'hover:bg-amber-500/5 border-l-amber-500/30 bg-slate-900/40'
                          }`}
                        >
                          <td className="px-6 py-5">
                            <div className="flex flex-col text-left">
                              <span className={`font-semibold text-slate-100 ${isBroken ? 'text-slate-500' : ''}`}>
                                {agreement.clientName}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(agreement.clientCpf.replace(/\D/g, ''));
                                    showToast('CPF (apenas números) copiado!', 'success');
                                  }}
                                  className="text-xs text-sky-400/70 font-mono hover:text-sky-400 transition-colors"
                                  title="Copiar CPF"
                                >
                                  {agreement.clientCpf}
                                </button>
                                <button 
                                  onClick={() => handleClientClick(agreement.clientCpf)}
                                  className="p-1 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-all"
                                  title="Ver Histórico"
                                >
                                  <History size={12} />
                                </button>
                                
                                {agreement.status === AgreementStatus.WAITING && (
                                  <div 
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                                      isMorning 
                                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    }`}
                                    title={isMorning ? 'Registrado no ciclo da manhã (Verificação Hoje)' : 'Registrado no ciclo da tarde (Verificação Amanhã)'}
                                  >
                                    {isMorning ? <Sun size={8} /> : <Moon size={8} />}
                                    {isMorning ? 'Ciclo Hoje' : 'Ciclo Seg.'}
                                  </div>
                                )}
                                {isCheckedToday && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-sky-500 text-white border border-sky-400">
                                    <Check size={8} strokeWidth={4} />
                                    Conferido
                                  </div>
                                )}
                                {isPriorityOntem && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-amber-500 text-white border border-amber-400">
                                    <Zap size={8} fill="currentColor" />
                                    Prioridade Ontem
                                  </div>
                                )}
                                {isOverdue && !isCheckedToday && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    <AlertTriangle size={8} />
                                    Vencimento Expirado
                                  </div>
                                )}
                                {isOverdue && isCheckedToday && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-rose-600 text-white border border-rose-500">
                                    <AlertTriangle size={8} />
                                    Confirmado: Quebrado
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <OriginBadge origin={agreement.origin} />
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-300 font-medium px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 w-fit">
                                {agreement.type === 'quitacao' ? 'Quitação' : 
                                 agreement.type === 'parcelamento' ? 'Parcelamento' :
                                 agreement.type === 'parcela_atrasada' ? 'Pcl Atrasada' : 
                                 agreement.type === 'antecipacao' ? 'Antecipação' : agreement.type}
                               </span>
                               {agreement.currentInstallment && (
                                 <span className="text-[10px] text-sky-400 font-bold mt-1 ml-1 uppercase tracking-tighter">
                                   Parcela: {agreement.currentInstallment}
                                 </span>
                               )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                                {agreement.dueDate.split('-').reverse().join('/')}
                              </span>
                              {isOverdue && (
                                <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Vencido</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-white tabular-nums">
                            {formatCurrency(agreement.value)}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {agreement.status === AgreementStatus.PAID ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 pr-2">
                                   <CheckCircle2 size={16} />
                                   <span className="text-xs font-bold uppercase tracking-wide">Pago</span>
                                </div>
                              ) : (
                                <>
                                  {isOverdue && (
                                    <div className="flex items-center gap-1 text-rose-500/40 mr-1 hidden sm:flex">
                                      <AlertCircle size={14} />
                                    </div>
                                  )}
                                  <button 
                                    onClick={() => handleEfetivar(agreement.id)}
                                    className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                    title="Efetivar Pagamento"
                                  >
                                    <Check size={18} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => handleToggleChecked(agreement.id, agreement.lastCheckedAt)}
                                    className={`p-2 rounded-lg transition-all border ${
                                      isCheckedToday 
                                        ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20' 
                                        : 'bg-slate-800 text-slate-400 hover:text-sky-400 hover:border-sky-500/50'
                                    }`}
                                    title={isCheckedToday ? 'Remover marcação de conferido' : 'Marcar como conferido hoje'}
                                  >
                                    <Search size={18} />
                                  </button>
                                </>
                              )}
                            <div className="flex items-center gap-1 border-l border-slate-800 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingAgreement(agreement);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 text-slate-500 hover:text-sky-400 hover:bg-primary/10 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(agreement.id)}
                                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </td>
                        </motion.tr>
                    );
                  })
                  )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/30">
              <p className="text-xs text-slate-500">
                Mostrando <span className="font-bold text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-slate-300">{Math.min(currentPage * itemsPerPage, filteredAgreements.length)}</span> de <span className="font-bold text-slate-300">{filteredAgreements.length}</span> acordos
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
              </div>
            )}
          </section>
          </>
        )}
      </main>
      <AgreementModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgreement(null);
        }}
        onSubmit={handleAddOrEditAgreement}
        editingAgreement={editingAgreement}
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
      />
      {/* Modal de Remanejamento */}
      <AnimatePresence>
        {transferringMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferringMember(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Gerenciar Membro</h2>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{transferringMember.displayName}</p>
                </div>
                <button 
                  onClick={() => setTransferringMember(null)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Transferir para Equipe</label>
                  <div className="grid grid-cols-1 gap-2">
                    {managedTeamsData
                      .filter(t => t.id !== profile.teamId)
                      .map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleTransferOperator(transferringMember.uid, team.id, team.name)}
                          className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all group text-left"
                        >
                          <div>
                            <p className="font-bold text-slate-200 group-hover:text-primary transition-colors">{team.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">ID: {team.id}</p>
                          </div>
                          <ArrowLeftRight size={18} className="text-slate-700 group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                    {managedTeamsData.filter(t => t.id !== profile.teamId).length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-4 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                        Nenhuma outra equipe disponível para transferência.
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800/50">
                  <button
                    onClick={() => handleRemoveOperator(transferringMember.uid, transferringMember.displayName)}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    <LogOut size={16} />
                    Remover da Equipe Atual
                  </button>
                  <p className="text-[9px] text-slate-600 text-center mt-3 uppercase font-bold">Ao remover, o membro voltará para o onboarding</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DashboardPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        hiddenCards={localHiddenCards}
        onToggleCard={handleToggleCard}
      />
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmRemoveOperator}
        title="Remover Membro"
        message={`Tem certeza que deseja remover ${memberToRemove?.name} desta equipe? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};
export default Dashboard;
