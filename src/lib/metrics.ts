import { Agreement, AttendanceRecord, AgreementStatus, DashboardStats } from '../types';
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
 * Computa estatísticas avançadas de desconto (Níveis 1, 2, 4, 5).
 */
export const calculateDiscountStats = (agreements: Agreement[]) => {
  const real = filterRealAgreements(agreements);

  let totalWithDiscount = 0;
  let totalWithoutDiscount = 0;
  let totalNotSpecified = 0;

  const byReason = {
    installment_discount: 0,
    overdue_discount: 0,
    payment_discount: 0,
    payoff_discount: 0,
  };

  let paidWithDiscount = 0;
  let brokenWithDiscount = 0;

  let paidWithoutDiscount = 0;
  let brokenWithoutDiscount = 0;

  let volumeWithDiscount = 0;
  let volumeWithoutDiscount = 0;

  let paidVolumeWithDiscount = 0;
  let paidVolumeWithoutDiscount = 0;

  const byAgreementType: Record<string, { total: number; withDiscount: number; discountRate: number }> = {};

  real.forEach(a => {
    const typeKey = a.type || 'outros';
    if (!byAgreementType[typeKey]) {
      byAgreementType[typeKey] = { total: 0, withDiscount: 0, discountRate: 0 };
    }
    byAgreementType[typeKey].total++;

    if (a.discountApplied === true) {
      totalWithDiscount++;
      volumeWithDiscount += a.value || 0;
      byAgreementType[typeKey].withDiscount++;

      if (a.discountReason && byReason[a.discountReason] !== undefined) {
        byReason[a.discountReason]++;
      }

      if (a.status === AgreementStatus.PAID) {
        paidWithDiscount++;
        paidVolumeWithDiscount += a.value || 0;
      } else if (a.status === AgreementStatus.BROKEN) {
        brokenWithDiscount++;
      }
    } else if (a.discountApplied === false) {
      totalWithoutDiscount++;
      volumeWithoutDiscount += a.value || 0;

      if (a.status === AgreementStatus.PAID) {
        paidWithoutDiscount++;
        paidVolumeWithoutDiscount += a.value || 0;
      } else if (a.status === AgreementStatus.BROKEN) {
        brokenWithoutDiscount++;
      }
    } else {
      totalNotSpecified++;
    }
  });

  Object.values(byAgreementType).forEach(item => {
    item.discountRate = item.total > 0 ? Math.round((item.withDiscount / item.total) * 100) : 0;
  });

  const validSpecified = totalWithDiscount + totalWithoutDiscount;
  const discountRate = validSpecified > 0 ? Math.round((totalWithDiscount / validSpecified) * 100) : 0;

  const effectivenessWithDiscount = totalWithDiscount > 0
    ? Math.round((paidWithDiscount / totalWithDiscount) * 100)
    : 0;

  const effectivenessWithoutDiscount = totalWithoutDiscount > 0
    ? Math.round((paidWithoutDiscount / totalWithoutDiscount) * 100)
    : 0;

  const breakRateWithDiscount = totalWithDiscount > 0
    ? Math.round((brokenWithDiscount / totalWithDiscount) * 100)
    : 0;

  const breakRateWithoutDiscount = totalWithoutDiscount > 0
    ? Math.round((brokenWithoutDiscount / totalWithoutDiscount) * 100)
    : 0;

  return {
    totalWithDiscount,
    totalWithoutDiscount,
    totalNotSpecified,
    discountRate,
    byReason,
    effectivenessWithDiscount,
    effectivenessWithoutDiscount,
    breakRateWithDiscount,
    breakRateWithoutDiscount,
    byAgreementType,
    volumeWithDiscount,
    volumeWithoutDiscount,
    paidVolumeWithDiscount,
    paidVolumeWithoutDiscount,
  };
};

/**
 * Calcula métricas preditivas, forecast de arrecadação N+1, risco de quebra,
 * atendimentos por operador e modalidades de acordo para a 6ª sub-aba do BI.
 */
export const calculateForecastStats = (
  agreements: Agreement[],
  records: AttendanceRecord[] = []
): NonNullable<DashboardStats['insights']>['forecastStats'] => {
  const realAgreements = filterRealAgreements(agreements);

  // 1. Operadores e Atendimentos na visão
  const operatorIds = new Set<string>();
  realAgreements.forEach(a => { if (a.operatorId) operatorIds.add(a.operatorId); });
  records.forEach(r => { if (r.operatorId) operatorIds.add(r.operatorId); });

  const activeOperatorsCount = Math.max(1, operatorIds.size);
  const totalAttendances = records.length;
  const avgAttendancesPerOperator = totalAttendances > 0 
    ? Math.round((totalAttendances / activeOperatorsCount) * 10) / 10 
    : 0;

  const successfulAttendances = records.filter(r => r.isSuccess).length;
  const attendanceEffectivenessRate = totalAttendances > 0 
    ? (successfulAttendances / totalAttendances) * 100 
    : (realAgreements.length > 0 ? (realAgreements.filter(a => a.status === AgreementStatus.PAID).length / realAgreements.length) * 100 : 0);

  // 2. Desmembramento por Modalidade de Acordo
  const paidVolumeByAgreementType: Record<string, { totalValue: number; count: number; paidValue: number; paidCount: number; ticketAverage: number; effectivenessRate: number }> = {};
  
  const typeMap: Record<string, Agreement[]> = {};
  realAgreements.forEach(a => {
    const typeKey = a.type || 'parcelamento';
    if (!typeMap[typeKey]) typeMap[typeKey] = [];
    typeMap[typeKey].push(a);
  });

  Object.entries(typeMap).forEach(([typeKey, list]) => {
    const totalValue = list.reduce((sum, item) => sum + item.value, 0);
    const count = list.length;
    const paidList = list.filter(item => item.status === AgreementStatus.PAID);
    const paidValue = paidList.reduce((sum, item) => sum + item.value, 0);
    const paidCount = paidList.length;
    const ticketAverage = count > 0 ? totalValue / count : 0;
    const effectivenessRate = count > 0 ? (paidCount / count) * 100 : 0;

    paidVolumeByAgreementType[typeKey] = {
      totalValue,
      count,
      paidValue,
      paidCount,
      ticketAverage,
      effectivenessRate
    };
  });

  // 3. Projeção Mês N+1 & Quebra Estimada
  const paidAgreements = realAgreements.filter(a => a.status === AgreementStatus.PAID);
  const totalPaid = paidAgreements.reduce((sum, a) => sum + a.value, 0);
  const effectivenessRatio = realAgreements.length > 0 ? paidAgreements.length / realAgreements.length : 0.7;

  // Projeção Mês N+1: Run rate + ponderação por efetividade
  const projectedNextMonthRecovery = Math.round(totalPaid * (1 + (effectivenessRatio > 0.5 ? 0.08 : -0.05)));

  // Quebra Estimada N+1 em R$
  const brokenAgreements = realAgreements.filter(a => a.status === AgreementStatus.BROKEN);
  const brokenRate = realAgreements.length > 0 ? brokenAgreements.length / realAgreements.length : 0.15;
  const projectedNextMonthBreakValue = Math.round((realAgreements.reduce((s, a) => s + a.value, 0) - totalPaid) * brokenRate);

  // Colchão Recorrente (Secundário)
  const today = new Date();
  const secondaryMrrColchao = calculateProjectedMrr(agreements, today);

  // Top 5 dias com maior liquidez (Sazonalidade 31 dias)
  const dayMap: Record<number, number> = {};
  paidAgreements.forEach(a => {
    const d = parseLocalDate(a.dueDate).getDate();
    dayMap[d] = (dayMap[d] || 0) + a.value;
  });
  const sortedDays = Object.entries(dayMap)
    .sort((a, b) => b[1] - a[1])
    .map(([day]) => parseInt(day, 10))
    .slice(0, 5);
  const bestLiquidityDays = sortedDays.length > 0 ? sortedDays : [5, 10, 15, 20, 28];

  // Prime Time Windows (Faixas Horárias de Conversão)
  const hourMap: Record<number, { total: number; paid: number }> = {};
  realAgreements.forEach(a => {
    const dateObj = new Date(a.createdAt);
    const h = dateObj.getHours();
    if (!hourMap[h]) hourMap[h] = { total: 0, paid: 0 };
    hourMap[h].total += 1;
    if (a.status === AgreementStatus.PAID) hourMap[h].paid += 1;
  });

  const primeTimeWindows = Object.entries(hourMap).map(([hourStr, data]) => {
    const hour = parseInt(hourStr, 10);
    const conversionRate = data.total > 0 ? (data.paid / data.total) * 100 : 0;
    return { hour, conversionRate: Math.round(conversionRate * 10) / 10, count: data.total };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  // Risco por Dilação (Até 3 dias, 4-7 dias, >7 dias)
  let lowRisk3d = 0;
  let medRisk7d = 0;
  let highRisk15d = 0;

  realAgreements.forEach(a => {
    const created = new Date(a.createdAt);
    const due = parseLocalDate(a.dueDate);
    const diffDays = Math.ceil((due.getTime() - created.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 3) lowRisk3d += a.value;
    else if (diffDays <= 7) medRisk7d += a.value;
    else highRisk15d += a.value;
  });

  // 4. Projeção Semana a Semana (W1: 1-7, W2: 8-14, W3: 15-21, W4: 22-31)
  const weekVolumeMap: Record<number, { paidValue: number; count: number }> = {
    1: { paidValue: 0, count: 0 },
    2: { paidValue: 0, count: 0 },
    3: { paidValue: 0, count: 0 },
    4: { paidValue: 0, count: 0 }
  };

  paidAgreements.forEach(a => {
    const day = parseLocalDate(a.dueDate).getDate();
    let weekNum = 1;
    if (day <= 7) weekNum = 1;
    else if (day <= 14) weekNum = 2;
    else if (day <= 21) weekNum = 3;
    else weekNum = 4;

    weekVolumeMap[weekNum].paidValue += a.value;
    weekVolumeMap[weekNum].count += 1;
  });

  const totalPaidHistorical = Object.values(weekVolumeMap).reduce((s, w) => s + w.paidValue, 0) || 1;

  const weeklyForecast = [
    { weekNumber: 1, weekLabel: 'Semana 1', dateRangeLabel: 'Dias 01 a 07 (Início de Mês / Salários)' },
    { weekNumber: 2, weekLabel: 'Semana 2', dateRangeLabel: 'Dias 08 a 14 (Meio da 1ª Quinzena)' },
    { weekNumber: 3, weekLabel: 'Semana 3', dateRangeLabel: 'Dias 15 a 21 (2ª Quinzena / Adiantamentos)' },
    { weekNumber: 4, weekLabel: 'Semana 4', dateRangeLabel: 'Dias 22 a 31 (Fechamento do Mês)' }
  ].map(w => {
    const weekData = weekVolumeMap[w.weekNumber];
    const pct = totalPaidHistorical > 0 && weekData.paidValue > 0 ? (weekData.paidValue / totalPaidHistorical) : 0.25;
    const historicalPercentage = Math.round(pct * 100);
    const projectedValue = Math.round(projectedNextMonthRecovery * (pct || 0.25));
    const projectedCount = Math.round((paidAgreements.length || 10) * (pct || 0.25));
    return {
      ...w,
      projectedValue,
      historicalPercentage,
      projectedCount
    };
  });

  // 5. Projeção Individual por Membro da Equipe / Operador
  const operatorMap: Record<string, { name: string; agreements: Agreement[]; attendancesCount: number }> = {};

  realAgreements.forEach(a => {
    const opId = a.operatorId || 'op-desconhecido';
    const opName = a.operatorName || opId;
    if (!operatorMap[opId]) operatorMap[opId] = { name: opName, agreements: [], attendancesCount: 0 };
    operatorMap[opId].agreements.push(a);
  });

  records.forEach(r => {
    const opId = r.operatorId || 'op-desconhecido';
    const opName = r.operatorName || opId;
    if (!operatorMap[opId]) operatorMap[opId] = { name: opName, agreements: [], attendancesCount: 0 };
    operatorMap[opId].attendancesCount += 1;
  });

  const opKeys = Object.keys(operatorMap);
  const operatorForecasts = opKeys.map(opId => {
    const opData = operatorMap[opId];
    const opPaidList = opData.agreements.filter(a => a.status === AgreementStatus.PAID);
    const currentMonthPaid = opPaidList.reduce((sum, a) => sum + a.value, 0);
    const opTotalCount = opData.agreements.length;
    const ticketAverage = opPaidList.length > 0 ? currentMonthPaid / opPaidList.length : 0;
    const effectivenessRate = opTotalCount > 0 ? Math.round((opPaidList.length / opTotalCount) * 100) : 70;

    const factor = effectivenessRate >= 80 ? 1.10 : (effectivenessRate >= 50 ? 1.02 : 0.90);
    const projectedNextMonth = Math.round(currentMonthPaid > 0 ? currentMonthPaid * factor : (projectedNextMonthRecovery / Math.max(1, opKeys.length)));

    const weeklyBreakdown = weeklyForecast.map(wf => ({
      weekNumber: wf.weekNumber,
      projectedValue: Math.round(projectedNextMonth * ((wf.historicalPercentage || 25) / 100))
    }));

    const trend: 'up' | 'stable' | 'down' = factor > 1.05 ? 'up' : (factor >= 0.98 ? 'stable' : 'down');

    return {
      operatorId: opId,
      operatorName: opData.name,
      currentMonthPaid,
      ticketAverage: Math.round(ticketAverage),
      effectivenessRate,
      projectedNextMonth,
      weeklyBreakdown,
      trend
    };
  }).sort((a, b) => b.projectedNextMonth - a.projectedNextMonth);

  return {
    activeOperatorsCount,
    totalAttendances,
    avgAttendancesPerOperator,
    attendanceEffectivenessRate: Math.round(attendanceEffectivenessRate * 10) / 10,
    paidVolumeByAgreementType,
    projectedNextMonthRecovery,
    projectedNextMonthBreakValue,
    secondaryMrrColchao,
    bestLiquidityDays,
    primeTimeWindows,
    dilatedBreakRisk: { lowRisk3d, medRisk7d, highRisk15d },
    weeklyForecast,
    operatorForecasts
  };
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
  const discountStats = calculateDiscountStats(realTargetAgreements);

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
      heatmap31Days,
      discountStats,
      roiByOrigin: calculateRoiByOrigin(realTargetAgreements),
      breakRecoveryStats: calculateBreakRecoveryStats(realTargetAgreements),
      forecastStats: calculateForecastStats(realTargetAgreements)
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

/**
 * Calcula o ROI e Eficiência Financeira agrupados por Canal de Origem
 */
export const calculateRoiByOrigin = (agreements: Agreement[]) => {
  const real = filterRealAgreements(agreements);
  const result: Record<string, {
    totalValue: number;
    paidValue: number;
    totalCount: number;
    paidCount: number;
    conversionRate: number;
    discountRate: number;
    avgDiscountPercentage: number;
  }> = {};

  real.forEach(a => {
    const origin = a.origin || 'outros';
    if (!result[origin]) {
      result[origin] = {
        totalValue: 0,
        paidValue: 0,
        totalCount: 0,
        paidCount: 0,
        conversionRate: 0,
        discountRate: 0,
        avgDiscountPercentage: 0
      };
    }
    result[origin].totalValue += a.value;
    result[origin].totalCount += 1;

    if (a.status === AgreementStatus.PAID) {
      result[origin].paidValue += a.value;
      result[origin].paidCount += 1;
    }
  });

  Object.keys(result).forEach(origin => {
    const item = result[origin];
    item.conversionRate = item.totalCount > 0 ? (item.paidCount / item.totalCount) * 100 : 0;
    const originAgreements = real.filter(a => (a.origin || 'outros') === origin);
    const withDiscount = originAgreements.filter(a => a.discountApplied);
    item.discountRate = item.totalCount > 0 ? (withDiscount.length / item.totalCount) * 100 : 0;
  });

  return result;
};

/**
 * Calcula o Índice de Resgate de Acordos Quebrados (% de acordos salvos e tempo médio em dias)
 */
export const calculateBreakRecoveryStats = (agreements: Agreement[]) => {
  const real = filterRealAgreements(agreements);
  const brokenHistory = real.filter(a => {
    const hasBrokenNote = a.notesHistory?.some(n => n.content.toLowerCase().includes('quebr') || n.category === 'warning');
    const isRecovered = a.status === AgreementStatus.PAID || a.status === AgreementStatus.RECOVERED;
    return (a.status === AgreementStatus.BROKEN || hasBrokenNote || a.notesHistory?.length) && isRecovered;
  });

  const totalBrokenEver = real.filter(a => a.status === AgreementStatus.BROKEN || a.notesHistory?.some(n => n.content.toLowerCase().includes('quebr'))).length;
  const recoveredCount = brokenHistory.length;
  const recoveredVolume = brokenHistory.reduce((acc, curr) => acc + curr.value, 0);
  const recoveryRate = totalBrokenEver > 0 ? (recoveredCount / totalBrokenEver) * 100 : (recoveredCount > 0 ? 100 : 0);

  let totalDays = 0;
  let countDays = 0;
  brokenHistory.forEach(a => {
    const created = new Date(a.createdAt).getTime();
    const paid = a.paidAt ? new Date(a.paidAt).getTime() : new Date().getTime();
    const days = Math.max(1, Math.round((paid - created) / (1000 * 60 * 60 * 24)));
    totalDays += days;
    countDays += 1;
  });

  const avgRecoveryDays = countDays > 0 ? Math.round(totalDays / countDays) : 0;

  return {
    totalBroken: totalBrokenEver,
    recoveredCount,
    recoveredVolume,
    recoveryRate,
    avgRecoveryDays
  };
};

