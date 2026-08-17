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
 * Envia e-mail de convite corporativo via Vercel Serverless Function (/api/send-email).
 * A chave do Resend é lida exclusivamente das variáveis de ambiente do servidor Vercel.
 * Fallback: Fila Firestore Trigger Email caso a serverless function falhe.
 */
export const sendInviteEmail = async ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl,
  fromName = 'Tracker Platform'
}: SendInviteEmailParams): Promise<SendEmailResult> => {
  const cleanEmail = recipientEmail.trim().toLowerCase();

  // Tentativa 1: Endpoint serverless oficial na Vercel (/api/send-email)
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

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText };
    }

    if (response.ok && (data.success || data.id)) {
      return {
        success: true,
        messageId: data.id || 'resend-ok'
      };
    }

    if (!response.ok) {
      console.warn('[sendInviteEmail] Servidor retornou erro:', data);
      // Se não for erro 404 de rota inexistente, retorna o erro real do Resend
      if (response.status !== 404) {
        return {
          success: false,
          error: data.error || data.message || `Erro ${response.status} ao enviar e-mail.`
        };
      }
    }
  } catch (err: any) {
    console.warn('[sendInviteEmail] Falha na conexão com /api/send-email:', err);
  }

  // Tentativa 2 (Fallback): Fila do Firestore Trigger Email
  try {
    const htmlContent = generateInviteEmailHtml({
      recipientEmail: cleanEmail,
      orgName,
      roleName,
      inviteUrl
    });

    const mailDoc = await addDoc(collection(db, 'mail'), {
      to: [cleanEmail],
      message: {
        subject: `🚀 Convite de Acesso Corporativo — ${orgName} (Tracker Platform)`,
        html: htmlContent
      },
      createdAt: new Date().toISOString(),
      metadata: { orgName, roleName, inviteUrl }
    });

    return {
      success: true,
      messageId: `firestore-mail-${mailDoc.id}`
    };
  } catch (firestoreError: any) {
    console.error('[sendInviteEmail] Erro ao gravar na fila:', firestoreError);
    return {
      success: false,
      error: 'Não foi possível disparar o e-mail via Vercel Serverless Function ou fila do Firestore.'
    };
  }
};

export { generateInviteEmailHtml };
