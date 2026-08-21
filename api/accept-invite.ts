import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import serviceAccountFallback from '../service-account.json';

const PRODUCTION_DATABASE_ID = 'ai-studio-764c464a-6ef4-407d-8079-cfe6869a3634';

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
      console.warn('[accept-invite] Falha ao parsear FIREBASE_SERVICE_ACCOUNT JSON:', e);
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
      console.warn('[accept-invite] Falha ao inicializar com variáveis individuais:', e);
    }
  }

  try {
    if (serviceAccountFallback && (serviceAccountFallback as any).private_key) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccountFallback as any),
      });
    }
  } catch (e) {
    console.warn('[accept-invite] Falha ao inicializar com fallback embutido:', e);
  }

  try {
    return admin.initializeApp();
  } catch (e) {
    console.error('[accept-invite] Erro crítico ao inicializar o Firebase Admin:', e);
    throw new Error('Credenciais do Firebase Admin SDK não configuradas no servidor.');
  }
}

function leadershipFieldAndRole(token: string): { field: string; role: string } | null {
  if (token.startsWith('MGR-')) return { field: 'managerInviteToken', role: 'manager' };
  if (token.startsWith('SUP-')) return { field: 'supervisorInviteToken', role: 'supervisor' };
  if (token.startsWith('COORD-')) return { field: 'coordinatorInviteToken', role: 'coordinator' };
  if (token.startsWith('MON-')) return { field: 'monitorInviteToken', role: 'monitor' };
  return null;
}

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const app = getFirebaseAdminApp();
    const authAdmin = getAuth(app);
    const db = getFirestore(app, PRODUCTION_DATABASE_ID);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização ausente. Faça login após criar a conta.' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!idToken) {
      return res.status(401).json({ error: 'ID Token não fornecido.' });
    }

    const decoded = await authAdmin.verifyIdToken(idToken);
    const uid = decoded.uid;
    const authEmail = (decoded.email || '').toLowerCase().trim();

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const orgIdHint = typeof body.orgId === 'string' ? body.orgId.trim() : undefined;
    const displayName =
      typeof body.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim()
        : authEmail.split('@')[0] || 'Usuário';

    if (!token) {
      return res.status(400).json({ error: 'Token de convite obrigatório.' });
    }

    let inviteData: Record<string, any> | null = null;
    let inviteDocRef: FirebaseFirestore.DocumentReference | null = null;
    let orgTokenFieldToClear: { orgId: string; field: string } | null = null;

    const inviteSnap = await db.collection('invites').doc(token).get();
    if (inviteSnap.exists) {
      inviteData = { id: inviteSnap.id, ...inviteSnap.data() };
      inviteDocRef = inviteSnap.ref;
    }

    if (!inviteData) {
      const leadership = leadershipFieldAndRole(token);
      if (leadership) {
        if (!orgIdHint) {
          return res.status(400).json({
            error: 'INVITE_INVALID: Token de liderança requer orgId na URL.',
          });
        }
        const orgSnap = await db.collection('organizations').doc(orgIdHint).get();
        if (!orgSnap.exists) {
          return res.status(404).json({ error: 'INVITE_INVALID: Organização não encontrada.' });
        }
        const orgData = orgSnap.data() || {};
        if (orgData[leadership.field] === token) {
          inviteData = {
            id: token,
            token,
            organizationId: orgSnap.id,
            orgName: orgData.name,
            role: leadership.role,
            status: orgData.status === 'inactive' ? 'revoked' : 'pending',
            createdAt: orgData.createdAt || new Date().toISOString(),
          };
          orgTokenFieldToClear = { orgId: orgSnap.id, field: leadership.field };
        }
      }
    }

    if (!inviteData || !inviteData.organizationId) {
      return res.status(404).json({
        error: 'INVITE_INVALID: Convite não encontrado ou sem organização associada.',
      });
    }

    if (inviteData.status && inviteData.status !== 'pending') {
      return res.status(410).json({
        error: 'INVITE_INVALID: Este convite já foi utilizado ou está expirado.',
      });
    }

    if (inviteData.expiresAt && Date.now() > new Date(inviteData.expiresAt).getTime()) {
      return res.status(410).json({
        error: 'INVITE_INVALID: Este convite expirou. Solicite um novo link à liderança.',
      });
    }

    const inviteEmail = (inviteData.email || '').toLowerCase().trim();
    if (authEmail && inviteEmail && authEmail !== inviteEmail) {
      return res.status(403).json({
        error: `INVITE_EMAIL_MISMATCH: O convite foi emitido para ${inviteEmail}, mas você está autenticado como ${authEmail}.`,
      });
    }

    const orgSnap = await db.collection('organizations').doc(inviteData.organizationId).get();
    if (!orgSnap.exists) {
      return res.status(404).json({ error: 'INVITE_INVALID: Organização vinculada não existe mais.' });
    }
    const orgData = orgSnap.data() || {};
    if (orgData.status === 'inactive') {
      return res.status(403).json({ error: 'INVITE_INVALID: Esta empresa está suspensa.' });
    }

    const now = new Date().toISOString();
    const role = inviteData.role || 'member';
    const userProfile: Record<string, any> = {
      uid,
      email: authEmail || inviteEmail || '',
      displayName,
      role,
      organizationId: inviteData.organizationId,
      acceptedTermsAt: now,
      createdAt: now,
      updatedAt: now,
    };
    if (inviteData.teamId) userProfile.teamId = inviteData.teamId;
    if (role === 'supervisor' && inviteData.teamId) {
      userProfile.managedTeams = [inviteData.teamId];
    }
    if (inviteData.invitedBy) userProfile.managerId = inviteData.invitedBy;
    if (inviteData.monthlyServiceValue != null) {
      userProfile.monthlyServiceValue = inviteData.monthlyServiceValue;
    }

    await db.collection('users').doc(uid).set(userProfile, { merge: true });

    if (role === 'supervisor' && inviteData.teamId) {
      try {
        await db.collection('teams').doc(inviteData.teamId).update({ supervisorId: uid });
      } catch (e) {
        console.warn('[accept-invite] Falha ao atualizar supervisorId no time:', e);
      }
    }

    if (inviteDocRef) {
      try {
        await inviteDocRef.update({ status: 'accepted', acceptedAt: now, acceptedBy: uid });
      } catch (e) {
        console.warn('[accept-invite] Falha ao marcar invite como accepted:', e);
      }
    }

    if (orgTokenFieldToClear) {
      try {
        await db
          .collection('organizations')
          .doc(orgTokenFieldToClear.orgId)
          .update({ [orgTokenFieldToClear.field]: null });
      } catch (e) {
        console.warn('[accept-invite] Falha ao limpar token de liderança na org:', e);
      }
    }

    return res.status(200).json({
      success: true,
      profile: {
        uid,
        email: userProfile.email,
        displayName,
        role,
        organizationId: inviteData.organizationId,
        orgName: orgData.name || inviteData.orgName || null,
        teamId: inviteData.teamId || null,
      },
    });
  } catch (error: any) {
    console.error('[accept-invite] Erro crítico:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao aceitar convite.',
    });
  }
}
