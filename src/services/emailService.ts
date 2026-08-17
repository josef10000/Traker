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
  resendStatus?: number;
}

/**
 * Envia e-mail de convite corporativo exclusivamente via Vercel Serverless Function (/api/send-email).
 * A chave do Resend (RESEND_API_KEY) é lida estritamente das variáveis de ambiente do servidor Vercel.
 * Se o Resend recusar ou falhar, o erro real é retornado diretamente para a interface.
 * Zero gravações residuais ou filas de e-mail no Firestore.
 */
export const sendInviteEmail = async ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl,
  fromName = 'Tracker Platform'
}: SendInviteEmailParams): Promise<SendEmailResult> => {
  const cleanEmail = recipientEmail.trim().toLowerCase();

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

    if (response.ok && data.success && data.id) {
      return {
        success: true,
        messageId: data.id
      };
    }

    // Retorna a mensagem de erro exata retornada pela API do Resend / Vercel
    const errorMsg = data.error || data.message || `Erro ${response.status} ao disparar e-mail via Resend.`;
    console.warn('[sendInviteEmail] Falha reportada pelo servidor:', response.status, data);

    return {
      success: false,
      resendStatus: response.status,
      error: errorMsg
    };
  } catch (err: any) {
    console.error('[sendInviteEmail] Falha na requisição para /api/send-email:', err);
    return {
      success: false,
      error: err.message || 'Falha de conexão com o servidor de e-mail da Vercel.'
    };
  }
};

export { generateInviteEmailHtml };
