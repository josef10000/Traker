import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Users, 
  Coffee, 
  Sparkle, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle, 
  WarningCircle, 
  Lightning, 
  FileText, 
  PhoneCall, 
  MagnifyingGlass, 
  TrendUp,
  Funnel,
  ShieldCheck,
  Crown
} from '@phosphor-icons/react';
import { UserProfile, Agreement, AuditLog, Team } from '../../types';
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

  // 1. Estados dos Filtros
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [actionFilter, setActionFilter] = useState<'all' | 'agreements' | 'attendances'>('all');

  // Horários exibidos na matriz: 08h até 18h (11 blocos de 1 hora)
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  // 2. Filtragem de Escopo da Equipe com base no Cargo (Role) do Usuário
  const scopedOperators = useMemo(() => {
    let filtered = [...teamMembers];

    // Operador comum (não deve ver esta aba, mas filtragem defensiva)
    if (profile.role === 'member') {
      return filtered.filter(m => m.uid === profile.uid);
    }

    // Supervisor: vê estritamente os operadores das suas equipes
    if (profile.role === 'supervisor') {
      const supervisorTeams = profile.managedTeams && profile.managedTeams.length > 0 
        ? profile.managedTeams 
        : [profile.teamId || ''];
      
      filtered = filtered.filter(m => {
        if (m.role === 'supervisor' || m.role === 'manager' || m.role === 'coordinator') return false;
        return supervisorTeams.includes(m.teamId || '');
      });
    } else {
      // Gerente, Coordenador e QA: veem a equipe geral e filtram se selecionado
      filtered = filtered.filter(m => m.role === 'member');
    }

    // Se houver um filtro de equipe selecionado no seletor do topo
    if (selectedTeamFilter !== 'all') {
      filtered = filtered.filter(m => m.teamId === selectedTeamFilter);
    }

    return filtered;
  }, [teamMembers, profile, selectedTeamFilter]);

  // 3. Processamento de Ações por Operador e por Hora no Dia Selecionado
  const activityData = useMemo(() => {
    const targetDate = selectedDateStr; // formato YYYY-MM-DD

    return scopedOperators.map(operator => {
      const shiftStart = operator.shiftStartHour ?? 8;
      const shiftEnd = operator.shiftEndHour ?? 17;
      const maxPauseMinutes = operator.dailyPauseAllowance ?? 72;

      // Estrutura por hora (8h-18h)
      const hourlyStats: Record<number, {
        agreementsCount: number;
        attendancesCount: number;
        auditCount: number;
        totalActions: number;
        lastActionTimestamp?: string;
      }> = {};

      HOURS.forEach(h => {
        hourlyStats[h] = { agreementsCount: 0, attendancesCount: 0, auditCount: 0, totalActions: 0 };
      });

      let totalDayActions = 0;
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
          hourlyStats[hour].totalActions += 1;
          totalDayActions += 1;
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
          // Hora sem ações dentro do expediente consomem 60 min da cota
          pauseMinutesUsed += 60;
        }
      });

      // Ajuste proporcional da estimativa de pausa (máximo tolerado = 72 min)
      const actualPauseMinutes = Math.min(pauseMinutesUsed, Math.max(0, (totalShiftHours - activeHoursCount) * 60));
      const remainingPause = Math.max(0, maxPauseMinutes - actualPauseMinutes);
      const isPauseExceeded = actualPauseMinutes > maxPauseMinutes;

      // Consistência % (Horas Ativas / Horas Totais do Expediente)
      const consistencyPct = totalShiftHours > 0 
        ? Math.min(100, Math.round((activeHoursCount / totalShiftHours) * 100))
        : 0;

      // Status do Operador em Tempo Real (Heartbeat)
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
  }, [scopedOperators, agreements, attendances, auditLogs, selectedDateStr, actionFilter]);

  // 4. Métricas Globais do Topo
  const globalSummary = useMemo(() => {
    const totalOps = activityData.length;
    const activeNow = activityData.filter(d => d.realTimeStatus === 'active').length;
    const inPause = activityData.filter(d => d.realTimeStatus === 'pause').length;
    
    const avgConsistency = totalOps > 0 
      ? Math.round(activityData.reduce((acc, d) => acc + d.consistencyPct, 0) / totalOps)
      : 0;

    const avgPauseUsed = totalOps > 0
      ? Math.round(activityData.reduce((acc, d) => acc + d.actualPauseMinutes, 0) / totalOps)
      : 0;

    // Encontrar a Hora de Pico da Operação
    const hourlyTotals: Record<number, number> = {};
    HOURS.forEach(h => { hourlyTotals[h] = 0; });

    activityData.forEach(d => {
      HOURS.forEach(h => {
        hourlyTotals[h] += d.hourlyStats[h].totalActions;
      });
    });

    let peakHour = 10;
    let maxActionsInPeak = 0;
    HOURS.forEach(h => {
      if (hourlyTotals[h] > maxActionsInPeak) {
        maxActionsInPeak = hourlyTotals[h];
        peakHour = h;
      }
    });

    return {
      totalOps,
      activeNow,
      inPause,
      avgConsistency,
      avgPauseUsed,
      peakHour,
      maxActionsInPeak,
      hourlyTotals
    };
  }, [activityData]);

  // 5. Função de Exportação para Excel / CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Operador;Email;Equipe;Turno;Ações no Dia;Consistência %;Banco Pausa Consumido (min);08h;09h;10h;11h;12h;13h;14h;15h;16h;17h;18h\n";

    activityData.forEach(d => {
      const teamName = managedTeamsData.find(t => t.id === d.operator.teamId)?.name || 'Sem Equipe';
      const hoursValues = HOURS.map(h => d.hourlyStats[h].totalActions).join(";");
      csvContent += `${d.operator.displayName};${d.operator.email};${teamName};${d.shiftStart}h-${d.shiftEnd}h;${d.totalDayActions};${d.consistencyPct}%;${d.actualPauseMinutes}m;${hoursValues}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_jornada_atividade_${selectedDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER DA ABA JORNADA */}
      <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-lg">
              <Clock size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Cockpit de Jornada & Atividade Passiva</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-widest flex items-center gap-1">
                  {profile.role === 'supervisor' ? <Users size={12} /> : profile.role === 'coordinator' ? <ShieldCheck size={12} /> : <Crown size={12} />}
                  {profile.role === 'supervisor' ? 'Visão de Equipe' : profile.role === 'coordinator' ? 'Visão da Coordenação' : 'Visão Executiva'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Monitoramento reativo hora a hora, banco de pausas diário (72 min) e consistência operacional.
              </p>
            </div>
          </div>

          {/* BARRA DE FILTROS & AÇÕES */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Data */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono">
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

            {/* Filtro por Tipo de Ação */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActionFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  actionFilter === 'all' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setActionFilter('agreements')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  actionFilter === 'agreements' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Acordos
              </button>
              <button
                onClick={() => setActionFilter('attendances')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  actionFilter === 'attendances' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Atendimentos
              </button>
            </div>

            {/* Exportar Excel */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* CARDS RESUMO EXECUTIVO DO TOPO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Operadores Ativos Agora</span>
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
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Banco de Pausas Consumido</span>
              <div className="text-xl font-black text-white flex items-center gap-1.5">
                <span>{globalSummary.avgPauseUsed}m</span>
                <span className="text-xs text-amber-400 font-bold">/ 72m cota</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Lightning size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Consistência Média da Equipe</span>
              <div className="text-xl font-black text-sky-400">
                {globalSummary.avgConsistency}%
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendUp size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hora de Pico da Operação</span>
              <div className="text-xl font-black text-white flex items-center gap-2">
                <span>{globalSummary.peakHour}:00h</span>
                <span className="text-xs text-indigo-400 font-bold">({globalSummary.maxActionsInPeak} ações)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA MATRIZ HORA A HORA */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-base font-black tracking-tight flex items-center gap-2">
              <span>Matriz de Produção Hora a Hora (08:00 às 19:00)</span>
              <span className="text-xs text-slate-400 font-medium">({activityData.length} operadores no escopo)</span>
            </h3>
          </div>

          {/* LEGENDA DE CORES */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 5+ Ações</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span> 2-4 Ações</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> 1 Ação</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span> Pausa Permitida (72m)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Pausa Excedente</span>
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
                {HOURS.map(h => (
                  <th key={h} className="py-3 px-2 text-center w-12">{h}h</th>
                ))}
                <th className="py-3 px-4 text-right">Total Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold">
              {activityData.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500">
                    Nenhum operador encontrado no escopo selecionado.
                  </td>
                </tr>
              ) : (
                activityData.map(d => {
                  const team = managedTeamsData.find(t => t.id === d.operator.teamId);

                  return (
                    <tr key={d.operator.uid} className="hover:bg-white/5 transition-colors">
                      {/* Operador / Equipe */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            d.realTimeStatus === 'active' ? 'bg-emerald-400 animate-pulse' : d.realTimeStatus === 'pause' ? 'bg-amber-400' : 'bg-slate-600'
                          }`} title={d.realTimeStatus === 'active' ? 'Ativo Agora' : 'Em Pausa / Off'} />
                          <div>
                            <span className="font-bold text-white block truncate max-w-[170px]">
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
                        const actions = actionFilter === 'agreements'
                          ? stats.agreementsCount
                          : actionFilter === 'attendances'
                          ? stats.attendancesCount
                          : stats.totalActions;

                        // Estilização condicional da Célula
                        let cellBg = 'bg-slate-950/40 text-slate-600';
                        let badgeText: React.ReactNode = '-';

                        if (actions >= 5) {
                          cellBg = 'bg-emerald-500/30 text-emerald-300 font-black border border-emerald-500/40';
                          badgeText = actions;
                        } else if (actions >= 2) {
                          cellBg = 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30';
                          badgeText = actions;
                        } else if (actions === 1) {
                          cellBg = 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30';
                          badgeText = actions;
                        } else if (inShift) {
                          // Pausa durante o expediente
                          if (d.isPauseExceeded) {
                            cellBg = 'bg-rose-950/50 text-rose-400 border border-rose-500/30';
                            badgeText = '⚠️';
                          } else {
                            cellBg = 'bg-slate-800/60 text-slate-400';
                            badgeText = '🍱';
                          }
                        } else {
                          // Fora do expediente
                          cellBg = 'bg-slate-950/80 text-slate-700';
                          badgeText = '⬛';
                        }

                        const tooltip = `Hora ${h}:00 - ${actions} Ações\n• Acordos: ${stats.agreementsCount}\n• Atendimentos: ${stats.attendancesCount}\n• Consultas: ${stats.auditCount}`;

                        return (
                          <td key={h} className="py-2 px-1 text-center">
                            <div 
                              className={`w-9 h-8 mx-auto rounded-xl flex items-center justify-center text-xs transition-all hover:scale-110 cursor-pointer ${cellBg}`}
                              title={tooltip}
                            >
                              {badgeText}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Ações no Dia */}
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-sky-400">
                        {d.totalDayActions}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* LINHA DE TOTAIS DA EQUIPE POR HORA */}
            <tfoot>
              <tr className="bg-slate-950 border-t-2 border-white/10 font-mono font-black text-xs text-slate-300">
                <td className="py-3.5 px-4" colSpan={4}>
                  TOTAL DA EQUIPE POR HORA
                </td>
                {HOURS.map(h => (
                  <td key={h} className="py-3.5 px-1 text-center text-sky-400">
                    {globalSummary.hourlyTotals[h]}
                  </td>
                ))}
                <td className="py-3.5 px-4 text-right text-emerald-400 text-sm">
                  {HOURS.reduce((acc, h) => acc + globalSummary.hourlyTotals[h], 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
