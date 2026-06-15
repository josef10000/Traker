import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { CollaborationNote } from '../types';
import { generateSecureToken } from './teams';

export const addCollaborationNote = async (
  noteData: Omit<CollaborationNote, 'id' | 'createdAt'>
): Promise<string> => {
  const noteId = `note-${generateSecureToken(9)}`;
  const now = new Date().toISOString();
  
  const note: CollaborationNote = {
    id: noteId,
    ...noteData,
    createdAt: now
  };

  await setDoc(doc(db, 'collaboration_notes', noteId), note);
  return noteId;
};

export const getCollaborationNotes = async (collaboratorId: string): Promise<CollaborationNote[]> => {
  try {
    const notesRef = collection(db, 'collaboration_notes');
    const q = query(
      notesRef, 
      where('collaboratorId', '==', collaboratorId)
    );
    
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => doc.data() as CollaborationNote);
    
    // Ordenação robusta client-side para evitar erro de índice composto do Firestore
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Erro ao buscar notas do colaborador:', error);
    return [];
  }
};

export const getAttendanceStatusForDay = async (
  collaboratorId: string, 
  dateStr: string // Formato YYYY-MM-DD
): Promise<CollaborationNote | null> => {
  try {
    const notesRef = collection(db, 'collaboration_notes');
    const q = query(
      notesRef,
      where('collaboratorId', '==', collaboratorId),
      where('type', '==', 'attendance')
    );
    
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => doc.data() as CollaborationNote);
    
    // Filtragem de dia client-side
    const targetDate = new Date(dateStr);
    const dayNotes = notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return (
        noteDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
        noteDate.getUTCMonth() === targetDate.getUTCMonth() &&
        noteDate.getUTCDate() === targetDate.getUTCDate()
      );
    });
    
    if (dayNotes.length === 0) return null;
    
    // Retornar o status de presença mais recente inserido hoje
    dayNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return dayNotes[0];
  } catch (error) {
    console.error('Erro ao buscar status de presença:', error);
    return null;
  }
};

export const getOrganizationNotesReport = async (
  orgId: string
): Promise<CollaborationNote[]> => {
  try {
    const notesRef = collection(db, 'collaboration_notes');
    const q = query(
      notesRef,
      where('organizationId', '==', orgId)
    );
    
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => doc.data() as CollaborationNote);
    
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Erro ao gerar relatório consolidado de notas:', error);
    return [];
  }
};
