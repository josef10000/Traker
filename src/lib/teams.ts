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
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Team, UserProfile, UserRole, Organization, Invite } from '../types';
import { sendInviteEmail } from '../services/emailService';

export const generateSecureToken = (length: number): string => {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback pseudo-aleatório seguro se crypto não estiver disponível
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
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
    plan: 'free',
    maxUsers: 5,
    maxTeams: 1,
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

  // Contar equipes ativas na organização para validar o limite
  const teamsRef = collection(db, 'teams');
  const teamsCountQuery = query(teamsRef, where('organizationId', '==', organizationId));
  const teamsCountSnap = await getDocs(teamsCountQuery);
  if (teamsCountSnap.size >= orgData.maxTeams) {
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

  // Contar membros ativos na organização para validar o limite do plano
  const usersRef = collection(db, 'users');
  const userCountQuery = query(usersRef, where('organizationId', '==', teamData.organizationId));
  const userCountSnap = await getDocs(userCountQuery);
  if (userCountSnap.size >= orgData.maxUsers) {
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
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const getTeamData = async (teamId: string): Promise<Team | null> => {
  const docRef = doc(db, 'teams', teamId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as Team;
  }
  return null;
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
  const userCountSnap = await getDocs(userCountQuery);

  const pendingInvites = await getPendingInvites(organizationId);
  const totalSlotsUsed = userCountSnap.size + pendingInvites.length;

  if (totalSlotsUsed + invitesData.length > orgData.maxUsers) {
    throw new Error(
      `Limite do plano excedido. Sua empresa possui ${userCountSnap.size} membros ativos e ${pendingInvites.length} convites pendentes. Limite máximo: ${orgData.maxUsers} usuários.`
    );
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const createdList: Invite[] = [];

  for (let i = 0; i < invitesData.length; i++) {
    const data = invitesData[i];
    const inviteId = generateSecureToken(12);
    const token = generateSecureToken(16);

    const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${token}`;
    const roleLabel = 
      data.role === 'super_admin' ? '👑 Administrador Master' :
      data.role === 'manager' ? '🏢 Gerente da Empresa' :
      data.role === 'coordinator' ? '🎯 Coordenador de Operações' :
      data.role === 'supervisor' ? '👥 Supervisor de Equipe' :
      data.role === 'monitor' ? '🛡️ Monitor / QA' :
      data.role === 'backoffice' ? '📋 Backoffice' : '🎧 Operador';

    // Disparo automático via Resend para convites da liderança
    if (typeof window !== 'undefined') {
      sendInviteEmail({
        recipientEmail: data.email.trim().toLowerCase(),
        orgName: orgData.name,
        roleName: roleLabel,
        inviteUrl
      }).catch(err => console.error('[createInvitesInBulk] Erro ao disparar e-mail:', err));
    }

    const invite: Invite = {
      id: inviteId,
      email: data.email.trim().toLowerCase(),
      role: data.role,
      teamId: data.teamId,
      organizationId,
      status: 'pending',
      token,
      invitedBy,
      createdAt: now,
      expiresAt,
      monthlyServiceValue: data.monthlyServiceValue || undefined
    };

    await setDoc(doc(db, 'invites', inviteId), invite);
    createdList.push(invite);
  }

  return createdList;
};

export const revokeInvite = async (inviteId: string): Promise<void> => {
  await deleteDoc(doc(db, 'invites', inviteId));
};

export const validateInvite = async (token: string): Promise<Invite | null> => {
  const invitesRef = collection(db, 'invites');
  const q = query(
    invitesRef, 
    where('token', '==', token), 
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const data = snap.docs[0].data() as Invite;
  
  if (data.expiresAt && new Date().getTime() > new Date(data.expiresAt).getTime()) {
    await updateDoc(snap.docs[0].ref, { status: 'expired' });
    return null;
  }

  return data;
};

export const acceptInvite = async (uid: string, token: string): Promise<void> => {
  const invitesRef = collection(db, 'invites');
  const q = query(invitesRef, where('token', '==', token));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Convite não encontrado.');
  }

  const inviteDoc = snap.docs[0];
  const inviteData = inviteDoc.data() as Invite;

  if (inviteData.status !== 'pending') {
    throw new Error('Este convite já foi aceito ou está expirado.');
  }

  const now = new Date().toISOString();

  const userProfile: UserProfile = {
    uid,
    email: inviteData.email,
    displayName: inviteData.email.split('@')[0],
    role: inviteData.role,
    teamId: inviteData.teamId || undefined,
    organizationId: inviteData.organizationId,
    createdAt: now,
    managedTeams: inviteData.role === 'supervisor' && inviteData.teamId ? [inviteData.teamId] : undefined,
    managerId: inviteData.invitedBy || null,
    monthlyServiceValue: inviteData.monthlyServiceValue || undefined
  };

  await setDoc(doc(db, 'users', uid), userProfile);

  if (inviteData.role === 'supervisor' && inviteData.teamId) {
    await updateDoc(doc(db, 'teams', inviteData.teamId), {
      supervisorId: uid
    });
  }

  await updateDoc(inviteDoc.ref, { status: 'accepted' });
};
