import React from 'react';
import { 
  CurrencyDollar as DollarSign, 
  TrendUp as TrendingUp, 
  Target, 
  WarningCircle as AlertCircle, 
  Clock, 
  CheckCircle as CheckCircle2 
} from '@phosphor-icons/react';
import { StatCard } from './StatCard';
import { DashboardStats } from '../../types';

interface StatsGridProps {
  stats: DashboardStats;
  comparisonStats?: DashboardStats;
  statTrends: {
    projected: { name: string; value: number }[];
    paid: { name: string; value: number }[];
    overdue: { name: string; value: number }[];
  };
  monthlyGoal: number;
  localHiddenCards: string[];
  formatCurrency: (v: number) => string;
  operatorQaScore?: number;
  onHelpClick?: () => void;
}

export const StatsGrid = ({
  stats,
  comparisonStats,
  statTrends,
  monthlyGoal,
  localHiddenCards,
  formatCurrency,
  operatorQaScore,
  onHelpClick
}: StatsGridProps) => {
  // Calcula delta percentual entre o valor atual e o valor do período comparado
  const delta = (current: number, compare: number | undefined): number | undefined => {
    if (compare === undefined || compare === 0) return undefined;
    return ((current - compare) / Math.abs(compare)) * 100;
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Painel de Indicadores</h3>
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="flex items-center gap-1 text-[9px] text-primary uppercase tracking-widest font-black hover:underline cursor-pointer"
          >
            <span>Dúvidas sobre os KPIs? Abrir Central de Ajuda</span>
          </button>
        )}
      </div>
      <section id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Total Projetado" 
        value={formatCurrency(stats.totalProjected)} 
        icon={DollarSign} 
        color="primary" 
        chartData={statTrends.projected}
        chartType="area"
        comparisonDelta={delta(stats.totalProjected, comparisonStats?.totalProjected)}
        comparisonValue={comparisonStats ? formatCurrency(comparisonStats.totalProjected) : undefined}
      />
      <StatCard 
        title="Produtividade Diária (Pagos)" 
        value={formatCurrency(stats.filteredPaidValue)} 
        icon={TrendingUp} 
        color="emerald" 
        subtitle={`${stats.counts.filtered.paid} acordos pagos no período`}
        chartData={statTrends.paid}
        chartType="bar"
        extra={stats.todayEffectiveness !== undefined ? `Efet. Dia: ${stats.todayEffectiveness.toFixed(1)}%` : undefined}
        comparisonDelta={delta(stats.filteredPaidValue, comparisonStats?.filteredPaidValue)}
        comparisonValue={comparisonStats ? formatCurrency(comparisonStats.filteredPaidValue) : undefined}
      />
      <StatCard 
        title="Falta para Meta" 
        value={formatCurrency(stats.remainingToGoal)} 
        icon={Target} 
        color="rose"
        subtitle={`${((stats.totalPaid / (monthlyGoal || 1)) * 100).toFixed(1)}% atingido`}
        chartData={[
          { name: 'Atingido', value: stats.totalPaid },
          { name: 'Restante', value: Math.max(0, monthlyGoal - stats.totalPaid) }
        ]}
        chartType="pie"
        comparisonDelta={comparisonStats ? delta(stats.remainingToGoal, comparisonStats.remainingToGoal) : undefined}
        comparisonValue={comparisonStats ? formatCurrency(comparisonStats.remainingToGoal) : undefined}
        invertDelta
      />
      <StatCard 
        title="Projeção p/ Mês" 
        value={formatCurrency(stats.projection)} 
        icon={TrendingUp} 
        color="sky"
        subtitle="Baseado no ritmo atual"
        chartData={statTrends.paid}
        chartType="area"
        comparisonDelta={delta(stats.projection, comparisonStats?.projection)}
        comparisonValue={comparisonStats ? formatCurrency(comparisonStats.projection) : undefined}
      />
      
      <StatCard 
        id="overdue-card"
        title="Valores Vencidos" 
        value={formatCurrency(stats.totalOverdue)} 
        icon={AlertCircle} 
        color="rose"
        subtitle={`${stats.counts.month.overdue} acordos não pagos até ontem`}
        chartData={statTrends.overdue}
        chartType="bar"
        comparisonDelta={delta(stats.totalOverdue, comparisonStats?.totalOverdue)}
        comparisonValue={comparisonStats ? formatCurrency(comparisonStats.totalOverdue) : undefined}
        invertDelta
      />
      <StatCard 
        title="Vencendo Hoje" 
        value={formatCurrency(stats.totalPendingToday)} 
        icon={Clock} 
        color="amber"
        subtitle={`${stats.counts.month.pendingToday} acordos pendentes p/ hoje`}
        chartData={statTrends.overdue}
        chartType="bar"
        comparisonDelta={delta(stats.totalPendingToday, comparisonStats?.totalPendingToday)}
        comparisonValue={comparisonStats ? formatCurrency(comparisonStats.totalPendingToday) : undefined}
        invertDelta
      />
      {!localHiddenCards.includes('cadastradosHoje') && (
        <StatCard 
          title="Volume de Registros" 
          value={stats.counts.today} 
          icon={CheckCircle2} 
          color="primary"
          subtitle="Acordos cadastrados hoje"
          chartData={statTrends.projected}
          chartType="area"
        />
      )}
      {!localHiddenCards.includes('ticketMedioGeral') && (
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(stats.ticketAverage)} 
          icon={Target} 
          color="indigo"
          subtitle="Média por acordo registrado"
          chartData={statTrends.projected}
          chartType="bar"
        />
      )}
      {!localHiddenCards.includes('mediaQualidadeQa') && operatorQaScore !== undefined && (
        <StatCard 
          title="Média de Qualidade (QA)" 
          value={`${operatorQaScore.toFixed(1)}%`} 
          icon={CheckCircle2} 
          color="sky"
          subtitle="Nota média de avaliações de QA"
          chartData={[]}
          chartType="bar"
        />
      )}
    </section>
  </div>
  );
};
