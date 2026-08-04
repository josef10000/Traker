import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { sandboxService } from './sandboxService';
import { EmployeeSurveyConfig, EmployeeSurveyResponse, SurveyFrequency, UserProfile } from '../types';

export interface SurveyStats {
  totalResponses: number;
  averageScore: number;
  enpsScore: number | null; // Apenas para escala 0-10
  enpsZone: string; // 'Excelência' | 'Qualidade' | 'Aperfeiçoamento' | 'Crítica' | '-'
  distribution: Record<number, number>; // rating -> count
  promotersPercentage: number;
  neutralsPercentage: number;
  detractorsPercentage: number;
}

function getSandboxItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`sandbox_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSandboxItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`sandbox_${key}`, JSON.stringify(val));
    sandboxService.forceNotify();
  } catch {}
}

const DEFAULT_CONFIG_ID = 'active_survey_config';

/**
 * Retorna a configuração de pesquisa ativa para a organização
 */
export async function getActiveSurveyConfig(organizationId: string): Promise<EmployeeSurveyConfig | null> {
  if (organizationId === 'sandbox-test') {
    const sandboxConfig = getSandboxItem<EmployeeSurveyConfig>('employee_survey_config');
    if (sandboxConfig) return sandboxConfig;
    
    // Configuração padrão do Sandbox se nenhuma tiver sido criada
    return {
      id: DEFAULT_CONFIG_ID,
      organizationId: 'sandbox-test',
      question: 'Em uma escala de 0 a 10, o quanto você recomendaria o ambiente de trabalho para um colega?',
      scaleType: '0_10',
      allowComments: true,
      commentPlaceholder: 'Deixe aqui sua sugestão ou comentário anônimo...',
      frequency: 'weekly',
      targetTeamIds: [],
      isActive: true,
      createdBy: 'sandbox-admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  try {
    const docRef = doc(db, 'organizations', organizationId, 'survey_configs', DEFAULT_CONFIG_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as EmployeeSurveyConfig;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar configuração de pesquisa:', error);
    return null;
  }
}

/**
 * Salva ou atualiza a configuração da pesquisa de satisfação
 */
export async function saveSurveyConfig(config: EmployeeSurveyConfig): Promise<void> {
  const now = new Date().toISOString();
  const payload: EmployeeSurveyConfig = {
    ...config,
    id: DEFAULT_CONFIG_ID,
    updatedAt: now
  };

  if (config.organizationId === 'sandbox-test') {
    setSandboxItem('employee_survey_config', payload);
    return;
  }

  const docRef = doc(db, 'organizations', config.organizationId, 'survey_configs', DEFAULT_CONFIG_ID);
  await setDoc(docRef, payload, { merge: true });
}

/**
 * Envia uma resposta 100% ANÔNIMA para a pesquisa
 * ATENÇÃO: NENHUM ID DE USUÁRIO, NOME OU E-MAIL É GRAVADO AQUI
 */
export async function submitAnonymousSurveyResponse(
  organizationId: string,
  surveyConfigId: string,
  rating: number,
  scaleType: '0_10' | 'stars' | 'emojis',
  comment?: string,
  teamId?: string
): Promise<void> {
  const responseData: Omit<EmployeeSurveyResponse, 'id'> = {
    surveyConfigId,
    organizationId,
    rating,
    scaleType,
    comment: comment?.trim() || '',
    teamId: teamId || 'default',
    createdAt: new Date().toISOString()
  };

import { secureRandomId } from '../utils/crypto';

  if (organizationId === 'sandbox-test') {
    const responses = getSandboxItem<EmployeeSurveyResponse[]>('employee_survey_responses') || [];
    const newResponse: EmployeeSurveyResponse = {
      ...responseData,
      id: secureRandomId('resp')
    };
    setSandboxItem('employee_survey_responses', [newResponse, ...responses]);
    return;
  }

  const colRef = collection(db, 'organizations', organizationId, 'survey_responses');
  await addDoc(colRef, responseData);
}

/**
 * Escuta todas as respostas anônimas da pesquisa em tempo real
 */
export function subscribeSurveyResponses(
  organizationId: string,
  surveyConfigId: string,
  onUpdate: (responses: EmployeeSurveyResponse[]) => void
): () => void {
  if (organizationId === 'sandbox-test') {
    const responses = getSandboxItem<EmployeeSurveyResponse[]>('employee_survey_responses') || [
      {
        id: 'resp-1',
        surveyConfigId: DEFAULT_CONFIG_ID,
        organizationId: 'sandbox-test',
        rating: 10,
        scaleType: '0_10',
        comment: 'Excelente clima de trabalho e ótimas ferramentas!',
        teamId: 'team-alpha',
        createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
      },
      {
        id: 'resp-2',
        surveyConfigId: DEFAULT_CONFIG_ID,
        organizationId: 'sandbox-test',
        rating: 8,
        scaleType: '0_10',
        comment: 'Gosto do suporte da supervisão.',
        teamId: 'team-alpha',
        createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
      },
      {
        id: 'resp-3',
        surveyConfigId: DEFAULT_CONFIG_ID,
        organizationId: 'sandbox-test',
        rating: 5,
        scaleType: '0_10',
        comment: 'Poderíamos ter mais treinamentos de reciclagem.',
        teamId: 'team-beta',
        createdAt: new Date().toISOString()
      }
    ];
    onUpdate(responses.filter(r => r.surveyConfigId === surveyConfigId));
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'survey_responses');
  const q = query(colRef, where('surveyConfigId', '==', surveyConfigId), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: EmployeeSurveyResponse[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EmployeeSurveyResponse));
    onUpdate(list);
  }, (err) => {
    console.error('Erro ao assinar respostas da pesquisa:', err);
    onUpdate([]);
  });
}

/**
 * Verifica se a pesquisa deve ser exibida ao colaborador atual com base na frequência configurada
 */
export function isUserEligibleForSurvey(
  user: UserProfile,
  config: EmployeeSurveyConfig | null,
  lastRespondedAt?: string
): boolean {
  if (!config || !config.isActive) return false;
  if (!config.question || config.question.trim() === '') return false;
  if (config.frequency === 'disabled') return false;

  // Verifica se a equipe do usuário está incluída nos destinatários (se a lista não for vazia)
  if (config.targetTeamIds && config.targetTeamIds.length > 0) {
    if (!user.teamId || !config.targetTeamIds.includes(user.teamId)) {
      return false;
    }
  }

  // Se o usuário nunca respondeu
  if (!lastRespondedAt) return true;

  const lastDate = new Date(lastRespondedAt).getTime();
  if (isNaN(lastDate)) return true;

  const now = Date.now();
  const diffDays = (now - lastDate) / (1000 * 3600 * 24);

  switch (config.frequency) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'biweekly':
      return diffDays >= 14;
    case 'monthly':
      return diffDays >= 30;
    case 'quarterly':
      return diffDays >= 90;
    case 'semiannual':
      return diffDays >= 180;
    case 'annual':
      return diffDays >= 365;
    case 'once':
      return false; // Já respondeu 1x
    default:
      return false;
  }
}

/**
 * Calcula KPIs estatísticos e eNPS para as respostas recebidas
 */
export function calculateSurveyStats(responses: EmployeeSurveyResponse[]): SurveyStats {
  if (!responses || responses.length === 0) {
    return {
      totalResponses: 0,
      averageScore: 0,
      enpsScore: null,
      enpsZone: '-',
      distribution: {},
      promotersPercentage: 0,
      neutralsPercentage: 0,
      detractorsPercentage: 0
    };
  }

  const total = responses.length;
  const sum = responses.reduce((acc, r) => acc + r.rating, 0);
  const averageScore = Number((sum / total).toFixed(1));

  const distribution: Record<number, number> = {};
  responses.forEach(r => {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  });

  // Cálculo de eNPS (apenas para escala 0 a 10)
  const isScale010 = responses.some(r => r.scaleType === '0_10');
  if (!isScale010) {
    return {
      totalResponses: total,
      averageScore,
      enpsScore: null,
      enpsZone: '-',
      distribution,
      promotersPercentage: 0,
      neutralsPercentage: 0,
      detractorsPercentage: 0
    };
  }

  let promoters = 0;
  let neutrals = 0;
  let detractors = 0;

  responses.forEach(r => {
    if (r.rating >= 9) promoters++;
    else if (r.rating >= 7) neutrals++;
    else detractors++;
  });

  const promotersPercentage = Math.round((promoters / total) * 100);
  const neutralsPercentage = Math.round((neutrals / total) * 100);
  const detractorsPercentage = Math.round((detractors / total) * 100);

  const enpsScore = Math.round(promotersPercentage - detractorsPercentage);

  let enpsZone = 'Aperfeiçoamento';
  if (enpsScore >= 75) enpsZone = 'Excelência';
  else if (enpsScore >= 50) enpsZone = 'Qualidade';
  else if (enpsScore >= 0) enpsZone = 'Aperfeiçoamento';
  else enpsZone = 'Crítica';

  return {
    totalResponses: total,
    averageScore,
    enpsScore,
    enpsZone,
    distribution,
    promotersPercentage,
    neutralsPercentage,
    detractorsPercentage
  };
}
