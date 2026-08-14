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
 * Envia e-mail de convite com fallback triplo:
 * 1. Disparo direto via API REST oficial do Resend (https://api.resend.com/emails)
 * 2. Endpoint serverless /api/send-email (Vercel)
 * 3. Fallback redundante para Firestore Trigger Email (coleção 'mail')
 */
export const sendInviteEmail = async ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl,
  fromName = 'Tracker Platform'
}: SendInviteEmailParams): Promise<SendEmailResult> => {
  const cleanEmail = recipientEmail.trim().toLowerCase();
  const htmlContent = generateInviteEmailHtml({
    recipientEmail: cleanEmail,
    orgName,
    roleName,
    inviteUrl
  });

  const resendApiKey = 
    (typeof process !== 'undefined' && process.env?.RESEND_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_RESEND_API_KEY) ||
    (import.meta as any).env?.VITE_RESEND_API_KEY ||
    're_e1T1eJvY_P1h1iH4rA1v2Z6z1w1z3h1y';

  // Tentativa 1: API REST direta do Resend (HTTPS oficial com Bearer token)
  if (resendApiKey && resendApiKey.startsWith('re_')) {
    try {
      const directResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Tracker Platform <onboarding@resend.dev>',
          to: [cleanEmail],
          subject: `🚀 Convite de Acesso Corporativo — ${orgName} (Tracker Platform)`,
          html: htmlContent
        })
      });

      const responseText = await directResponse.text();
      let resendData: any = {};
      try {
        resendData = JSON.parse(responseText);
      } catch {
        resendData = { message: responseText };
      }

      if (directResponse.ok && resendData.id) {
        return {
          success: true,
          messageId: resendData.id
        };
      }
      
      console.warn('[sendInviteEmail] Tentativa direta Resend retornou erro:', resendData);
    } catch (directErr) {
      console.warn('[sendInviteEmail] Falha na chamada direta à API do Resend:', directErr);
    }
  }

  // Tentativa 2: Endpoint serverless /api/send-email
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

  // Tentativa 3: Gravação na coleção 'mail' do Firebase Trigger Email
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
