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
    | 'EXPORT_CSV';
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
        id: `sandbox-audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        userId: user?.uid || 'sandbox-user-1',
        userEmail: user?.email || 'operador.teste@noverde.com.br',
        userName: userName || 'Carlos Silva',
        organizationId: 'sandbox-test',
        action,
        details,
        timestamp
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;
    // organizationId é obrigatório para satisfazer a Firestore Rule de audit_logs
    if (!organizationId) {
      console.warn('[Audit] logAudit chamado sem organizationId — log não gravado.');
      return;
    }

    // Buscar o último log global no banco para encadear os hashes
    let previousHash = 'genesis-block';
    const auditLogsRef = collection(db, 'audit_logs');
    const q = query(auditLogsRef, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const lastLog = snapshot.docs[0].data() as AuditLog;
      if (lastLog.hash) {
        previousHash = lastLog.hash;
      }
    }

    const timestamp = new Date().toISOString();
    
    // Monta o payload de dados do bloco para assinar com o hash
    const payload = `${user.uid}|${action}|${timestamp}|${JSON.stringify(details)}|${previousHash}`;
    const hash = await generateSHA256(payload);

    const auditLog: AuditLog = {
      userId: user.uid,
      userEmail: user.email,
      userName: userName,
      organizationId,
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
