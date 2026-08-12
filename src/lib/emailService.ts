import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  sentAt: string;
  backupCodes: string[];
}

// Armazena temporariamente a última notificação de e-mail no cliente para simulação visual no Sandbox
let lastSandboxEmail: EmailPayload | null = null;
let emailListeners: ((email: EmailPayload) => void)[] = [];

export const subscribeSandboxEmails = (callback: (email: EmailPayload) => void) => {
  emailListeners.push(callback);
  if (lastSandboxEmail) {
    callback(lastSandboxEmail);
  }
  return () => {
    emailListeners = emailListeners.filter(l => l !== callback);
  };
};

/**
 * Prepara e envia o e-mail oficial com os códigos de contingência (Backup) do Windows Hello
 */
export const sendBackupCodesEmail = async (
  recipientEmail: string,
  displayName: string,
  backupCodes: string[],
  isSandbox: boolean = false
): Promise<EmailPayload> => {
  const sentAt = new Date().toISOString();
  const formattedDate = new Date().toLocaleString('pt-BR');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Kit de Emergência 2FA - Windows Hello</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }
        .container { max-width: 580px; margin: 0 auto; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .logo { font-size: 20px; font-weight: 900; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; }
        h2 { color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
        .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 4px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; }
        .codes-box { background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 20px; margin: 24px 0; text-align: center; }
        .code-item { font-family: monospace; font-size: 22px; font-weight: 800; color: #4ade80; letter-spacing: 4px; padding: 8px; border-bottom: 1px dashed rgba(255, 255, 255, 0.1); }
        .code-item:last-child { border-bottom: none; }
        .warning { background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; color: #fbbf24; font-size: 12px; margin-top: 24px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🛡️ Tracker Security</div>
        <span class="badge">Autenticação Nativa 2FA</span>
        <h2>Seus Códigos de Contingência (Windows Hello)</h2>
        <p>Olá <strong>${displayName || recipientEmail}</strong>,</p>
        <p>Você ativou com sucesso a proteção por **Windows Hello (Biometria / PIN)** na sua conta do Tracker. Abaixo estão seus <strong>5 Códigos de Emergência</strong> para acesso caso você esteja em outro computador ou sem seu leitor biométrico.</p>
        
        <div class="codes-box">
          ${backupCodes.map(code => `<div class="code-item">${code}</div>`).join('')}
        </div>

        <div class="warning">
          <strong>⚠️ Guarde este e-mail com carinho!</strong> Cada código pode ser utilizado apenas uma vez caso precise acessar o sistema sem o seu leitor biométrico/PIN do Windows.
        </div>

        <div class="footer">
          Ativado em ${formattedDate} • Notificação automática enviada para ${recipientEmail}.
        </div>
      </div>
    </body>
    </html>
  `;

  const payload: EmailPayload = {
    to: recipientEmail,
    subject: '🛡️ Seus Códigos de Contingência (Windows Hello 2FA) - Tracker',
    html: htmlContent,
    sentAt,
    backupCodes
  };

  // Atualiza ouvintes do simulador
  lastSandboxEmail = payload;
  emailListeners.forEach(listener => listener(payload));

  // Dispara disparo real de e-mail em segundo plano
  addDoc(collection(db, 'mail'), {
    to: [recipientEmail],
    message: {
      subject: payload.subject,
      html: payload.html
    },
    createdAt: sentAt
  }).catch((e) => console.warn('Mail trigger note:', e));

  return payload;
};
