import { Agreement, QaCompetence, QaEvaluation, Pdi } from '../types';

export interface QaStatsResult {
  avgScore: number;
  totalEvals: number;
  gapsData: Array<{
    subject: string;
    "Operador": number;
    "Média Geral": number;
    "Diferença": number;
  }>;
  worstCompetence: string;
  chartData: Array<{ date: string; Nota: number }>;
}

export interface OpPerformanceResult {
  monthVal: number;
  weekVal: number;
  avgCount: number;
  todayStatus: 'present' | 'late' | 'absent';
}

/**
 * Calcula todas as estatísticas e análise de competências do QA
 */
export const calculateQaStats = (
  evaluations: QaEvaluation[],
  competences: QaCompetence[],
  selectedOperatorId: string
): QaStatsResult => {
  // 1. Calcular médias globais de competências (todos os operadores)
  const globalCompetenceSum: Record<string, { total: number; count: number }> = {};
  competences.forEach(c => {
    globalCompetenceSum[c.id] = { total: 0, count: 0 };
  });
  
  evaluations.forEach(e => {
    Object.entries(e.grades).forEach(([compId, grade]) => {
      if (globalCompetenceSum[compId]) {
        globalCompetenceSum[compId].total += grade as number;
        globalCompetenceSum[compId].count += 1;
      }
    });
  });

  // 2. Filtrar avaliações pelo operador
  const filteredEvals = selectedOperatorId === 'all' 
    ? evaluations 
    : evaluations.filter(e => e.operatorId === selectedOperatorId);

  const sum = filteredEvals.reduce((acc, curr) => acc + curr.score, 0);
  const avgScore = filteredEvals.length > 0 ? sum / filteredEvals.length : 0;

  // Calcular médias do operador selecionado
  const competenceSum: Record<string, { total: number; count: number }> = {};
  competences.forEach(c => {
    competenceSum[c.id] = { total: 0, count: 0 };
  });

  filteredEvals.forEach(e => {
    Object.entries(e.grades).forEach(([compId, grade]) => {
      if (competenceSum[compId]) {
        competenceSum[compId].total += grade as number;
        competenceSum[compId].count += 1;
      }
    });
  });

  // Gerar gapsData
  const gapsData = competences.map(c => {
    const info = competenceSum[c.id];
    const avg = info && info.count > 0 ? info.total / info.count : 0;

    const globalInfo = globalCompetenceSum[c.id];
    const globalAvg = globalInfo && globalInfo.count > 0 ? globalInfo.total / globalInfo.count : 0;

    const opAvg = info && info.count > 0 ? avg : 0;
    const diff = Math.round(opAvg - globalAvg);

    return {
      subject: c.name,
      "Operador": Math.round(opAvg),
      "Média Geral": Math.round(globalAvg),
      "Diferença": diff
    };
  });

  // Pior Competência
  let worstCompName = 'N/A';
  let worstAvg = 101;
  competences.forEach(c => {
    const info = competenceSum[c.id];
    const avg = info && info.count > 0 ? info.total / info.count : 0;
    if (info && info.count > 0 && avg < worstAvg) {
      worstAvg = avg;
      worstCompName = c.name;
    }
  });

  // Histórico de notas temporal
  const chartData = [...filteredEvals]
    .reverse()
    .map(e => ({
      date: new Date(e.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      Nota: Math.round(e.score)
    }));

  return {
    avgScore,
    totalEvals: filteredEvals.length,
    gapsData,
    worstCompetence: worstCompName,
    chartData
  };
};

/**
 * Calcula produtividade de acordos e status do operador selecionado
 */
export const calculateOpPerformance = (
  agreements: Agreement[],
  selectedOperatorId: string,
  attendanceStatuses: Record<string, 'present' | 'late' | 'absent'>
): OpPerformanceResult | null => {
  if (selectedOperatorId === 'all') return null;

  const opAgreements = agreements.filter(a => a.operatorId === selectedOperatorId);
  
  // Valor total do mês (pagos + aguardando)
  const monthVal = opAgreements
    .filter(a => a.status === 'paid' || a.status === 'waiting')
    .reduce((acc, curr) => acc + curr.value, 0);

  // Valor total semanal
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekVal = opAgreements
    .filter(a => {
      const createDate = new Date(a.createdAt);
      return createDate >= sevenDaysAgo && (a.status === 'paid' || a.status === 'waiting');
    })
    .reduce((acc, curr) => acc + curr.value, 0);

  // Média de acordos por dia
  const todayDay = new Date().getDate() || 1;
  const avgCount = opAgreements.length / todayDay;

  // Frequência
  const todayStatus = attendanceStatuses[selectedOperatorId] || 'present';

  return {
    monthVal,
    weekVal,
    avgCount,
    todayStatus
  };
};

/**
 * Conta quantidade de PDIs vencidos
 */
export const getExpiredPdisCount = (pdis: Pdi[]): number => {
  return pdis.filter(p => p.status === 'expired').length;
};
