import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import serviceAccountFallback from '../service-account.json';

const PRODUCTION_DATABASE_ID = 'ai-studio-764c464a-6ef4-407d-8079-cfe6869a3634';

// Inicialização segura do Firebase Admin SDK com suporte a múltiplos formatos de credenciais
function getFirebaseAdminApp() {
  if (admin.apps && admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  // Estratégia 1: FIREBASE_SERVICE_ACCOUNT JSON completo via env
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.warn('[delete-organization] Falha ao parsear FIREBASE_SERVICE_ACCOUNT JSON:', e);
    }
  }

  // Estratégia 2: Variáveis individuais (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID)
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
      console.warn('[delete-organization] Falha ao inicializar com variáveis individuais:', e);
    }
  }

  // Estratégia 3: Fallback embutido com serviceAccountFallback
  try {
    if (serviceAccountFallback && (serviceAccountFallback as any).private_key) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccountFallback as any),
      });
    }
  } catch (e) {
    console.warn('[delete-organization] Falha ao inicializar com fallback embutido:', e);
  }

  // Estratégia 4: Default Application Credentials (GCP/Firebase hosting)
  try {
    return admin.initializeApp();
  } catch (e) {
    console.error('[delete-organization] Erro crítico ao inicializar o Firebase Admin:', e);
    throw new Error('Credenciais do Firebase Admin SDK não configuradas no servidor.');
  }
}

const isMasterAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return e === 'hubsymples@gmail.com' || e === 'admin@traker.com.br' || e.includes('hubsymples');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
      return res.status(401).json({ error: 'Token de autorização ausente ou malformado.' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!idToken) {
      return res.status(401).json({ error: 'ID Token não fornecido.' });
    }

    // 1. Validar identidade e permissões do solicitante
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const callerUid = decodedToken.uid;
    const callerEmail = decodedToken.email || '';

    const { orgId } = req.body;
    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({ error: 'Identificador da organização (orgId) obrigatório.' });
    }

    // 2. Verificar se o solicitante é Super Admin ou Gerente da organização
    let isAuthorized = isMasterAdminEmail(callerEmail);
    if (!isAuthorized) {
      const callerUserDoc = await db.collection('users').doc(callerUid).get();
      if (callerUserDoc.exists) {
        const callerData = callerUserDoc.data();
        if (callerData?.role === 'super_admin' || (callerData?.role === 'manager' && callerData?.organizationId === orgId)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Permissão negada. Apenas administradores ou gerentes da organização podem excluí-la.' });
    }

    // 3. Obter todos os UIDs dos usuários vinculados à organização
    const usersSnapshot = await db.collection('users').where('organizationId', '==', orgId).get();
    const uidsToDelete: string[] = [];
    usersSnapshot.forEach(doc => {
      uidsToDelete.push(doc.id);
    });

    // 4. Buscar e deletar todos os documentos das coleções vinculadas
    const collectionsToDelete = [
      'users',
      'invites',
      'teams',
      'agreements',
      'monthly_stats',
      'audit_logs',
      'settings',
      'notifications',
      'custom_origins',
      'transfers',
      'attendances',
      'knowledge_base',
      'reconciliations'
    ];

    let totalDeletedDocs = 0;

    for (const colName of collectionsToDelete) {
      const snapshot = await db.collection(colName).where('organizationId', '==', orgId).get();
      if (!snapshot.empty) {
        const docs = snapshot.docs;
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = db.batch();
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
          totalDeletedDocs += chunk.length;
        }
      }
    }

    // 5. Deletar subcoleções de organizations/{orgId}
    const subcollections = ['survey_configs', 'survey_responses', 'knowledge_base', 'import_history'];
    for (const subCol of subcollections) {
      const subSnap = await db.collection(`organizations/${orgId}/${subCol}`).get();
      if (!subSnap.empty) {
        const docs = subSnap.docs;
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = db.batch();
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
          totalDeletedDocs += chunk.length;
        }
      }
    }

    // 6. Excluir permanentemente todas as contas correspondentes do Firebase Authentication
    let deletedAuthUsersCount = 0;
    const authErrors: string[] = [];

    if (uidsToDelete.length > 0) {
      for (const uid of uidsToDelete) {
        try {
          await authAdmin.deleteUser(uid);
          deletedAuthUsersCount++;
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found') {
            deletedAuthUsersCount++;
          } else {
            console.error(`[delete-organization] Erro ao deletar UID ${uid} do Firebase Auth:`, authErr);
            authErrors.push(`UID ${uid}: ${authErr.message || authErr.code}`);
          }
        }
      }
    }

    if (authErrors.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Exclusão parcial no Firebase Authentication: ${authErrors.join(', ')}`
      });
    }

    // 7. Deletar o documento raiz da organização
    await db.collection('organizations').doc(orgId).delete();
    totalDeletedDocs++;

    return res.status(200).json({
      success: true,
      message: `Organização ${orgId} excluída permanentemente com sucesso.`,
      deletedUsersCount: deletedAuthUsersCount,
      deletedDocsCount: totalDeletedDocs
    });
  } catch (error: any) {
    console.error('[delete-organization] Erro crítico ao excluir organização:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao excluir organização.'
    });
  }
}
