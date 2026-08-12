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
  <title>Convite de Acesso Corporativo — ${orgName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #030712;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f8fafc;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #030712;
      padding: 40px 12px;
    }
    .main-card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header-bar {
      background: linear-gradient(135deg, #0284c7 0%, #3b82f6 50%, #6366f1 100%);
      padding: 36px 40px;
      text-align: center;
    }
    .header-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 9999px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 0.1em;
      color: #ffffff;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: #e0f2fe;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .body-content {
      padding: 40px;
    }
    .salutation {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #38bdf8;
      margin: 0 0 8px 0;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.35;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 28px;
    }
    .grid-container {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 28px;
    }
    .grid-row {
      margin-bottom: 14px;
    }
    .grid-row:last-child {
      margin-bottom: 0;
    }
    .grid-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #64748b;
      margin-bottom: 4px;
      display: block;
    }
    .grid-value {
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
    }
    .role-badge {
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-action {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 18px 42px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.5);
    }
    .security-notice {
      background-color: rgba(56, 189, 248, 0.05);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 28px;
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .fallback-container {
      border-top: 1px solid #334155;
      padding-top: 24px;
      margin-top: 24px;
    }
    .fallback-text {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .fallback-box {
      background-color: #020617;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px 14px;
      word-break: break-all;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #38bdf8;
    }
    .footer {
      padding: 28px 40px;
      background-color: #090d16;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 11px;
      line-height: 1.6;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <!-- CABEÇALHO COM GRADIENTE -->
      <div class="header-bar">
        <div class="header-badge">✦ CONVITE CORPORATIVO DE ACESSO</div>
        <h1 class="brand-title">TRACKER</h1>
        <div class="brand-subtitle">Gestão Inteligente & Recuperação de Crédito</div>
      </div>

      <!-- CORPO DO E-MAIL -->
      <div class="body-content">
        <div class="salutation">BEM-VINDO À PLATAFORMA</div>
        <h2 class="title">Você foi convidado para integrar a empresa ${orgName}.</h2>
        
        <p class="paragraph">
          Sua credencial de acesso foi gerada com sucesso. Clique no botão abaixo para aceitar o convite, configurar sua conta e definir sua senha de acesso ao sistema corporativo.
        </p>

        <!-- CARD DE CREDENCIAIS -->
        <div class="grid-container">
          <div class="grid-row">
            <span class="grid-label">Empresa / Organização</span>
            <div class="grid-value">${orgName}</div>
          </div>
          <div class="grid-row" style="margin-top: 16px;">
            <span class="grid-label">Cargo / Perfil de Acesso</span>
            <div style="margin-top: 4px;">
              <span class="role-badge">${roleName}</span>
            </div>
          </div>
          <div class="grid-row" style="margin-top: 16px;">
            <span class="grid-label">E-mail Convidado</span>
            <div class="grid-value" style="font-size: 13px; color: #94a3b8;">${recipientEmail}</div>
          </div>
        </div>

        <!-- AVISO DE SEGURANÇA -->
        <div class="security-notice">
          🔒 <strong>Acesso Seguro:</strong> Este convite é individual, intransferível e vinculado ao e-mail <strong>${recipientEmail}</strong>.
        </div>

        <!-- BOTÃO CTA DE IMPACTO -->
        <div class="btn-container">
          <a href="${inviteUrl}" target="_blank" class="btn-action">
            ACEITAR CONVITE E DEFINIR SENHA ➔
          </a>
        </div>

        <!-- LINK DIRETO DE CONTINGÊNCIA -->
        <div class="fallback-container">
          <p class="fallback-text">
            Se o botão acima não funcionar, copie e cole o link seguro direto abaixo em seu navegador:
          </p>
          <div class="fallback-box">
            ${inviteUrl}
          </div>
        </div>
      </div>

      <!-- RODAPÉ -->
      <div class="footer">
        <p style="margin: 0 0 6px 0;">Este e-mail foi gerado automaticamente pela plataforma <strong>Tracker</strong>.</p>
        <p style="margin: 0;">© ${new Date().getFullYear()} Tracker Platform • Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};
