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
  // Consumo 100% nativo da variável de ambiente compilada no build da Vercel
  const apiKey = (import.meta.env.VITE_RESEND_API_KEY || '').trim();

  if (!apiKey) {
    console.warn('[emailService] VITE_RESEND_API_KEY não configurada no ambiente nativo.');
    return {
      success: false,
      error: 'A variável de ambiente VITE_RESEND_API_KEY ainda não foi compilada no build da Vercel.'
    };
  }

  const htmlContent = generateInviteEmailHtml({
    recipientEmail,
    orgName,
    roleName,
    inviteUrl
  });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <onboarding@resend.dev>`,
        to: [recipientEmail],
        subject: `🚀 Convite de Acesso — ${orgName} (Tracker Platform)`,
        html: htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[emailService] Erro retornado pela API do Resend:', data);
      return {
        success: false,
        error: data.message || data.error?.message || 'Falha ao enviar e-mail via Resend.'
      };
    }

    return {
      success: true,
      messageId: data.id
    };
  } catch (error: any) {
    console.error('[emailService] Erro ao conectar com o servidor do Resend:', error);
    return {
      success: false,
      error: error.message || 'Erro de rede ao disparar e-mail.'
    };
  }
};
