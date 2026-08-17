import { useMemo } from 'react';
import { Agreement, DashboardStats, MonthlyAggregatedStats } from '../types';
import { calculateDashboardStats } from '../lib/metrics';

interface UseDashboardStatsProps {
  monthAgreements: Agreement[];
  filteredAgreements: Agreement[];
  monthlyGoal: number;
  selectedMonth: number;
  selectedYear: number;
  aggregatedStats?: MonthlyAggregatedStats | null;
}

export const useDashboardStats = ({
  monthAgreements,
  filteredAgreements,
  monthlyGoal,
  selectedMonth,
  selectedYear,
  aggregatedStats
}: UseDashboardStatsProps): DashboardStats => {
  return useMemo(() => {
    const rawStats = calculateDashboardStats(
      monthAgreements,
      filteredAgreements,
      monthlyGoal,
      selectedMonth,
      selectedYear
    );

    // Se temos estatísticas pré-agregadas do servidor/cache e não há filtros locais ativos,
    // usamos os números agregados garantindo consistência com alta performance.
    if (aggregatedStats && (!filteredAgreements.length || filteredAgreements.length === monthAgreements.length)) {
      return {
        ...rawStats,
        totalProjected: aggregatedStats.totalProjected ?? rawStats.totalProjected,
        totalPaid: aggregatedStats.totalPaid ?? rawStats.totalPaid,
        effectivenessRate: aggregatedStats.effectivenessRate ?? rawStats.effectivenessRate,
        ticketAverage: aggregatedStats.ticketAverage ?? rawStats.ticketAverage,
        projectedMrr: aggregatedStats.projectedMrr ?? rawStats.projectedMrr
      };
    }

    return rawStats;
  }, [monthAgreements, filteredAgreements, monthlyGoal, selectedMonth, selectedYear, aggregatedStats]);
};

