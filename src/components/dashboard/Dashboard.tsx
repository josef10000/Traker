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
  Calculator,
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
  CheckSquare,
  ChevronDown
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
  getDocFromServer,
  deleteField
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
  AgreementCategory,
  DashboardStats, 
  UserProfile, 
  Team,
  Reconciliation
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
import { ReconciliationModal } from '../modals/ReconciliationModal';
import { MONTHS, getMonthName, getYearRange, getWorkingDaysInMonth, getRemainingWorkingDays } from '../../utils/date';
import { ToastType } from '../ui/Toast';
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
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ uid: string; name: string } | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
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
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  
  const totalPaidMonth = useMemo(() => {
    return agreements
      .filter(a => {
        const d = new Date(a.createdAt);
        const isMonthMatch = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        const isStatusMatch = a.status === AgreementStatus.PAID;
        const isMemberMatch = viewMode === 'personal' 
          ? a.operatorId === profile.uid 
          : (selectedMemberId === 'all' || a.operatorId === selectedMemberId);
        return isMonthMatch && isStatusMatch && isMemberMatch && !a.isAdjustment;
      })
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [agreements, selectedMonth, selectedYear, viewMode, profile.uid, selectedMemberId]);

  const workingDays = useMemo(() => getWorkingDaysInMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const remainingWorkingDays = useMemo(() => getRemainingWorkingDays(selectedMonth, selectedYear), [selectedMonth, selectedYear]);

  const dailyGoal = useMemo(() => Math.max(0, (monthlyGoal || 0) - totalPaidMonth) / (remainingWorkingDays || 1), [monthlyGoal, totalPaidMonth, remainingWorkingDays]);

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
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  // Load Reconciliation Data
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
  // Filtering Logic
  const monthFilteredAgreements = useMemo(() => {
    return agreements.filter(a => {
      const d = new Date(a.createdAt);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [agreements, selectedMonth, selectedYear]);

  const monthAdjustments = useMemo(() => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    return agreements.filter(a => {
      if (!a.isAdjustment) return false;
      if (a.operatorId !== profile.uid) return false;
      if (a.teamId !== targetTeamId) return false;
      const d = new Date(a.createdAt);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [agreements, selectedMonth, selectedYear, profile.uid, selectedTeamId, profile.teamId]);
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
    // Se estiver no Modo Checklist, ignoramos o filtro de tempo (timeFilteredAgreements)
    // e usamos a base de membros filtrados para pegar todos os períodos.
    let filtered = isChecklistMode ? memberFilteredAgreements : timeFilteredAgreements;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter by Checklist Mode (Filtro Inteligente de Conferência)
    if (isChecklistMode) {
      filtered = filtered.filter(a => {
        const dueDate = parseLocalDate(a.dueDate);
        const isPending = a.status === AgreementStatus.WAITING;
        const wasCheckedToday = a.lastCheckedAt && 
          new Date(a.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
        
        const isOverdue = dueDate < today;
        const isDueToday = dueDate.getTime() === today.getTime();
        const wasCheckedAtAnyTime = !!a.lastCheckedAt;

        // Se vence hoje: mostra se não foi conferido hoje
        if (isDueToday) {
          return isPending && !wasCheckedToday;
        } 
        
        // Se já venceu (ontem ou antes): mostra apenas se NUNCA foi conferido
        if (isOverdue) {
          return isPending && !wasCheckedAtAnyTime;
        }

        return false;
      });
    }

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
    
    // Filter by Status (Ignorado se estiver no Modo Checklist para evitar conflitos)
    if (!isChecklistMode && filterStatus !== 'all') {
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

    // Ocultar registros de ajuste técnico da lista principal
    filtered = filtered.filter(a => !a.isAdjustment);

    return filtered;
  }, [isChecklistMode, memberFilteredAgreements, timeFilteredAgreements, searchTerm, filterStatus, sortOrder]);
  // Stats calculation
  const stats: DashboardStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Fonte Mensal (Sempre o mês selecionado)
    const monthAgreements = memberFilteredAgreements;
    
    // Fonte Filtrada (Tabela e Gráfico)
    const filteredAgreements = timeFilteredAgreements;

    // Filtrar apenas acordos reais para contagens e médias
    const realMonthAgreements = monthAgreements.filter(a => !a.isAdjustment);
    const realFilteredAgreements = filteredAgreements.filter(a => !a.isAdjustment);

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
    const paidAgreementsFiltered = filteredAgreements.filter(a => a.status === AgreementStatus.PAID);
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
          total: realMonthAgreements.length,
          paid: realMonthAgreements.filter(a => a.status === AgreementStatus.PAID).length,
          waiting: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today).length,
          broken: realMonthAgreements.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)).length,
          overdue: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today).length,
          pendingToday: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate).getTime() === today.getTime()).length,
        },
        filtered: {
          total: realFilteredAgreements.length,
          paid: realFilteredAgreements.filter(a => a.status === AgreementStatus.PAID).length,
          waiting: realFilteredAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today).length,
          broken: realFilteredAgreements.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)).length,
          overdue: realFilteredAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today).length,
        },
        today: realMonthAgreements.filter(a => new Date(a.createdAt) >= today).length,
        checklist: realMonthAgreements.filter(a => {
          const dueDate = parseLocalDate(a.dueDate);
          const wasCheckedToday = a.lastCheckedAt && 
            new Date(a.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
          const isOverdue = dueDate < today;
          const isDueToday = dueDate.getTime() === today.getTime();
          const wasCheckedAtAnyTime = !!a.lastCheckedAt;

          if (isDueToday) {
            return a.status === AgreementStatus.WAITING && !wasCheckedToday;
          }
          if (isOverdue) {
            return a.status === AgreementStatus.WAITING && !wasCheckedAtAnyTime;
          }
          return false;
        }).length,
      },
      ticketAverage: realMonthAgreements.length > 0 ? totalProjected / realMonthAgreements.length : 0,
      remainingToGoal: Math.max(0, (monthlyGoal || 0) - totalPaidMonth),
      
      // Advanced Insights
      insights: {
        avgTimeToPay: (() => {
          const paidWithTime = monthAgreements.filter(a => a.status === AgreementStatus.PAID && a.paidAt);
          if (paidWithTime.length === 0) return 0;
          const totalMs = paidWithTime.reduce((acc, a) => {
            const created = new Date(a.createdAt).getTime();
            const paid = new Date(a.paidAt!).getTime();
            return acc + Math.max(0, paid - created);
          }, 0);
          return totalMs / paidWithTime.length / (1000 * 60 * 60); // In hours
        })(),
        projection7d: (() => {
          const next7 = new Date(today);
          next7.setDate(today.getDate() + 7);
          return monthAgreements
            .filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today && parseLocalDate(a.dueDate) <= next7)
            .reduce((acc, curr) => acc + curr.value, 0);
        })(),
        performanceByOrigin: monthAgreements.reduce((acc, curr) => {
          const origin = curr.origin;
          if (!acc[origin]) acc[origin] = { total: 0, paid: 0 };
          acc[origin].total += curr.value;
          if (curr.status === AgreementStatus.PAID) acc[origin].paid += curr.value;
          return acc;
        }, {} as Record<string, { total: number; paid: number }>),
        ticketByType: monthAgreements.reduce((acc, curr) => {
          const type = curr.type;
          if (!acc[type]) acc[type] = { total: 0, count: 0 };
          acc[type].total += curr.value;
          acc[type].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>),
        cycleEfficiency: {
          morning: (() => {
            const morning = monthAgreements.filter(a => new Date(a.createdAt).getHours() < 12);
            if (morning.length === 0) return 0;
            return (morning.filter(a => a.status === AgreementStatus.PAID).length / morning.length) * 100;
          })(),
          afternoon: (() => {
            const afternoon = monthAgreements.filter(a => new Date(a.createdAt).getHours() >= 12);
            if (afternoon.length === 0) return 0;
            return (afternoon.filter(a => a.status === AgreementStatus.PAID).length / afternoon.length) * 100;
          })()
        },
        earlyBreakRate: (() => {
          const expiredWaiting = monthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today);
          if (expiredWaiting.length === 0) return 0;
          const checked = expiredWaiting.filter(a => a.lastCheckedAt && new Date(a.lastCheckedAt).toLocaleDateString() === today.toLocaleDateString());
          return (checked.length / expiredWaiting.length) * 100;
        })()
      },
      projection: (() => {
        if (!isCurrentMonth) return totalPaidMonth;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const dailyAvg = totalPaidMonth / currentDay;
        return dailyAvg * daysInMonth;
      })(),
      hourlyDistribution: filteredAgreements.reduce((acc, a) => {
        const hour = new Date(a.createdAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    };
  }, [timeFilteredAgreements, memberFilteredAgreements, monthlyGoal, selectedMonth, selectedYear]);
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

    const projectedData = Object.keys(trendData).map(day => ({
      day,
      value: trendData[parseInt(day)].projected
    }));

    const paidData = Object.keys(trendData).map(day => ({
      day,
      value: trendData[parseInt(day)].paid
    }));

    const overdueData = Object.keys(trendData).map(day => ({
      day,
      value: trendData[parseInt(day)].overdue
    }));

    const efficiencyData = Object.keys(trendData).map(day => {
      const dayData = trendData[parseInt(day)];
      return {
        day,
        value: dayData.projected > 0 ? (dayData.paid / dayData.projected) * 100 : 0
      };
    });

    return {
      projected: projectedData,
      paid: paidData,
      overdue: overdueData,
      efficiency: efficiencyData
    };
  }, [memberFilteredAgreements, selectedMonth, selectedYear]);

  const paidHeatmapData = useMemo(() => {
    const data: Record<number, { count: number; total: number; totalValue: number }> = {};
    memberFilteredAgreements
      .forEach(a => {
        const d = new Date(a.createdAt);
        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          const day = d.getDate();
          if (!data[day]) data[day] = { count: 0, total: 0, totalValue: 0 };
          data[day].total += 1;
          if (a.status === AgreementStatus.PAID) {
            data[day].count += 1;
            data[day].totalValue += a.value;
          }
        }
      });
    return data;
  }, [memberFilteredAgreements, selectedMonth, selectedYear]);

  const maxPaidPerDay = useMemo(() => {
    const values = (Object.values(paidHeatmapData) as any[]).map(d => d.count);
    return values.length > 0 ? Math.max(...(values as number[])) : 1;
  }, [paidHeatmapData]);

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
      month: selectedMonth,
      year: selectedYear,
      updatedAt: new Date().toISOString()
    };

    if (officialValue === null) {
      reconData.officialValue = deleteField();
      reconData.difference = deleteField();
      
      try {
        const adjustmentsToDelete = agreements.filter(a => {
          if (!a.isAdjustment) return false;
          if (a.operatorId !== profile.uid) return false;
          if (a.teamId !== targetTeamId) return false;
          
          const d = new Date(a.createdAt);
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        for (const adj of adjustmentsToDelete) {
          await deleteDoc(doc(db, 'agreements', adj.id));
        }
      } catch (e) {
        console.error("Erro ao remover ajustes ao apagar saldo:", e);
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
      // 1. Apaga a conciliação
      await deleteDoc(reconRef);

      // 2. Apaga quaisquer acordos de ajuste técnico vinculados a essa conciliação
      const adjustmentsToDelete = agreements.filter(a => {
        if (!a.isAdjustment) return false;
        if (a.operatorId !== profile.uid) return false;
        if (a.teamId !== targetTeamId) return false;
        
        const d = new Date(a.createdAt);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
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

  const handleNormalizeSaldo = async (difference: number) => {
    const targetTeamId = selectedTeamId === 'all' ? profile.teamId : selectedTeamId;
    if (!targetTeamId) return;

    try {
      // Cria um acordo especial de "Ajuste Técnico"
      const adjustmentData = {
        clientName: "Ajuste de Saldo Oficial",
        clientCpf: "000.000.000-00",
        value: Math.abs(difference),
        dueDate: new Date().toISOString().split('T')[0],
        status: AgreementStatus.PAID,
        origin: AgreementOrigin.SALESFORCE,
        type: AgreementType.QUITACAO,
        category: AgreementCategory.FIXA,
        operatorId: profile.uid,
        teamId: targetTeamId,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        isAdjustment: true // Flag interna
      };

      await setDoc(doc(collection(db, 'agreements')), adjustmentData);
      
      // Atualiza o registro de conciliação para zerar a diferença
      const reconId = `${targetTeamId}_${selectedMonth}_${selectedYear}_${profile.uid}`;
      await updateDoc(doc(db, 'reconciliations', reconId), {
        trackerValue: stats.totalPaid + difference,
        difference: 0,
        updatedAt: new Date().toISOString()
      });

      showToast('Saldo normalizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao normalizar saldo.', 'error');
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

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeamId || selectedTeamId === 'all') return;
    try {
      await removeTeamMember(memberId);
      showToast('Membro removido com sucesso!', 'success');
      // Recarregar membros
      const members = await getTeamMembers(selectedTeamId);
      setCurrentTeamMembers(members);
    } catch (error) {
      console.error(error);
      showToast('Erro ao remover membro.', 'error');
    }
  };

  const handleToggleChecked = async (id: string, currentStatus: string | undefined) => {
    try {
      const agreement = agreements.find(a => a.id === id);
      if (!agreement) return;

      const dueDate = parseLocalDate(agreement.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isCurrentlyChecked = currentStatus && new Date(currentStatus).toLocaleDateString() === new Date().toLocaleDateString();
      const isAfterDueDate = today > dueDate;

      // Se estiver conferindo após o vencimento, marcamos como BROKEN e registramos a data
      if (!isCurrentlyChecked && isAfterDueDate) {
        await updateDoc(doc(db, 'agreements', id), {
          status: AgreementStatus.BROKEN,
          lastCheckedAt: new Date().toISOString()
        });
        showToast('Acordo marcado como quebrado (conferência após o vencimento).', 'info');
      } else {
        // Se for no dia do vencimento ou se estiver removendo a marcação
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
            <div className="cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={onSettingsClick}>
              <img src="https://i.imgur.com/JPJTsAQ.png" alt="Tracker Logo" className="w-10 h-10 drop-shadow-lg" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">Tracker</h1>
              {profile.managedTeams && profile.managedTeams.length > 1 ? (
                <button 
                  onClick={() => setIsTeamSelectorOpen(true)}
                  className="flex items-center gap-1.5 text-[10px] text-sky-400 uppercase tracking-widest font-bold mt-1.5 hover:text-sky-300 transition-colors group"
                >
                  {selectedTeamId === 'all' 
                    ? 'Visão Macro (Todas)' 
                    : managedTeamsData.find(t => t.id === selectedTeamId)?.name || 'Selecionar Equipe'}
                  <ChevronDown size={12} className={`transition-transform duration-300 ${isTeamSelectorOpen ? 'rotate-180' : ''}`} />
                </button>
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
              onClick={() => setIsConfirmLogoutOpen(true)}
              className="p-2.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
            <button 
              onClick={() => setIsReconciliationModalOpen(true)}
              disabled={selectedTeamId === 'all'}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Conciliar com Sistema Oficial"
            >
              <Calculator size={18} className="text-sky-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Conciliar</span>
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
      <main className={`flex-1 transition-all duration-700 relative ${isPresentMode ? 'p-12 bg-slate-950 min-h-screen' : 'max-w-7xl mx-auto px-6 py-6 space-y-6'}`}>
        {/* Header com Toggle de Visão (Apenas para Supervisores) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
          {!isPresentMode && (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex glass-card p-1 rounded-xl shadow-2xl">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none border-none cursor-pointer px-3 py-2 hover:text-white transition-colors"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index} className="bg-slate-900 text-white">{month}</option>
                  ))}
                </select>
                <div className="w-[1px] h-4 bg-slate-800 my-auto" />
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none border-none cursor-pointer px-3 py-2 hover:text-white transition-colors"
                >
                  {getYearRange().map(year => (
                    <option key={year} value={year} className="bg-slate-900 text-white">{year}</option>
                  ))}
                </select>
              </div>
              {profile.role === 'supervisor' && (
                <div className="flex glass-card p-1 rounded-xl shadow-2xl">
                <button
                  onClick={() => setViewMode('personal')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'personal' 
                      ? 'bg-primary text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <UserIcon size={14} />
                  Pessoal
                </button>
                <button
                  onClick={() => setViewMode('team')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'team' 
                      ? 'bg-primary text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Users size={14} />
                  Equipe
                </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
        <section id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Projetado" 
            value={formatCurrency(stats.totalProjected)} 
            icon={DollarSign} 
            color="primary" 
            chartData={statTrends.projected}
            chartType="area"
          />
          <StatCard 
            title="Produtividade Diária (Pagos)" 
            value={formatCurrency(stats.filteredPaidValue)} 
            icon={TrendingUp} 
            color="emerald" 
            subtitle={`${stats.counts.filtered.paid} acordos pagos no período`}
            chartData={statTrends.paid}
            chartType="bar"
          />
          <StatCard 
            title="Falta para Meta" 
            value={formatCurrency(stats.remainingToGoal)} 
            icon={Target} 
            color="rose"
            subtitle={`${((stats.totalPaid / (monthlyGoal || 1)) * 100).toFixed(1)}% atingido`}
            chartData={[
              { name: 'Atingido', value: stats.totalPaid },
              { name: 'Restante', value: Math.max(0, monthlyGoal - stats.totalPaid) }
            ]}
            chartType="pie"
          />
          <StatCard 
            title="Projeção p/ Mês" 
            value={formatCurrency(stats.projection)} 
            icon={TrendingUp} 
            color="sky"
            subtitle="Baseado no ritmo atual"
            chartData={statTrends.paid}
            chartType="area"
          />
          
          <StatCard 
            id="overdue-card"
            title="Valores Vencidos" 
            value={formatCurrency(stats.totalOverdue)} 
            icon={AlertCircle} 
            color="rose"
            subtitle={`${stats.counts.month.overdue} acordos não pagos até ontem`}
            chartData={statTrends.overdue}
            chartType="bar"
          />
          <StatCard 
            title="Vencendo Hoje" 
            value={formatCurrency(stats.totalPendingToday)} 
            icon={Clock} 
            color="amber"
            subtitle={`${stats.counts.month.pendingToday} acordos pendentes p/ hoje`}
            chartData={statTrends.overdue}
            chartType="bar"
          />
          {!localHiddenCards.includes('cadastradosHoje') && (
            <StatCard 
              title="Volume de Registros" 
              value={stats.counts.today} 
              icon={CheckCircle2} 
              color="primary"
              subtitle="Acordos cadastrados hoje"
              chartData={statTrends.projected}
              chartType="area"
            />
          )}
          {!localHiddenCards.includes('ticketMedioGeral') && (
            <StatCard 
              title="Ticket Médio" 
              value={formatCurrency(stats.ticketAverage)} 
              icon={Target} 
              color="indigo"
              subtitle="Média por acordo registrado"
              chartData={statTrends.projected}
              chartType="bar"
            />
          )}
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 grid grid-cols-1 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-2xl shadow-xl relative group flex flex-col justify-center"
            >
              <button 
                onClick={() => setIsGoalModalOpen(true)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-all bg-slate-900/50 rounded-lg border border-slate-800"
              >
                <Target size={14} />
              </button>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Meta de recuperação</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    {((stats.totalPaid / (monthlyGoal || 1)) * 100).toFixed(1)}%
                  </h3>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taxa de Efetividade</p>
                  <p className={`text-xl font-bold ${getEffectivenessColor((stats.totalPaid / (stats.totalProjected || 1)) * 100, effectivenessGoal)}`}>
                    {((stats.totalPaid / (stats.totalProjected || 1)) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[8px] text-slate-500 font-medium uppercase mt-0.5">Base: {formatCurrency(stats.totalProjected)} projetado</p>
                  {reconciliation && reconciliation.officialEffectiveness !== undefined && reconciliation.officialEffectiveness !== null && reconciliation.officialEffectiveness > 0 && (
                    <div className="mt-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] text-emerald-400 font-bold inline-flex items-center leading-none">
                      Oficial: {reconciliation.officialEffectiveness.toFixed(1)}% 
                      <span className={`ml-1 font-extrabold ${reconciliation.differenceEffectiveness !== undefined && reconciliation.differenceEffectiveness >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        (Dif: {reconciliation.differenceEffectiveness !== undefined && reconciliation.differenceEffectiveness > 0 ? '+' : ''}{reconciliation.differenceEffectiveness?.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span>Progresso da Recuperação</span>
                  <span>Meta: {formatCurrency(monthlyGoal)}</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.totalPaid / (monthlyGoal || 1)) * 100, 100)}%` }}
                    className={`h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)]`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                   <span>Recuperado: {formatCurrency(stats.totalPaid)}</span>
                   <span>Faltam: {formatCurrency(Math.max(0, monthlyGoal - stats.totalPaid))}</span>
                </div>
              </div>
            </motion.div>

            {/* Novo Card de Meta Diária */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-2xl shadow-xl relative overflow-hidden group border-l-4 border-l-sky-500 flex flex-col justify-center"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Calculator size={40} className="text-sky-400" />
              </div>
              
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ritmo Necessário</p>
              <h4 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2 mb-4">
                Meta Diária
                <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[9px] border border-sky-500/20">
                  {workingDays} dias úteis
                </span>
              </h4>
              
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white tracking-tight">
                  {formatCurrency(dailyGoal)}
                </span>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 leading-relaxed">
                  Valor diário para atingir a meta de <br />
                  <span className="text-sky-400/70">{formatCurrency(monthlyGoal)}</span> no mês
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500/50 w-full animate-pulse" />
                </div>
                <TrendingUp size={12} className="text-sky-500/50" />
              </div>
            </motion.div>
          </div>
          <div id="performance-chart" className="glass-card p-6 rounded-2xl shadow-xl flex flex-col relative overflow-hidden group lg:col-span-2">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />
            
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Performance vs Meta
            </h4>
            
            <div className="flex-1 min-h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#334155" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1e293b" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #1e293b', 
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '12px' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40} animationDuration={1500}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 glass-card p-6 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl" />
            
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <TrendingUp size={16} className="text-sky-400" />
              Densidade de Acordos por Horário
            </h4>
            
            <div className="grid grid-cols-12 md:grid-cols-24 gap-1.5 h-32 items-end">
              {Array.from({ length: 24 }).map((_, hour) => {
                const count = stats.hourlyDistribution[hour] || 0;
                const counts = Object.values(stats.hourlyDistribution);
                const max = counts.length > 0 ? Math.max(...counts) : 1;
                const intensity = (count / max);
                
                return (
                  <div key={hour} className="flex flex-col gap-2 items-center flex-1 h-full justify-end group/item">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: count > 0 ? `${Math.max(10, intensity * 100)}%` : '4px' }}
                      className="w-full rounded-t-sm transition-all duration-500 relative"
                      style={{ 
                        backgroundColor: count > 0 
                          ? `rgba(14, 165, 233, ${0.3 + (intensity * 0.7)})` 
                          : 'rgba(30, 41, 59, 0.3)',
                        boxShadow: count > 0 ? `0 0 15px rgba(14, 165, 233, ${intensity * 0.4})` : 'none'
                      }}
                    >
                      {count > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-[9px] font-bold text-white px-1.5 py-0.5 rounded border border-slate-700 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {count} acordos
                        </div>
                      )}
                    </motion.div>
                    <span className="text-[7px] text-slate-500 font-bold uppercase">{hour}h</span>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 flex justify-between items-center border-t border-slate-800/50 pt-4">
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">
                Análise de produtividade temporal baseada em {stats.counts.filtered.total} registros
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-slate-500 uppercase font-bold">Intensidade:</span>
                <div className="flex gap-0.5">
                  {[0.2, 0.4, 0.6, 0.8, 1].map(v => (
                    <div key={v} className="w-2 h-2 rounded-sm" style={{ backgroundColor: `rgba(14, 165, 233, ${v})` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <StatCard 
              title="Aguardando" 
              value={stats.counts.month.waiting} 
              icon={Loader2} 
              color="amber"
              subtitle="Pendente Pagto"
            />
            <StatCard 
              title="Quebrados" 
              value={stats.counts.month.broken} 
              icon={X} 
              color="rose"
              subtitle="Faltas / Recusas"
            />
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <FilterButton 
                label="Total" 
                count={stats.counts.filtered.total} 
                colorClass="bg-slate-800 text-slate-400" 
                active={filterStatus === 'all'} 
                onClick={() => setFilterStatus('all')}
              />
              <FilterButton 
                label="Pagos" 
                count={stats.counts.filtered.paid} 
                colorClass="bg-emerald-500/10 text-emerald-400" 
                active={filterStatus === AgreementStatus.PAID} 
                onClick={() => setFilterStatus(AgreementStatus.PAID)}
              />
              <FilterButton 
                label="Aguardando" 
                count={stats.counts.filtered.waiting} 
                colorClass="bg-amber-500/10 text-amber-400" 
                active={filterStatus === AgreementStatus.WAITING} 
                onClick={() => setFilterStatus(AgreementStatus.WAITING)}
              />
              <FilterButton 
                label="Quebrados" 
                count={stats.counts.filtered.broken} 
                colorClass="bg-rose-500/10 text-rose-400" 
                active={filterStatus === AgreementStatus.BROKEN} 
                onClick={() => setFilterStatus(AgreementStatus.BROKEN)}
              />
            </div>

            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  dateFilter === 'all' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Tudo
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  dateFilter === 'today' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setDateFilter('yesterday')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  dateFilter === 'yesterday' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Ontem
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  dateFilter === 'custom' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Calendário
              </button>
            </div>
            
            <button
              onClick={handleExport}
              disabled={filteredAgreements.length === 0}
              className="flex items-center gap-2 bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar para Excel (CSV)"
            >
              <FileDown size={14} />
              Exportar
            </button>
          </div>
          <AnimatePresence>
            {dateFilter === 'custom' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Início:</span>
                    <input 
                      type="date" 
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none transition-all backdrop-blur-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fim:</span>
                    <input 
                      type="date" 
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none transition-all backdrop-blur-sm"
                    />
                  </div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                    Filtrando acordos registrados entre {customStartDate || '...'} e {customEndDate || '...'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!isPresentMode && (
          <section className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="relative group flex-1 w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-sky-400 transition-colors">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Buscar por Nome ou CPF..." 
                className="w-full bg-white/5 border border-white/10 pl-12 pr-6 py-4 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all text-white placeholder:text-white/30 outline-none backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setIsChecklistMode(!isChecklistMode)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-2xl shrink-0 w-full md:w-auto backdrop-blur-md ${
                isChecklistMode 
                  ? 'bg-sky-500 text-white border-sky-400' 
                  : 'bg-white/5 text-white/60 border-white/10 hover:text-sky-400 hover:border-sky-500/30'
              }`}
              title="Modo Conferência: Mostra apenas acordos vencendo hoje ou atrasados que ainda não foram conferidos."
            >
              <CheckSquare size={20} />
              <div className="flex flex-col items-start">
                <span className="leading-none">{isChecklistMode ? 'Conferindo' : 'Verificar'}</span>
                <span className="text-[8px] opacity-60 mt-0.5">{isChecklistMode ? 'Pendentes Hoje' : 'Pendentes'}</span>
              </div>
              {stats.counts.checklist > 0 && !isChecklistMode && (
                <span className="ml-2 bg-sky-500 text-white px-2 py-0.5 rounded-full text-[9px] animate-pulse border border-sky-400/50">
                  {stats.counts.checklist}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl hover:border-sky-500/50 transition-all group shrink-0 w-full md:w-auto backdrop-blur-sm"
              title={sortOrder === 'desc' ? 'Mudar para Mais Antigos' : 'Mudar para Mais Recentes'}
            >
              <ArrowUpDown size={18} className={sortOrder === 'desc' ? 'text-sky-400' : 'text-amber-400 rotate-180 transition-transform'} />
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">Ordem de Lançamento</span>
                <span className="text-xs font-bold text-white mt-1">
                  {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigos'}
                </span>
              </div>
            </button>
          </section>
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
                  className="glass-card p-5 rounded-2xl hover:border-primary/50 transition-all cursor-pointer group shadow-xl"
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
                    <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '0%' }} /> 
                    </div>
                    <span className="text-xs font-bold text-slate-300">0%</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Hoje</p>
                      <p className="text-sm font-bold text-sky-400">
                        {agreements.filter(a => a.teamId === t.id && new Date(a.createdAt).getTime() >= new Date().setHours(0,0,0,0)).length}
                      </p>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
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
                      className="py-2 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1"
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
                        : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30 backdrop-blur-sm'
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
        {/* Advanced Insights Section */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-sky-500/10 rounded-lg">
              <TrendingUp size={20} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Insights Analíticos</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Performance e Projeções</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ticket Médio p/ Tipo */}
            {!localHiddenCards.includes('ticketMedioTipo') && (
              <div 
                className="glass-card p-5 rounded-2xl border border-slate-800/50 hover:border-sky-500/30 transition-all group"
                title="Mostra o valor financeiro médio de cada tipo de negociação (Quitação, Parcelamento) fechada no período selecionado."
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <BarChart3 size={20} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ticket Médio</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.insights?.ticketByType || {}).slice(0, 3).map(([type, data]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 capitalize">
                        {type === 'quitacao' ? 'Quitação' : type === 'parcelamento' ? 'Parc.' : 'Outros'}
                      </span>
                      <span className="text-xs font-bold text-white">{formatCurrency(data.total / (data.count || 1))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Heatmap de Pagamentos */}
            {!localHiddenCards.includes('tempoMedioPagar') && (
              <div 
                className="glass-card p-5 rounded-2xl border border-slate-800/50 hover:border-emerald-500/30 transition-all group"
                title="Mapa de calor que mostra a distribuição dos pagamentos efetuados ao longo do mês selecionado."
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <CalendarDays size={20} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volume de Pagos</span>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-[7px] font-black text-slate-600 text-center uppercase">{d}</div>
                  ))}
                  {(() => {
                    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                    const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();
                    const days = [];
                    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
                    for (let i = 1; i <= daysInMonth; i++) days.push(i);
                    
                    return days.map((day, idx) => {
                      const dayData = day ? paidHeatmapData[day] : null;
                      const count = dayData?.count || 0;
                      const total = dayData?.total || 0;
                      const totalValue = dayData?.totalValue || 0;
                      const intensity = count / (maxPaidPerDay || 1);
                      
                      let heatClass = 'bg-white/5 text-slate-600';
                      if (day) {
                        if (count > 0) {
                          if (intensity > 0.8) heatClass = 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]';
                          else if (intensity > 0.5) heatClass = 'bg-emerald-500/60 text-white';
                          else if (intensity > 0.2) heatClass = 'bg-emerald-500/30 text-emerald-300';
                          else heatClass = 'bg-emerald-500/10 text-emerald-400';
                        }
                      }

                      return (
                        <div 
                          key={idx} 
                          className={`aspect-square rounded-[3px] flex items-center justify-center text-[8px] font-black transition-all ${day ? heatClass : 'opacity-0'}`}
                          title={day ? `${day}/${selectedMonth + 1}: ${count}/${total} pagos (${formatCurrency(totalValue)})` : ''}
                        >
                          {day}
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Intensidade</span>
                  <div className="flex gap-0.5">
                    {[0.1, 0.3, 0.6, 0.9].map(v => (
                      <div 
                        key={v} 
                        className="w-2 h-2 rounded-[1px]" 
                        style={{ backgroundColor: `rgba(16, 185, 129, ${v})` }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Projeção 7 Dias */}
            {!localHiddenCards.includes('projecao7Dias') && (
              <div 
                className="glass-card p-5 rounded-2xl border border-slate-800/50 hover:border-purple-500/30 transition-all group"
                title="Soma de todos os acordos que ainda aguardam pagamento e têm vencimento agendado para os próximos 7 dias."
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <CalendarDays size={20} className="text-purple-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Próximos 7 Dias</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-purple-400 tracking-tight">
                    {formatCurrency(stats.insights?.projection7d || 0)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Estimativa de entrada</span>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex-1 h-1 bg-slate-800 rounded-full">
                      <div className="h-full bg-purple-500 w-1/2 opacity-50" />
                    </div>
                    <span className="text-[10px] font-bold text-purple-400/50">Expectativa</span>
                  </div>
                </div>
              </div>
            )}
            {/* Eficiência por Ciclo */}
            {!localHiddenCards.includes('eficienciaCiclo') && (
              <div 
                className="glass-card p-5 rounded-2xl border border-slate-800/50 hover:border-sky-500/30 transition-all group"
                title="Compara a taxa de sucesso (conversão) dos acordos feitos no período da Manhã (antes das 12h) contra o período da Tarde (após 12h)."
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-sky-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Target size={20} className="text-sky-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Eficiência Ciclo</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-sky-400">Manhã</span>
                      <span className="text-white">{stats.insights?.cycleEfficiency?.morning.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${stats.insights?.cycleEfficiency?.morning}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-amber-500">Tarde</span>
                      <span className="text-white">{stats.insights?.cycleEfficiency?.afternoon.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${stats.insights?.cycleEfficiency?.afternoon}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        {viewMode === 'team' && selectedTeamId !== 'all' && selectedMemberId === 'all' && (
          <div className="mb-12">
            <TeamPerformance agreements={monthFilteredAgreements} members={currentTeamMembers} dailyGoal={dailyGoal} />
          </div>
        )}

        {viewMode === 'personal' && (
          <div className="mb-12">
            <TeamPerformance 
              agreements={memberFilteredAgreements} 
              members={[profile]} 
              dailyGoal={dailyGoal} 
              showRanking={false}
            />
          </div>
        )}

        <section className="glass-card rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-white/40">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Origem</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Vencimento</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </section>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-black text-white tracking-tight uppercase">Gerenciar Membro</h3>
                <button 
                  onClick={() => setTransferringMember(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 font-black text-xl">
                    {transferringMember.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-white leading-none">{transferringMember.name}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">Membro da Equipe</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">Ações de Gestão</p>
                  <button
                    onClick={() => {
                      if (window.confirm(`Tem certeza que deseja remover ${transferringMember.name} da equipe?`)) {
                        handleRemoveMember(transferringMember.id);
                        setTransferringMember(null);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-4 bg-rose-500/10 text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                  >
                    <Trash2 size={20} />
                    <span className="font-bold">Remover da Equipe</span>
                  </button>
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
        onToggleCard={(cardId) => {
          const newHidden = localHiddenCards.includes(cardId)
            ? localHiddenCards.filter(id => id !== cardId)
            : [...localHiddenCards, cardId];
          setLocalHiddenCards(newHidden);
          localStorage.setItem('dashboard_hidden_cards', JSON.stringify(newHidden));
        }}
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

      {/* Modal de Seleção de Equipe */}
      <AnimatePresence>
        {isTeamSelectorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTeamSelectorOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900/90 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col"
            >
              <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Selecionar Equipe</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gerencie a visão de performance por time</p>
                </div>
                <button 
                  onClick={() => setIsTeamSelectorOpen(false)}
                  className="p-3 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setSelectedTeamId('all');
                      setIsTeamSelectorOpen(false);
                    }}
                    className={`flex items-center justify-between p-6 rounded-[2rem] transition-all border group text-left ${
                      selectedTeamId === 'all' 
                        ? 'bg-sky-500 border-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.3)]' 
                        : 'bg-white/5 border-white/5 hover:border-sky-500/50 hover:bg-sky-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl transition-colors ${selectedTeamId === 'all' ? 'bg-white/20 text-white' : 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20'}`}>
                        <PieIcon size={28} />
                      </div>
                      <div>
                        <p className={`text-lg font-black tracking-tight ${selectedTeamId === 'all' ? 'text-white' : 'text-slate-200'}`}>Visão Macro</p>
                        <p className={`text-xs font-bold uppercase tracking-widest ${selectedTeamId === 'all' ? 'text-white/70' : 'text-slate-500'}`}>Resumo de todas as equipes</p>
                      </div>
                    </div>
                    {selectedTeamId === 'all' && <CheckCircle2 size={24} className="text-white" />}
                  </button>

                  {managedTeamsData.map(team => (
                    <button
                      key={team.id}
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setIsTeamSelectorOpen(false);
                      }}
                      className={`flex items-center justify-between p-6 rounded-[2rem] transition-all border group text-left ${
                        selectedTeamId === team.id 
                          ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                          : 'bg-white/5 border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl transition-colors ${selectedTeamId === team.id ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20'}`}>
                          <Users size={28} />
                        </div>
                        <div>
                          <p className={`text-lg font-black tracking-tight ${selectedTeamId === team.id ? 'text-white' : 'text-slate-200'}`}>{team.name}</p>
                          <p className={`text-xs font-bold uppercase tracking-widest ${selectedTeamId === team.id ? 'text-white/70' : 'text-slate-500'}`}>Meta: {formatCurrency(team.monthlyGoal)}</p>
                        </div>
                      </div>
                      {selectedTeamId === team.id && <CheckCircle2 size={24} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-8 bg-white/5 border-t border-white/5 text-center">
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Pressione ESC para fechar</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
