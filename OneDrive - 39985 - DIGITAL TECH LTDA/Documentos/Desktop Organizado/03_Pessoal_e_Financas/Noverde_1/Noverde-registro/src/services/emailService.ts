import { generateInviteEmailHtml } from '../templates/inviteEmailTemplate';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface SendInviteEmailParams {
  recipientEmail: string;
  orgName: string;
  roleName: string;
  inviteUrl: string;
  fromName?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envia e-mail de convite com fallback duplo:
 * 1. Tenta endpoint serverless /api/send-email (Vercel Resend)
 * 2. Fallback redundante para Firestore Trigger Email (coleção 'mail')
 */
export const sendInviteEmail = async ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl,
  fromName = 'Tracker System'
}: SendInviteEmailParams): Promise<SendEmailResult> => {
  const cleanEmail = recipientEmail.trim().toLowerCase();
  const htmlContent = generateInviteEmailHtml({
    recipientEmail: cleanEmail,
    orgName,
    roleName,
    inviteUrl
  });

  // Tentativa 1: Endpoint serverless /api/send-email
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recipientEmail: cleanEmail, 
        orgName, 
        roleName, 
        inviteUrl, 
        fromName 
      })
    });

    if (response.ok) {
      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { success: true };
      }

      if (data.success || data.id) {
        return {
          success: true,
          messageId: typeof data.id === 'string' ? data.id : undefined
        };
      }
    }
  } catch (err) {
    console.warn('[sendInviteEmail] Falha na rota /api/send-email, acionando fallback do Firestore:', err);
  }

  // Tentativa 2: Gravação na coleção 'mail' do Firebase Trigger Email
  try {
    const mailDoc = await addDoc(collection(db, 'mail'), {
      to: [cleanEmail],
      message: {
        subject: `🚀 Convite de Acesso Corporativo — ${orgName} (Tracker Platform)`,
        html: htmlContent
      },
      createdAt: new Date().toISOString(),
      metadata: {
        orgName,
        roleName,
        inviteUrl
      }
    });

    return {
      success: true,
      messageId: `firestore-mail-${mailDoc.id}`
    };
  } catch (firestoreError: any) {
    console.error('[sendInviteEmail] Erro ao gravar na coleção mail:', firestoreError);
    return {
      success: false,
      error: firestoreError?.message || 'Não foi possível disparar o e-mail pelo servidor ou fila.'
    };
  }
};

export { generateInviteEmailHtml };
