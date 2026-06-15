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
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Team, UserProfile, UserRole, Organization } from '../types';

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
  
  const teamData: Team = {
    id: teamId,
    name: teamName,
    supervisorId: null,
    inviteToken,
    inviteTokenExpiresAt: expiresAt,
    organizationId,
    supervisorInviteToken: null,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'teams', teamId), teamData);

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data() as UserProfile;
    if (userData.role === 'manager') {
      // O Gerente não vira supervisor do time. A equipe é criada sem supervisorId
      // e podemos deixar supervisorInviteToken nulo inicialmente ou criar um token
      // Mas o supervisor se vincula pela organizacao inteira agora, o que é melhor!
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

  for (const teamId of selectedTeamIds) {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      supervisorId: uid
    });
  }

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
