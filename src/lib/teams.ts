import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  deleteDoc,
  writeBatch,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Team, UserProfile, UserRole, Organization, Invite } from '../types';
import { sendInviteEmail } from '../services/emailService';

import { secureRandom } from '../utils/crypto';

export const generateSecureToken = (length: number): string => {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback pseudo-aleatório seguro se crypto não estiver disponível
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(secureRandom() * 256);
    }
  }
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

export const createOrganization = async (uid: string, userEmail: string, orgName: string): Promise<string> => {
  const orgId = generateSecureToken(9);
  const now = new Date().toISOString();
  
  const orgData: Organization = {
    id: orgId,
    name: orgName,
    status: 'active',
    plan: 'enterprise',
    maxUsers: -1, // -1 = Usuários Ilimitados (Modelo Enterprise)
    maxTeams: -1, // -1 = Equipes Ilimitadas
    createdAt: now
  };

  await setDoc(doc(db, 'organizations', orgId), orgData);

  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email: userEmail,
    displayName: userEmail.split('@')[0],
    role: 'manager',
    organizationId: orgId,
    createdAt: now
  }, { merge: true });

  return orgId;
};

export const createTeam = async (uid: string, userEmail: string, teamName: string, organizationId: string): Promise<string> => {
  // Obter organização e validar limites e status
  const orgRef = doc(db, 'organizations', organizationId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    throw new Error('A organização não foi encontrada.');
  }
  const orgData = orgSnap.data() as Organization;
  if (orgData.status === 'inactive') {
    throw new Error('Esta empresa está suspensa. Não é possível criar novas equipes.');
  }

  // Contar equipes ativas na organização para validar o limite (Custo = 1 leitura)
  const teamsRef = collection(db, 'teams');
  const teamsCountQuery = query(teamsRef, where('organizationId', '==', organizationId));
  const teamsCountSnap = await getCountFromServer(teamsCountQuery);
  if (teamsCountSnap.data().count >= orgData.maxTeams) {
    throw new Error(`O limite de equipes do plano da empresa (${orgData.maxTeams}) foi atingido.`);
  }

  const teamId = generateSecureToken(9);
  const inviteToken = generateSecureToken(12);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // Expira em 48h
  
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  let creatorManagerId: string | null = null;

  if (userSnap.exists()) {
    const userData = userSnap.data() as UserProfile;
    if (userData.role === 'manager') {
      creatorManagerId = uid;
    } else if (userData.role === 'supervisor') {
      creatorManagerId = userData.managerId || null;
    }
  }

  const teamData: Team = {
    id: teamId,
    name: teamName,
    supervisorId: null,
    inviteToken,
    inviteTokenExpiresAt: expiresAt,
    organizationId,
    supervisorInviteToken: null,
    managerId: creatorManagerId,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'teams', teamId), teamData);

  if (userSnap.exists()) {
    const userData = userSnap.data() as UserProfile;
    if (userData.role === 'manager') {
      // O Gerente não vira supervisor do time
    } else {
      // Criador é supervisor
      await updateDoc(doc(db, 'teams', teamId), {
        supervisorId: uid
      });
      await updateDoc(userRef, {
        role: 'supervisor' as UserRole,
        managedTeams: arrayUnion(teamId),
        teamId: userSnap.data().teamId || teamId,
        organizationId
      });
    }
  } else {
    // Se não existir perfil (ex: onboarding), cria como supervisor
    await updateDoc(doc(db, 'teams', teamId), {
      supervisorId: uid
    });
    const userProfile: UserProfile = {
      uid,
      email: userEmail,
      displayName: userEmail.split('@')[0],
      role: 'supervisor',
      teamId,
      organizationId,
      managedTeams: [teamId],
      managerId: creatorManagerId,
      createdAt: new Date().toISOString()
    };
    await setDoc(userRef, userProfile);
  }

  return teamId;
};

export const joinTeam = async (uid: string, userEmail: string, inviteToken: string): Promise<boolean> => {
  const teamsRef = collection(db, 'teams');
  const q = query(teamsRef, where('inviteToken', '==', inviteToken));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Token de convite inválido.');
  }

  const teamDoc = querySnapshot.docs[0];
  const teamData = teamDoc.data() as Team;

  // Validar expiração do token (48 horas)
  if (teamData.inviteTokenExpiresAt && new Date().getTime() > new Date(teamData.inviteTokenExpiresAt).getTime()) {
    throw new Error('O token de convite expirou. Solicite um novo link ao supervisor.');
  }

  // Obter organização e validar limites e status
  const orgRef = doc(db, 'organizations', teamData.organizationId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    throw new Error('A organização vinculada a este time não foi encontrada.');
  }
  const orgData = orgSnap.data() as Organization;
  if (orgData.status === 'inactive') {
    throw new Error('Esta empresa está suspensa. Novos membros não podem ingressar.');
  }

  // Contar membros ativos na organização para validar o limite do plano (Custo = 1 leitura)
  const usersRef = collection(db, 'users');
  const userCountQuery = query(usersRef, where('organizationId', '==', teamData.organizationId));
  const userCountSnap = await getCountFromServer(userCountQuery);
  if (userCountSnap.data().count >= orgData.maxUsers) {
    throw new Error(`O limite de usuários do plano da empresa (${orgData.maxUsers}) foi atingido.`);
  }

  const userProfile: UserProfile = {
    uid,
    email: userEmail,
    displayName: userEmail.split('@')[0],
    role: 'member',
    teamId: teamData.id,
    organizationId: teamData.organizationId,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'users', uid), userProfile);
  
  // Invalidação por uso único (Gera um novo token e expiração para a equipe)
  const newInviteToken = generateSecureToken(12);
  const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await updateDoc(doc(db, 'teams', teamData.id), {
    inviteToken: newInviteToken,
    inviteTokenExpiresAt: newExpiresAt
  });
  
  return true;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    try {
      const cached = localStorage.getItem('tracker_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.uid === uid) return parsed;
      }
    } catch {}
    const isOffline = error?.code === 'unavailable' || error?.message?.includes('offline');
    if (!isOffline) {
      console.warn('Aviso ao consultar perfil no Firestore:', error?.message || error);
    }
    return null;
  }
};

export const getTeamData = async (teamId: string): Promise<Team | null> => {
  try {
    const docRef = doc(db, 'teams', teamId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as Team;
    }
    return null;
  } catch (error: any) {
    const isOffline = error?.code === 'unavailable' || error?.message?.includes('offline');
    if (!isOffline) {
      console.warn('Aviso ao consultar equipe no Firestore:', error?.message || error);
    }
    return null;
  }
};

export const deleteTeam = async (uid: string, teamId: string): Promise<void> => {
  await deleteDoc(doc(db, 'teams', teamId));
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    managedTeams: arrayRemove(teamId)
  });
};

export const getTeamMembers = async (teamId: string): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('teamId', '==', teamId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserProfile);
};

export const removeTeamMember = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    teamId: null,
    role: 'member'
  });
};

export const joinOrganizationAsManager = async (uid: string, userEmail: string, inviteToken: string): Promise<string> => {
  const orgsRef = collection(db, 'organizations');
  const q = query(orgsRef, where('managerInviteToken', '==', inviteToken));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Código de convite de Gerente inválido.');
  }

  const orgDoc = querySnapshot.docs[0];
  const orgData = orgDoc.data() as Organization;

  if (orgData.status === 'inactive') {
    throw new Error('Esta empresa está inativa.');
  }

  const now = new Date().toISOString();
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email: userEmail,
    displayName: userEmail.split('@')[0],
    role: 'manager',
    organizationId: orgData.id,
    createdAt: now
  }, { merge: true });

  await updateDoc(orgDoc.ref, { managerInviteToken: null });

  return orgData.name;
};

export const joinOrganizationAsSupervisor = async (uid: string, userEmail: string, inviteToken: string, selectedTeamIds: string[]): Promise<string> => {
  const orgsRef = collection(db, 'organizations');
  const q = query(orgsRef, where('supervisorInviteToken', '==', inviteToken));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Código de convite de Supervisor inválido.');
  }

  const orgDoc = querySnapshot.docs[0];
  const orgData = orgDoc.data() as Organization;

  if (orgData.status === 'inactive') {
    throw new Error('Esta empresa está inativa.');
  }

  const now = new Date().toISOString();
  const userRef = doc(db, 'users', uid);
  
  await setDoc(userRef, {
    uid,
    email: userEmail,
    displayName: userEmail.split('@')[0],
    role: 'supervisor',
    organizationId: orgData.id,
    managedTeams: selectedTeamIds,
    teamId: selectedTeamIds.length > 0 ? selectedTeamIds[0] : null,
    createdAt: now
  }, { merge: true });

  const batch = writeBatch(db);
  for (const teamId of selectedTeamIds) {
    const teamRef = doc(db, 'teams', teamId);
    batch.update(teamRef, {
      supervisorId: uid
    });
  }
  await batch.commit();

  await updateDoc(orgDoc.ref, { supervisorInviteToken: null });

  return orgData.name;
};

export const regenerateManagerInviteToken = async (orgId: string): Promise<string> => {
  const token = `MGR-${generateSecureToken(6)}`;
  await updateDoc(doc(db, 'organizations', orgId), {
    managerInviteToken: token
  });
  return token;
};

export const regenerateSupervisorInviteToken = async (orgId: string): Promise<string> => {
  const token = `SUP-${generateSecureToken(6)}`;
  await updateDoc(doc(db, 'organizations', orgId), {
    supervisorInviteToken: token
  });
  return token;
};

export const joinOrganizationAsCoordinator = async (uid: string, userEmail: string, inviteToken: string): Promise<string> => {
  const orgsRef = collection(db, 'organizations');
  const q = query(orgsRef, where('coordinatorInviteToken', '==', inviteToken));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Código de convite de Coordenador inválido.');
  }

  const orgDoc = querySnapshot.docs[0];
  const orgData = orgDoc.data() as Organization;

  if (orgData.status === 'inactive') {
    throw new Error('Esta empresa está inativa.');
  }

  const now = new Date().toISOString();
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email: userEmail,
    displayName: userEmail.split('@')[0],
    role: 'coordinator',
    organizationId: orgData.id,
    createdAt: now
  }, { merge: true });

  await updateDoc(orgDoc.ref, { coordinatorInviteToken: null });

  return orgData.name;
};

export const joinOrganizationAsMonitor = async (uid: string, userEmail: string, inviteToken: string): Promise<string> => {
  const orgsRef = collection(db, 'organizations');
  const q = query(orgsRef, where('monitorInviteToken', '==', inviteToken));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Código de convite de Monitor/QA inválido.');
  }

  const orgDoc = querySnapshot.docs[0];
  const orgData = orgDoc.data() as Organization;

  if (orgData.status === 'inactive') {
    throw new Error('Esta empresa está inativa.');
  }

  const now = new Date().toISOString();
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email: userEmail,
    displayName: userEmail.split('@')[0],
    role: 'monitor',
    organizationId: orgData.id,
    createdAt: now
  }, { merge: true });

  await updateDoc(orgDoc.ref, { monitorInviteToken: null });

  return orgData.name;
};

export const regenerateCoordinatorInviteToken = async (orgId: string): Promise<string> => {
  const token = `COORD-${generateSecureToken(6)}`;
  await updateDoc(doc(db, 'organizations', orgId), {
    coordinatorInviteToken: token
  });
  return token;
};

export const regenerateMonitorInviteToken = async (orgId: string): Promise<string> => {
  const token = `MON-${generateSecureToken(6)}`;
  await updateDoc(doc(db, 'organizations', orgId), {
    monitorInviteToken: token
  });
  return token;
};

export const getPendingInvites = async (organizationId: string): Promise<Invite[]> => {
  const invitesRef = collection(db, 'invites');
  const q = query(
    invitesRef, 
    where('organizationId', '==', organizationId),
    where('status', '==', 'pending')
  );
  const querySnapshot = await getDocs(q);
  
  const now = new Date().getTime();
  const list: Invite[] = [];
  
  for (const inviteDoc of querySnapshot.docs) {
    const data = inviteDoc.data() as Invite;
    if (data.expiresAt && now > new Date(data.expiresAt).getTime()) {
      updateDoc(inviteDoc.ref, { status: 'expired' });
    } else {
      list.push(data);
    }
  }
  
  return list;
};

export const createInvitesInBulk = async (
  invitesData: Array<{ email: string; role: UserRole; teamId: string | null; monthlyServiceValue?: number }>,
  organizationId: string,
  invitedBy: string
): Promise<Invite[]> => {
  const orgRef = doc(db, 'organizations', organizationId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    throw new Error('A organização não foi encontrada.');
  }
  const orgData = orgSnap.data() as Organization;
  if (orgData.status === 'inactive') {
    throw new Error('Esta empresa está suspensa. Não é possível convidar novos membros.');
  }

  const usersRef = collection(db, 'users');
  const userCountQuery = query(usersRef, where('organizationId', '==', organizationId));
  const userCountSnap = await getCountFromServer(userCountQuery);
  const activeUsersCount = userCountSnap.data().count;

  const pendingInvites = await getPendingInvites(organizationId);
  const totalSlotsUsed = activeUsersCount + pendingInvites.length;

  // Checagem de limite apenas para planos com trava explícita (> 0). Para -1 ou null = Ilimitado.
  if (orgData.maxUsers && orgData.maxUsers > 0) {
    if (totalSlotsUsed + invitesData.length > orgData.maxUsers) {
      throw new Error(
        `Limite do plano excedido. Sua empresa possui ${activeUsersCount} membros ativos e ${pendingInvites.length} convites pendentes. Limite máximo: ${orgData.maxUsers} usuários.`
      );
    }
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const createdList: Invite[] = [];

  for (let i = 0; i < invitesData.length; i++) {
    const data = invitesData[i];
    const token = `inv-${generateSecureToken(12).toLowerCase()}`;
    const encodedOrg = typeof window !== 'undefined' ? encodeURIComponent(orgData.name) : encodeURIComponent(orgData.name);
    const orgIdParam = `&orgId=${encodeURIComponent(organizationId)}`;
    const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite?token=${token}${orgIdParam}&org=${encodedOrg}&email=${encodeURIComponent(data.email.trim().toLowerCase())}&role=${data.role}`;
    const roleLabel = 
      data.role === 'super_admin' ? '👑 Administrador Master' :
      data.role === 'manager' ? '🏢 Gerente da Empresa' :
      data.role === 'coordinator' ? '🎯 Coordenador de Operações' :
      data.role === 'supervisor' ? '👥 Supervisor de Equipe' :
      data.role === 'monitor' ? '🛡️ Monitor / QA' :
      data.role === 'backoffice' ? '📋 Backoffice' : '🎧 Operador';

    // Disparo automático via Resend para convites da liderança
    let emailSent = false;
    if (typeof window !== 'undefined') {
      try {
        await sendInviteEmail({
          recipientEmail: data.email.trim().toLowerCase(),
          orgName: orgData.name,
          roleName: roleLabel,
          inviteUrl
        });
        emailSent = true;
      } catch (err) {
        console.error('[createInvitesInBulk] Erro ao disparar e-mail:', err);
        emailSent = false;
      }
    }

    const invite: Invite = {
      id: token,
      email: data.email.trim().toLowerCase(),
      role: data.role,
      teamId: data.teamId,
      organizationId,
      orgName: orgData.name,
      status: 'pending',
      token,
      invitedBy,
      createdAt: now,
      expiresAt,
      emailSent,
      monthlyServiceValue: data.monthlyServiceValue || undefined
    };

    await setDoc(doc(db, 'invites', token), invite);
    createdList.push(invite);
  }

  return createdList;
};

export const revokeInvite = async (inviteId: string): Promise<void> => {
  await deleteDoc(doc(db, 'invites', inviteId));
};

export const validateInvite = async (token: string): Promise<Invite | null> => {
  if (!token) return null;
  const cleanToken = token.trim();

  try {
    let inviteData: Invite | null = null;
    let inviteRefDoc: any = null;

    // Tentativa 1: busca direta por ID do documento (padrão unificado invites/{token})
    const directDocRef = doc(db, 'invites', cleanToken);
    const directSnap = await getDoc(directDocRef);
    if (directSnap.exists()) {
      inviteData = { id: directSnap.id, ...directSnap.data() } as Invite;
      inviteRefDoc = directDocRef;
    } else {
      // Tentativa 2: fallback por query de campo token para retrocompatibilidade
      const invitesRef = collection(db, 'invites');
      const q = query(invitesRef, where('token', '==', cleanToken));
      const snap = await getDocs(q);
      if (!snap.empty) {
        inviteData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Invite;
        inviteRefDoc = snap.docs[0].ref;
      }
    }

    // Tentativa 3: token de liderança direto da organização (MGR-/SUP-/COORD-/MON-)
    if (!inviteData && (cleanToken.startsWith('MGR-') || cleanToken.startsWith('SUP-') || cleanToken.startsWith('COORD-') || cleanToken.startsWith('MON-'))) {
      const orgsRef = collection(db, 'organizations');
      let qField: string;
      let role: UserRole;
      if (cleanToken.startsWith('MGR-')) {
        qField = 'managerInviteToken';
        role = 'manager';
      } else if (cleanToken.startsWith('SUP-')) {
        qField = 'supervisorInviteToken';
        role = 'supervisor';
      } else if (cleanToken.startsWith('COORD-')) {
        qField = 'coordinatorInviteToken';
        role = 'coordinator';
      } else {
        qField = 'monitorInviteToken';
        role = 'monitor';
      }
      const q = query(orgsRef, where(qField, '==', cleanToken));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const orgDoc = snap.docs[0];
        const orgData = orgDoc.data();
        inviteData = {
          id: cleanToken,
          token: cleanToken,
          organizationId: orgDoc.id,
          orgName: orgData.name,
          role,
          status: orgData.status === 'inactive' ? 'revoked' : 'pending',
          createdAt: orgData.createdAt || new Date().toISOString()
        } as Invite;
      }
    }

    if (!inviteData) return null;

    // Se já foi aceito ou revogado
    if (inviteData.status !== 'pending') {
      return null;
    }

    // Validação de expiração
    if (inviteData.expiresAt && new Date().getTime() > new Date(inviteData.expiresAt).getTime()) {
      if (inviteRefDoc) {
        await updateDoc(inviteRefDoc, { status: 'expired' }).catch(() => {});
      }
      return null;
    }

    // Busca sempre o nome atualizado e oficial da organização no Firestore
    if (inviteData.organizationId) {
      try {
        const orgSnap = await getDoc(doc(db, 'organizations', inviteData.organizationId));
        if (orgSnap.exists()) {
          const orgData = orgSnap.data();
          inviteData.orgName = orgData.name;
          if (orgData.status === 'inactive') {
            return null; // Empresa suspensa
          }
        }
      } catch {}
    }

    return inviteData;
  } catch (error) {
    console.warn('[validateInvite] Erro ao validar convite no Firestore:', error);
    return null;
  }
};

export const acceptInvite = async (uid: string, token: string, customDisplayName?: string): Promise<void> => {
  if (!token) throw new Error('Token de convite obrigatório.');
  const cleanToken = token.trim();

  let inviteData: Invite | null = null;
  let inviteDocRef: any = null;

  // Busca o convite por ID direto ou por token
  const directDocRef = doc(db, 'invites', cleanToken);
  const directSnap = await getDoc(directDocRef);
  if (directSnap.exists()) {
    inviteData = directSnap.data() as Invite;
    inviteDocRef = directDocRef;
  } else {
    const invitesRef = collection(db, 'invites');
    const q = query(invitesRef, where('token', '==', cleanToken));
    const snap = await getDocs(q);
    if (!snap.empty) {
      inviteData = snap.docs[0].data() as Invite;
      inviteDocRef = snap.docs[0].ref;
    }
  }

  // Se for token de liderança (MGR / SUP / COORD / MON) direto da organização
  let orgDocRefToClearToken: any = null;
  if (!inviteData && (cleanToken.startsWith('MGR-') || cleanToken.startsWith('SUP-') || cleanToken.startsWith('COORD-') || cleanToken.startsWith('MON-'))) {
    const orgsRef = collection(db, 'organizations');
    let qField: string;
    let role: UserRole;
    if (cleanToken.startsWith('MGR-')) {
      qField = 'managerInviteToken';
      role = 'manager';
    } else if (cleanToken.startsWith('SUP-')) {
      qField = 'supervisorInviteToken';
      role = 'supervisor';
    } else if (cleanToken.startsWith('COORD-')) {
      qField = 'coordinatorInviteToken';
      role = 'coordinator';
    } else {
      qField = 'monitorInviteToken';
      role = 'monitor';
    }
    const q = query(orgsRef, where(qField, '==', cleanToken));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const orgDoc = snap.docs[0];
      const orgData = orgDoc.data();
      inviteData = {
        id: cleanToken,
        token: cleanToken,
        organizationId: orgDoc.id,
        orgName: orgData.name,
        role,
        status: 'pending',
        createdAt: orgData.createdAt || new Date().toISOString()
      } as Invite;
      orgDocRefToClearToken = { ref: orgDoc.ref, field: qField };
    }
  }

  if (!inviteData || !inviteData.organizationId) {
    throw new Error('INVITE_INVALID: Convite não encontrado ou sem organização associada.');
  }

  // Validação de identidade: garante integridade do e-mail do convite se informado
  const currentAuthEmail = auth.currentUser?.email?.toLowerCase().trim();
  const inviteEmail = inviteData.email?.toLowerCase().trim();
  if (currentAuthEmail && inviteEmail && currentAuthEmail !== inviteEmail) {
    throw new Error(`INVITE_EMAIL_MISMATCH: O convite foi emitido para ${inviteEmail}, mas você está autenticado como ${currentAuthEmail}.`);
  }

  const activeEmail = currentAuthEmail || inviteEmail || '';
  const now = new Date().toISOString();
  const nameToSave = customDisplayName?.trim() || activeEmail.split('@')[0] || 'Usuário';

  const userProfile: Record<string, any> = {
    uid,
    email: activeEmail,
    displayName: nameToSave,
    role: inviteData.role || 'member',
    organizationId: inviteData.organizationId,
    acceptedTermsAt: now,
    createdAt: now
  };
  if (inviteData.teamId) userProfile.teamId = inviteData.teamId;
  if (inviteData.role === 'supervisor' && inviteData.teamId) userProfile.managedTeams = [inviteData.teamId];
  if (inviteData.invitedBy) userProfile.managerId = inviteData.invitedBy;
  if (inviteData.monthlyServiceValue) userProfile.monthlyServiceValue = inviteData.monthlyServiceValue;

  await setDoc(doc(db, 'users', uid), userProfile, { merge: true });

  if (inviteData.role === 'supervisor' && inviteData.teamId) {
    await updateDoc(doc(db, 'teams', inviteData.teamId), {
      supervisorId: uid
    }).catch(() => {});
  }

  if (inviteDocRef) {
    await updateDoc(inviteDocRef, { status: 'accepted' }).catch(() => {});
  }

  if (orgDocRefToClearToken) {
    await updateDoc(orgDocRefToClearToken.ref, { [orgDocRefToClearToken.field]: null }).catch(() => {});
  }
};

export const assignUserToTeam = async (uid: string, teamId: string | null): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('Usuário não encontrado.');
  }

  const userData = userSnap.data() as UserProfile;

  await updateDoc(userRef, {
    teamId: teamId || null,
    managedTeams: userData.role === 'supervisor' && teamId ? arrayUnion(teamId) : (userData.managedTeams || undefined)
  });

  // Se o usuário for supervisor e for vinculado a um time, define supervisorId no time
  if (userData.role === 'supervisor' && teamId) {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      supervisorId: uid
    });
  }
};

export const getUnassignedUsers = async (organizationId: string): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('organizationId', '==', organizationId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs
    .map(doc => doc.data() as UserProfile)
    .filter(user => !user.teamId && user.role !== 'super_admin' && user.role !== 'manager');
};

