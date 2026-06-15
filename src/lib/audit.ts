import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface AuditLog {
  userId: string;
  userEmail: string | null;
  userName: string;
  action: 'REVEAL_CPF' | 'EXPORT_CSV_COMPLETE' | 'EXPORT_CSV_MASKED' | 'ANONIMIZE_CLIENT' | 'ACCEPT_TERMS';
  details: Record<string, any>;
  timestamp: string;
}

export const logAudit = async (
  action: AuditLog['action'],
  details: Record<string, any>,
  userName: string = 'Sistema'
) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const auditLog: AuditLog = {
      userId: user.uid,
      userEmail: user.email,
      userName: userName,
      action,
      details,
      timestamp: new Date().toISOString()
    };

    await addDoc(collection(db, 'audit_logs'), auditLog);
  } catch (error) {
    console.error('Erro ao salvar log de auditoria:', error);
  }
};
