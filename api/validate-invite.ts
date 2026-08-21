import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccountFallback from '../service-account.json';

const PRODUCTION_DATABASE_ID = 'ai-studio-764c464a-6ef4-407d-8079-cfe6869a3634';

/**
 * Validação server-side de convites (Admin SDK).
 * Contorna regras do cliente e App Check — essencial porque o app usa
 * o banco nomeado `ai-studio-764c464a-6ef4-407d-8079-cfe6869a3634`.
 * As regras publicadas no console em (default) NÃO se aplicam a este banco.
 */
function getFirebaseAdminApp() {
  if (admin.apps && admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.warn('[validate-invite] Falha ao parsear FIREBASE_SERVICE_ACCOUNT:', e);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL_ADDRESS;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (rawKey && clientEmail && projectId) {
    try {
      const privateKey = rawKey.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1');
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (e) {
      console.warn('[validate-invite] Falha com variáveis individuais:', e);
    }
  }

  try {
    if (serviceAccountFallback && (serviceAccountFallback as any).private_key) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccountFallback as any),
      });
    }
  } catch (e) {
    console.warn('[validate-invite] Falha com service-account.json:', e);
  }

  try {
    return admin.initializeApp();
  } catch (e) {
    console.error('[validate-invite] Erro crítico Admin SDK:', e);
    throw new Error('Credenciais do Firebase Admin SDK não configuradas.');
  }
}

function getAdminDb() {
  const app = getFirebaseAdminApp();
  return getFirestore(app, PRODUCTION_DATABASE_ID);
}

type InvitePayload = {
  id: string;
  token: string;
  organizationId: string;
  orgName?: string;
  role: string;
  status: string;
  email?: string;
  teamId?: string;
  expiresAt?: string;
  createdAt?: string;
  invitedBy?: string;
  monthlyServiceValue?: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tokenRaw =
      (req.method === 'GET' ? req.query.token : (req.body as any)?.token) ||
      (req.method === 'GET' ? req.query.invite : (req.body as any)?.invite);
    const orgIdRaw =
      (req.method === 'GET' ? req.query.orgId : (req.body as any)?.orgId) ||
      (req.method === 'GET' ? req.query.org_id : (req.body as any)?.org_id) ||
      (req.method === 'GET' ? req.query.organizationId : (req.body as any)?.organizationId);

    const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : '';
    const orgIdHint = typeof orgIdRaw === 'string' ? orgIdRaw.trim() : undefined;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'token_required' });
    }

    const db = getAdminDb();
    let invite: InvitePayload | null = null;

    // 1) Documento em invites/{token}
    const inviteSnap = await db.collection('invites').doc(token).get();
    if (inviteSnap.exists) {
      const data = inviteSnap.data() || {};
      invite = {
        id: inviteSnap.id,
        token: (data.token as string) || inviteSnap.id,
        organizationId: data.organizationId as string,
        orgName: data.orgName as string | undefined,
        role: (data.role as string) || 'member',
        status: (data.status as string) || 'pending',
        email: data.email as string | undefined,
        teamId: data.teamId as string | undefined,
        expiresAt: data.expiresAt as string | undefined,
        createdAt: data.createdAt as string | undefined,
        invitedBy: data.invitedBy as string | undefined,
        monthlyServiceValue: data.monthlyServiceValue as number | undefined,
      };
    }

    // 2) Token de liderança (MGR-/SUP-/COORD-/MON-) no doc da organização
    if (
      !invite &&
      (token.startsWith('MGR-') ||
        token.startsWith('SUP-') ||
        token.startsWith('COORD-') ||
        token.startsWith('MON-'))
    ) {
      if (!orgIdHint) {
        return res.status(200).json({
          valid: false,
          error: 'leadership_token_requires_orgId',
          message: 'Token de liderança exige orgId na URL (&orgId=...).',
        });
      }

      const orgSnap = await db.collection('organizations').doc(orgIdHint).get();
      if (orgSnap.exists) {
        const org = orgSnap.data() || {};
        let field: string | null = null;
        let role = 'member';
        if (token.startsWith('MGR-')) {
          field = 'managerInviteToken';
          role = 'manager';
        } else if (token.startsWith('SUP-')) {
          field = 'supervisorInviteToken';
          role = 'supervisor';
        } else if (token.startsWith('COORD-')) {
          field = 'coordinatorInviteToken';
          role = 'coordinator';
        } else {
          field = 'monitorInviteToken';
          role = 'monitor';
        }

        if (field && org[field] === token) {
          invite = {
            id: token,
            token,
            organizationId: orgSnap.id,
            orgName: org.name as string | undefined,
            role,
            status: org.status === 'inactive' ? 'revoked' : 'pending',
            createdAt: (org.createdAt as string) || new Date().toISOString(),
          };
        }
      }
    }

    if (!invite) {
      return res.status(200).json({ valid: false, error: 'not_found' });
    }

    if (invite.status !== 'pending') {
      return res.status(200).json({ valid: false, error: 'not_pending', status: invite.status });
    }

    if (invite.expiresAt && Date.now() > new Date(invite.expiresAt).getTime()) {
      return res.status(200).json({ valid: false, error: 'expired' });
    }

    // Enriquece com nome da org e bloqueia org inativa
    if (invite.organizationId) {
      try {
        const orgSnap = await db.collection('organizations').doc(invite.organizationId).get();
        if (orgSnap.exists) {
          const org = orgSnap.data() || {};
          invite.orgName = (org.name as string) || invite.orgName;
          if (org.status === 'inactive') {
            return res.status(200).json({ valid: false, error: 'org_inactive' });
          }
        }
      } catch (e) {
        console.warn('[validate-invite] Falha ao ler organização:', e);
      }
    }

    return res.status(200).json({ valid: true, invite });
  } catch (error: any) {
    console.error('[validate-invite] Erro:', error);
    return res.status(500).json({
      valid: false,
      error: 'server_error',
      message: error?.message || 'Internal error',
    });
  }
}
