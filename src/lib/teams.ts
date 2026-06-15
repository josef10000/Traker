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
import { Team, UserProfile, UserRole } from '../types';

const generateSecureToken = (length: number): string => {
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

export const createTeam = async (uid: string, userEmail: string, teamName: string): Promise<string> => {
  const teamId = generateSecureToken(9);
  const inviteToken = generateSecureToken(12);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // Expira em 48h
  
  const teamData: Team = {
    id: teamId,
    name: teamName,
    supervisorId: uid,
    inviteToken,
    inviteTokenExpiresAt: expiresAt,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'teams', teamId), teamData);

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      role: 'supervisor' as UserRole,
      managedTeams: arrayUnion(teamId),
      teamId: userSnap.data().teamId || teamId
    });
  } else {
    const userProfile: UserProfile = {
      uid,
      email: userEmail,
      displayName: userEmail.split('@')[0],
      role: 'supervisor',
      teamId,
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

  const userProfile: UserProfile = {
    uid,
    email: userEmail,
    displayName: userEmail.split('@')[0],
    role: 'member',
    teamId: teamData.id,
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
