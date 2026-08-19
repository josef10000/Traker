import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Users, 
  Coffee, 
  Sparkle, 
  Calendar, 
  FileCsv as FileSpreadsheet, 
  CheckCircle, 
  WarningCircle, 
  Lightning, 
  FileText, 
  PhoneCall, 
  MagnifyingGlass, 
  TrendUp,
  Funnel,
  ShieldCheck,
  Crown,
  Trophy,
  X,
  Handshake,
  ChartBar,
  Eye,
  ListNumbers,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';
import { UserProfile, Agreement, Team } from '../../types';
import { AuditLog } from '../../lib/audit';
import { formatCurrency } from '../../utils/masks';

interface HourlyActivityTrackerSectionProps {
  profile: UserProfile;
  teamMembers: UserProfile[];
  agreements: Agreement[];
  attendances?: any[];
  auditLogs?: AuditLog[];
  managedTeamsData: Team[];
  selectedMonth: number;
  selectedYear: number;
  theme?: 'light' | 'dark';
}

export const HourlyActivityTrackerSection: React.FC<HourlyActivityTrackerSectionProps> = ({
  profile,
  teamMembers = [],
  agreements = [],
  attendances = [],
  auditLogs = [],
  managedTeamsData = [],
  selectedMonth,
  selectedYear,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  // 1. Estados dos Filtros e Modos de Exibição
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [actionFilter, setActionFilter] = useState<'all' | 'agreements' | 'attendances'>('all');
  const [viewMode, setViewMode] = useState<'detailed' | 'simplified'>('detailed');

  // Hora atual em tempo real e verificação do dia de hoje
  const currentHour = new Date().getHours();
  const isTodaySelected = selectedDateStr === new Date().toISOString().slice(0, 10);
  
  // Novos Estados: Busca por Nome & Filtros Rápidos de Status
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pause' | 'exceeded' | 'deals'>('all');

  // Alternador de Métrica no Gráfico do Topo: Quantidade de Ações vs R$ Recuperado
  const [chartMetricMode, setChartMetricMode] = useState<'actions' | 'revenue'>('actions');

  // Estados do Modal de Exportação Avançada (Período Flexível e Escopo)
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportRange, setExportRange] = useState<'day' | 'week' | 'month'>('day');
  const [exportScope, setExportScope] = useState<'all' | 'team' | 'operator'>('all');
  const [exportSelectedTeamId, setExportSelectedTeamId] = useState<string>('all');
  const [exportSelectedOperatorId, setExportSelectedOperatorId] = useState<string>('');

  // Estado para a Timeline (Drawer do Operador)
  const [selectedOperatorForTimeline, setSelectedOperatorForTimeline] = useState<any | null>(null);

  // Horários exibidos na matriz: 08h até 18h (11 blocos de 1 hora)
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  // 2. Filtragem de Escopo da Equipe com base no Cargo (Role) do Usuário
  const scopedOperators = useMemo(() => {
    let filtered = [...teamMembers];

    if (profile.role === 'member') {
      return filtered.filter(m => m.uid === profile.uid);
    }

    if (profile.role === 'supervisor') {
      const supervisorTeams = profile.managedTeams && profile.managedTeams.length > 0 
        ? profile.managedTeams 
        : [profile.teamId || ''];
      
      filtered = filtered.filter(m => {
        if (m.role === 'supervisor' || m.role === 'manager' || m.role === 'coordinator') return false;
        return supervisorTeams.includes(m.teamId || '');
      });
    } else {
      filtered = filtered.filter(m => m.role === 'member');
    }

    if (selectedTeamFilter !== 'all') {
      filtered = filtered.filter(m => m.teamId === selectedTeamFilter);
    }

    // Filtro por Busca de Nome / Email
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        (m.displayName && m.displayName.toLowerCase().includes(term)) ||
        (m.email && m.email.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [teamMembers, profile, selectedTeamFilter, searchTerm]);

  // 3. Processamento de Ações por Operador e por Hora no Dia Selecionado
  const activityData = useMemo(() => {
    const targetDate = selectedDateStr; // YYYY-MM-DD

    const processed = scopedOperators.map(operator => {
      const shiftStart = operator.shiftStartHour ?? 8;
      const shiftEnd = operator.shiftEndHour ?? 17;
      const maxPauseMinutes = operator.dailyPauseAllowance ?? 72;

      const hourlyStats: Record<number, {
        agreementsCount: number;
        agreementsValue: number;
        attendancesCount: number;
        auditCount: number;
        totalActions: number;
        agreementsList: Agreement[];
      }> = {};

      HOURS.forEach(h => {
        hourlyStats[h] = { 
          agreementsCount: 0, 
          agreementsValue: 0, 
          attendancesCount: 0, 
          auditCount: 0, 
          totalActions: 0, 
          agreementsList: [] 
        };
      });

      let totalDayActions = 0;
      let totalDayAgreementsCount = 0;
      let totalDayAgreementsValue = 0;
      let lastActionTime: Date | null = null;

      // A) Filtrar Acordos
      agreements.forEach(a => {
        if (a.operatorId !== operator.uid) return;
        if (!a.createdAt) return;
        const dateObj = new Date(a.createdAt);
        const dateIso = dateObj.toISOString().slice(0, 10);
        if (dateIso !== targetDate) return;

        const hour = dateObj.getHours();
        if (hourlyStats[hour]) {
          hourlyStats[hour].agreementsCount += 1;
          hourlyStats[hour].agreementsValue += (a.totalAmount || 0);
          hourlyStats[hour].totalActions += 1;
          hourlyStats[hour].agreementsList.push(a);
          totalDayActions += 1;
          totalDayAgreementsCount += 1;
          totalDayAgreementsValue += (a.totalAmount || 0);
          if (!lastActionTime || dateObj > lastActionTime) lastActionTime = dateObj;
        }
      });

      // B) Filtrar Tabulações / Atendimentos
      attendances.forEach(att => {
        const collabId = att.collaboratorId || att.operatorId || att.userId;
        if (collabId !== operator.uid) return;
        if (!att.createdAt) return;
        const dateObj = new Date(att.createdAt);
        const dateIso = dateObj.toISOString().slice(0, 10);
        if (dateIso !== targetDate) return;

        const hour = dateObj.getHours();
        if (hourlyStats[hour]) {
          hourlyStats[hour].attendancesCount += 1;
          hourlyStats[hour].totalActions += 1;
          totalDayActions += 1;
          if (!lastActionTime || dateObj > lastActionTime) lastActionTime = dateObj;
        }
      });

      // C) Filtrar Consultas & Logs Auditados
      auditLogs.forEach(log => {
        if (log.userId !== operator.uid) return;
        if (!log.timestamp) return;
        const dateObj = new Date(log.timestamp);
        const dateIso = dateObj.toISOString().slice(0, 10);
        if (dateIso !== targetDate) return;

        const hour = dateObj.getHours();
        if (hourlyStats[hour]) {
          hourlyStats[hour].auditCount += 1;
          hourlyStats[hour].totalActions += 1;
          totalDayActions += 1;
          if (!lastActionTime || dateObj > lastActionTime) lastActionTime = dateObj;
        }
      });

      // D) Cálculo de Horas Ativas e Consumo do Banco de Pausas (72 min)
      let activeHoursCount = 0;
      let totalShiftHours = 0;
      let pauseMinutesUsed = 0;

      HOURS.forEach(h => {
        const inShift = h >= shiftStart && h < shiftEnd;
        if (!inShift) return;

        totalShiftHours += 1;
        const hourActions = actionFilter === 'agreements'
          ? hourlyStats[h].agreementsCount
          : actionFilter === 'attendances'
          ? hourlyStats[h].attendancesCount
          : hourlyStats[h].totalActions;

        if (hourActions > 0) {
          activeHoursCount += 1;
        } else {
          pauseMinutesUsed += 60;
        }
      });

      const actualPauseMinutes = Math.min(pauseMinutesUsed, Math.max(0, (totalShiftHours - activeHoursCount) * 60));
      const remainingPause = Math.max(0, maxPauseMinutes - actualPauseMinutes);
      const isPauseExceeded = actualPauseMinutes > maxPauseMinutes;

      const consistencyPct = totalShiftHours > 0 
        ? Math.min(100, Math.round((activeHoursCount / totalShiftHours) * 100))
        : 0;

      let realTimeStatus: 'active' | 'pause' | 'off' = 'off';
      if (lastActionTime) {
        const diffMinutes = Math.floor((Date.now() - (lastActionTime as Date).getTime()) / (1000 * 60));
        if (diffMinutes <= 15) {
          realTimeStatus = 'active';
        } else if (diffMinutes <= 45) {
          realTimeStatus = 'pause';
        }
      }

      return {
        operator,
        shiftStart,
        shiftEnd,
        maxPauseMinutes,
        hourlyStats,
        totalDayActions,
        totalDayAgreementsCount,
        totalDayAgreementsValue,
        lastActionTime,
        activeHoursCount,
        totalShiftHours,
        actualPauseMinutes,
        remainingPause,
        isPauseExceeded,
        consistencyPct,
        realTimeStatus
      };
    });

    // Aplicar Filtro de Status Rápido
    if (statusFilter === 'active') {
      return processed.filter(d => d.realTimeStatus === 'active');
    }
    if (statusFilter === 'pause') {
      return processed.filter(d => d.realTimeStatus === 'pause');
    }
    if (statusFilter === 'exceeded') {
      return processed.filter(d => d.isPauseExceeded);
    }
    if (statusFilter === 'deals') {
      return processed.filter(d => d.totalDayAgreementsCount > 0);
    }

    return processed;
  }, [scopedOperators, agreements, attendances, auditLogs, selectedDateStr, actionFilter, statusFilter]);

  // Paginação de Operadores na Matriz Hora a Hora (Máximo 10 por página)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(activityData.length / itemsPerPage) || 1;

  const paginatedActivityData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return activityData.slice(start, start + itemsPerPage);
  }, [activityData, currentPage]);

  // 4. Métricas Globais e Seleção do "Destaque do Dia"
  const globalSummary = useMemo(() => {
    const totalOps = activityData.length;
    const activeNow = activityData.filter(d => d.realTimeStatus === 'active').length;
    const inPause = activityData.filter(d => d.realTimeStatus === 'pause').length;
    const exceededPauseCount = activityData.filter(d => d.isPauseExceeded).length;
    const totalDealsValue = activityData.reduce((acc, d) => acc + d.totalDayAgreementsValue, 0);
    
    const avgConsistency = totalOps > 0 
      ? Math.round(activityData.reduce((acc, d) => acc + d.consistencyPct, 0) / totalOps)
      : 0;

    const avgPauseUsed = totalOps > 0
      ? Math.round(activityData.reduce((acc, d) => acc + d.actualPauseMinutes, 0) / totalOps)
      : 0;

    // Totais e Distribuição por Hora
    const hourlyTotals: Record<number, { actions: number; agreements: number; attendances: number; value: number }> = {};
    HOURS.forEach(h => { hourlyTotals[h] = { actions: 0, agreements: 0, attendances: 0, value: 0 }; });

    activityData.forEach(d => {
      HOURS.forEach(h => {
        hourlyTotals[h].actions += d.hourlyStats[h].totalActions;
        hourlyTotals[h].agreements += d.hourlyStats[h].agreementsCount;
        hourlyTotals[h].attendances += d.hourlyStats[h].attendancesCount;
        hourlyTotals[h].value += d.hourlyStats[h].agreementsValue;
      });
    });

    let peakHour = 10;
    let maxActionsInPeak = 0;
    let maxRevenueInPeak = 0;

    HOURS.forEach(h => {
      if (hourlyTotals[h].actions > maxActionsInPeak) {
        maxActionsInPeak = hourlyTotals[h].actions;
        peakHour = h;
      }
      if (hourlyTotals[h].value > maxRevenueInPeak) {
        maxRevenueInPeak = hourlyTotals[h].value;
      }
    });

    // 🏆 Encontrar o "Operador Destaque de Consistência do Dia"
    let starOperatorData: typeof activityData[0] | null = null;
    let maxScore = -1;

    activityData.forEach(d => {
      const score = (d.consistencyPct * 0.5) + (d.totalDayActions * 0.3) + (d.totalDayAgreementsValue > 0 ? 30 : 0);
      if (score > maxScore && d.totalDayActions > 0) {
        maxScore = score;
        starOperatorData = d;
      }
    });

    return {
      totalOps,
      activeNow,
      inPause,
      exceededPauseCount,
      totalDealsValue,
      avgConsistency,
      avgPauseUsed,
      peakHour,
      maxActionsInPeak,
      maxRevenueInPeak,
      hourlyTotals,
      starOperatorData
    };
  }, [activityData]);

  // 5. Função de Exportação Avançada Multi-Período (Diário, Semanal, Mensal)
  const handleExecuteAdvancedExport = () => {
    // Definir lista de datas conforme o período escolhido
    let targetDates: string[] = [];
    const baseDate = new Date(selectedDateStr + 'T12:00:00');

    if (exportRange === 'day') {
      targetDates = [selectedDateStr];
    } else if (exportRange === 'week') {
      // Últimos 7 dias a partir da data selecionada
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        targetDates.push(d.toISOString().slice(0, 10));
      }
    } else if (exportRange === 'month') {
      // Todos os dias do mês selecionado
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(selectedMonth).padStart(2, '0');
        targetDates.push(`${selectedYear}-${monthStr}-${dayStr}`);
      }
    }

    // Filtrar operadores por escopo de exportação
    let exportOperators = [...teamMembers].filter(m => m.role === 'member');
    if (exportScope === 'team' && exportSelectedTeamId !== 'all') {
      exportOperators = exportOperators.filter(m => m.teamId === exportSelectedTeamId);
    } else if (exportScope === 'operator' && exportSelectedOperatorId) {
      exportOperators = exportOperators.filter(m => m.uid === exportSelectedOperatorId);
    }

    // Montar CSV estruturado com UTF-8 BOM
    let csvContent = "\uFEFF"; // Byte Order Mark para Excel brasileiro
    csvContent += "Data;Operador;Email;Equipe;Turno;Qtd Acordos;R$ Recuperado;Qtd Tabulacoes;Total Acoes;Consistencia %;Pausa Consumida (min);Status Pausa;08h;09h;10h;11h;12h;13h;14h;15h;16h;17h;18h\n";

    targetDates.forEach(dateIso => {
      exportOperators.forEach(operator => {
        const teamName = managedTeamsData.find(t => t.id === operator.teamId)?.name || 'Sem Equipe';
        const shiftStart = operator.shiftStartHour ?? 8;
        const shiftEnd = operator.shiftEndHour ?? 17;
        const maxPause = operator.dailyPauseAllowance ?? 72;

        const hCounts: Record<number, number> = {};
        HOURS.forEach(h => { hCounts[h] = 0; });

        let dayAgreementsCount = 0;
        let dayAgreementsValue = 0;
        let dayAttendancesCount = 0;

        agreements.forEach(a => {
          if (a.operatorId !== operator.uid || !a.createdAt) return;
          if (a.createdAt.slice(0, 10) === dateIso) {
            const h = new Date(a.createdAt).getHours();
            if (hCounts[h] !== undefined) hCounts[h] += 1;
            dayAgreementsCount += 1;
            dayAgreementsValue += (a.totalAmount || 0);
          }
        });

        attendances.forEach(att => {
          const collabId = att.collaboratorId || att.operatorId || att.userId;
          if (collabId !== operator.uid || !att.createdAt) return;
          if (att.createdAt.slice(0, 10) === dateIso) {
            const h = new Date(att.createdAt).getHours();
            if (hCounts[h] !== undefined) hCounts[h] += 1;
            dayAttendancesCount += 1;
          }
        });

        const totalActions = Object.values(hCounts).reduce((a, b) => a + b, 0);
        let activeHours = 0;
        let totalShift = 0;
        let pauseMinutes = 0;

        HOURS.forEach(h => {
          if (h >= shiftStart && h < shiftEnd) {
            totalShift += 1;
            if (hCounts[h] > 0) activeHours += 1;
            else pauseMinutes += 60;
          }
        });

        const actualPause = Math.min(pauseMinutes, Math.max(0, (totalShift - activeHours) * 60));
        const isExceeded = actualPause > maxPause;
        const consistency = totalShift > 0 ? Math.min(100, Math.round((activeHours / totalShift) * 100)) : 0;
        const hoursStr = HOURS.map(h => hCounts[h]).join(";");
        const formattedValue = dayAgreementsValue.toFixed(2).replace('.', ',');

        csvContent += `${dateIso};"${operator.displayName || operator.email}";"${operator.email}";"${teamName}";"${shiftStart}h-${shiftEnd}h";${dayAgreementsCount};"${formattedValue}";${dayAttendancesCount};${totalActions};${consistency}%;${actualPause}m;${isExceeded ? 'Excedida' : 'Regular'};${hoursStr}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const rangeName = exportRange === 'day' ? selectedDateStr : exportRange === 'week' ? `semanal_${selectedDateStr}` : `mensal_${selectedMonth}-${selectedYear}`;
    link.setAttribute("download", `relatorio_jornada_${rangeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* HEADER DA ABA JORNADA */}
      <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-lg">
              <Clock size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Cockpit de Jornada & Produção em Tempo Real</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-widest flex items-center gap-1">
                  {profile.role === 'supervisor' ? <Users size={12} /> : profile.role === 'coordinator' ? <ShieldCheck size={12} /> : <Crown size={12} />}
                  {profile.role === 'supervisor' ? 'Visão de Equipe' : profile.role === 'coordinator' ? 'Visão da Coordenação' : 'Visão Executiva'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Acompanhamento hora a hora, banco de pausas flexível (72 min) e exportações consolidadas.
              </p>
            </div>
          </div>

          {/* BARRA DE FILTROS & AÇÕES */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Campo de Busca Rápida por Nome */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <MagnifyingGlass size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar operador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-white placeholder:text-slate-500 focus:outline-none w-32 sm:w-40 text-xs"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Seletor de Data */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono">
              <Calendar size={14} className="text-sky-400" />
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
            </div>

            {/* Seletor de Equipes (Visível para Gestão Ampliada) */}
            {profile.role !== 'supervisor' && (
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-950 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="all">🏢 Todas as Equipes ({managedTeamsData.length})</option>
                {managedTeamsData.map(t => (
                  <option key={t.id} value={t.id}>👥 {t.name}</option>
                ))}
              </select>
            )}

            {/* Botão de Exportação Avançada Excel */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10"
              title="Exportar dados consolidados em Excel (Diário, Semanal ou Mensal)"
            >
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* PÍLULAS DE FILTRO RÁPIDO DE STATUS */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-white/10 text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Filtrar por Status:</span>
          
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            Todos ({activityData.length})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ativos Agora ({globalSummary.activeNow})</span>
          </button>

          <button
            onClick={() => setStatusFilter('pause')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pause'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <span>☕ Em Pausa ({globalSummary.inPause})</span>
          </button>

          <button
            onClick={() => setStatusFilter('exceeded')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'exceeded'
                ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/20'
                : 'bg-slate-950/60 text-rose-400 hover:text-rose-300 border border-rose-500/20'
            }`}
          >
            <span>🚨 Pausa Excedida ({globalSummary.exceededPauseCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('deals')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'deals'
                ? 'bg-purple-500 text-white font-black shadow-md shadow-purple-500/20'
                : 'bg-slate-950/60 text-purple-300 hover:text-white border border-purple-500/20'
            }`}
          >
            <span>💰 Com Acordos Hoje</span>
          </button>
        </div>

        {/* CARDS RESUMO EXECUTIVO DO TOPO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-5">
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Operadores Ativos</span>
              <div className="text-xl font-black text-white flex items-center gap-2">
                <span>{globalSummary.activeNow}</span>
                <span className="text-xs font-medium text-slate-400">/ {globalSummary.totalOps} em produção</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coffee size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Média Banco de Pausa</span>
              <div className="text-xl font-black text-white flex items-center gap-1.5">
                <span>{globalSummary.avgPauseUsed}m</span>
                <span className="text-xs text-amber-400 font-bold">/ 72m cota</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendUp size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">R$ Fechado no Dia</span>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {formatCurrency(globalSummary.totalDealsValue)}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Lightning size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hora de Pico</span>
              <div className="text-xl font-black text-white flex items-center gap-2">
                <span>{globalSummary.peakHour}:00h</span>
                <span className="text-xs text-sky-400 font-bold">({globalSummary.maxActionsInPeak} ações)</span>
              </div>
            </div>
          </div>

          {/* CARD DESTAQUE DO DIA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/30 flex items-center gap-3 relative overflow-hidden shadow-lg">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <Trophy size={24} weight="fill" className="animate-bounce" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">🏆 Destaque do Dia</span>
              </div>
              {globalSummary.starOperatorData ? (
                <div>
                  <span className="text-sm font-black text-white block truncate">
                    {(globalSummary.starOperatorData as any).operator.displayName || (globalSummary.starOperatorData as any).operator.email}
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 font-mono">
                    {(globalSummary.starOperatorData as any).consistencyPct}% Consistência • {(globalSummary.starOperatorData as any).totalDayActions} Ações
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Aguardando entregas...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICO DE DISTRIBUIÇÃO HORA A HORA COM ALTERNADOR DE MÉTRICAS */}
      <div className={`p-5 rounded-3xl border shadow-xl transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ChartBar size={20} className="text-sky-400" />
            <h3 className="text-sm font-black tracking-tight">Distribuição de Produção Hora a Hora</h3>
            {isTodaySelected && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Horário Atual: {currentHour}:00h
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setChartMetricMode('actions')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  chartMetricMode === 'actions' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Ações do Time
              </button>
              <button
                onClick={() => setChartMetricMode('revenue')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  chartMetricMode === 'revenue' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                💰 R$ Recuperado
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-11 gap-2 items-end h-28 pt-4 pb-2 border-b border-white/10 font-mono">
          {HOURS.map(h => {
            const hStats = globalSummary.hourlyTotals[h];
            const maxVal = chartMetricMode === 'actions' 
              ? (globalSummary.maxActionsInPeak || 1)
              : (globalSummary.maxRevenueInPeak || 1);
            
            const currentVal = chartMetricMode === 'actions' ? hStats.actions : hStats.value;
            const heightPct = Math.max(12, Math.round((currentVal / maxVal) * 100));
            const isPeak = chartMetricMode === 'actions' ? h === globalSummary.peakHour : currentVal === globalSummary.maxRevenueInPeak && currentVal > 0;
            const isCurrent = isTodaySelected && h === currentHour;

            return (
              <div 
                key={h} 
                className={`flex flex-col items-center gap-1.5 h-full justify-end group relative ${
                  isCurrent ? 'bg-cyan-500/5 rounded-xl border border-cyan-500/20 py-1' : ''
                }`}
              >
                {isCurrent && (
                  <span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter bg-cyan-500/20 px-1 rounded absolute -top-3">
                    AGORA
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors truncate max-w-full">
                  {chartMetricMode === 'actions' ? hStats.actions : formatCurrency(hStats.value)}
                </span>
                <div 
                  className={`w-full rounded-t-lg transition-all group-hover:scale-105 ${
                    isPeak 
                      ? chartMetricMode === 'actions' ? 'bg-gradient-to-t from-sky-600 to-sky-400 shadow-lg shadow-sky-500/30' : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/30'
                      : currentVal > 0 
                      ? chartMetricMode === 'actions' ? 'bg-slate-700 group-hover:bg-sky-500' : 'bg-emerald-800 group-hover:bg-emerald-500'
                      : 'bg-slate-800/40'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className={`text-[10px] font-black ${isCurrent ? 'text-cyan-400' : 'text-slate-400'}`}>{h}h</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABELA MATRIZ HORA A HORA */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-black tracking-tight flex items-center gap-2">
              <span>Matriz de Produção Hora a Hora (08:00 às 19:00)</span>
              <span className="text-xs text-slate-400 font-medium">({activityData.length} operadores)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique em qualquer linha para abrir a Timeline Gráfica Detalhada do operador.</p>
          </div>

          {/* SELETOR DE MODO DE EXIBIÇÃO: DETALHADO vs SIMPLIFICADO */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-white/10 text-xs shadow-inner">
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'detailed' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListNumbers size={14} />
                <span>Modo Detalhado (Ações & R$)</span>
              </button>
              <button
                onClick={() => setViewMode('simplified')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'simplified' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={14} />
                <span>Modo Simplificado (🟢 Presença)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase font-black text-[10px] tracking-wider">
                <th className="py-3 px-4 min-w-[200px]">Operador / Equipe</th>
                <th className="py-3 px-3 text-center">Turno</th>
                <th className="py-3 px-3 text-center">Banco Pausa (72m)</th>
                <th className="py-3 px-3 text-center">Consistência</th>
                {HOURS.map(h => {
                  const isCurrent = isTodaySelected && h === currentHour;
                  return (
                    <th 
                      key={h} 
                      className={`py-3 px-2 text-center w-12 ${
                        isCurrent ? 'bg-cyan-500/20 text-cyan-300 font-black border-x border-cyan-500/30' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        {isCurrent && <span className="text-[8px] text-cyan-400 leading-none mb-0.5">AGORA</span>}
                        <span>{h}h</span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-4 text-right">Total Ações</th>
                <th className="py-3 px-4 text-right">R$ Fechado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold">
              {activityData.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-500">
                    Nenhum operador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedActivityData.map(d => {
                  const team = managedTeamsData.find(t => t.id === d.operator.teamId);

                  return (
                    <tr 
                      key={d.operator.uid} 
                      onClick={() => setSelectedOperatorForTimeline(d)}
                      className="hover:bg-sky-500/10 cursor-pointer transition-colors group"
                    >
                      {/* Operador / Equipe */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            d.realTimeStatus === 'active' ? 'bg-emerald-400 animate-pulse' : d.realTimeStatus === 'pause' ? 'bg-amber-400' : 'bg-slate-600'
                          }`} title={d.realTimeStatus === 'active' ? 'Ativo Agora' : 'Em Pausa / Off'} />
                          <div>
                            <span className="font-bold text-white block truncate max-w-[170px] group-hover:text-sky-300 transition-colors">
                              {d.operator.displayName || d.operator.email}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              👥 {team?.name || 'Sem Equipe'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Turno */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-300">
                        {d.shiftStart}h-{d.shiftEnd}h
                      </td>

                      {/* Banco de Pausas Consumido */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold ${
                          d.isPauseExceeded ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-300'
                        }`}>
                          🍱 {d.actualPauseMinutes}m / {d.maxPauseMinutes}m
                        </span>
                      </td>

                      {/* Consistência % */}
                      <td className="py-3 px-3 text-center font-mono font-black text-xs">
                        <span className={d.consistencyPct >= 80 ? 'text-emerald-400' : d.consistencyPct >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                          {d.consistencyPct}%
                        </span>
                      </td>

                      {/* Células Hora a Hora (08h - 18h) */}
                      {HOURS.map(h => {
                        const stats = d.hourlyStats[h];
                        const inShift = h >= d.shiftStart && h < d.shiftEnd;
                        const isCurrent = isTodaySelected && h === currentHour;
                        const actions = actionFilter === 'agreements'
                          ? stats.agreementsCount
                          : actionFilter === 'attendances'
                          ? stats.attendancesCount
                          : stats.totalActions;

                        const tooltip = `Hora ${h}:00 - ${actions} Ações\n• Acordos: ${stats.agreementsCount} (${formatCurrency(stats.agreementsValue)})\n• Atendimentos: ${stats.attendancesCount}\n• Consultas: ${stats.auditCount}`;

                        // MODO 1: DETALHADO COM HEATMAP
                        if (viewMode === 'detailed') {
                          let cellBg = 'bg-slate-950/40 text-slate-600';
                          let badgeContent: React.ReactNode = '-';

                          if (stats.agreementsCount > 0) {
                            cellBg = 'bg-emerald-500/30 text-emerald-200 font-black border border-emerald-500/40 shadow-sm shadow-emerald-500/10';
                            badgeContent = (
                              <div className="flex items-center gap-0.5">
                                <span>{actions}</span>
                                <span className="text-[10px] text-amber-300">💰</span>
                              </div>
                            );
                          } else if (actions >= 6) {
                            cellBg = 'bg-teal-500/30 text-teal-200 font-black border border-teal-500/40';
                            badgeContent = actions;
                          } else if (actions >= 3) {
                            cellBg = 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30';
                            badgeContent = actions;
                          } else if (actions >= 1) {
                            cellBg = 'bg-blue-500/15 text-blue-300 font-medium border border-blue-500/20';
                            badgeContent = actions;
                          } else if (inShift) {
                            if (d.isPauseExceeded) {
                              cellBg = 'bg-rose-950/50 text-rose-400 border border-rose-500/30';
                              badgeContent = '⚠️';
                            } else {
                              cellBg = 'bg-slate-800/60 text-slate-400';
                              badgeContent = '🍱';
                            }
                          } else {
                            cellBg = 'bg-slate-950/80 text-slate-700';
                            badgeContent = '⬛';
                          }

                          return (
                            <td key={h} className={`py-2 px-1 text-center ${isCurrent ? 'bg-cyan-500/5 border-x border-cyan-500/15' : ''}`}>
                              <div 
                                className={`w-9 h-8 mx-auto rounded-xl flex items-center justify-center text-xs transition-all hover:scale-110 ${cellBg}`}
                                title={tooltip}
                              >
                                {badgeContent}
                              </div>
                            </td>
                          );
                        }

                        // MODO 2: SIMPLIFICADO
                        let dotNode = <span className="w-2.5 h-2.5 rounded-full bg-slate-800" title="Fora do Expediente" />;

                        if (stats.agreementsCount > 0) {
                          dotNode = <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm border border-emerald-300 animate-pulse" title={`Acordo fechado: ${formatCurrency(stats.agreementsValue)}`} />;
                        } else if (actions > 0) {
                          dotNode = <span className="w-3.5 h-3.5 rounded-full bg-sky-400 shadow-sm border border-sky-300" title={`${actions} Ações ativas`} />;
                        } else if (inShift) {
                          if (d.isPauseExceeded) {
                            dotNode = <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm border border-rose-400" title="Pausa Excedente" />;
                          } else {
                            dotNode = <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" title="Pausa Regular no Banco (72m)" />;
                          }
                        }

                        return (
                          <td key={h} className={`py-2 px-1 text-center ${isCurrent ? 'bg-cyan-500/5 border-x border-cyan-500/15' : ''}`}>
                            <div 
                              className="w-9 h-8 mx-auto rounded-xl flex items-center justify-center transition-all hover:scale-125"
                              title={tooltip}
                            >
                              {dotNode}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Ações no Dia */}
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-sky-400">
                        {d.totalDayActions}
                      </td>

                      {/* Total R$ Fechado no Dia */}
                      <td className="py-3 px-4 text-right font-mono font-black text-xs text-emerald-400">
                        {formatCurrency(d.totalDayAgreementsValue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 border-t-2 border-white/10 font-mono font-black text-xs text-slate-300">
                <td className="py-3.5 px-4" colSpan={4}>
                  TOTAL DA EQUIPE POR HORA
                </td>
                {HOURS.map(h => (
                  <td key={h} className="py-3.5 px-1 text-center text-sky-400">
                    {globalSummary.hourlyTotals[h].actions}
                  </td>
                ))}
                <td className="py-3.5 px-4 text-right text-sky-400 text-sm">
                  {HOURS.reduce((acc, h) => acc + globalSummary.hourlyTotals[h].actions, 0)}
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-400 text-sm">
                  {formatCurrency(globalSummary.totalDealsValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rodapé de Paginação */}
        {activityData.length > 0 && (
          <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-950/40">
            <span className="text-slate-400 font-medium">
              Exibindo <strong className="text-white">{Math.min((currentPage - 1) * itemsPerPage + 1, activityData.length)}</strong> a <strong className="text-white">{Math.min(currentPage * itemsPerPage, activityData.length)}</strong> de <strong className="text-white">{activityData.length}</strong> operadores (máximo 10 por página)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
              >
                <CaretLeft size={14} />
                <span>Anterior</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-sky-400 font-black border border-white/10">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Próxima</span>
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE EXPORTAÇÃO AVANÇADA (EXCEL / CSV MULTI-PERÍODO) */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <FileSpreadsheet size={24} weight="bold" />
                <h3 className="text-base font-black text-white">Exportação Avançada de Jornada</h3>
              </div>
              <button 
                onClick={() => setExportModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* SELETOR DE PERÍODO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">1. Selecione o Período de Exportação:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportRange('day')}
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    exportRange === 'day'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block text-sm mb-0.5">📅</span>
                  <span>Dia Selecionado ({selectedDateStr})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportRange('week')}
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    exportRange === 'week'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block text-sm mb-0.5">🗓️</span>
                  <span>Últimos 7 Dias (Semanal)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportRange('month')}
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    exportRange === 'month'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block text-sm mb-0.5">📆</span>
                  <span>Mês Completo ({selectedMonth}/{selectedYear})</span>
                </button>
              </div>
            </div>

            {/* SELETOR DE ESCOPO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">2. Selecione o Escopo dos Dados:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    exportScope === 'all'
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-md'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  🏢 Toda a Operação
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('team')}
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    exportScope === 'team'
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-md'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  👥 Por Equipe
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('operator')}
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    exportScope === 'operator'
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-md'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  👤 Individual
                </button>
              </div>

              {exportScope === 'team' && (
                <div className="pt-2">
                  <select
                    value={exportSelectedTeamId}
                    onChange={(e) => setExportSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-950 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="all">Todas as Equipes</option>
                    {managedTeamsData.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {exportScope === 'operator' && (
                <div className="pt-2">
                  <select
                    value={exportSelectedOperatorId}
                    onChange={(e) => setExportSelectedOperatorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-950 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="">Selecione um Operador...</option>
                    {teamMembers.filter(m => m.role === 'member').map(op => (
                      <option key={op.uid} value={op.uid}>{op.displayName || op.email}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
              💡 <strong>Padrão Microsoft Excel:</strong> O arquivo é gerado com codificação UTF-8 BOM e delimitador <code>;</code>, compatível com importação em ferramentas de BI e análise financeira.
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteAdvancedExport}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <FileSpreadsheet size={16} weight="bold" />
                <span>Baixar Relatório Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DA TIMELINE VISUAL INTERATIVA DO OPERADOR */}
      {selectedOperatorForTimeline && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border-l border-white/10 text-white h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-slide-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-lg">
                  {selectedOperatorForTimeline.operator.displayName?.charAt(0) || 'O'}
                </div>
                <div>
                  <h3 className="text-lg font-black">{selectedOperatorForTimeline.operator.displayName}</h3>
                  <span className="text-xs text-slate-400 font-medium">{selectedOperatorForTimeline.operator.email}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOperatorForTimeline(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* CARDS RESUMO DO OPERADOR */}
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Consistência</span>
                <span className="text-lg font-black text-emerald-400">{selectedOperatorForTimeline.consistencyPct}%</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Banco Pausa</span>
                <span className="text-lg font-black text-amber-400">{selectedOperatorForTimeline.actualPauseMinutes}m / {selectedOperatorForTimeline.maxPauseMinutes}m</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Total Ações</span>
                <span className="text-lg font-black text-sky-400">{selectedOperatorForTimeline.totalDayActions}</span>
              </div>
            </div>

            {/* TRILHA VISUAL DA TIMELINE DO DIA */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Trilha Temporal de Atendimento (08h às 18h)</h4>
              <div className="space-y-2">
                {HOURS.map(h => {
                  const stats = selectedOperatorForTimeline.hourlyStats[h];
                  const inShift = h >= selectedOperatorForTimeline.shiftStart && h < selectedOperatorForTimeline.shiftEnd;

                  return (
                    <div key={h} className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-4 font-mono text-xs">
                      <div className="flex items-center gap-3 min-w-[70px]">
                        <span className="font-black text-sky-400">{h}:00h</span>
                      </div>

                      <div className="flex-1 flex items-center gap-2">
                        {stats.totalActions > 0 ? (
                          <div className="flex-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center justify-between">
                            <span>🟢 {stats.totalActions} Ações registradas</span>
                            {stats.agreementsCount > 0 && (
                              <span className="text-[11px] text-amber-300 font-black">📜 {stats.agreementsCount} Acordo(s) ({formatCurrency(stats.agreementsValue)})</span>
                            )}
                          </div>
                        ) : inShift ? (
                          <div className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl font-medium">
                            🍱 Pausa / Intervalo absorvido pelo banco de 72m
                          </div>
                        ) : (
                          <div className="flex-1 bg-slate-900 text-slate-600 px-3 py-1.5 rounded-xl">
                            ⬛ Fora do Horário do Expediente
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
