import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db } from './firebase';
import { KnowledgeArticle } from '../types';

const LOCAL_STORAGE_KEY = 'tracker_knowledge_base_articles';

// Artigos padrão para inicialização no ambiente Sandbox
const DEFAULT_SANDBOX_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb-default-1',
    organizationId: 'sandbox-test',
    title: '💬 Script de Alta Conversão: Quebra de Objeções (Acordo PIX)',
    content: 'Orientação padrão para negociar com clientes que relatam falta de limite no cartão. Apresentar a opção de parcelamento via PIX com desconto de juros acumulados.',
    category: 'script',
    isPinned: true,
    isUrgent: false,
    copyableScript: 'Olá! Compreendo sua situação. Para facilitar a quitação do seu débito hoje, conseguimos autorização para parcelar seu saldo via PIX em até 3 vezes com isenção de juros de mora! Posso gerar o seu primeiro código PIX com desconto agora?',
    tags: ['script', 'pix', 'objeção', 'desconto'],
    createdByUid: 'system',
    createdByName: 'Supervisão de Operações',
    createdByRole: 'supervisor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kb-default-2',
    organizationId: 'sandbox-test',
    title: '🚨 COMUNICADO: Nova Regra de Desconto para Contratos > 90 Dias',
    content: 'Atenção equipe: Contratos com atraso superior a 90 dias estão com alçada pré-aprovada de até 25% de desconto para quitação à vista durante este mês.',
    category: 'announcement',
    isPinned: true,
    isUrgent: true,
    copyableScript: 'Temos uma excelente notícia: seu contrato foi selecionado para o programa de desconto especial de 25% para quitação à vista! Este valor é válido somente para emissão hoje.',
    tags: ['comunicado', 'regra', 'desconto', 'urgente'],
    createdByUid: 'system',
    createdByName: 'Coordenação Geral',
    createdByRole: 'coordinator',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kb-default-3',
    organizationId: 'sandbox-test',
    title: '❓ FAQ: Cliente informa que já pagou o boleto há 24h',
    content: 'Quando o cliente alega pagamento recente, solicitar o envio do comprovante pelo canal oficial. Esclarecer que a compensação bancária leva até 48 horas úteis para baixar no sistema.',
    category: 'faq',
    isPinned: false,
    isUrgent: false,
    copyableScript: 'Perfeito! Pagamentos via boleto bancário podem levar até 48 horas úteis para compensação em nosso sistema. Para acelerar a baixa, por favor nos envie a foto ou PDF do comprovante por este canal.',
    tags: ['faq', 'comprovante', 'compensação'],
    createdByUid: 'system',
    createdByName: 'Supervisão de Qualidade',
    createdByRole: 'monitor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Funções auxiliares para LocalStorage (Sandbox)
const getLocalArticles = (orgId: string): KnowledgeArticle[] => {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${orgId}`);
    if (!raw) {
      if (orgId === 'sandbox-test') {
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_${orgId}`, JSON.stringify(DEFAULT_SANDBOX_ARTICLES));
        return DEFAULT_SANDBOX_ARTICLES;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler artigos locais:', e);
    return orgId === 'sandbox-test' ? DEFAULT_SANDBOX_ARTICLES : [];
  }
};

const saveLocalArticles = (orgId: string, articles: KnowledgeArticle[]) => {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${orgId}`, JSON.stringify(articles));
  } catch (e) {
    console.error('Erro ao salvar artigos locais:', e);
  }
};

/**
 * Insere ou atualiza um artigo de conhecimento / script da operação
 */
export const saveKnowledgeArticle = async (article: Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> => {
  const now = new Date().toISOString();
  const articleId = article.id || `kb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  const fullArticle: KnowledgeArticle = {
    ...article,
    id: articleId,
    createdAt: article.id ? (article as any).createdAt || now : now,
    updatedAt: now
  };

  if (article.organizationId === 'sandbox-test') {
    const articles = getLocalArticles(article.organizationId);
    const existingIndex = articles.findIndex(a => a.id === articleId);
    if (existingIndex >= 0) {
      articles[existingIndex] = fullArticle;
    } else {
      articles.unshift(fullArticle);
    }
    saveLocalArticles(article.organizationId, articles);
    return articleId;
  }

  const articleRef = doc(db, 'knowledge_articles', articleId);
  await setDoc(articleRef, fullArticle, { merge: true });
  return articleId;
};

/**
 * Exclui um artigo de conhecimento pelo ID
 */
export const deleteKnowledgeArticle = async (orgId: string, articleId: string): Promise<void> => {
  if (orgId === 'sandbox-test') {
    const articles = getLocalArticles(orgId);
    const filtered = articles.filter(a => a.id !== articleId);
    saveLocalArticles(orgId, filtered);
    return;
  }

  const articleRef = doc(db, 'knowledge_articles', articleId);
  await deleteDoc(articleRef);
};

/**
 * Escuta em tempo real os artigos de conhecimento da organização
 */
export const subscribeKnowledgeArticles = (
  orgId: string, 
  callback: (articles: KnowledgeArticle[]) => void
): (() => void) => {
  if (!orgId) {
    callback([]);
    return () => {};
  }

  if (orgId === 'sandbox-test') {
    const initial = getLocalArticles(orgId);
    callback(initial);
    
    // Intervalo de verificação simples para simulação no Sandbox
    const intervalId = setInterval(() => {
      const current = getLocalArticles(orgId);
      callback(current);
    }, 2000);

    return () => clearInterval(intervalId);
  }

  const q = query(
    collection(db, 'knowledge_articles'),
    where('organizationId', '==', orgId)
  );

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => d.data() as KnowledgeArticle);
    // Ordenar: Fixados primeiro, Urgentes depois, depois por data mais recente
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    callback(list);
  }, (err) => {
    console.error('Erro ao escutar artigos da Base de Conhecimento:', err);
    callback([]);
  });
};
