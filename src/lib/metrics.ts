import { Agreement, AgreementStatus, DashboardStats } from '../types';
import { parseLocalDate } from '../utils/date';

/**
 * Filtra apenas acordos reais, removendo os acordos de ajuste de conciliação.
 */
export const filterRealAgreements = (agreements: Agreement[]): Agreement[] => {
  return agreements.filter(a => !a.isAdjustment);
};

/**
 * Calcula o colchão projetado (MRR futuro) de parcelamentos aguardando pagamento
 * com vencimento a partir de hoje.
 */
export const calculateProjectedMrr = (agreements: Agreement[], today: Date): number => {
  const realAgreements = filterRealAgreements(agreements);
  return realAgreements
    .filter(a => a.type === 'parcelamento' && a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= today)
    .reduce((acc, curr) => acc + curr.value, 0);
};

/**
 * Calcula a taxa de quebra de acordos agrupados pelo intervalo de dilação
 * (diferença em dias entre a data de vencimento e a data de criação).
 */
export const calculateBreakRatesByDilatedDays = (agreements: Agreement[]): Record<string, number> => {
  const realAgreements = filterRealAgreements(agreements);
  const bins: Record<string, { total: number; broken: number }> = {
    '1-3 dias': { total: 0, broken: 0 },
    '4-7 dias': { total: 0, broken: 0 },
    '8-15 dias': { total: 0, broken: 0 },
    '16+ dias': { total: 0, broken: 0 }
  };

  realAgreements.forEach(a => {
    const created = new Date(a.createdAt);
    const due = parseLocalDate(a.dueDate);
    const diffDays = Math.ceil((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    let bin = '1-3 dias';
    if (diffDays <= 3) bin = '1-3 dias';
    else if (diffDays <= 7) bin = '4-7 dias';
    else if (diffDays <= 15) bin = '8-15 dias';
    else bin = '16+ dias';

    bins[bin].total += 1;
    if (a.status === AgreementStatus.BROKEN) {
      bins[bin].broken += 1;
    }
  });

  const rates: Record<string, number> = {};
  Object.keys(bins).forEach(key => {
    rates[key] = bins[key].total > 0 ? (bins[key].broken / bins[key].total) * 100 : 0;
  });
  return rates;
};

/**
 * Calcula a taxa de quebra agrupada por categoria (fixa/variável).
 */
export const calculateBreakRateByCategory = (agreements: Agreement[]): { fixa: number; variavel: number } => {
  const realAgreements = filterRealAgreements(agreements);
  const categories = {
    fixa: { total: 0, broken: 0 },
    variavel: { total: 0, broken: 0 }
  };

  realAgreements.forEach(a => {
    const cat = a.category;
    if (cat === 'fixa' || cat === 'variavel') {
      categories[cat].total += 1;
      if (a.status === AgreementStatus.BROKEN) {
        categories[cat].broken += 1;
      }
    }
  });

  return {
    fixa: categories.fixa.total > 0 ? (categories.fixa.broken / categories.fixa.total) * 100 : 0,
    variavel: categories.variavel.total > 0 ? (categories.variavel.broken / categories.variavel.total) * 100 : 0
  };
};

/**
 * Calcula a distribuição horária do valor liquidado (pago).
 */
export const calculatePrimeTimeDistribution = (agreements: Agreement[]): Record<number, number> => {
  const realAgreements = filterRealAgreements(agreements);
  return realAgreements
    .filter(a => a.status === AgreementStatus.PAID)
    .reduce((acc, a) => {
      const hour = new Date(a.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + a.value;
      return acc;
    }, {} as Record<number, number>);
};

/**
 * Monta o calendário de calor macro de 31 dias (ou tamanho do mês).
 */
export const calculateHeatmap31Days = (
  agreements: Agreement[],
  selectedMonth: number,
  selectedYear: number
): { day: number; generation: number; liquidity: number }[] => {
  const realAgreements = filterRealAgreements(agreements);
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, generation: 0, liquidity: 0 });
  }

  realAgreements.forEach(a => {
    const createdDate = new Date(a.createdAt);
    if (createdDate.getMonth() === selectedMonth && createdDate.getFullYear() === selectedYear) {
      const day = createdDate.getDate();
      if (day >= 1 && day <= daysInMonth) {
        days[day - 1].generation += a.value;
      }
    }

    if (a.status === AgreementStatus.PAID && a.paidAt) {
      const paidDate = new Date(a.paidAt);
      if (paidDate.getMonth() === selectedMonth && paidDate.getFullYear() === selectedYear) {
        const day = paidDate.getDate();
        if (day >= 1 && day <= daysInMonth) {
          days[day - 1].liquidity += a.value;
        }
      }
    }
  });

  return days;
};

/**
 * Função principal consolidadora que recebe acordos e metas e retorna
 * as estatísticas consolidadas do dashboard.
 */
export const calculateDashboardStats = (
  monthAgreements: Agreement[],
  filteredAgreements: Agreement[],
  monthlyGoal: number,
  selectedMonth: number,
  selectedYear: number,
  today: Date = new Date()
): DashboardStats => {
  const todayZero = new Date(today);
  todayZero.setHours(0, 0, 0, 0);

  // Filtrar acordos reais (remover os de ajuste) para contagens e médias
  const realMonthAgreements = filterRealAgreements(monthAgreements);
  const realFilteredAgreements = filterRealAgreements(filteredAgreements);

  // Usa o conjunto filtrado (granular) para as métricas dos cards/gráficos
  const realTargetAgreements = realFilteredAgreements;

  // Cálculos Filtrados / Granulados para Cards e Gráficos
  const totalProjected = realTargetAgreements.reduce((acc, curr) => acc + curr.value, 0);
  const paidAgreementsFiltered = realTargetAgreements.filter(a => a.status === AgreementStatus.PAID);
  const totalPaidFiltered = paidAgreementsFiltered.reduce((acc, curr) => acc + curr.value, 0);

  const overdueAgreementsFiltered = realTargetAgreements.filter(a => 
    a.status === AgreementStatus.WAITING && 
    parseLocalDate(a.dueDate) < todayZero
  );
  const totalOverdueFiltered = overdueAgreementsFiltered.reduce((acc, curr) => acc + curr.value, 0);

  const pendingTodayAgreementsFiltered = realTargetAgreements.filter(a => 
    a.status === AgreementStatus.WAITING && 
    parseLocalDate(a.dueDate).getTime() === todayZero.getTime()
  );
  const totalPendingTodayFiltered = pendingTodayAgreementsFiltered.reduce((acc, curr) => acc + curr.value, 0);

  // Cálculos Mensais Fixos para Acompanhamento de Meta Global
  const paidAgreementsMonth = realMonthAgreements.filter(a => a.status === AgreementStatus.PAID);
  const totalPaidMonth = paidAgreementsMonth.reduce((acc, curr) => acc + curr.value, 0);

  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

  // Chamando sub-cálculos purificados
  const projectedMrr = calculateProjectedMrr(monthAgreements, todayZero);
  const breakRatesByDilatedDays = calculateBreakRatesByDilatedDays(realTargetAgreements);
  const breakRateByCategory = calculateBreakRateByCategory(realTargetAgreements);
  const primeTimeDistribution = calculatePrimeTimeDistribution(realTargetAgreements);
  const heatmap31Days = calculateHeatmap31Days(monthAgreements, selectedMonth, selectedYear);

  const dueTodayAgreements = realMonthAgreements.filter(a => 
    parseLocalDate(a.dueDate).getTime() === todayZero.getTime()
  );
  const dueTodayPaidCount = dueTodayAgreements.filter(a => a.status === AgreementStatus.PAID).length;
  const dueTodayTotalCount = dueTodayAgreements.length;
  const todayEffectiveness = dueTodayTotalCount > 0 
    ? (dueTodayPaidCount / dueTodayTotalCount) * 100 
    : 0;

  const todayPaidValue = realMonthAgreements
    .filter(a => a.status === AgreementStatus.PAID && new Date(a.createdAt) >= todayZero)
    .reduce((acc, curr) => acc + curr.value, 0);

  const effectivenessRate = realTargetAgreements.length > 0
    ? (paidAgreementsFiltered.length / realTargetAgreements.length) * 100
    : 0;

  return {
    totalProjected,
    totalPaid: totalPaidFiltered,
    filteredPaidValue: totalPaidFiltered,
    totalOverdue: totalOverdueFiltered,
    totalPendingToday: totalPendingTodayFiltered,
    effectivenessRate,
    todayPaidValue,
    todayEffectiveness,
    counts: {
      month: {
        total: realMonthAgreements.length,
        paid: realMonthAgreements.filter(a => a.status === AgreementStatus.PAID).length,
        waiting: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= todayZero).length,
        broken: realMonthAgreements.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < todayZero)).length,
        overdue: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < todayZero).length,
        pendingToday: realMonthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate).getTime() === todayZero.getTime()).length,
      },
      filtered: {
        total: realFilteredAgreements.length,
        paid: realFilteredAgreements.filter(a => a.status === AgreementStatus.PAID).length,
        waiting: realFilteredAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= todayZero).length,
        broken: realFilteredAgreements.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < todayZero)).length,
        overdue: realFilteredAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < todayZero).length,
      },
      today: realTargetAgreements.filter(a => new Date(a.createdAt) >= todayZero).length,
      checklist: realMonthAgreements.filter(a => {
        const dueDate = parseLocalDate(a.dueDate);
        const wasCheckedToday = a.lastCheckedAt && 
          new Date(a.lastCheckedAt).toLocaleDateString() === today.toLocaleDateString();
        const isOverdue = dueDate < todayZero;
        const isDueToday = dueDate.getTime() === todayZero.getTime();
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
    ticketAverage: realTargetAgreements.length > 0 ? totalProjected / realTargetAgreements.length : 0,
    remainingToGoal: Math.max(0, (monthlyGoal || 0) - totalPaidMonth),
    projectedMrr,
    
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
        const next7 = new Date(todayZero);
        next7.setDate(todayZero.getDate() + 7);
        return monthAgreements
          .filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) >= todayZero && parseLocalDate(a.dueDate) <= next7)
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
        const expiredWaiting = monthAgreements.filter(a => a.status === AgreementStatus.WAITING && parseLocalDate(a.dueDate) < todayZero);
        if (expiredWaiting.length === 0) return 0;
        const checked = expiredWaiting.filter(a => a.lastCheckedAt && new Date(a.lastCheckedAt).toLocaleDateString() === today.toLocaleDateString());
        return (checked.length / expiredWaiting.length) * 100;
      })(),
      breakRatesByDilatedDays,
      breakRateByCategory,
      primeTimeDistribution,
      heatmap31Days
    },
    projection: (() => {
      const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();
      if (!isCurrentMonth) return totalPaidMonth;
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDay = today.getDate();
      const dailyAvg = totalPaidMonth / currentDay;
      return dailyAvg * daysInMonth;
    })(),
    hourlyDistribution: filteredAgreements.reduce((acc, a) => {
      const hour = new Date(a.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>)
  };
};
