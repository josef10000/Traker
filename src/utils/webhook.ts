import { maskCPF } from './masks';

export const triggerWebhook = async (
  webhookUrl: string | undefined, 
  event: 'agreement.created' | 'agreement.updated' | 'agreement.paid', 
  agreementData: any, 
  organizationId: string
) => {
  if (!webhookUrl) return;

  // Criamos uma cópia segura do payload mascarando o CPF para estar em conformidade com a LGPD
  const secureAgreement = {
    ...agreementData,
    clientCpf: maskCPF(agreementData.clientCpf || '')
  };

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    organizationId,
    data: secureAgreement
  };

  try {
    // Usamos mode: 'no-cors' para garantir que a requisição seja disparada pelo navegador do operador,
    // mesmo que o destino do webhook não possua configurações de CORS de recebimento.
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Erro ao disparar webhook:", err);
  }
};
