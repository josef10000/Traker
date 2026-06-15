import { useMemo } from 'react';
import { Agreement, AgreementStatus, DashboardStats } from '../types';
import { parseLocalDate } from '../utils/date';

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtrar apenas acordos reais para contagens e médias (remover os de ajuste)
    const realMonthAgreements = monthAgreements.filter(a => !a.isAdjustment);
    const realFilteredAgreements = filteredAgreements.filter(a => !a.isAdjustment);

    // Cálculos Mensais
    const totalProjected = monthAgreements.reduce((acc, curr) => acc + curr.value, 0);
    const paidAgreementsMonth = monthAgreements.filter(a => a.status === AgreementStatus.PAID);
    const totalPaidMonth = paidAgreementsMonth.reduce((acc, curr) => acc + curr.value, 0);
    
    const overdueAgreementsMonth = monthAgreements.filter(a => 
      a.status === AgreementStatus.WAITING && 
      parseLocalDate(a.dueDate) < today
    );
    const totalOverdueMonth = overdueAgreementsMonth.reduce((acc, curr) => acc + curr.value, 0);
    
    const pendingTodayAgreementsMonth = monthAgreements.filter(a => 
      a.status === AgreementStatus.WAITING && 
      parseLocalDate(a.dueDate).getTime() === today.getTime()
    );
    const totalPendingTodayMonth = pendingTodayAgreementsMonth.reduce((acc, curr) => acc + curr.value, 0);

    // Cálculos Filtrados
    const paidAgreementsFiltered = filteredAgreements.filter(a => a.status === AgreementStatus.PAID);
    const totalPaidFiltered = paidAgreementsFiltered.reduce((acc, curr) => acc + curr.value, 0);
    
    const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();

    return {
      totalProjected,
      totalPaid: totalPaidMonth,
      filteredPaidValue: totalPaidFiltered,
      totalOverdue: totalOverdueMonth,
      totalPendingToday: totalPendingTodayMonth,
      effectivenessRate: (totalPaidMonth / (totalProjected || 1)) * 100,
      counts: {
        month: {
          total: realMonthAgreements.length,
          paid: realMonthAgreements.filter(a => a.status === AgreementStatus.PAID).length,
          waiting: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today).length,
          broken: realMonthAgreements.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)).length,
          overdue: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today).length,
          pendingToday: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate).getTime() === today.getTime()).length,
        },
        filtered: {
          total: realFilteredAgreements.length,
          paid: realFilteredAgreements.filter(a => a.status === AgreementStatus.PAID).length,
          waiting: realFilteredAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today).length,
          broken: realFilteredAgreements.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today)).length,
          overdue: realFilteredAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today).length,
        },
        today: realMonthAgreements.filter(a => new Date(a.createdAt) >= today).length,
        checklist: realMonthAgreements.filter(a => {
          const dueDate = parseLocalDate(a.dueDate);
          const wasCheckedToday = a.lastCheckedAt && 
            new Date(a.lastCheckedAt).toLocaleDateString() === new Date().toLocaleDateString();
          const isOverdue = dueDate < today;
          const isDueToday = dueDate.getTime() === today.getTime();
          const wasCheckedAtAnyTime = !!a.lastCheckedAt;

          if (isDueToday) {
            return a.status === AgreementStatus.WAITING && !wasCheckedToday;
          }
          if (isOverdue) {
            return a.status === AgreementStatus.WAITING && !wasCheckedAtAnyTime;
          }
          return false;
        }).length,
      },
      ticketAverage: realMonthAgreements.length > 0 ? totalProjected / realMonthAgreements.length : 0,
      remainingToGoal: Math.max(0, (monthlyGoal || 0) - totalPaidMonth),
      
      // Advanced Insights
      insights: {
        avgTimeToPay: (() => {
          const paidWithTime = monthAgreements.filter(a => a.status === AgreementStatus.PAID && a.paidAt);
          if (paidWithTime.length === 0) return 0;
          const totalMs = paidWithTime.reduce((acc, a) => {
            const created = new Date(a.createdAt).getTime();
            const paid = new Date(a.paidAt!).getTime();
            return acc + Math.max(0, paid - created);
          }, 0);
          return totalMs / paidWithTime.length / (1000 * 60 * 60); // Em horas
        })(),
        projection7d: (() => {
          const next7 = new Date(today);
          next7.setDate(today.getDate() + 7);
          return monthAgreements
            .filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today && parseLocalDate(a.dueDate) <= next7)
            .reduce((acc, curr) => acc + curr.value, 0);
        })(),
        performanceByOrigin: monthAgreements.reduce((acc, curr) => {
          const origin = curr.origin;
          if (!acc[origin]) acc[origin] = { total: 0, paid: 0 };
          acc[origin].total += curr.value;
          if (curr.status === AgreementStatus.PAID) acc[origin].paid += curr.value;
          return acc;
        }, {} as Record<string, { total: number; paid: number }>),
        ticketByType: monthAgreements.reduce((acc, curr) => {
          const type = curr.type;
          if (!acc[type]) acc[type] = { total: 0, count: 0 };
          acc[type].total += curr.value;
          acc[type].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>),
        cycleEfficiency: {
          morning: (() => {
            const morning = monthAgreements.filter(a => new Date(a.createdAt).getHours() < 12);
            if (morning.length === 0) return 0;
            return (morning.filter(a => a.status === AgreementStatus.PAID).length / morning.length) * 100;
          })(),
          afternoon: (() => {
            const afternoon = monthAgreements.filter(a => new Date(a.createdAt).getHours() >= 12);
            if (afternoon.length === 0) return 0;
            return (afternoon.filter(a => a.status === AgreementStatus.PAID).length / afternoon.length) * 100;
          })()
        },
        earlyBreakRate: (() => {
          const expiredWaiting = monthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < today);
          if (expiredWaiting.length === 0) return 0;
          const checked = expiredWaiting.filter(a => a.lastCheckedAt && new Date(a.lastCheckedAt).toLocaleDateString() === today.toLocaleDateString());
          return (checked.length / expiredWaiting.length) * 100;
        })()
      },
      projection: (() => {
        if (!isCurrentMonth) return totalPaidMonth;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const dailyAvg = totalPaidMonth / currentDay;
        return dailyAvg * daysInMonth;
      })(),
      hourlyDistribution: filteredAgreements.reduce((acc, a) => {
        const hour = new Date(a.createdAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    };
  }, [monthAgreements, filteredAgreements, monthlyGoal, selectedMonth, selectedYear]);
};
