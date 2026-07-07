import { 
  Agreement, 
  AgreementStatus, 
  AgreementOrigin, 
  AgreementType, 
  AgreementCategory, 
  UserProfile, 
  Team, 
  Organization, 
  QaCompetence, 
  QaEvaluation, 
  Pdi,
  BackOfficeImport,
  BackOfficeClient
} from '../types';

// Tipo para listeners reativos
type ListenerCallback = () => void;

class SandboxService {
  private listeners: Set<ListenerCallback> = new Set();
  
  // Estado volátil
  private organizations: Record<string, Organization> = {};
  private users: Record<string, UserProfile> = {};
  private teams: Record<string, Team> = {};
  private agreements: Record<string, Agreement> = {};
  private qaCompetences: Record<string, QaCompetence> = {};
  private qaEvaluations: Record<string, QaEvaluation> = {};
  private pdis: Record<string, Pdi> = {};
  private backofficeImports: Record<string, BackOfficeImport> = {};
  private backofficeClients: Record<string, BackOfficeClient> = {};

  constructor() {
    this.resetSandbox();
  }

  // Inscreve um componente para receber atualizações reativas de estado
  public subscribe(callback: ListenerCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notifica todos os inscritos
  private notify(): void {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('[SandboxService] Erro ao notificar listener:', err);
      }
    });
  }

  // Reseta a simulação para o estado inicial de fábrica
  public resetSandbox(): void {
    const orgId = 'sandbox-test';
    const now = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Organização
    this.organizations[orgId] = {
      id: orgId,
      name: 'Empresa de Teste (Sandbox)',
      status: 'active',
      plan: 'enterprise',
      maxUsers: 100,
      maxTeams: 20,
      createdAt: now
    };

    // 2. Times
    const teamsList: Team[] = [
      // Supervisor 1 (Carlos)
      { id: 'team-fenix', name: 'Time Fênix', supervisorId: 'sandbox-supervisor-a1', inviteToken: 'tok-fenix', organizationId: orgId, monthlyGoal: 80000, effectivenessGoal: 85, createdAt: now },
      { id: 'team-dragao', name: 'Time Dragão', supervisorId: 'sandbox-supervisor-a1', inviteToken: 'tok-dragao', organizationId: orgId, monthlyGoal: 70000, effectivenessGoal: 80, createdAt: now },
      // Supervisor 2 (Amanda)
      { id: 'team-aguia', name: 'Time Águia', supervisorId: 'sandbox-supervisor-a2', inviteToken: 'tok-aguia', organizationId: orgId, monthlyGoal: 90000, effectivenessGoal: 88, createdAt: now },
      { id: 'team-falcao', name: 'Time Falcão', supervisorId: 'sandbox-supervisor-a2', inviteToken: 'tok-falcao', organizationId: orgId, monthlyGoal: 85000, effectivenessGoal: 85, createdAt: now },
      // Supervisor 3 (Roberto)
      { id: 'team-lobo', name: 'Time Lobo', supervisorId: 'sandbox-supervisor-b1', inviteToken: 'tok-lobo', organizationId: orgId, monthlyGoal: 65000, effectivenessGoal: 82, createdAt: now },
      { id: 'team-tigre', name: 'Time Tigre', supervisorId: 'sandbox-supervisor-b1', inviteToken: 'tok-tigre', organizationId: orgId, monthlyGoal: 75000, effectivenessGoal: 84, createdAt: now }
    ];

    this.teams = {};
    teamsList.forEach(t => {
      this.teams[t.id] = t;
    });

    // 3. Usuários (Gerentes, Supervisores, Monitor e Backoffice)
    const usersList: UserProfile[] = [
      // Gerentes
      { uid: 'sandbox-manager-a', email: 'arthur.gerente@sandbox.local', displayName: 'Arthur (Gerente A)', role: 'manager', organizationId: orgId, createdAt: now },
      { uid: 'sandbox-manager-b', email: 'beatrice.gerente@sandbox.local', displayName: 'Beatrice (Gerente B)', role: 'manager', organizationId: orgId, createdAt: now },
      
      // Coordenadores
      { uid: 'sandbox-coordinator-a', email: 'carolina.coordenador@sandbox.local', displayName: 'Carolina (Coordenador)', role: 'coordinator', organizationId: orgId, createdAt: now },
      
      // Supervisores
      { uid: 'sandbox-supervisor-a1', email: 'carlos.supervisor@sandbox.local', displayName: 'Carlos (Supervisor A1)', role: 'supervisor', organizationId: orgId, managedTeams: ['team-fenix', 'team-dragao'], teamId: 'team-fenix', createdAt: now },
      { uid: 'sandbox-supervisor-a2', email: 'amanda.supervisor@sandbox.local', displayName: 'Amanda (Supervisor A2)', role: 'supervisor', organizationId: orgId, managedTeams: ['team-aguia', 'team-falcao'], teamId: 'team-aguia', createdAt: now },
      { uid: 'sandbox-supervisor-b1', email: 'roberto.supervisor@sandbox.local', displayName: 'Roberto (Supervisor B1)', role: 'supervisor', organizationId: orgId, managedTeams: ['team-lobo', 'team-tigre'], teamId: 'team-lobo', createdAt: now },
      
      // Monitor & Backoffice
      { uid: 'sandbox-user-monitor', email: 'monitor@sandbox.local', displayName: 'Monitor de Qualidade', role: 'monitor', organizationId: orgId, createdAt: now },
      { uid: 'sandbox-user-backoffice', email: 'backoffice@sandbox.local', displayName: 'Back Office Principal', role: 'backoffice', jobTitle: 'Back Office', organizationId: orgId, teamId: 'team-fenix', createdAt: now }
    ];

    // Operadores (15 operadores distribuídos entre os times)
    const operatorNames = [
      { name: 'Ana Souza', team: 'team-fenix' },
      { name: 'Bruno Lima', team: 'team-fenix' },
      { name: 'Daniela Silva', team: 'team-fenix' },
      { name: 'Eduardo Costa', team: 'team-dragao' },
      { name: 'Fernanda Dias', team: 'team-dragao' },
      { name: 'Gabriel Alves', team: 'team-aguia' },
      { name: 'Helena Ramos', team: 'team-aguia' },
      { name: 'Igor Rocha', team: 'team-aguia' },
      { name: 'Julia Martins', team: 'team-falcao' },
      { name: 'Lucas Freitas', team: 'team-falcao' },
      { name: 'Marina Santos', team: 'team-lobo' },
      { name: 'Nicolas Barbosa', team: 'team-lobo' },
      { name: 'Olivia Castro', team: 'team-lobo' },
      { name: 'Pedro Cardoso', team: 'team-tigre' },
      { name: 'Rafael Melo', team: 'team-tigre' }
    ];

    operatorNames.forEach((op, i) => {
      const uid = `sandbox-op-${i + 1}`;
      usersList.push({
        uid,
        email: `${op.name.toLowerCase().replace(' ', '.')}@sandbox.local`,
        displayName: op.name,
        role: 'member',
        organizationId: orgId,
        teamId: op.team,
        createdAt: now
      });
    });

    this.users = {};
    usersList.forEach(u => {
      this.users[u.uid] = u;
    });

    // 4. Competências Padrão de QA
    const qaCompsList: QaCompetence[] = [
      { id: 'comp-1', organizationId: orgId, name: 'Argumentação', weight: 1.5, description: 'Postura, firmeza e flexibilidade de negociação.' },
      { id: 'comp-2', organizationId: orgId, name: 'Processos e Sistemas', weight: 1.0, description: 'Registro correto das informações do acordo.' },
      { id: 'comp-3', organizationId: orgId, name: 'Compliance & LGPD', weight: 2.0, description: 'Segurança jurídica, confirmação de CPF/dados.' },
      { id: 'comp-4', organizationId: orgId, name: 'Empatia & Escuta', weight: 1.0, description: 'Ouvir a dor do devedor e propo soluções justas.' }
    ];
    this.qaCompetences = {};
    qaCompsList.forEach(c => {
      this.qaCompetences[c.id] = c;
    });

    // 5. Acordos Fictícios do Mês (Gerados Programaticamente)
    this.agreements = {};
    this.qaEvaluations = {};
    this.pdis = {};
    
    let agreementIdCounter = 1;
    let qaIdCounter = 1;
    let pdiIdCounter = 1;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Gerar acordos de forma que tenhamos liquidez em vários dias do mês
    const origins = Object.values(AgreementOrigin);
    const types = Object.values(AgreementType);
    const categories = Object.values(AgreementCategory);

    // Iterar operadores e fabricar histórico
    usersList.filter(u => u.role === 'member').forEach((op, opIdx) => {
      // Cada operador terá de 4 a 6 acordos
      const numAgreements = 5 + (opIdx % 2); // alternar 5 e 6 acordos
      
      for (let j = 0; j < numAgreements; j++) {
        const id = `sandbox-agree-${agreementIdCounter++}`;
        const val = Math.round(800 + (Math.random() * 8000));
        
        // Distribuir as datas de vencimento no mês corrente
        // j=0: Pago no início do mês
        // j=1: Pago no meio do mês
        // j=2: Aguardando no futuro (próximos dias)
        // j=3: Vencendo hoje
        // j=4: Vencido no passado (quebrado)
        // j=5: Confirmado quebrado (broken)
        
        let status = AgreementStatus.WAITING;
        let dueDate: Date;
        let paidAt: string | undefined = undefined;

        if (j === 0) {
          status = AgreementStatus.PAID;
          dueDate = new Date(currentYear, currentMonth, 5);
          paidAt = new Date(currentYear, currentMonth, 5, 10 + (j % 8), 0, 0).toISOString();
        } else if (j === 1) {
          status = AgreementStatus.PAID;
          dueDate = new Date(currentYear, currentMonth, 15);
          paidAt = new Date(currentYear, currentMonth, 14, 14 + (j % 5), 30, 0).toISOString();
        } else if (j === 2) {
          status = AgreementStatus.WAITING;
          dueDate = new Date(currentYear, currentMonth, new Date().getDate() + 3);
        } else if (j === 3) {
          status = AgreementStatus.WAITING;
          dueDate = new Date(); // Vence hoje
        } else if (j === 4) {
          status = AgreementStatus.WAITING;
          dueDate = new Date(currentYear, currentMonth, new Date().getDate() - 3); // Vencido
        } else {
          status = AgreementStatus.BROKEN;
          dueDate = new Date(currentYear, currentMonth, new Date().getDate() - 5);
        }

        const createdAt = new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // Criado 2 dias antes do vencimento
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const clientCpf = `123456789${String(opIdx).padStart(2, '0')}`;
        
        this.agreements[id] = {
          id,
          clientName: `Devedor ${agreementIdCounter} (${op.displayName})`,
          clientCpf,
          value: val,
          dueDate: dueDateStr,
          status,
          origin: origins[(opIdx + j) % origins.length],
          type: types[(opIdx + j) % types.length],
          category: categories[(opIdx + j) % categories.length],
          operatorId: op.uid,
          teamId: op.teamId || 'team-fenix',
          organizationId: orgId,
          createdAt,
          paidAt,
          phone: `(11) 98765-43${String(opIdx).padStart(2, '0')}`,
          notes: j % 2 === 0 ? 'Cliente negociou desconto de parcela.' : undefined
        };
      }

      // 6. Gerar avaliação de QA para cada operador
      const qaId = `sandbox-qa-${qaIdCounter++}`;
      // Nota baseada no index
      const score = Math.round(75 + (opIdx * 1.5) % 25); 
      const grades: Record<string, number> = {
        'comp-1': Math.min(100, score + (opIdx % 5) - 2),
        'comp-2': Math.min(100, score - (opIdx % 3) + 1),
        'comp-3': score < 80 ? 70 : 90,
        'comp-4': Math.min(100, score + 4)
      };

      this.qaEvaluations[qaId] = {
        id: qaId,
        organizationId: orgId,
        operatorId: op.uid,
        evaluatorId: 'sandbox-user-monitor',
        score,
        callId: `REC-${100000 + qaIdCounter}`,
        protocol: `PROT-${20260000 + qaIdCounter}`,
        grades,
        feedback: `Excelente atendimento. O operador ${op.displayName} demonstrou forte poder de argumentação e seguiu as regras de compliance perfeitamente.`,
        createdAt: new Date(currentYear, currentMonth, 10 + (opIdx % 10)).toISOString()
      };

      // 7. Gerar PDI para quem teve nota mais baixa (< 82)
      if (score < 82) {
        const pdiId = `sandbox-pdi-${pdiIdCounter++}`;
        this.pdis[pdiId] = {
          id: pdiId,
          organizationId: orgId,
          operatorId: op.uid,
          evaluatorId: 'sandbox-user-monitor',
          competenceId: 'comp-1',
          competenceName: 'Argumentação',
          actionPlan: 'Fazer escuta ativa de 3 ligações de benchmark e participar do treinamento de contorno de objeções.',
          dueDate: new Date(currentYear, currentMonth + 1, 10).toISOString().split('T')[0],
          status: 'pending',
          createdAt: now
        };
      }
    });

    // 8. Backoffice Imports & Clients Fictícios
    const importId = 'sandbox-import-1';
    this.backofficeImports[importId] = {
      id: importId,
      organizationId: orgId,
      teamId: 'team-fenix',
      importedBy: 'sandbox-user-backoffice',
      importedByName: 'Back Office Principal',
      fileName: 'acordos_noverde_carga_0707.xlsx',
      totalRows: 10,
      validRows: 8,
      headers: ['NOME', 'CPF', 'VALOR', 'DUE_DATE', 'CONTRATO'],
      columnMapping: { clientName: 'NOME', clientCpf: 'CPF', value: 'VALOR', dueDate: 'DUE_DATE' },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
    };

    const backofficeNames = ['Gabriela Rocha', 'Marcos Toledo', 'Rita de Cassia', 'Felipe Santos', 'Paula Abreu'];
    backofficeNames.forEach((name, i) => {
      const cliId = `sandbox-bcli-${i + 1}`;
      this.backofficeClients[cliId] = {
        id: cliId,
        importId,
        organizationId: orgId,
        teamId: 'team-fenix',
        clientName: name,
        clientCpf: `987654321${i}0`,
        value: 1200 + i * 450,
        dueDate: todayStr,
        customFields: { CONTRATO: `NV-2026-00${i}` },
        notes: [
          { id: `note-${i}-1`, authorId: 'sandbox-user-backoffice', authorName: 'Back Office Principal', content: 'Ligar para confirmar pagamento se não constar até 14h.', createdAt: now }
        ],
        status: i % 2 === 0 ? 'pending' : 'treated',
        createdAt: now,
        updatedAt: now
      };
    });

    this.notify();
  }

  // --- MÉTODOS DE LEITURA (SIMULAM CONSULTAS FIRESTORE) ---

  public getOrganization(id: string): Organization | null {
    return this.organizations[id] || null;
  }

  public getProfile(uid: string): UserProfile | null {
    return this.users[uid] || null;
  }

  public getUser(uid: string): UserProfile | null {
    return this.getProfile(uid);
  }

  public getAllProfiles(): UserProfile[] {
    return Object.values(this.users);
  }

  public getUsers(orgId: string): UserProfile[] {
    return Object.values(this.users).filter(u => u.organizationId === orgId);
  }

  public getTeam(teamId: string): Team | null {
    return this.teams[teamId] || null;
  }

  public getTeams(orgId: string): Team[] {
    return Object.values(this.teams).filter(t => t.organizationId === orgId);
  }

  public getTeamMembers(teamId: string): UserProfile[] {
    return Object.values(this.users).filter(u => u.teamId === teamId);
  }

  public getAgreements(orgId: string, month: number, year: number): Agreement[] {
    return Object.values(this.agreements).filter(a => {
      const date = new Date(a.createdAt);
      return a.organizationId === orgId && 
             date.getMonth() === month && 
             date.getFullYear() === year;
    });
  }

  public getQaCompetences(orgId: string): QaCompetence[] {
    return Object.values(this.qaCompetences).filter(c => c.organizationId === orgId);
  }

  public getQaEvaluations(orgId: string): QaEvaluation[] {
    return Object.values(this.qaEvaluations).filter(e => e.organizationId === orgId);
  }

  public getPdis(orgId: string): Pdi[] {
    return Object.values(this.pdis).filter(p => p.organizationId === orgId);
  }

  public getBackofficeImports(orgId: string): BackOfficeImport[] {
    return Object.values(this.backofficeImports).filter(i => i.organizationId === orgId);
  }

  public getBackofficeClients(importId: string): BackOfficeClient[] {
    return Object.values(this.backofficeClients).filter(c => c.importId === importId);
  }

  // --- MÉTODOS DE MUTTAÇÃO (SIMULAM ESCRITAS EM MEMÓRIA VOLÁTIL) ---

  public setAgreement(agreement: Agreement): void {
    this.agreements[agreement.id] = { ...agreement };
    this.notify();
  }

  public updateAgreement(id: string, fields: Partial<Agreement>): void {
    if (this.agreements[id]) {
      this.agreements[id] = { ...this.agreements[id], ...fields };
      this.notify();
    }
  }

  public deleteAgreement(id: string): void {
    delete this.agreements[id];
    this.notify();
  }

  public deleteTeam(id: string): void {
    delete this.teams[id];
    this.notify();
  }

  public setTeamGoal(teamId: string, goal: number, effectiveness?: number): void {
    if (this.teams[teamId]) {
      this.teams[teamId] = {
        ...this.teams[teamId],
        monthlyGoal: goal,
        effectivenessGoal: effectiveness !== undefined ? effectiveness : this.teams[teamId].effectivenessGoal
      };
      this.notify();
    }
  }

  public setTeam(team: Team): void {
    this.teams[team.id] = { ...team };
    this.notify();
  }

  public setProfile(profile: UserProfile): void {
    this.users[profile.uid] = { ...profile };
    this.notify();
  }

  public addQaCompetence(competence: QaCompetence): void {
    this.qaCompetences[competence.id] = { ...competence };
    this.notify();
  }

  public updateQaCompetence(id: string, fields: Partial<QaCompetence>): void {
    if (this.qaCompetences[id]) {
      this.qaCompetences[id] = { ...this.qaCompetences[id], ...fields };
      this.notify();
    }
  }

  public deleteQaCompetence(id: string): void {
    delete this.qaCompetences[id];
    this.notify();
  }

  public setQaEvaluation(evaluation: QaEvaluation): void {
    this.qaEvaluations[evaluation.id] = { ...evaluation };
    this.notify();
  }

  public setPdi(pdi: Pdi): void {
    this.pdis[pdi.id] = { ...pdi };
    this.notify();
  }

  public updatePdiStatus(id: string, status: 'pending' | 'completed' | 'expired'): void {
    if (this.pdis[id]) {
      this.pdis[id] = { ...this.pdis[id], status };
      this.notify();
    }
  }

  public addBackofficeImport(imp: BackOfficeImport, clients: BackOfficeClient[]): void {
    this.backofficeImports[imp.id] = { ...imp };
    clients.forEach(c => {
      this.backofficeClients[c.id] = { ...c };
    });
    this.notify();
  }

  public deleteBackofficeImport(importId: string): void {
    delete this.backofficeImports[importId];
    Object.keys(this.backofficeClients).forEach(key => {
      if (this.backofficeClients[key].importId === importId) {
        delete this.backofficeClients[key];
      }
    });
    this.notify();
  }

  public updateBackofficeClientStatus(clientId: string, status: 'pending' | 'treated' | 'ignored'): void {
    if (this.backofficeClients[clientId]) {
      this.backofficeClients[clientId] = { 
        ...this.backofficeClients[clientId], 
        status,
        updatedAt: new Date().toISOString()
      };
      this.notify();
    }
  }

  public addBackofficeClientNote(clientId: string, note: any): void {
    if (this.backofficeClients[clientId]) {
      const notes = this.backofficeClients[clientId].notes || [];
      this.backofficeClients[clientId] = {
        ...this.backofficeClients[clientId],
        notes: [...notes, note],
        updatedAt: new Date().toISOString()
      };
      this.notify();
    }
  }
}

// Exporta o singleton do serviço
export const sandboxService = new SandboxService();
