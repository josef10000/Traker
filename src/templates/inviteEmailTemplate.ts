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
      background-color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #e5e5e5;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #000000;
      padding: 48px 12px;
    }
    .main-card {
      max-width: 560px;
      margin: 0 auto;
      background-color: #0a0a0a;
      border: 1px solid #262626;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
    }
    .header {
      padding: 40px 40px 28px 40px;
      text-align: center;
      background-color: #0d0d0d;
      border-bottom: 1px solid #1f1f1f;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.2em;
      color: #ffffff;
      text-transform: uppercase;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.25em;
      color: #a3a3a3;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .body-content {
      padding: 40px;
    }
    .salutation {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #737373;
      margin: 0 0 12px 0;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 20px;
      line-height: 1.35;
      letter-spacing: -0.01em;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.7;
      color: #a3a3a3;
      margin-bottom: 28px;
    }
    .info-box {
      background-color: #121212;
      border: 1px solid #262626;
      border-left: 3px solid #ffffff;
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 32px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #737373;
      margin-bottom: 6px;
      display: block;
    }
    .info-value {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
    }
    .btn-container {
      text-align: center;
      margin-top: 36px;
      margin-bottom: 36px;
    }
    .btn-action {
      display: inline-block;
      background-color: #ffffff;
      color: #000000 !important;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 16px 40px;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(255, 255, 255, 0.15);
    }
    .fallback-container {
      border-top: 1px dashed #262626;
      padding-top: 24px;
      margin-top: 24px;
    }
    .fallback-text {
      font-size: 12px;
      color: #737373;
      margin-bottom: 10px;
    }
    .fallback-box {
      background-color: #050505;
      border: 1px solid #1f1f1f;
      border-radius: 6px;
      padding: 12px 14px;
      word-break: break-all;
      font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 11px;
      color: #a3a3a3;
    }
    .footer {
      padding: 28px 40px;
      background-color: #050505;
      border-top: 1px solid #171717;
      text-align: center;
      font-size: 11px;
      line-height: 1.6;
      color: #525252;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <!-- CABEÇALHO CORPORATIVO CLÁSSICO -->
      <div class="header">
        <h2 class="brand-title">TRACKER</h2>
        <div class="brand-subtitle">CORPORATE PLATFORM</div>
      </div>

      <!-- CORPO DO E-MAIL -->
      <div class="body-content">
        <div class="salutation">CONVITE DE ACESSO OFICIAL</div>
        <h1 class="title">Sua credencial para acessar a empresa ${orgName} está pronta.</h1>
        
        <p class="paragraph">
          Você foi convidado para integrar o sistema corporativo da empresa <strong>${orgName}</strong> na plataforma <strong>Tracker</strong>.
        </p>

        <!-- CARGO CORPORATIVO -->
        <div class="info-box">
          <span class="info-label">Cargo / Função Atribuída:</span>
          <div class="info-value">${roleName}</div>
        </div>

        <!-- BOTÃO CLÁSSICO DE ALTA DENSIDADE -->
        <div class="btn-container">
          <a href="${inviteUrl}" target="_blank" class="btn-action">
            ACEITAR CONVITE DE ACESSO
          </a>
        </div>

        <div class="fallback-container">
          <p class="fallback-text">
            Se o botão acima não abrir automaticamente, utilize o link direto corporativo:
          </p>
          <div class="fallback-box">
            ${inviteUrl}
          </div>
        </div>
      </div>

      <!-- RODAPÉ CORPORATIVO -->
      <div class="footer">
        <p style="margin: 0 0 6px 0;">Este convite corporativo é de uso exclusivo do e-mail <strong>${recipientEmail}</strong>.</p>
        <p style="margin: 0;">Tracker Platform • Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};
