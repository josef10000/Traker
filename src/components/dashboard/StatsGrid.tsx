import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { StatCard } from './StatCard';
import { DashboardStats } from '../../types';

interface StatsGridProps {
  stats: DashboardStats;
  statTrends: {
    projected: { name: string; value: number }[];
    paid: { name: string; value: number }[];
    overdue: { name: string; value: number }[];
  };
  monthlyGoal: number;
  localHiddenCards: string[];
  formatCurrency: (v: number) => string;
}

export const StatsGrid = ({
  stats,
  statTrends,
  monthlyGoal,
  localHiddenCards,
  formatCurrency
}: StatsGridProps) => {
  return (
    <section id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Total Projetado" 
        value={formatCurrency(stats.totalProjected)} 
        icon={DollarSign} 
        color="primary" 
        chartData={statTrends.projected}
        chartType="area"
      />
      <StatCard 
        title="Produtividade Diária (Pagos)" 
        value={formatCurrency(stats.filteredPaidValue)} 
        icon={TrendingUp} 
        color="emerald" 
        subtitle={`${stats.counts.filtered.paid} acordos pagos no período`}
        chartData={statTrends.paid}
        chartType="bar"
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
      />
      <StatCard 
        title="Projeção p/ Mês" 
        value={formatCurrency(stats.projection)} 
        icon={TrendingUp} 
        color="sky"
        subtitle="Baseado no ritmo atual"
        chartData={statTrends.paid}
        chartType="area"
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
      />
      <StatCard 
        title="Vencendo Hoje" 
        value={formatCurrency(stats.totalPendingToday)} 
        icon={Clock} 
        color="amber"
        subtitle={`${stats.counts.month.pendingToday} acordos pendentes p/ hoje`}
        chartData={statTrends.overdue}
        chartType="bar"
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
    </section>
  );
};
