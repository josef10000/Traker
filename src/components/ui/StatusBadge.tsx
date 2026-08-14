import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, 
  WarningCircle, 
  Clock, 
  Lightning, 
  XCircle,
  HourglassMedium,
  ShieldCheck
} from '@phosphor-icons/react';
import { AgreementStatus } from '../../types';

export type StatusVariant = 
  | 'paid' 
  | 'broken' 
  | 'overdue' 
  | 'priority' 
  | 'pending' 
  | 'today' 
  | 'cancelled'
  | 'verified';

interface StatusBadgeProps {
  status?: AgreementStatus | string;
  variant?: StatusVariant;
  label?: string;
  isOverdue?: boolean;
  isCheckedToday?: boolean;
  isPriorityOntem?: boolean;
  isToday?: boolean;
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  isOverdue,
  isCheckedToday,
  isPriorityOntem,
  isToday,
  theme = 'dark',
  size = 'sm',
  className = ''
}) => {
  // Determinar a variante semântica caso não tenha sido passada diretamente
  let resolvedVariant: StatusVariant = variant || 'pending';
  let resolvedLabel = label;
  let tooltip = '';

  if (!variant && status) {
    if (status === AgreementStatus.PAID || status === 'PAID' || status === 'pago') {
      resolvedVariant = 'paid';
      resolvedLabel = resolvedLabel || 'Pago';
      tooltip = 'Acordo quitado e verificado no sistema';
    } else if (isOverdue && isCheckedToday) {
      resolvedVariant = 'broken';
      resolvedLabel = resolvedLabel || 'Quebrado';
      tooltip = 'O cliente não efetuou o pagamento no prazo estipulado';
    } else if (isOverdue && !isCheckedToday) {
      resolvedVariant = 'overdue';
      resolvedLabel = resolvedLabel || 'Vencido';
      tooltip = 'Data limite expirada aguardando confirmação';
    } else if (isPriorityOntem) {
      resolvedVariant = 'priority';
      resolvedLabel = resolvedLabel || 'Prioridade';
      tooltip = 'Acordo de alta prioridade pendente de acompanhamento';
    } else if (isToday) {
      resolvedVariant = 'today';
      resolvedLabel = resolvedLabel || 'Vence Hoje';
      tooltip = 'Vencimento programado para o dia de hoje';
    } else if (status === 'CANCELLED' || status === 'cancelled') {
      resolvedVariant = 'cancelled';
      resolvedLabel = resolvedLabel || 'Cancelado';
      tooltip = 'Acordo cancelado pelo operador ou supervisor';
    } else {
      resolvedVariant = 'pending';
      resolvedLabel = resolvedLabel || (typeof status === 'string' ? status : 'Pendente');
      tooltip = 'Aguardando data de vencimento / compensação bancária';
    }
  }

  const isDark = theme === 'dark';

  // Definições de Estilo & Cores Semânticas
  const getBadgeStyle = () => {
    switch (resolvedVariant) {
      case 'paid':
        return {
          icon: CheckCircle,
          colors: isDark 
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-xs shadow-emerald-950/20' 
            : 'bg-emerald-100 text-emerald-800 border-emerald-300',
          pulseColor: 'bg-emerald-400',
          animatePulse: true
        };
      case 'broken':
        return {
          icon: XCircle,
          colors: isDark 
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs shadow-rose-950/20' 
            : 'bg-rose-100 text-rose-800 border-rose-300',
          pulseColor: 'bg-rose-500',
          animatePulse: false
        };
      case 'overdue':
        return {
          icon: WarningCircle,
          colors: isDark 
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
            : 'bg-amber-100 text-amber-800 border-amber-300',
          pulseColor: 'bg-amber-400',
          animatePulse: false
        };
      case 'priority':
        return {
          icon: Lightning,
          colors: isDark 
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
            : 'bg-amber-500 text-white border-amber-400',
          pulseColor: 'bg-amber-300',
          animatePulse: true
        };
      case 'today':
        return {
          icon: Clock,
          colors: isDark 
            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs' 
            : 'bg-sky-100 text-sky-800 border-sky-300',
          pulseColor: 'bg-sky-400',
          animatePulse: true
        };
      case 'verified':
        return {
          icon: ShieldCheck,
          colors: isDark 
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
            : 'bg-indigo-100 text-indigo-800 border-indigo-300',
          pulseColor: 'bg-indigo-400',
          animatePulse: false
        };
      case 'cancelled':
        return {
          icon: XCircle,
          colors: isDark 
            ? 'bg-slate-800/80 text-slate-400 border-slate-700/50' 
            : 'bg-slate-200 text-slate-600 border-slate-300',
          pulseColor: 'bg-slate-500',
          animatePulse: false
        };
      case 'pending':
      default:
        return {
          icon: HourglassMedium,
          colors: isDark 
            ? 'bg-slate-800/60 text-slate-300 border-white/10' 
            : 'bg-slate-100 text-slate-700 border-slate-300',
          pulseColor: 'bg-slate-400',
          animatePulse: false
        };
    }
  };

  const { icon: Icon, colors, pulseColor, animatePulse } = getBadgeStyle();

  const sizeClasses = {
    sm: 'text-[10px] px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3 py-1.5 gap-2',
    lg: 'text-sm px-3.5 py-2 gap-2'
  }[size];

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18
  }[size];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center rounded-xl font-black uppercase tracking-wider border select-none transition-all ${sizeClasses} ${colors} ${className}`}
      title={tooltip || resolvedLabel}
    >
      {/* Ponto pulsante para status vivos */}
      {animatePulse && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`} />
        </span>
      )}

      <Icon size={iconSizes} weight="bold" className="shrink-0" />
      <span className="truncate">{resolvedLabel}</span>
    </motion.span>
  );
};
