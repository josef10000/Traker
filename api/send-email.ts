import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EmailRequestBody {
  recipientEmail: string;
  orgName: string;
  roleName: string;
  inviteUrl: string;
  fromName?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Universal para evitar bloqueios de origem (localhost, Vercel, Firebase)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Tratamento do preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const { recipientEmail, orgName, roleName, inviteUrl, fromName = 'Tracker Platform' } = req.body as EmailRequestBody;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'E-mail de destino inválido ou ausente.' });
    }

    if (!inviteUrl) {
      return res.status(400).json({ error: 'URL do convite é obrigatória.' });
    }

    // Leitura da chave do Resend no ambiente do servidor Vercel
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (!apiKey) {
      console.error('[Vercel Serverless]: RESEND_API_KEY não configurada no painel da Vercel.');
      return res.status(500).json({ 
        error: 'RESEND_API_KEY não encontrada nas variáveis de ambiente da Vercel. Configure em Settings > Environment Variables.' 
      });
    }

    // Remetente configurável via variável de ambiente ou fallback verificado
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const senderName = process.env.RESEND_FROM_NAME || fromName;
    const fromAddress = `${senderName} <${senderEmail}>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite de Acesso Corporativo — ${orgName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 20px; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 580px; margin: 0 auto; background: linear-gradient(180deg, #0f172a 0%, #020617 100%); border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
    
    <!-- HEADER -->
    <div style="padding: 36px 32px 24px 32px; text-align: center; border-bottom: 1px solid #1e293b; background: radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15), transparent 70%);">
      <div style="display: inline-block; padding: 6px 14px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; margin-bottom: 16px;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8;">Acesso Corporativo Liberado</span>
      </div>
      <h1 style="font-size: 26px; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; letter-spacing: -0.5px;">Convite de Acesso</h1>
      <p style="font-size: 14px; color: #94a3b8; margin: 0; font-weight: 500;">Você foi convidado para ingressar na equipe da <strong>${orgName}</strong></p>
    </div>

    <!-- CORPO -->
    <div style="padding: 32px;">
      <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; width: 40%;">Empresa:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #ffffff; font-weight: 700; text-align: right;">${orgName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; border-top: 1px solid #1e293b;">Cargo / Função:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #a855f7; font-weight: 700; text-align: right; border-top: 1px solid #1e293b;">${roleName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; border-top: 1px solid #1e293b;">E-mail Cadastrado:</td>
            <td style="padding: 8px 0; font-size: 13px; color: #38bdf8; font-family: monospace; font-weight: 700; text-align: right; border-top: 1px solid #1e293b;">${recipientEmail}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 28px 0; text-align: center;">
        Para ativar sua conta corporativa e definir sua senha de acesso, clique no botão abaixo:
      </p>

      <!-- BOTÃO CTA -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${inviteUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; padding: 16px 36px; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.4);">
          Ativar Minha Conta & Acessar ➔
        </a>
      </div>

      <div style="background: rgba(2, 6, 23, 0.6); border: 1px dashed #334155; border-radius: 12px; padding: 14px; text-align: center;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">Ou copie e cole o link direto no seu navegador:</p>
        <p style="font-size: 11px; color: #38bdf8; font-family: monospace; word-break: break-all; margin: 0;">${inviteUrl}</p>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center;">
      <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Este convite é confidencial e intransferível. Válido por 72 horas.</p>
      <p style="font-size: 11px; color: #475569; margin: 0;">Tracker Platform • Plataforma de Gestão Corporativa</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Disparo oficial via API Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipientEmail],
        subject: `🚀 Convite de Acesso Corporativo — ${orgName} (Tracker Platform)`,
        html: htmlContent
      })
    });

    const resText = await resendResponse.text();
    let data: any = {};
    try {
      data = JSON.parse(resText);
    } catch {
      data = { message: resText };
    }

    if (!resendResponse.ok) {
      console.error('[Vercel Serverless Resend Error]:', data);
      return res.status(resendResponse.status).json({ 
        error: data.message || data.error?.message || 'Erro ao enviar e-mail via Resend.' 
      });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('[Vercel Serverless Handler Error]:', error);
    return res.status(500).json({ error: error.message || 'Erro interno no servidor ao disparar e-mail.' });
  }
}
