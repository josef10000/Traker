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
import { generateSandboxSeeds } from './sandboxSeeder';

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
  private qaSettings: Record<string, QaSettings> = {};
  private invites: Record<string, Invite> = {};
  private transferRequests: Record<string, any> = {};


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
    const seeds = generateSandboxSeeds();
    this.organizations = seeds.organizations;
    this.users = seeds.users;
    this.teams = seeds.teams;
    this.agreements = seeds.agreements;
    this.qaCompetences = seeds.qaCompetences;
    this.qaEvaluations = seeds.qaEvaluations;
    this.pdis = seeds.pdis;
    this.backofficeImports = seeds.backofficeImports;
    this.backofficeClients = seeds.backofficeClients;
    this.qaSettings = seeds.qaSettings;
    this.invites = seeds.invites;

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

  public getQaSettings(orgId: string): QaSettings {
    if (!this.qaSettings[orgId]) {
      this.qaSettings[orgId] = {
        id: `settings-${orgId}`,
        organizationId: orgId,
        evaluationCycleDays: 30,
        pdiObservationDays: 15
      };
    }
    return this.qaSettings[orgId];
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

  public updatePdiStatus(id: string, status: 'pending' | 'completed' | 'failed' | 'expired'): void {
    if (this.pdis[id]) {
      this.pdis[id] = { ...this.pdis[id], status };
      this.notify();
    }
  }

  public updateQaSettings(orgId: string, settings: Partial<QaSettings>): void {
    const current = this.getQaSettings(orgId);
    this.qaSettings[orgId] = { ...current, ...settings };
    this.notify();
  }

  public updateOperatorQaDates(uid: string, nextQaDate?: string, qaCycleStatus?: 'pending' | 'evaluated', lastQaDate?: string): void {
    if (this.users[uid]) {
      if (nextQaDate !== undefined) {
        this.users[uid].nextQaDate = nextQaDate;
      }
      if (qaCycleStatus !== undefined) {
        this.users[uid].qaCycleStatus = qaCycleStatus;
      }
      if (lastQaDate !== undefined) {
        this.users[uid].lastQaDate = lastQaDate;
      }
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

  // --- MÉTODOS DE CONVITES DO SANDBOX ---
  
  public getPendingInvites(orgId: string): Invite[] {
    return Object.values(this.invites).filter(
      inv => inv.organizationId === orgId && inv.status === 'pending'
    );
  }

  public createInvitesInBulk(
    invitesData: Array<{ email: string; role: UserRole; teamId: string | null }>,
    orgId: string,
    invitedBy: string
  ): Invite[] {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const newInvites: Invite[] = [];

    invitesData.forEach((data, index) => {
      const id = `sandbox-invite-${Date.now()}-${index}`;
      const token = `sb-tok-${Math.random().toString(36).substring(2, 8)}`;
      const invite: Invite = {
        id,
        email: data.email.trim(),
        role: data.role,
        teamId: data.teamId,
        organizationId: orgId,
        status: 'pending',
        token,
        invitedBy,
        createdAt: now,
        expiresAt
      };

      this.invites[id] = invite;
      newInvites.push(invite);
    });

    this.notify();
    return newInvites;
  }

  public revokeInvite(inviteId: string): void {
    if (this.invites[inviteId]) {
      delete this.invites[inviteId];
      this.notify();
    }
  }

  public validateInvite(token: string): Invite | null {
    const invite = Object.values(this.invites).find(
      inv => inv.token === token && inv.status === 'pending'
    );
    if (!invite) return null;
    return invite;
  }

  public acceptInvite(uid: string, token: string): void {
    const invite = Object.values(this.invites).find(inv => inv.token === token);
    if (!invite) return;

    // Marca como aceito
    invite.status = 'accepted';

    // Cria o usuário simulado
    const now = new Date().toISOString();
    const newUser: UserProfile = {
      uid,
      email: invite.email,
      displayName: invite.email.split('@')[0],
      role: invite.role,
      teamId: invite.teamId || undefined,
      organizationId: invite.organizationId,
      createdAt: now,
      managedTeams: invite.role === 'supervisor' && invite.teamId ? [invite.teamId] : undefined,
      managerId: invite.invitedBy || null
    };

    this.users[uid] = newUser;
    this.notify();
  }

  public getTransferRequests(): any[] {
    return Object.values(this.transferRequests);
  }

  public createTransferRequest(req: any): void {
    this.transferRequests[req.id] = { ...req };
    this.notify();
  }

  public updateTransferRequest(id: string, fields: Partial<any>): void {
    if (this.transferRequests[id]) {
      this.transferRequests[id] = { ...this.transferRequests[id], ...fields };
      this.notify();
    }
  }
}

// Exporta o singleton do serviço
export const sandboxService = new SandboxService();
