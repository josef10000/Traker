export enum AgreementStatus {
  WAITING = 'waiting',
  PAID = 'paid',
  BROKEN = 'broken',
  SCHEDULED = 'scheduled',
  RECOVERED = 'recovered'
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

export type UserRole = 'super_admin' | 'manager' | 'coordinator' | 'supervisor' | 'member' | 'monitor' | 'backoffice';

export interface Organization {
  id: string;
  name: string;
  cnpj?: string;
  status: 'active' | 'inactive' | 'pending';
  plan: 'free' | 'starter' | 'pro' | 'enterprise' | 'custom';
  planExpiresAt?: string;
  maxUsers: number;
  maxTeams: number;
  webhookUrl?: string;
  crmOrgId?: string;
  crmClientId?: string;
  crmPublicToken?: string;
  managerInviteToken?: string | null;
  supervisorInviteToken?: string | null;
  coordinatorInviteToken?: string | null;
  monitorInviteToken?: string | null;
  createdAt: string;
  closingConfig?: {
    enabled: boolean;
    closingDay: number;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId?: string;
  organizationId?: string; // Tenant ID no SaaS
  managedTeams?: string[]; // Para supervisores que gerenciam múltiplos times
  jobTitle?: string;
  theme?: 'dark' | 'sky' | 'purple';
  portfolio?: string;
  monthlyGoal?: number;
  monthlyServiceValue?: number; // Valor da prestação PJ mensal
  observation?: string;
  hasSeenTour?: boolean;
  managerId?: string | null;
  createdAt: string; // Aceite da LGPD no primeiro login
  startDate?: string; // Data oficial de início da contratação PJ
  acceptedTermsAt?: string; // Aceite da LGPD no primeiro login
  dashboardPreferences?: {
    hiddenCards: string[];
  };
  lastQaDate?: string;
  nextQaDate?: string;
  qaCycleStatus?: 'pending' | 'evaluated';
  avatarStyle?: string;
  avatarSeed?: string;
}

export interface QaSettings {
  id: string;
  organizationId: string;
  evaluationCycleDays: number;
  pdiObservationDays: number;
}

export interface Team {
  id: string;
  name: string;
  supervisorId: string | null;
  inviteToken: string;
  inviteTokenExpiresAt?: string; // Expiração do convite (LGPD/Segurança)
  organizationId: string;        // Vínculo com a empresa
  monthlyGoal?: number;
  effectivenessGoal?: number;
  supervisorInviteToken?: string | null;
  managerId?: string | null;
  createdAt: string;
}

export interface Agreement {
  id: string;
  clientName: string;
  clientCpf: string;
  value: number;       // Valor que conta nas métricas (entrada, se houver; ou parcela)
  dueDate: string;
  status: AgreementStatus;
  origin: AgreementOrigin;
  type: AgreementType;
  category: AgreementCategory;
  phone?: string;

  // Campos de Parcelamento
  installmentCount?: number;   // Quantidade de parcelas (informativo)
  hasEntry?: boolean;           // Se o parcelamento tem entrada
  installmentValue?: number;   // Valor de cada parcela (informativo — não conta nas métricas)

  operatorId: string; // Quem registrou
  teamId: string;     // A qual equipe pertence
  organizationId: string; // Vínculo com a empresa
  createdAt: string;
  paidAt?: string;
  lastCheckedAt?: string;
  isAdjustment?: boolean;
  notes?: string;
  scheduledAt?: string; // Data/Hora agendada para retorno
  forcedCollision?: boolean; // Bypass manual de colisão de CPF
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
  projectedMrr: number; // MRR futuro (colchão projetado)
  insights?: {
    avgTimeToPay: number;
    projection7d: number;
    performanceByOrigin: Record<string, { total: number; paid: number }>;
    ticketByType: Record<string, { total: number; count: number }>;
    cycleEfficiency: { morning: number; afternoon: number };
    earlyBreakRate: number;
    breakRatesByDilatedDays: Record<string, number>; // Dilação vs Quebra
    breakRateByCategory: { fixa: number; variavel: number }; // Categoria vs Quebra
    primeTimeDistribution: Record<number, number>; // Liquidez por hora
    heatmap31Days: { day: number; generation: number; liquidity: number }[]; // 31 dias calor
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
  todayPaidValue?: number;
  todayEffectiveness?: number;
}
export interface Reconciliation {
  id: string;
  userId: string;
  teamId: string;
  organizationId: string; // Vínculo com a empresa
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

export interface CollaborationNote {
  id: string;
  organizationId: string;
  collaboratorId: string;
  creatorId: string;
  creatorName: string;
  type: 'note' | 'attendance';
  content: string;
  attendanceStatus?: 'present' | 'late' | 'absent' | 'early_departure' | 'day_off' | 'vacation' | '';
  lateDuration?: string;
  absenceReason?: string;
  attendanceConfirmed?: boolean;
  confirmedAt?: string;
  createdAt: string;
}

export interface QaCompetence {
  id: string;
  organizationId: string;
  name: string;        // Nome da competência (Argumentação, LGPD, etc.)
  weight: number;      // Peso (padrão 1)
  description?: string;
}

export interface QaEvaluation {
  id: string;
  organizationId: string;
  operatorId: string;
  evaluatorId: string;
  score: number;             // Nota final (0 a 100)
  callId?: string;           // ID Ligação / Protocolo
  protocol?: string;         // Protocolo adicional
  callLink?: string;         // Link opcional
  grades: Record<string, number>; // ID Competência -> Nota (0 a 100)
  feedback: string;
  createdAt: string;
}

export interface Pdi {
  id: string;
  organizationId: string;
  operatorId: string;
  evaluatorId: string;
  competenceId: string;      // ID da competência do foco
  competenceName: string;    // Nome da competência do foco
  actionPlan: string;        // Plano de Ação
  dueDate: string;           // Vencimento do PDI
  status: 'pending' | 'completed' | 'failed' | 'expired';
  createdAt: string;
}

export interface BackOfficeNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface BackOfficeImport {
  id: string;
  organizationId: string;
  teamId: string;
  importedBy: string;
  importedByName: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  headers: string[];
  columnMapping: Record<string, string>;
  createdAt: string;
}

export interface BackOfficeClient {
  id: string;
  importId: string;
  organizationId: string;
  teamId: string;
  clientName: string;
  clientCpf: string;
  value: number;
  dueDate: string;
  customFields: Record<string, string>;
  notes: BackOfficeNote[];
  status: 'pending' | 'treated' | 'ignored';
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  organizationId: string;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  monthlyServiceValue?: number; // Valor da prestação PJ mensal
}

export interface TransferRequest {
  id: string;
  fromManagerId: string;
  fromManagerName: string;
  toManagerId: string;
  supervisorId: string;
  supervisorName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  organizationId: string;
  title: string;
  date: string; // YYYY-MM-DD
  targetType: 'team' | 'individual';
  targetId: string; // teamId ou collaboratorId
  createdBy: string;
  createdAt: string;
}

export interface MonthlyPayment {
  id: string;                    // Formato: userId_month_year
  userId: string;
  userName: string;
  role: 'member' | 'backoffice';
  teamId: string;
  organizationId: string;
  month: number;                 // 1 a 12
  year: number;
  baseValue: number;             // Valor PJ acordado no convite
  totalDays: number;             // Total de dias do mês calendário
  missedDays: number;            // Total de faltas registradas no calendário no período
  excusedDays: number;           // Total de faltas abonadas pelo coordenador
  excusedDates?: string[];       // Datas específicas das faltas que foram abonadas (ex: ["2026-06-12"])
  deductedValue: number;         // Valor final líquido: baseValue - ((baseValue/totalDays) * (missedDays - excusedDays))
  status: 'released' | 'invoice_issued' | 'contested';
  contestationText?: string;
  releasedAt: string;
  invoiceIssuedAt?: string;      // Timestamp de quando o operador marcou como nota emitida
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;                // Destinatário
  title: string;
  message: string;
  type: 'payment_released' | 'invoice_issued' | 'contested' | 'transfer_requested' | 'system' | 'presencial_scheduled';
  referenceId?: string;          // ID do fechamento de pagamento ou transferência associado
  read: boolean;
  createdAt: string;
}
