import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Inicialização segura e singleton do Firebase Admin SDK
if (admin.apps.length === 0) {
  try {
    // 1. Tentar carregar variáveis de ambiente (produção Vercel recomendada)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // 2. Fallback para arquivo local service-account.json
      const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        throw new Error('Chaves de autenticação do Firebase Admin não encontradas.');
      }
    }
  } catch (error: any) {
    console.error('Erro ao inicializar o Firebase Admin:', error);
  }
}

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { integrationCode, crmOrgId, crmClientId, crmPublicToken } = req.body;

  // Validação simples de parâmetros
  if (!integrationCode || !crmOrgId || !crmClientId || !crmPublicToken) {
    return res.status(400).json({ error: 'Parâmetros ausentes (integrationCode, crmOrgId, crmClientId, crmPublicToken são obrigatórios)' });
  }

  try {
    // Localizar a empresa no Firestore na coleção 'organizations'
    // O ID do documento é o próprio ID da organização (que serve como integrationCode)
    const orgRef = db.collection('organizations').doc(integrationCode);
    const docSnap = await orgRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Empresa com código de vinculação não encontrada.' });
    }

    const orgData = docSnap.data();

    // Salvar tokens do CRM no cadastro da empresa
    await orgRef.update({
      crmOrgId,
      crmClientId,
      crmPublicToken,
      // Se houver alguma data limite de expiração do plano de um cancelamento anterior, limpamos
      // para que a empresa volte a ter acesso ativo ao ser integrada/reintegrada
      planExpiresAt: admin.firestore.FieldValue.delete()
    });

    console.log(`Empresa "${orgData?.name || integrationCode}" integrada ao CRM com sucesso!`);
    
    return res.status(200).json({ 
      success: true, 
      message: `Empresa integrada com sucesso!` 
    });
  } catch (error: any) {
    console.error('Erro no processamento do webhook:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
}
