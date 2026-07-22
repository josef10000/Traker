import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { recipientEmail, orgName, roleName, inviteUrl, fromName = 'Tracker System', apiKey: bodyApiKey } = req.body;

    if (!recipientEmail || !inviteUrl) {
      return res.status(400).json({ error: 'E-mail de destino e URL do convite são obrigatórios.' });
    }

    // Leitura resiliente de todas as variações de nome da chave no servidor Node.js da Vercel
    const apiKey = (
      bodyApiKey ||
      process.env.VITE_RESEND_API_KEY || 
      process.env.RESEND_API_KEY || 
      process.env.resend_api_key ||
      process.env.RESEND_KEY ||
      ''
    ).trim();

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'A chave da API do Resend (VITE_RESEND_API_KEY ou RESEND_API_KEY) não foi encontrada no servidor da Vercel. Certifique-se de salvar a variável nas Environment Variables da Vercel e ir em Deployments -> Redeploy para que a Vercel atualize os containers de servidor.' 
      });
    }

    // HTML do E-mail
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para Acessar o Tracker — ${orgName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #030712; padding: 40px 0; }
    .main-card { max-width: 580px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); }
    .header { padding: 36px 40px 24px 40px; text-align: center; background: linear-gradient(180deg, rgba(14, 165, 233, 0.15) 0%, rgba(15, 23, 42, 0) 100%); border-bottom: 1px solid #1e293b; }
    .logo-img { max-width: 180px; max-height: 60px; height: auto; object-fit: contain; margin-bottom: 12px; }
    .brand-name { font-size: 20px; font-weight: 900; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase; margin: 0; }
    .body-content { padding: 36px 40px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 16px; line-height: 1.3; }
    .paragraph { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
    .badge-card { background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 16px; padding: 16px 20px; margin-bottom: 28px; }
    .badge-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #a5b4fc; margin-bottom: 4px; display: block; }
    .badge-value { font-size: 16px; font-weight: 800; color: #ffffff; }
    .btn-container { text-align: center; margin-top: 32px; margin-bottom: 32px; }
    .btn-action { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: #ffffff !important; font-size: 14px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; padding: 16px 36px; border-radius: 14px; text-decoration: none; box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4); }
    .fallback-box { background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; margin-top: 24px; word-break: break-all; font-family: monospace; font-size: 12px; color: #38bdf8; }
    .footer { padding: 24px 40px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="header">
        <img src="https://tracker.hubsymples.com.br/logo.png" alt="Tracker" class="logo-img" />
        <h2 class="brand-name">TRACKER PLATFORM</h2>
      </div>
      <div class="body-content">
        <h1 class="title">Você foi convidado para ingressar em ${orgName}!</h1>
        <p class="paragraph">
          Olá! Você recebeu um convite oficial de acesso à plataforma <strong>Tracker</strong> para integrar a equipe da empresa <strong>${orgName}</strong>.
        </p>
        <div class="badge-card">
          <span class="badge-label">Sua Função Atribuída:</span>
          <div class="badge-value">${roleName}</div>
        </div>
        <div class="btn-container">
          <a href="${inviteUrl}" target="_blank" class="btn-action">
            🚀 Aceitar Convite & Acessar Empresa
          </a>
        </div>
        <p class="paragraph" style="margin-bottom: 8px;">
          Se o botão acima não funcionar, copie e cole o link direto no seu navegador:
        </p>
        <div class="fallback-box">${inviteUrl}</div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">Este é um convite individual e exclusivo atrelado ao e-mail <strong>${recipientEmail}</strong>.</p>
        <p style="margin: 0;">Se você não esperava por este e-mail, pode ignorá-lo com segurança.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Chamada oficial à API do Resend no servidor Node da Vercel
    const resendResponse = await fetch('https://api.resend.com/emails', {
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

    const data = await resendResponse.json();

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
