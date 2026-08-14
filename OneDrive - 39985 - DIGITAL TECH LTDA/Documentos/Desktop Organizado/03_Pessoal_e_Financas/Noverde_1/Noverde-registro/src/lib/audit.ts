import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string | null;
  userName: string;
  organizationId: string; // Obrigatório para isolamento multi-tenant nas Firestore Rules
  action: 
    | 'COPY_CPF'
    | 'REVEAL_CPF'
    | 'CREATE_AGREEMENT'
    | 'UPDATE_AGREEMENT'
    | 'EFETIVAR_PAGAMENTO'
    | 'CHECK_AGREEMENT'
    | 'DELETE_AGREEMENT'
    | 'EXPORT_CSV_COMPLETE'
    | 'EXPORT_CSV_MASKED'
    | 'ANONIMIZE_CLIENT'
    | 'ACCEPT_TERMS'
    | 'CREATE_ORGANIZATION'
    | 'DELETE_ORGANIZATION'
    | 'UPDATE_ORGANIZATION_LIMITS'
    | 'FORCE_COLLISION'
    | 'EXPORT_CSV'
    | 'ATTACH_RECEIPT'
    | 'ADD_CPF_NOTE';
  details: Record<string, any>;
  timestamp: string;
  previousHash?: string;
  hash?: string;
}

// Importação tardia dinâmica para evitar dependências circulares com sandboxService
import { sandboxService } from './sandboxService';

// Função assíncrona para gerar hash SHA-256 em formato hexadecimal
async function generateSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

import { secureRandomId } from '../utils/crypto';

export const logAudit = async (
  action: AuditLog['action'],
  details: Record<string, any>,
  userName: string = 'Sistema',
  organizationId?: string
) => {
  try {
    const timestamp = new Date().toISOString();
    const user = auth.currentUser;

    if (organizationId === 'sandbox-test') {
      sandboxService.addAuditLog({
        id: secureRandomId('sandbox-audit'),
        userId: user?.uid || 'sandbox-user-1',
        userEmail: user?.email || 'operador.teste@traker.com.br',
        userName: userName || 'Carlos Silva',
        organizationId: 'sandbox-test',
        action,
        details,
        timestamp
      });
      return;
    }

    if (!user) return;

    // Super admin pode não ter organizationId vinculado — usar fallback 'system'
    const resolvedOrgId = organizationId || 'system';

    // Buscar o último hash com timeout de 3s para não travar a UI
    let previousHash = 'genesis-block';
    try {
      const auditLogsRef = collection(db, 'audit_logs');
      const q = query(auditLogsRef, orderBy('timestamp', 'desc'), limit(1));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      const snapshot = await Promise.race([getDocs(q), timeoutPromise]);
      
      if (!snapshot.empty) {
        const lastLog = snapshot.docs[0].data() as AuditLog;
        if (lastLog.hash) {
          previousHash = lastLog.hash;
        }
      }
    } catch {
      // Se timeout ou erro, continua com genesis-block
    }
    
    // Monta o payload de dados do bloco para assinar com o hash
    const payload = `${user.uid}|${action}|${timestamp}|${JSON.stringify(details)}|${previousHash}`;
    const hash = await generateSHA256(payload);

    const auditLog: AuditLog = {
      userId: user.uid,
      userEmail: user.email,
      userName: userName,
      organizationId: resolvedOrgId,
      action,
      details,
      timestamp,
      previousHash,
      hash
    };

    await addDoc(collection(db, 'audit_logs'), auditLog);
  } catch (error) {
    console.error('Erro ao salvar log de auditoria:', error);
  }
};
