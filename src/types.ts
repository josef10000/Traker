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

export interface ContactChannelConfig {
  id: string;
  name: string;
  code: string;
  active: boolean;
  color?: string;
  iconName?: string;
}

export interface TabulationReasonConfig {
  id: string;
  title: string;
  isNegotiation: boolean;
  isSuccess: boolean;
  active: boolean;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'vencimento' | 'preventiva' | 'confirmacao' | 'geral';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string;
}

export interface DiscountRequestData {
  cpf: string;
  requestedValue: number;
  agreementId?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  cpfReference?: string;
  agreementId?: string;
  discountRequest?: DiscountRequestData;
  createdAt: string;
  read: boolean;
  organizationId: string;
}

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
  contactChannels?: ContactChannelConfig[];
  tabulationReasons?: TabulationReasonConfig[];
  createdAt: string;
  onboardingDaysLimit?: number; // Padrão: 90 dias
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
  managedProducts?: string[]; // Para gerentes/coordenadores que gerenciam múltiplos produtos
  product?: string;        // Produto primário vinculado
  jobTitle?: string;
  theme?: 'cyan' | 'obsidian' | 'emerald' | 'amber' | 'slate' | 'dark' | 'sky' | 'purple';
  customCursorStyle?: 'default' | 'cyan_enterprise' | 'precision_ring' | 'ambient_glow';
  portfolio?: string;
  monthlyGoal?: number;
  monthlyServiceValue?: number; // Valor da prestação PJ mensal
  observation?: string;
  hasSeenTour?: boolean;
  managerId?: string | null;
  createdAt: string; // Aceite da LGPD no primeiro login
  startDate?: string; // Data oficial de início da contratação PJ
  acceptedTermsAt?: string; // Aceite da LGPD no primeiro login
  onboardingChecklist?: Record<string, boolean>;
  onboardingGraduatedAt?: string;
  dashboardPreferences?: {
    hiddenCards: string[];
  };
  lastQaDate?: string;
  nextQaDate?: string;
  qaCycleStatus?: 'pending' | 'evaluated';
  avatarStyle?: string;
  avatarSeed?: string;
  photoURL?: string;
  avatarType?: 'custom' | 'api';
  shiftStartHour?: number;    // Padrão: 8 (08:00)
  shiftEndHour?: number;      // Padrão: 17 (17:00)
  dailyPauseAllowance?: number; // Padrão: 72 (minutos de pausa permitidos por dia)
  isWebAuthnEnabled?: boolean;
  webAuthnCredentials?: WebAuthnCredential[];
  backupCodes?: string[];
  // Preferências de Áudio e Efeitos Sonoros (Sintetizador Web Audio API)
  soundEnabled?: boolean;
  soundVolume?: number; // 0 a 100
  dealSoundEffect?: 'coin' | 'laser' | 'marimba' | 'silent';
  coverPhotoURL?: string;
  coverPosition?: string;
  recentCovers?: string[];
  customStatus?: {
    emoji: string;
    text: string;
    state?: 'available' | 'busy' | 'focus' | 'break' | 'meeting';
  };
  // Metas Pessoais Motivacionais do Colaborador & Preferências de Widgets
  personalMonthlyGoal?: number;
  personalDailyGoal?: number;
  personalGoalType?: 'value' | 'count';
  showPersonalGoal?: boolean;
  dashboardWidgets?: DashboardWidgetConfig[];
}

export type WidgetId = 
  | 'personal_goal'
  | 'hourly_cockpit'
  | 'risk_carousel'
  | 'crm_callbacks'
  | 'quick_actions'
  | 'mini_bi'
  | 'wiki_announcements'
  | 'qa_radar';

export interface DashboardWidgetConfig {
  id: WidgetId;
  label: string;
  enabled: boolean;
  order: number;
}

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  deviceName: string;
  createdAt: string;
  counter: number;
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
  managerId?: string | null;
  product?: string;              // Carteira / Produto da equipe (ex: Consignado, Cartões, Auto)
  inviteToken: string;
  inviteTokenExpiresAt?: string; // Expiração do convite (LGPD/Segurança)
  organizationId: string;        // Vínculo com a empresa
  monthlyGoal?: number;
  effectivenessGoal?: number;
  supervisorInviteToken?: string | null;
  createdAt: string;
}

export interface AgreementNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  category: 'phone' | 'whatsapp' | 'warning' | 'general';
  createdAt: string;
}

export type DiscountReason = 'installment_discount' | 'overdue_discount' | 'payment_discount' | 'payoff_discount';

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
  clientPhone?: string;

  // Campos de Parcelamento
  installmentCount?: number;   // Quantidade de parcelas (informativo)
  hasEntry?: boolean;           // Se o parcelamento tem entrada
  installmentValue?: number;   // Valor de each parcela (informativo — não conta nas métricas)

  // Campos de Desconto
  discountApplied?: boolean;
  discountReason?: DiscountReason;

  operatorId: string; // Quem registrou
  operatorName?: string; // Nome do operador
  teamId: string;     // A qual equipe pertence
  organizationId: string; // Vínculo com a empresa
  createdAt: string;
  paidAt?: string;
  lastCheckedAt?: string;
  isAdjustment?: boolean;
  notes?: string;
  notesHistory?: AgreementNote[]; // Linha do tempo de notas de transição do lead
  scheduledAt?: string; // Data/Hora agendada para retorno
  forcedCollision?: boolean; // Bypass manual de colisão de CPF
  receiptUrl?: string; // URL do comprovante salvo no R2
  receiptFileName?: string; // Nome original do arquivo do comprovante
  receiptUploadedAt?: string; // Data do upload do comprovante
}


export interface MonthlyAggregatedStats {
  id: string;             // Ex: 'orgId_2026_8'
  organizationId: string;
  year: number;
  month: number;          // 1 a 12
  totalProjected: number;
  totalPaid: number;
  totalBroken: number;
  totalAgreements: number;
  paidCount: number;
  brokenCount: number;
  waitingCount: number;
  ticketAverage: number;
  effectivenessRate: number;
  projectedMrr: number;
  byTeam?: Record<string, {
    totalProjected: number;
    totalPaid: number;
    count: number;
    paidCount: number;
  }>;
  byOrigin?: Record<string, {
    totalValue: number;
    paidValue: number;
    count: number;
    paidCount: number;
  }>;
  lastUpdated: string;
  version?: number;
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
    roiByOrigin?: Record<string, {
      totalValue: number;
      paidValue: number;
      totalCount: number;
      paidCount: number;
      conversionRate: number;
      discountRate: number;
      avgDiscountPercentage: number;
    }>;
    breakRecoveryStats?: {
      totalBroken: number;
      recoveredCount: number;
      recoveredVolume: number;
      recoveryRate: number;
      avgRecoveryDays: number;
    };
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
    discountStats?: {
      totalWithDiscount: number;
      totalWithoutDiscount: number;
      totalNotSpecified: number;
      discountRate: number;
      byReason: {
        installment_discount: number;
        overdue_discount: number;
        payment_discount: number;
        payoff_discount: number;
      };
      effectivenessWithDiscount: number;
      effectivenessWithoutDiscount: number;
      breakRateWithDiscount: number;
      breakRateWithoutDiscount: number;
      byAgreementType: Record<string, { total: number; withDiscount: number; discountRate: number }>;
      volumeWithDiscount: number;
      volumeWithoutDiscount: number;
      paidVolumeWithDiscount: number;
      paidVolumeWithoutDiscount: number;
    };
    forecastStats?: {
      activeOperatorsCount: number;
      totalAttendances: number;
      avgAttendancesPerOperator: number;
      attendanceEffectivenessRate: number;
      paidVolumeByAgreementType: Record<string, { totalValue: number; count: number; paidValue: number; paidCount: number; ticketAverage: number; effectivenessRate: number }>;
      projectedNextMonthRecovery: number;
      projectedNextMonthBreakValue: number;
      secondaryMrrColchao: number;
      bestLiquidityDays: number[];
      primeTimeWindows: { hour: number; conversionRate: number; count: number }[];
      dilatedBreakRisk: { lowRisk3d: number; medRisk7d: number; highRisk15d: number };
      weeklyForecast?: {
        weekNumber: number;
        weekLabel: string;
        dateRangeLabel: string;
        projectedValue: number;
        historicalPercentage: number;
        projectedCount: number;
      }[];
      operatorForecasts?: {
        operatorId: string;
        operatorName: string;
        currentMonthPaid: number;
        ticketAverage: number;
        effectivenessRate: number;
        projectedNextMonth: number;
        weeklyBreakdown: { weekNumber: number; projectedValue: number }[];
        trend: 'up' | 'stable' | 'down';
      }[];
    };
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
  callExpiresAt?: string;    // Expiração automática da mídia de áudio do QA
  isBestPractice?: boolean;  // Gravação destaque para treinamento (Best Practice)
  grades: Record<string, number>; // ID Competência -> Nota (0 a 100)
  feedback: string;
  createdAt: string;

  // Ficha de Diagnóstico da Monitoria de Qualidade
  recoveredAmount?: number;            // Valor Recuperado em R$
  delayProfileLabel?: string;          // Rótulo customizado do campo (padrão: "Perfil de atraso")
  delayProfile?: string;               // Conteúdo customizado do campo (ex: "2 a 30 dias", "Preventivo", etc.)
  clientReason?: string;               // Motivo apresentado pelo cliente
  objections?: string;                 // Objeções para não negociar
  improvementOpportunities?: string[]; // Oportunidades de melhoria (tópicos)
  readAt?: string;                     // Timestamp de quando o operador visualizou a monitoria
  acknowledgedAt?: string;             // Timestamp de quando o operador marcou como "Ciente"
  operatorReply?: string;              // Comentário / Tréplica opcional do operador
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

export type SurveyFrequency = 
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'semiannual' 
  | 'annual' 
  | 'once' 
  | 'disabled';

export interface EmployeeSurveyConfig {
  id: string;
  organizationId: string;
  question: string;
  scaleType: '0_10' | 'stars' | 'emojis';
  allowComments: boolean;
  commentPlaceholder?: string;
  frequency: SurveyFrequency;
  targetTeamIds: string[]; // Vazio = Todos os times
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSurveyResponse {
  id: string;
  surveyConfigId: string;
  organizationId: string;
  rating: number; // 0-10 ou 1-5
  scaleType: '0_10' | 'stars' | 'emojis';
  comment?: string;
  teamId?: string; // Apenas ID do time para filtro por equipe, SEM ID ou Nome de Usuário (100% Anônimo)
  createdAt: string;
}

export interface BackOfficeNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentUrl?: string;
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
  attachmentUrl?: string;
  attachments?: string[];
  status: 'pending' | 'in_progress' | 'treated' | 'ignored';
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  organizationId: string;
  orgName?: string;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  invitedBy?: string;
  createdAt: string;
  expiresAt?: string;
  monthlyServiceValue?: number; // Valor da prestação PJ mensal
  shiftStartHour?: number;
  shiftEndHour?: number;
  emailSent?: boolean;
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
  senderUserId?: string;          // Quem executou a ação (para filtro de auto-notificação)
  title: string;
  message: string;
  type: 'payment_released' | 'invoice_issued' | 'contested' | 'transfer_requested' | 'system' | 'presencial_scheduled' | 'high_value_break' | 'agenda_reminder' | 'lead_assigned' | 'agreement_note' | 'announcement' | 'knowledge_base' | 'qa_evaluated' | 'windows_hello_reminder';
  referenceId?: string;          // ID do fechamento de pagamento ou transferência associado
  read: boolean;
  createdAt: string;
}

export interface AttendanceReason {
  id: string;
  organizationId: string;
  teamId?: string;        // Opcional: ID da equipe específica ou 'all'/undefined para global
  title: string;
  isNegotiation: boolean; // Flag 1: Oportunidade real de negociação
  isSuccess: boolean;     // Flag 2: Negociação culminou em acordo
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  teamId?: string;
  operatorId: string;
  operatorName: string;
  clientCpf: string;
  clientName: string;
  reasonId: string;
  reasonTitle: string;
  isNegotiation: boolean;
  isSuccess: boolean;
  audioUrl?: string;       // Anexo de áudio MP3
  audioExpiresAt?: string; // Data/Hora de expiração automática do áudio
  observation?: string;    // Observação do atendimento
  agreementId?: string;    // Vínculo com acordo gerado
  createdAt: string;
}

export type MetricType = 
  | 'recovered_amount'
  | 'agreements_count'
  | 'paid_agreements'
  | 'conversion_rate'
  | 'avg_ticket';

export type CompletionRule = 'ALL_REQUIRED' | 'ANY_REQUIRED' | 'WEIGHTED_AVERAGE';

export interface GoalTargetItem {
  id: string;
  metric: MetricType;
  targetValue: number;
}

export interface GoalCampaign {
  id: string;
  organizationId: string;
  title: string;
  scope: 'collective' | 'individual';
  targetOperatorId?: string;
  targetMetric?: MetricType; // Compatibilidade com campanhas legadas
  targetValue?: number;      // Compatibilidade com campanhas legadas
  targets?: GoalTargetItem[]; // Múltiplas metas
  completionRule?: CompletionRule; // Regra de conclusão
  startDate: string;
  endDate: string;
  reward: string;
  createdAt: string;
}

export interface ExecutivePresentationBlock {
  id: string;
  title: string;
  type: 'big_number' | 'compact' | 'full' | 'text' | 'image' | 'chart';
  metricKey?: string;
  customText?: string;
  imageUrl?: string;
}

export interface ExecutivePresentation {
  id: string;
  organizationId: string;
  title: string;
  layouts: any;
  blocks: ExecutivePresentationBlock[];
  isPublic: boolean;
  createdAt: string;
}

export interface CustomIndicatorConfig {
  id: string;
  label: string;
  metricKey: 'conversion' | 'revenue' | 'share' | 'qa' | 'attendance' | 'absenteeism' | 'custom';
  description?: string;
}

export interface PerformanceProfileConfig {
  id: string;
  title: string;
  description: string;
  icon?: string;
  weights: Record<string, number>; // Map de indicator.id -> peso %
}

export type KnowledgeCategory = 'script' | 'announcement' | 'policy' | 'faq' | 'general';

export interface KnowledgeArticle {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  isPinned: boolean;
  isUrgent: boolean;
  copyableScript?: string;
  imageUrl?: string;
  tags?: string[];
  requireAcknowledgement?: boolean;           // Exige ciente do colaborador
  acknowledgements?: Record<string, string>;  // Map de operatorUid -> acknowledgedAtTimestamp
  createdByUid: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// RECRUTAMENTO & SELEÇÃO (ATS INTEGRADO AO ONBOARDING)
// -------------------------------------------------------------

export interface JobOpening {
  id: string;
  organizationId?: string;
  title: string;                 // Ex: "Operador de Cobrança Jr", "Monitor de Qualidade"
  roleTitle?: string;            // Cargo da Vaga (ex: "Operador de Cobrança Jr", "Analista de Qualidade")
  teamId?: string;               // Equipe de destino prevista
  siteId?: string;               // ID do Site da Operação
  siteName?: string;             // Nome do Site (ex: "Site SP Paulista", "Home Office")
  shiftStartHour?: number;       // Ex: 8
  shiftEndHour?: number;         // Ex: 17
  totalSlots: number;            // Total de vagas abertas
  filledSlots: number;           // Vagas preenchidas/contratados
  sourceChannel?: string;        // "LinkedIn", "WhatsApp", "Indicação Interna", "Gupy", "Outro"
  status: 'open' | 'paused' | 'closed';
  description?: string;
  createdAt: string;
}

export type CandidateStage = 'applied' | 'contacted' | 'interview_scheduled' | 'approved' | 'rejected' | 'talent_pool';

export interface Candidate {
  id: string;
  organizationId?: string;
  jobOpeningId?: string;         // ID da vaga vinculada
  fullName: string;
  phone: string;
  email?: string;
  sourceChannel: string;         // Onde se inscreveu: LinkedIn, WhatsApp, Indicação, etc.
  resumeText?: string;           // Resumo do currículo / experiências
  resumeUrl?: string;            // Link para arquivo PDF / Drive
  stage: CandidateStage;
  contactNotes?: string;         // Observações de contato
  interviewDate?: string;        // Data e hora da entrevista (ISO ou YYYY-MM-DDTHH:mm)
  interviewNotes?: string;       // Observações / Link da entrevista (ex: Google Meet / Sala 4)
  interviewFeedback?: string;    // Feedback da entrevista
  rejectionReason?: string;      // Motivo do descarte se reprovado/desistente
  isTalentPool?: boolean;        // Se foi guardado no banco de talentos
  graduatedToOnboardingAt?: string; // Se aprovado e integrado ao Onboarding
  assignedTeamId?: string;       // Equipe atribuída na contratação
  assignedSupervisorId?: string; // Supervisor atribuído
  startDate?: string;            // Data de início efetivo
  createdAt: string;
  updatedAt: string;
}

