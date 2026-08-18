/**
 * Utilitário para cálculo e formatação de Tempo de Casa e Onboarding de Colaboradores
 */

export interface TenureInfo {
  days: number;
  months: number;
  years: number;
  formatted: string;
  category: 'newcomer' | 'ramping' | 'regular' | 'veteran';
  categoryLabel: string;
  categoryBadgeClass: string;
  isOnboarding: boolean;
}

export interface OnboardingChecklistItem {
  id: string;
  label: string;
  category: 'setup' | 'security' | 'training' | 'quality';
}

export const DEFAULT_ONBOARDING_CHECKLIST: OnboardingChecklistItem[] = [
  { id: 'tracker_access', label: 'Criação de Acesso ao Sistema & Credenciais', category: 'setup' },
  { id: 'equipment_delivery', label: 'Entrega de equipamentos de trabalho', category: 'setup' },
  { id: 'script_training', label: 'Treinamento de Scripts & Prontuário 360°', category: 'training' },
  { id: 'nda_contract', label: 'Assinatura do Contrato de Prestação & Termo de Sigilo', category: 'security' },
  { id: 'first_qa_monitoring', label: '1ª Monitoria de Qualidade Acompanhada (QA)', category: 'quality' },
];

/**
 * Calcula o tempo de casa e classifica o colaborador
 * @param startDateStr Data de admissão/início (formato YYYY-MM-DD ou ISO)
 * @param createdAtStr Data de criação do usuário no Firebase (fallback)
 * @param onboardingDaysLimit Limite de dias para a fase de onboarding (padrão 90)
 */
export function calculateTenure(
  startDateStr?: string | null,
  createdAtStr?: string | null,
  onboardingDaysLimit: number = 90
): TenureInfo {
  const referenceDateStr = startDateStr || createdAtStr;
  
  if (!referenceDateStr) {
    return {
      days: 0,
      months: 0,
      years: 0,
      formatted: 'Recém-chegado',
      category: 'newcomer',
      categoryLabel: 'Recém-chegado',
      categoryBadgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      isOnboarding: true,
    };
  }

  const startDate = new Date(referenceDateStr.includes('T') ? referenceDateStr : `${referenceDateStr}T12:00:00`);
  const now = new Date();

  // Diferença em milissegundos
  const diffTime = Math.max(0, now.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const diffMonths = Math.floor(diffDays / 30.4375);
  const diffYears = Math.floor(diffDays / 365.25);

  let formatted = '';
  if (diffDays === 0) {
    formatted = 'Primeiro dia';
  } else if (diffDays < 30) {
    formatted = `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  } else if (diffDays < 365) {
    const remainingDays = Math.floor(diffDays % 30.4375);
    formatted = remainingDays > 0 
      ? `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'} e ${remainingDays}d`
      : `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
  } else {
    const remainingMonths = Math.floor((diffDays % 365.25) / 30.4375);
    formatted = remainingMonths > 0
      ? `${diffYears} ${diffYears === 1 ? 'ano' : 'anos'} e ${remainingMonths}m`
      : `${diffYears} ${diffYears === 1 ? 'ano' : 'anos'}`;
  }

  // Classificação
  let category: TenureInfo['category'] = 'regular';
  let categoryLabel = 'Efetivado';
  let categoryBadgeClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';

  if (diffDays <= 30) {
    category = 'newcomer';
    categoryLabel = 'Recém-chegado';
    categoryBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (diffDays <= onboardingDaysLimit) {
    category = 'ramping';
    categoryLabel = 'Em Adaptação';
    categoryBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (diffDays > 365) {
    category = 'veteran';
    categoryLabel = 'Veterano';
    categoryBadgeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  }

  const isOnboarding = diffDays <= onboardingDaysLimit;

  return {
    days: diffDays,
    months: diffMonths,
    years: diffYears,
    formatted,
    category,
    categoryLabel,
    categoryBadgeClass,
    isOnboarding,
  };
}
