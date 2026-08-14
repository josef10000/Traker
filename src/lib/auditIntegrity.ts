import { db } from './firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export interface AuditLog {
  id: string;
  hash: string;
  previousHash: string;
  userId: string;
  action: string;
  timestamp: any;
  [key: string]: any;
}

export interface IntegrityResult {
  valid: boolean;
  totalChecked: number;
  corruptedLogs: { id: string; expected: string; found: string }[];
  checkedAt: string;
}

/**
 * Re-calcula a cadeia SHA-256 dos logs de auditoria e detecta qualquer inconsistência.
 * Idêntico ao processo do src/lib/audit.ts, mas para verificação (read-only).
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAuditChain(organizationId: string): Promise<IntegrityResult> {
  const logsRef = collection(db, 'audit_logs');
  const q = query(logsRef, orderBy('timestamp', 'asc'));
  const snap = await getDocs(q);

  // Filtrar apenas logs da organização
  const logs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as AuditLog))
    .filter((l) => l.organizationId === organizationId);

  const corruptedLogs: IntegrityResult['corruptedLogs'] = [];

  let previousHash = 'genesis-block';
  for (const log of logs) {
    // Recalcular o hash esperado com EXATAMENTE os mesmos campos e formato usados na criação (audit.ts)
    // Formato: userId|action|timestamp|JSON.stringify(details)|previousHash
    const payload = `${log.userId}|${log.action}|${log.timestamp}|${JSON.stringify(log.details)}|${previousHash}`;
    const expectedHash = await sha256(payload);

    if (log.hash !== expectedHash) {
      corruptedLogs.push({
        id: log.id,
        expected: expectedHash,
        found: log.hash,
      });
    }

    previousHash = log.hash;
  }

  return {
    valid: corruptedLogs.length === 0,
    totalChecked: logs.length,
    corruptedLogs,
    checkedAt: new Date().toISOString(),
  };
}
