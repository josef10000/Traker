import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Rate-limit centralizado via Upstash Redis.
// Funciona corretamente em múltiplas instâncias Vercel (stateless serverless).
// Limite: 100 chamadas por IP por janela de 1 hora.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_S = 60 * 60; // 1 hora em segundos (TTL do Redis)

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) {
    try {
      redisClient = new Redis({ url, token });
    } catch (err) {
      console.warn('[Upstash Redis Init Warning]:', err);
      return null;
    }
  }
  return redisClient;
}

// Fallback em memória caso o Redis esteja indisponível ou não configurado
const memoryRateLimitMap = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimit(ip: string): Promise<boolean> {
  // Tentativa com Upstash Redis
  try {
    const redis = getRedisClient();
    if (redis) {
      const key = `rate_limit:send_email:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW_S);
      }
      return count <= RATE_LIMIT_MAX;
    }
  } catch (err) {
    console.warn('[Upstash Redis RateLimit Error, falling back to memory]:', err);
  }

  // Fallback em memória
  const now = Date.now();
  const entry = memoryRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_S * 1000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

// Security headers HTTP aplicados em todas as respostas
function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'"
  );
}

// Domínios permitidos para o inviteUrl (evita open redirect)
const ALLOWED_INVITE_DOMAINS = [
  'traker-app.firebaseapp.com',
  'traker-app.web.app',
  'firebaseapp.com',
  'web.app',
  'hubsymples.com.br',
  'vercel.app',
  'localhost',
  '127.0.0.1',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Security headers em todas as respostas
  setSecurityHeaders(res);

  // CORS Headers — restringe origens permitidas
  const allowedOrigins = [
    'https://traker-app.firebaseapp.com',
    'https://traker-app.web.app',
  ];
  const origin = req.headers.origin || req.headers.referer || '';
  const isDev = process.env.NODE_ENV !== 'production';
  const isAllowedOrigin = isDev || allowedOrigins.some((o) => origin.startsWith(o));

  if (origin && isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Requisição same-origin ou server-to-server legítima
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // Rate-limit por IP via Upstash Redis (centralizado entre instâncias)
  const clientIp = (
    (req.headers['x-forwarded-for'] as string) ||
    req.socket?.remoteAddress ||
    'unknown'
  ).split(',')[0].trim();

  const allowed = await checkRateLimit(clientIp);
  if (!allowed) {
    return res.status(429).json({ error: 'Limite de requisições excedido. Tente novamente em 1 hora.' });
  }

  try {
    const body = req.body || {};
    const recipientEmail: string = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
    const orgName: string = typeof body.orgName === 'string' ? body.orgName.trim().slice(0, 200) : 'Empresa';
    const roleName: string = typeof body.roleName === 'string' ? body.roleName.trim().slice(0, 100) : 'Membro';
    const inviteUrl: string = typeof body.inviteUrl === 'string' ? body.inviteUrl.trim() : '';
    const fromName: string = typeof body.fromName === 'string' ? body.fromName.trim().slice(0, 100) : 'Tracker System';

    // Validação de payload
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: 'E-mail de destino inválido.' });
    }
    if (!inviteUrl || (!inviteUrl.startsWith('https://') && !inviteUrl.startsWith('http://'))) {
      return res.status(400).json({ error: 'URL do convite inválida.' });
    }
    // Validação de domínio: inviteUrl deve pertencer a um domínio autorizado
    try {
      const parsedUrl = new URL(inviteUrl);
      const isAllowedDomain = ALLOWED_INVITE_DOMAINS.some(
        (d) => parsedUrl.hostname === d || parsedUrl.hostname.endsWith(`.${d}`)
      );
      if (!isAllowedDomain && process.env.NODE_ENV === 'production') {
        return res.status(400).json({ error: 'Domínio do convite não autorizado.' });
      }
    } catch {
      return res.status(400).json({ error: 'URL do convite malformada.' });
    }

    // Leitura estritamente segura da chave de API nas variáveis de ambiente privadas do servidor Node
    const apiKey = (
      process.env.RESEND_API_KEY || 
      process.env.resend_api_key ||
      process.env.RESEND_KEY ||
      ''
    ).trim();

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'A chave da API do Resend (RESEND_API_KEY) não foi encontrada no servidor da Vercel.' 
      });
    }

    // HTML corporativo fiel ao design Stitch (Dark Theme com accent ciano)
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite de Acesso Corporativo — ${orgName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0b0e14; padding: 48px 12px; }
    .main-card { max-width: 580px; margin: 0 auto; background-color: #121721; border: 1px solid #1e2638; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .header { padding: 36px 40px 24px 40px; text-align: center; background-color: #121721; border-bottom: 1px solid #1c2333; }
    .brand-title { font-size: 22px; font-weight: 800; letter-spacing: 0.25em; color: #ffffff; text-transform: uppercase; margin: 0; }
    .brand-subtitle { font-size: 9px; font-weight: 700; letter-spacing: 0.3em; color: #718096; text-transform: uppercase; margin-top: 6px; }
    .body-content { padding: 40px; }
    .salutation { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #8a99ad; margin: 0 0 16px 0; }
    .title { font-size: 22px; font-weight: 600; color: #f8fafc; margin-top: 0; margin-bottom: 18px; line-height: 1.4; letter-spacing: -0.01em; }
    .paragraph { font-size: 14px; line-height: 1.7; color: #94a3b8; margin-bottom: 28px; }
    .info-box { background-color: #171d2a; border: 1px solid #222b3d; border-left: 3px solid #0099ff; border-radius: 6px; padding: 18px 22px; margin-bottom: 32px; }
    .info-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #8a99ad; margin-bottom: 8px; display: block; }
    .info-value { font-size: 16px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px; }
    .btn-container { text-align: center; margin-top: 36px; margin-bottom: 36px; }
    .btn-action { display: inline-block; background-color: #0099ff; color: #000000 !important; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; padding: 16px 44px; border-radius: 4px; text-decoration: none; transition: all 0.2s ease; box-shadow: 0 4px 20px rgba(0, 153, 255, 0.35); }
    .divider { border-top: 1px dashed #222b3d; margin: 32px 0 28px 0; }
    .fallback-text { font-size: 12px; color: #718096; margin-bottom: 12px; }
    .fallback-box { background-color: #0d111a; border: 1px solid #1c2333; border-radius: 6px; padding: 14px 16px; word-break: break-all; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 11px; color: #8a99ad; line-height: 1.5; }
    .footer { padding: 28px 40px; background-color: #121721; border-top: 1px solid #1c2333; text-align: center; font-size: 11px; line-height: 1.7; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="header">
        <h2 class="brand-title">TRACKER</h2>
        <div class="brand-subtitle">CORPORATE PLATFORM</div>
      </div>
      <div class="body-content">
        <div class="salutation">CONVITE DE ACESSO OFICIAL</div>
        <h1 class="title">Sua credencial para acessar a empresa ${orgName} está pronta.</h1>
        <p class="paragraph">
          Você foi convidado para integrar o sistema corporativo da empresa <strong>${orgName}</strong> na plataforma <strong>Tracker</strong>.
        </p>
        <div class="info-box">
          <span class="info-label">CARGO / FUNÇÃO ATRIBUÍDA:</span>
          <div class="info-value">🏢 ${roleName}</div>
        </div>
        <div class="btn-container">
          <a href="${inviteUrl}" target="_blank" class="btn-action">
            ACEITAR CONVITE DE ACESSO
          </a>
        </div>
        <div class="divider"></div>
        <p class="fallback-text">
          Se o botão acima não abrir automaticamente, utilize o link direto corporativo:
        </p>
        <div class="fallback-box">${inviteUrl}</div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0;">Este convite corporativo é de uso exclusivo do e-mail <strong>${recipientEmail}</strong>.</p>
        <p style="margin: 0;">Tracker Platform • Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Tentativa 1: Envio com remetente oficial
    let senderAddress = `${fromName} <notificacoes@hubsymples.com.br>`;
    
    let resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: senderAddress,
        to: [recipientEmail],
        subject: `🚀 Convite de Acesso Corporativo — ${orgName} (Tracker Platform)`,
        html: htmlContent
      })
    });

    let resText = await resendResponse.text();
    let data: any = {};
    try {
      data = JSON.parse(resText);
    } catch {
      data = { message: resText };
    }

    // Se falhar devido a domínio não verificado, faz fallback para o remetente oficial do Resend onboarding@resend.dev
    if (!resendResponse.ok && (resText.includes('domain') || resText.includes('verify') || resendResponse.status === 403 || resendResponse.status === 422)) {
      console.warn('[Vercel Serverless Resend Warning]: Domínio customizado recusado pelo Resend. Tentando remetente onboarding@resend.dev...');
      
      senderAddress = `Tracker Platform <onboarding@resend.dev>`;
      resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: senderAddress,
          to: [recipientEmail],
          subject: `🚀 Convite de Acesso Corporativo — ${orgName} (Tracker Platform)`,
          html: htmlContent
        })
      });

      resText = await resendResponse.text();
      try {
        data = JSON.parse(resText);
      } catch {
        data = { message: resText };
      }
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
