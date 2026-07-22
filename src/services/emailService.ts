import { generateInviteEmailHtml } from '../templates/inviteEmailTemplate';

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

export const sendInviteEmail = async ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl,
  fromName = 'Tracker System'
}: SendInviteEmailParams): Promise<SendEmailResult> => {
  try {
    // 1. Tenta chamar o Endpoint Serverless Nativo da Vercel (/api/send-email)
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientEmail,
        orgName,
        roleName,
        inviteUrl,
        fromName
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        messageId: data.id
      };
    }

    // Se o endpoint da Vercel retornar erro, obtém a mensagem
    if (!response.ok && data.error) {
      // Fallback para disparo direto se estiver rodando localmente sem a pasta /api
      const apiKey = (import.meta.env.VITE_RESEND_API_KEY || '').trim();
      if (apiKey) {
        return await sendDirectResendEmail({ recipientEmail, orgName, roleName, inviteUrl, fromName, apiKey });
      }
      return {
        success: false,
        error: data.error
      };
    }

    return {
      success: true,
      messageId: data.id
    };
  } catch (error: any) {
    // Fallback de desenvolvimento local se a rota /api não estiver rodando no localhost
    const apiKey = (import.meta.env.VITE_RESEND_API_KEY || '').trim();
    if (apiKey) {
      return await sendDirectResendEmail({ recipientEmail, orgName, roleName, inviteUrl, fromName, apiKey });
    }

    return {
      success: false,
      error: error.message || 'Erro ao comunicar com a API de e-mails.'
    };
  }
};

const sendDirectResendEmail = async ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl,
  fromName,
  apiKey
}: SendInviteEmailParams & { apiKey: string }): Promise<SendEmailResult> => {
  const htmlContent = generateInviteEmailHtml({
    recipientEmail,
    orgName,
    roleName,
    inviteUrl
  });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <notificacoes@hubsymples.com.br>`,
        to: [recipientEmail],
        subject: `🚀 Convite de Acesso — ${orgName} (Tracker Platform)`,
        html: htmlContent
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || 'Erro no Resend.' };
    }

    return { success: true, messageId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
