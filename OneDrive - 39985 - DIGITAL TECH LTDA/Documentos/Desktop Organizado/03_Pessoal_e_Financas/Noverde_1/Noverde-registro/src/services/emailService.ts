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

/**
 * Envia e-mail de convite exclusivamente via endpoint serverless /api/send-email (Vercel).
 * SEGURANCA: A chave Resend NUNCA e exposta no bundle do browser.
 * Ela reside apenas na variavel de ambiente privada RESEND_API_KEY do servidor Vercel.
 */
export const sendInviteEmail = async ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl,
  fromName = 'Tracker System'
}: SendInviteEmailParams): Promise<SendEmailResult> => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail, orgName, roleName, inviteUrl, fromName })
    });

    const responseText = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText || `Servidor respondeu com status ${response.status}` };
    }

    if (response.ok && data.success) {
      return {
        success: true,
        messageId: typeof data.id === 'string' ? data.id : undefined
      };
    }

    const errorMsg = typeof data.error === 'string'
      ? data.error
      : `Falha ao enviar e-mail (HTTP ${response.status}).`;

    return { success: false, error: errorMsg };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao comunicar com a API de e-mails.';
    return { success: false, error: msg };
  }
};

export { generateInviteEmailHtml };
