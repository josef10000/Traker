import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateInviteEmailHtml } from '../src/templates/inviteEmailTemplate';

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

    // Leitura das variáveis de ambiente na Vercel
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
        error: 'A chave da API do Resend (VITE_RESEND_API_KEY ou RESEND_API_KEY) não foi encontrada no servidor da Vercel.' 
      });
    }

    // Gerar o HTML com a logo embutida nativamente em Base64
    const htmlContent = generateInviteEmailHtml({
      recipientEmail,
      orgName,
      roleName,
      inviteUrl
    });

    // Disparo oficial da API do Resend
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
