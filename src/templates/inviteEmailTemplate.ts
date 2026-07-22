interface InviteEmailParams {
  recipientEmail: string;
  orgName: string;
  roleName: string;
  inviteUrl: string;
}

export const generateInviteEmailHtml = ({
  recipientEmail,
  orgName,
  roleName,
  inviteUrl
}: InviteEmailParams): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para Acessar o Tracker — ${orgName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #030712;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f3f4f6;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #030712;
      padding: 40px 0;
    }
    .main-card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 36px 40px 24px 40px;
      text-align: center;
      background: linear-gradient(180deg, rgba(14, 165, 233, 0.1) 0%, rgba(15, 23, 42, 0) 100%);
      border-bottom: 1px solid #1e293b;
    }
    .logo-img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      margin-bottom: 12px;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.1em;
      color: #38bdf8;
      text-transform: uppercase;
      margin: 0;
    }
    .body-content {
      padding: 36px 40px;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .badge-card {
      background-color: #1e1b4b;
      border: 1px solid #4338ca;
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }
    .badge-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #a5b4fc;
      margin-bottom: 4px;
      display: block;
    }
    .badge-value {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
    }
    .btn-container {
      text-align: center;
      margin-top: 32px;
      margin-bottom: 32px;
    }
    .btn-action {
      display: inline-block;
      background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 16px 36px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4);
    }
    .fallback-box {
      background-color: #020617;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 14px;
      margin-top: 24px;
      word-break: break-all;
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
    }
    .footer {
      padding: 24px 40px;
      background-color: #020617;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <!-- HEADER -->
      <div class="header">
        <img src="https://raw.githubusercontent.com/josef10000/Traker/main/public/s-logo.png" alt="Tracker Logo" class="logo-img" />
        <h2 class="brand-name">TRACKER PLATFORM</h2>
      </div>

      <!-- BODY -->
      <div class="body-content">
        <h1 class="title">Você foi convidado para ingressar em ${orgName}!</h1>
        
        <p class="paragraph">
          Olá! Você recebeu um convite oficial de acesso à plataforma <strong>Tracker</strong> para integrar a equipe da empresa <strong>${orgName}</strong>.
        </p>

        <!-- CARGO BADGE -->
        <div class="badge-card">
          <span class="badge-label">Sua Função Atribuída:</span>
          <div class="badge-value">${roleName}</div>
        </div>

        <!-- CTA BUTTON -->
        <div class="btn-container">
          <a href="${inviteUrl}" target="_blank" class="btn-action">
            🚀 Aceitar Convite & Acessar Empresa
          </a>
        </div>

        <p class="paragraph" style="margin-bottom: 8px;">
          Se o botão acima não funcionar, copie e cole o link direto no seu navegador:
        </p>
        <div class="fallback-box">
          ${inviteUrl}
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <p style="margin: 0 0 8px 0;">Este é um convite individual e exclusivo atrelado ao e-mail <strong>${recipientEmail}</strong>.</p>
        <p style="margin: 0;">Se você não esperava por este e-mail, pode ignorá-lo com segurança.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};
