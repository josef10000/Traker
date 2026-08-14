import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { MessageTemplate, Agreement } from '../types';

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl_default_1',
    title: '⏰ Lembrete de Vencimento no Dia',
    category: 'vencimento',
    content: 'Olá, {{NOME}}! Lembramos que o seu acordo no valor de R$ {{VALOR}} vence hoje ({{VENCIMENTO}}). Para garantir as condições especiais e a quitação, por favor confirme o pagamento assim que possível. Caso precise de suporte, estamos à disposição!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'sistema',
    organizationId: 'all'
  },
  {
    id: 'tpl_default_2',
    title: '🛡️ Aviso Preventivo de Cobrança',
    category: 'preventiva',
    content: 'Olá, {{NOME}}! Passando para confirmar a programação do seu acordo cadastrado sob o código {{ACORDO_ID}} no valor de R$ {{VALOR}} com vencimento para {{VENCIMENTO}}. Se já efetuou o pagamento, favor ignorar esta mensagem!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'sistema',
    organizationId: 'all'
  },
  {
    id: 'tpl_default_3',
    title: '✅ Confirmação de Acordo Registrado',
    category: 'confirmacao',
    content: 'Olá, {{NOME}}! Confirmamos que o seu acordo referente ao CPF {{CPF}} foi registrado com sucesso. Valor negociado: R$ {{VALOR}}, com vencimento em {{VENCIMENTO}}. Agradecemos a parceria!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'sistema',
    organizationId: 'all'
  }
];

/**
 * Interpola as variáveis dinâmicas de um template com os dados do acordo.
 */
export function interpolateTemplate(templateContent: string, agreement: Partial<Agreement>): string {
  const formattedVal = agreement.value
    ? agreement.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const formattedDate = agreement.dueDate
    ? new Date(agreement.dueDate.includes('T') ? agreement.dueDate : `${agreement.dueDate}T00:00:00`).toLocaleDateString('pt-BR')
    : 'Hoje';

  const cleanCpf = agreement.clientCpf ? agreement.clientCpf.replace(/\D/g, '') : '';
  const maskedCpf = cleanCpf ? `${cleanCpf.slice(0, 3)}.***.***-${cleanCpf.slice(-2)}` : '';

  return templateContent
    .replace(/\{\{NOME\}\}/g, agreement.clientName || 'Cliente')
    .replace(/\{\{VALOR\}\}/g, formattedVal)
    .replace(/\{\{VENCIMENTO\}\}/g, formattedDate)
    .replace(/\{\{CPF\}\}/g, maskedCpf || cleanCpf)
    .replace(/\{\{ACORDO_ID\}\}/g, agreement.id ? agreement.id.slice(-6).toUpperCase() : 'N/A');
}

// In-memory Sandbox Cache for Templates
let sandboxTemplates: MessageTemplate[] = [...DEFAULT_TEMPLATES];

/**
 * Busca todos os templates disponíveis para a organização (incluindo padrões).
 */
export async function getTemplates(organizationId: string): Promise<MessageTemplate[]> {
  if (organizationId === 'sandbox-test') {
    return [...sandboxTemplates];
  }

  try {
    const q = query(
      collection(db, 'message_templates'),
      where('organizationId', 'in', [organizationId, 'all'])
    );
    const snap = await getDocs(q);
    const customTemplates: MessageTemplate[] = [];
    snap.forEach(d => customTemplates.push({ id: d.id, ...d.data() } as MessageTemplate));
    
    // Mesclar padrões com customizados (evitando duplicatas)
    const customIds = new Set(customTemplates.map(t => t.id));
    const merged = [...customTemplates];
    DEFAULT_TEMPLATES.forEach(tpl => {
      if (!customIds.has(tpl.id)) {
        merged.push(tpl);
      }
    });

    return merged;
  } catch (err) {
    console.error('Erro ao buscar templates de mensagem:', err);
    return [...DEFAULT_TEMPLATES];
  }
}

/**
 * Salva ou atualiza um template de mensagem.
 */
export async function saveTemplate(template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MessageTemplate> {
  const now = new Date().toISOString();
  const id = template.id || `tpl_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  
  const fullTemplate: MessageTemplate = {
    ...template,
    id,
    createdAt: template.id ? (template as MessageTemplate).createdAt || now : now,
    updatedAt: now
  };

  if (template.organizationId === 'sandbox-test') {
    const idx = sandboxTemplates.findIndex(t => t.id === id);
    if (idx >= 0) {
      sandboxTemplates[idx] = fullTemplate;
    } else {
      sandboxTemplates.push(fullTemplate);
    }
    return fullTemplate;
  }

  try {
    const ref = doc(db, 'message_templates', id);
    await setDoc(ref, fullTemplate, { merge: true });
    return fullTemplate;
  } catch (err) {
    console.error('Erro ao salvar template:', err);
    throw err;
  }
}

/**
 * Exclui um template de mensagem.
 */
export async function deleteTemplate(id: string, organizationId: string): Promise<void> {
  if (organizationId === 'sandbox-test') {
    sandboxTemplates = sandboxTemplates.filter(t => t.id !== id);
    return;
  }

  try {
    await deleteDoc(doc(db, 'message_templates', id));
  } catch (err) {
    console.error('Erro ao excluir template:', err);
    throw err;
  }
}
