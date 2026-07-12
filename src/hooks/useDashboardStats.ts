import { useMemo } from 'react';
import { Agreement, DashboardStats } from '../types';
import { calculateDashboardStats } from '../lib/metrics';

interface UseDashboardStatsProps {
  monthAgreements: Agreement[];
  filteredAgreements: Agreement[];
  monthlyGoal: number;
  selectedMonth: number;
  selectedYear: number;
}

export const useDashboardStats = ({
  monthAgreements,
  filteredAgreements,
  monthlyGoal,
  selectedMonth,
  selectedYear
}: UseDashboardStatsProps): DashboardStats => {
  return useMemo(() => {
    return calculateDashboardStats(
      monthAgreements,
      filteredAgreements,
      monthlyGoal,
      selectedMonth,
      selectedYear
    );
  }, [monthAgreements, filteredAgreements, monthlyGoal, selectedMonth, selectedYear]);
};
