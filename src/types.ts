export enum AgreementStatus {
  WAITING = 'waiting',
  PAID = 'paid',
  BROKEN = 'broken'
}

export enum AgreementOrigin {
  SALESFORCE = 'salesforce',
  OKTOR = 'oktor',
  CALLIX = 'callix',
  WHATSAPP = 'whatsapp',
  WEBPHONE = 'webphone',
  QUITE_DIGITAL = 'quite_digital'
}

export enum AgreementType {
  QUITACAO = 'quitacao',
  PARCELAMENTO = 'parcelamento',
  PARCELA_ATRASADA = 'parcela_atrasada',
  ANTECIPACAO = 'antecipacao',
  PARCELA_ATUAL = 'parcela_atual'
}

export enum AgreementCategory {
  FIXA = 'fixa',
  VARIAVEL = 'variavel'
}

export type UserRole = 'supervisor' | 'member';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId?: string;
  managedTeams?: string[]; // Para supervisores que gerenciam múltiplos times
  jobTitle?: string;
  theme?: 'dark' | 'sky' | 'purple';
  hasSeenTour?: boolean;
  dashboardPreferences?: {
    hiddenCards: string[];
  };
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  supervisorId: string;
  inviteToken: string;
  monthlyGoal?: number;
  effectivenessGoal?: number;
  createdAt: string;
}

export interface Agreement {
  id: string;
  clientName: string;
  clientCpf: string;
  value: number;
  dueDate: string;
  status: AgreementStatus;
  origin: AgreementOrigin;
  type: AgreementType;
  category: AgreementCategory;
  phone?: string;

  operatorId: string; // Quem registrou
  teamId: string;     // A qual equipe pertence
  createdAt: string;
  paidAt?: string;
  lastCheckedAt?: string;
  isAdjustment?: boolean;
}

export interface DashboardStats {
  totalProjected: number;
  totalPaid: number;
  filteredPaidValue: number;
  totalOverdue: number;
  totalPendingToday: number;
  effectivenessRate: number;
  ticketAverage: number;
  remainingToGoal: number;
  projection: number;
  insights?: {
    avgTimeToPay: number;
    projection7d: number;
    performanceByOrigin: Record<string, { total: number; paid: number }>;
    ticketByType: Record<string, { total: number; count: number }>;
    cycleEfficiency: { morning: number; afternoon: number };
    earlyBreakRate: number;
  };
  counts: {
    month: {
      total: number;
      paid: number;
      waiting: number;
      broken: number;
      overdue: number;
      pendingToday: number;
    };
    filtered: {
      total: number;
      paid: number;
      waiting: number;
      broken: number;
      overdue: number;
    };
    today: number; // Volume de registros hoje
    checklist: number; // Quantidade de itens pendentes de conferência
  };
  hourlyDistribution: Record<number, number>;
}
export interface Reconciliation {
  id: string;
  userId: string;
  teamId: string;
  month: number;
  year: number;
  officialValue: number;
  trackerValue: number;
  difference: number;
  officialEffectiveness?: number;
  trackerEffectiveness?: number;
  differenceEffectiveness?: number;
  updatedAt: string;
}
