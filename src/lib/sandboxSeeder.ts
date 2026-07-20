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
  BackOfficeClient,
  QaSettings,
  Invite,
  UserRole
} from '../types';

export interface SandboxSeeds {
  organizations: Record<string, Organization>;
  users: Record<string, UserProfile>;
  teams: Record<string, Team>;
  agreements: Record<string, Agreement>;
  qaCompetences: Record<string, QaCompetence>;
  qaEvaluations: Record<string, QaEvaluation>;
  pdis: Record<string, Pdi>;
  backofficeImports: Record<string, BackOfficeImport>;
  backofficeClients: Record<string, BackOfficeClient>;
  qaSettings: Record<string, QaSettings>;
  invites: Record<string, Invite>;
}

export const generateSandboxSeeds = (): SandboxSeeds => {
  const orgId = 'sandbox-test';
  const now = new Date().toISOString();
  const todayStr = new Date().toISOString().split('T')[0];

  const organizations: Record<string, Organization> = {};
  const users: Record<string, UserProfile> = {};
  const teams: Record<string, Team> = {};
  const agreements: Record<string, Agreement> = {};
  const qaCompetences: Record<string, QaCompetence> = {};
  const qaEvaluations: Record<string, QaEvaluation> = {};
  const pdis: Record<string, Pdi> = {};
  const backofficeImports: Record<string, BackOfficeImport> = {};
  const backofficeClients: Record<string, BackOfficeClient> = {};
  const qaSettings: Record<string, QaSettings> = {};
  const invites: Record<string, Invite> = {};

  // 1. Organização
  organizations[orgId] = {
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
    { id: 'team-fenix', name: 'Time Fênix', supervisorId: 'sandbox-supervisor-a1', inviteToken: 'tok-fenix', organizationId: orgId, monthlyGoal: 80000, effectivenessGoal: 85, managerId: 'sandbox-manager-a', createdAt: now },
    { id: 'team-dragao', name: 'Time Dragão', supervisorId: 'sandbox-supervisor-a1', inviteToken: 'tok-dragao', organizationId: orgId, monthlyGoal: 70000, effectivenessGoal: 80, managerId: 'sandbox-manager-a', createdAt: now },
    // Supervisor 2 (Amanda)
    { id: 'team-aguia', name: 'Time Águia', supervisorId: 'sandbox-supervisor-a2', inviteToken: 'tok-aguia', organizationId: orgId, monthlyGoal: 90000, effectivenessGoal: 88, managerId: 'sandbox-manager-a', createdAt: now },
    { id: 'team-falcao', name: 'Time Falcão', supervisorId: 'sandbox-supervisor-a2', inviteToken: 'tok-falcao', organizationId: orgId, monthlyGoal: 85000, effectivenessGoal: 85, managerId: 'sandbox-manager-a', createdAt: now },
    // Supervisor 3 (Roberto)
    { id: 'team-lobo', name: 'Time Lobo', supervisorId: 'sandbox-supervisor-b1', inviteToken: 'tok-lobo', organizationId: orgId, monthlyGoal: 65000, effectivenessGoal: 82, managerId: 'sandbox-manager-b', createdAt: now },
    { id: 'team-tigre', name: 'Time Tigre', supervisorId: 'sandbox-supervisor-b1', inviteToken: 'tok-tigre', organizationId: orgId, monthlyGoal: 75000, effectivenessGoal: 84, managerId: 'sandbox-manager-b', createdAt: now }
  ];

  teamsList.forEach(t => {
    teams[t.id] = t;
  });

  // 3. Usuários (Gerentes, Supervisores, Monitor e Backoffice)
  const usersList: UserProfile[] = [
    // Gerentes
    { uid: 'sandbox-manager-a', email: 'arthur.gerente@sandbox.local', displayName: 'Arthur (Gerente A)', role: 'manager', organizationId: orgId, createdAt: now },
    { uid: 'sandbox-manager-b', email: 'beatrice.gerente@sandbox.local', displayName: 'Beatrice (Gerente B)', role: 'manager', organizationId: orgId, createdAt: now },
    
    // Coordenadores
    { uid: 'sandbox-coordinator-a', email: 'mariana.coordenadora@sandbox.local', displayName: 'Mariana (Coordenadora)', role: 'coordinator', organizationId: orgId, createdAt: now },
    
    // Supervisores
    { uid: 'sandbox-supervisor-a1', email: 'carlos.supervisor@sandbox.local', displayName: 'Carlos (Supervisor A1)', role: 'supervisor', organizationId: orgId, managedTeams: ['team-fenix', 'team-dragao'], teamId: 'team-fenix', managerId: 'sandbox-manager-a', createdAt: now },
    { uid: 'sandbox-supervisor-a2', email: 'amanda.supervisor@sandbox.local', displayName: 'Amanda (Supervisor A2)', role: 'supervisor', organizationId: orgId, managedTeams: ['team-aguia', 'team-falcao'], teamId: 'team-aguia', managerId: 'sandbox-manager-a', createdAt: now },
    { uid: 'sandbox-supervisor-b1', email: 'roberto.supervisor@sandbox.local', displayName: 'Roberto (Supervisor B1)', role: 'supervisor', organizationId: orgId, managedTeams: ['team-lobo', 'team-tigre'], teamId: 'team-lobo', managerId: 'sandbox-manager-b', createdAt: now },
    
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
    
    // Distribute portfolios and goals based on index
    let portfolio = 'Noverde Receptivo';
    let monthlyGoal = 210000;
    
    if (i >= 3 && i <= 4) {
      portfolio = 'Noverde Variável';
      monthlyGoal = 80000;
    } else if (i >= 5 && i <= 7) {
      portfolio = 'Noverde BNPL';
      monthlyGoal = 5000;
    } else if (i >= 8 && i <= 9) {
      portfolio = 'Pula Parcela + Ticket Alto';
      monthlyGoal = 10000;
    } else if (i >= 10 && i <= 12) {
      portfolio = 'Noverde - FPD';
      monthlyGoal = 15000;
    } else if (i >= 13) {
      portfolio = 'Noverde Receptivo';
      monthlyGoal = 270000;
    }

    usersList.push({
      uid,
      email: `${op.name.toLowerCase().replace(' ', '.')}@sandbox.local`,
      displayName: op.name,
      role: 'member',
      organizationId: orgId,
      teamId: op.team,
      portfolio,
      monthlyGoal,
      createdAt: now
    });
  });

  usersList.forEach(u => {
    users[u.uid] = u;
  });

  // 4. Competências Padrão de QA
  const qaCompsList: QaCompetence[] = [
    { id: 'comp-1', organizationId: orgId, name: 'Argumentação', weight: 1.5, description: 'Postura, firmeza e flexibilidade de negociação.' },
    { id: 'comp-2', organizationId: orgId, name: 'Processos e Sistemas', weight: 1.0, description: 'Registro correto das informações do acordo.' },
    { id: 'comp-3', organizationId: orgId, name: 'Compliance & LGPD', weight: 2.0, description: 'Segurança jurídica, confirmação de CPF/dados.' },
    { id: 'comp-4', organizationId: orgId, name: 'Empatia & Escuta', weight: 1.0, description: 'Ouvir a dor do devedor e propo soluções justas.' }
  ];
  qaCompsList.forEach(c => {
    qaCompetences[c.id] = c;
  });

  // 5. Acordos Fictícios do Mês (Gerados Programaticamente)
  let agreementIdCounter = 1;
  let qaIdCounter = 1;
  let pdiIdCounter = 1;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const origins = Object.values(AgreementOrigin);
  const types = Object.values(AgreementType);
  const categories = Object.values(AgreementCategory);

  usersList.filter(u => u.role === 'member').forEach((op, opIdx) => {
    const numAgreements = 5 + (opIdx % 2);
    
    for (let j = 0; j < numAgreements; j++) {
      const id = `sandbox-agree-${agreementIdCounter++}`;
      const val = Math.round(800 + (Math.random() * 8000));
      
      let customCpf: string | undefined = undefined;

      if (j === 0) {
        status = AgreementStatus.PAID;
        dueDate = new Date(currentYear, currentMonth, 5);
        paidAt = new Date(currentYear, currentMonth, 5, 10 + (j % 8), 0, 0).toISOString();
        if (opIdx === 0) {
          customCpf = '98765432110';
        }
      } else if (j === 1) {
        status = AgreementStatus.PAID;
        dueDate = new Date(currentYear, currentMonth, 15);
        paidAt = new Date(currentYear, currentMonth, 14, 14 + (j % 5), 30, 0).toISOString();
      } else if (j === 2) {
        status = AgreementStatus.WAITING;
        dueDate = new Date(currentYear, currentMonth, new Date().getDate() + 3);
      } else if (j === 3) {
        status = AgreementStatus.WAITING;
        dueDate = new Date();
      } else if (j === 4) {
        status = AgreementStatus.WAITING;
        dueDate = new Date(currentYear, currentMonth, new Date().getDate() - 3);
      } else {
        status = AgreementStatus.BROKEN;
        dueDate = new Date(currentYear, currentMonth, new Date().getDate() - 5);
      }

      const createdAt = new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const dueDateStr = dueDate.toISOString().split('T')[0];
      const clientCpf = customCpf || `123456789${String(opIdx).padStart(2, '0')}`;
      
      agreements[id] = {
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

    const baseScores = [
      Math.round(65 + (opIdx * 1.5) % 15),
      Math.round(72 + (opIdx * 1.5) % 15),
      Math.round(79 + (opIdx * 1.5) % 15)
    ];

    let lastScore = 100;

    baseScores.forEach((score, scoreIdx) => {
      const qaId = `sandbox-qa-${qaIdCounter++}`;
      const grades: Record<string, number> = {
        'comp-1': Math.min(100, score + (opIdx % 5) - 2),
        'comp-2': Math.min(100, score - (opIdx % 3) + 1),
        'comp-3': score < 80 ? 70 : 90,
        'comp-4': Math.min(100, score + 4)
      };

      const qaDate = new Date(currentYear, currentMonth, 3 + (scoreIdx * 8) + (opIdx % 3));
      const qaDateIso = qaDate.toISOString();
      const qaDateYmd = qaDateIso.split('T')[0];

      qaEvaluations[qaId] = {
        id: qaId,
        organizationId: orgId,
        operatorId: op.uid,
        evaluatorId: 'sandbox-user-monitor',
        score,
        callId: `REC-${100000 + qaIdCounter}`,
        protocol: `PROT-${20260000 + qaIdCounter}`,
        grades,
        feedback: `Avaliação de monitoria #${scoreIdx + 1}. Atendimento sob protocolo ${20260000 + qaIdCounter}. O operador ${op.displayName} demonstrou alinhamento técnico.`,
        createdAt: qaDateIso
      };

      if (scoreIdx === 2) {
        lastScore = score;
        if (users[op.uid]) {
          users[op.uid].lastQaDate = qaDateYmd;
          users[op.uid].qaCycleStatus = 'evaluated';
        }
      }
    });

    if (lastScore < 82) {
      const pdiId = `sandbox-pdi-${pdiIdCounter++}`;
      pdis[pdiId] = {
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
  backofficeImports[importId] = {
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
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  };

  const backofficeNames = ['Gabriela Rocha', 'Marcos Toledo', 'Rita de Cassia', 'Felipe Santos', 'Paula Abreu'];
  backofficeNames.forEach((name, i) => {
    const cliId = `sandbox-bcli-${i + 1}`;
    backofficeClients[cliId] = {
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

  // 9. Convites de teste
  const inviteTestList: Invite[] = [
    {
      id: 'sandbox-invite-1',
      email: 'colaborador.novo@sandbox.local',
      role: 'member',
      teamId: 'team-fenix',
      organizationId: orgId,
      status: 'pending',
      token: 'invite-member-token',
      invitedBy: 'sandbox-manager-a',
      createdAt: now,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sandbox-invite-2',
      email: 'lider.novo@sandbox.local',
      role: 'supervisor',
      teamId: 'team-aguia',
      organizationId: orgId,
      status: 'pending',
      token: 'invite-sup-token',
      invitedBy: 'sandbox-manager-a',
      createdAt: now,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sandbox-invite-3',
      email: 'back.equipe@sandbox.local',
      role: 'backoffice',
      teamId: 'team-fenix',
      organizationId: orgId,
      status: 'pending',
      token: 'invite-back-token',
      invitedBy: 'sandbox-supervisor-a1',
      createdAt: now,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    }
  ];
  inviteTestList.forEach(inv => {
    invites[inv.id] = inv;
  });

  return {
    organizations,
    users,
    teams,
    agreements,
    qaCompetences,
    qaEvaluations,
    pdis,
    backofficeImports,
    backofficeClients,
    qaSettings,
    invites
  };
};
