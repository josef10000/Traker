import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { Agreement, AttendanceRecord, UserProfile, Team, DashboardStats } from '../../types';
import { formatCurrency } from '../../utils/masks';
import { Fire, CurrencyDollar, Lightning, ShieldWarning, Tag, TrendUp as TrendingUp } from '@phosphor-icons/react';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomMonthYearPicker } from '../ui/CustomMonthYearPicker';
import { AdvancedInsights } from './AdvancedInsights';

interface BiAnalyticsTabProps {
  profile: UserProfile;
  agreements: Agreement[];
  stats: DashboardStats;
  teamsData?: Team[];
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

export const BiAnalyticsTab: React.FC<BiAnalyticsTabProps> = ({
  profile,
  agreements,
  stats,
  teamsData = [],
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  showToast,
  theme = 'dark'
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Estados dos Filtros
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [heatmapMetric, setHeatmapMetric] = useState<'total' | 'success' | 'paid_value' | 'real_conversion' | 'specific_reason'>('total');
  const [heatmapSelectedReason, setHeatmapSelectedReason] = useState<string>('all');

  // Carrega registros de tabulação/atendimento conforme o sandbox ou firestore
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const stored = localStorage.getItem(`sandbox_attendances_${profile.organizationId}`);
      if (stored) {
        setRecords(JSON.parse(stored));
      }
      return;
    }

    try {
      const q = query(
        collection(db, 'attendanceRecords'),
        where('organizationId', '==', profile.organizationId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: AttendanceRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord));

        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecords(fetched);
      }, (err) => {
        console.error('Erro ao ouvir registros de atendimento no BI:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Erro no snapshot do BI:', e);
    }
  }, [profile.organizationId]);

  // Filtragem dos Registros por Equipe
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedTeamFilter !== 'all') {
        const matchTeam = r.teamId === selectedTeamFilter;
        if (!matchTeam) return false;
      }
      return true;
    });
  }, [records, selectedTeamFilter]);

  // 1. Ticket Médio R$ por Motivo
  const reasonTicketStats = useMemo(() => {
    const statsMap: Record<string, { title: string; count: number; totalValue: number; averageValue: number }> = {};
    filteredRecords.forEach(r => {
      const key = r.reasonTitle || 'Sem motivo';
      if (!statsMap[key]) {
        statsMap[key] = { title: key, count: 0, totalValue: 0, averageValue: 0 };
      }
      statsMap[key].count += 1;
      if (r.agreementId) {
        const ag = agreements.find(a => a.id === r.agreementId);
        if (ag) {
          statsMap[key].totalValue += (ag.updatedValue || ag.originalValue || 0);
        }
      }
    });

    return Object.values(statsMap)
      .map(item => ({
        ...item,
        averageValue: item.count > 0 ? item.totalValue / item.count : 0
      }))
      .filter(item => item.totalValue > 0)
      .sort((a, b) => b.averageValue - a.averageValue);
  }, [filteredRecords, agreements]);

  // 2. FCR (First Contact Resolution - Resolução no 1º Contato %)
  const fcrStats = useMemo(() => {
    const clientHistory: Record<string, AttendanceRecord[]> = {};
    filteredRecords.forEach(r => {
      if (!r.clientCpf) return;
      if (!clientHistory[r.clientCpf]) {
        clientHistory[r.clientCpf] = [];
      }
      clientHistory[r.clientCpf].push(r);
    });

    let totalUniqueClients = 0;
    let resolvedFirstContact = 0;

    Object.values(clientHistory).forEach(history => {
      history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      totalUniqueClients += 1;
      if (history[0] && history[0].isSuccess) {
        resolvedFirstContact += 1;
      }
    });

    const fcrRate = totalUniqueClients > 0
      ? ((resolvedFirstContact / totalUniqueClients) * 100).toFixed(1)
      : '0.0';

    return {
      totalUniqueClients,
      resolvedFirstContact,
      fcrRate
    };
  }, [filteredRecords]);

  // 3. Taxa de Quebra Futura por Motivo (%)
  const quebraStats = useMemo(() => {
    const statsMap: Record<string, { title: string; totalAgreements: number; brokenAgreements: number; quebraRate: number }> = {};
    filteredRecords.forEach(r => {
      if (!r.agreementId) return;
      const ag = agreements.find(a => a.id === r.agreementId);
      if (!ag) return;

      const key = r.reasonTitle || 'Sem motivo';
      if (!statsMap[key]) {
        statsMap[key] = { title: key, totalAgreements: 0, brokenAgreements: 0, quebraRate: 0 };
      }
      statsMap[key].totalAgreements += 1;
      if (ag.status === 'BROKEN') {
        statsMap[key].brokenAgreements += 1;
      }
    });

    return Object.values(statsMap)
      .map(item => ({
        ...item,
        quebraRate: item.totalAgreements > 0 ? Number(((item.brokenAgreements / item.totalAgreements) * 100).toFixed(1)) : 0
      }))
      .filter(item => item.totalAgreements > 0)
      .sort((a, b) => b.quebraRate - a.quebraRate);
  }, [filteredRecords, agreements]);

  // 4. Breakdown dos Motivos (Pareto Rosca)
  const reasonBreakdown = useMemo(() => {
    const counts: Record<string, { title: string; count: number; isNegotiation: boolean; isSuccess: boolean }> = {};
    filteredRecords.forEach(r => {
      const key = r.reasonTitle || 'Sem motivo';
      if (!counts[key]) {
        counts[key] = {
          title: key,
          count: 0,
          isNegotiation: r.isNegotiation,
          isSuccess: r.isSuccess
        };
      }
      counts[key].count += 1;
    });

    const total = filteredRecords.length || 1;
    return Object.values(counts)
      .map(item => ({
        ...item,
        percentage: Number(((item.count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // 5. Matriz do Mapa de Calor Multidimensional (Segunda a Sábado x Faixas Horárias)
  const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const TIME_SLOTS = [
    { label: '08h - 10h', startHour: 8, endHour: 10 },
    { label: '10h - 12h', startHour: 10, endHour: 12 },
    { label: '12h - 14h', startHour: 12, endHour: 14 },
    { label: '14h - 16h', startHour: 14, endHour: 16 },
    { label: '16h - 18h', startHour: 16, endHour: 18 },
    { label: '18h - 20h', startHour: 18, endHour: 20 }
  ];

  const heatmapMatrix = useMemo(() => {
    const matrix: { day: string; time: string; value: number; count: number; countTotal: number }[][] = 
      DAYS_OF_WEEK.map(() => TIME_SLOTS.map(() => ({ day: '', time: '', value: 0, count: 0, countTotal: 0 })));

    let maxValue = 0;

    filteredRecords.forEach(r => {
      const date = new Date(r.createdAt);
      const dayOfWeek = date.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sáb
      if (dayOfWeek === 0) return;
      const dayIdx = dayOfWeek - 1;
      if (dayIdx < 0 || dayIdx >= 6) return;

      const hour = date.getHours();
      const timeIdx = TIME_SLOTS.findIndex(slot => hour >= slot.startHour && hour < slot.endHour);
      if (timeIdx === -1) return;

      const cell = matrix[dayIdx][timeIdx];
      cell.day = DAYS_OF_WEEK[dayIdx];
      cell.time = TIME_SLOTS[timeIdx].label;
      cell.countTotal += 1;

      if (heatmapMetric === 'total') {
        cell.value += 1;
        cell.count += 1;
      } else if (heatmapMetric === 'success' && r.isSuccess) {
        cell.value += 1;
        cell.count += 1;
      } else if (heatmapMetric === 'paid_value' && r.agreementId) {
        const ag = agreements.find(a => a.id === r.agreementId);
        if (ag && (ag.status === 'PAID' || ag.status === 'SCHEDULED')) {
          const val = ag.updatedValue || ag.originalValue || 0;
          cell.value += val;
          cell.count += 1;
        }
      } else if (heatmapMetric === 'real_conversion' && r.isNegotiation) {
        if (r.isSuccess) cell.value += 1;
        cell.count += 1;
      } else if (heatmapMetric === 'specific_reason') {
        if (heatmapSelectedReason === 'all' || r.reasonTitle === heatmapSelectedReason) {
          cell.value += 1;
          cell.count += 1;
        }
      }

      if (cell.value > maxValue) maxValue = cell.value;
    });

    return { matrix, maxValue: maxValue || 1 };
  }, [filteredRecords, heatmapMetric, heatmapSelectedReason, agreements]);

  const REASON_COLORS = [
    '#38bdf8', '#34d399', '#f59e0b', '#f43f5e', '#a78bfa', '#ec4899', '#10b981', '#6366f1'
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Superior com Título & Filtros de Período */}
      <div className={`p-6 rounded-[2rem] border ${
        theme === 'dark' ? 'border-white/5 bg-slate-900/40 shadow-2xl' : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                BI & Analytics Estratégico
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Métricas Preditivas, Ticket Médio, Resolução em 1º Contato, Risco de Quebra e Mapa de Calor
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Equipes */}
            {teamsData.length > 0 && (
              <div className="w-48">
                <CustomSelect
                  value={selectedTeamFilter}
                  onChange={(val) => setSelectedTeamFilter(val)}
                  placeholder="Todas as Equipes"
                  options={[
                    { value: 'all', label: '🏢 Todas as Equipes' },
                    ...teamsData.map(t => ({ value: t.id, label: `👥 ${t.name}` }))
                  ]}
                />
              </div>
            )}

            {/* Filtro Compacto de Mês e Ano */}
            <CustomMonthYearPicker
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onSelectMonth={setSelectedMonth}
              onSelectYear={setSelectedYear}
              theme={theme}
            />
          </div>
        </div>
      </div>

      {/* 📊 PAINEL DAS 3 NOVAS MÉTRICAS AVANÇADAS DE BI (3 COLUNAS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card A: Ticket Médio por Motivo (R$) */}
        <div className={`p-5 rounded-[2rem] border ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <CurrencyDollar size={18} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Ticket Médio por Motivo</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">R$ Recuperados</span>
          </div>

          {reasonTicketStats.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-6">Nenhum acordo registrado com motivo ainda.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {reasonTicketStats.slice(0, 4).map(item => (
                <div key={item.title} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/30 border border-white/5 text-xs">
                  <span className="text-slate-300 font-medium text-[11px] truncate max-w-[140px]" title={item.title}>
                    {item.title}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-[11px]">
                    {formatCurrency(item.averageValue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card B: Resolução no 1º Contato (FCR %) */}
        <div className={`p-5 rounded-[2rem] border ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Lightning size={18} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Resolução 1º Contato (FCR)</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Velocidade</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-3xl font-black text-amber-400 tracking-tight">{fcrStats.fcrRate}%</span>
              <span className="text-[11px] text-slate-400 block mt-1">Taxa de Resolução Imediata</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-200 block">{fcrStats.resolvedFirstContact} de {fcrStats.totalUniqueClients}</span>
              <span className="text-[10px] text-slate-400 block">clientes únicos atendidos</span>
            </div>
          </div>
        </div>

        {/* Card C: Taxa de Quebra Futura por Motivo (%) */}
        <div className={`p-5 rounded-[2rem] border ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <ShieldWarning size={18} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Taxa de Quebra Futura</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Risco</span>
          </div>

          {quebraStats.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-6">Sem histórico de acordos quebrados registrado.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {quebraStats.slice(0, 4).map(item => (
                <div key={item.title} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/30 border border-white/5 text-xs">
                  <span className="text-slate-300 font-medium text-[11px] truncate max-w-[140px]" title={item.title}>
                    {item.title}
                  </span>
                  <span className={`font-mono font-bold text-[11px] ${item.quebraRate > 30 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {item.quebraRate}% quebra ({item.brokenAgreements}/{item.totalAgreements})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🗺️ MAPA DE CALOR MULTIDIMENSIONAL REATIVO (BI HEATMAP) */}
      <div className={`p-6 rounded-[2rem] border ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Fire size={18} className="text-amber-400" />
              <span>Mapa de Calor Operacional: Janela de Ouro e Concentração</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Identifique os dias e horários nobres de maior densidade de resultado</p>
          </div>

          {/* Seletores de Métrica e Motivo do Heatmap */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <CustomSelect
                value={heatmapMetric}
                onChange={(val) => setHeatmapMetric(val as any)}
                placeholder="Selecione a Métrica..."
                options={[
                  { value: 'total', label: '📞 Volume de Atendimentos' },
                  { value: 'success', label: '🤝 Acordos Gerados' },
                  { value: 'paid_value', label: '💳 Valor de Acordos (R$)' },
                  { value: 'real_conversion', label: '🎯 Conversão Real (%)' },
                  { value: 'specific_reason', label: '🏷️ Filtrar por Motivo Específico' }
                ]}
              />
            </div>

            {/* Sub-seletor de Motivo Específico */}
            {heatmapMetric === 'specific_reason' && (
              <div className="w-56">
                <CustomSelect
                  value={heatmapSelectedReason}
                  onChange={(val) => setHeatmapSelectedReason(val)}
                  placeholder="Selecione o Motivo..."
                  options={[
                    { value: 'all', label: '🏷️ Todos os Motivos' },
                    ...reasonBreakdown.map(r => ({ value: r.title, label: r.title }))
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Grade do Mapa de Calor (Heatmap Matrix Table) */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">
                <th className="py-3 px-4 text-left">Dia / Horário</th>
                {TIME_SLOTS.map(slot => (
                  <th key={slot.label} className="py-3 px-3 min-w-[100px]">{slot.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs font-mono divide-y divide-white/[0.02]">
              {DAYS_OF_WEEK.map((dayName, dayIdx) => (
                <tr key={dayName} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-300 text-left text-xs">
                    {dayName}
                  </td>

                  {TIME_SLOTS.map((slot, timeIdx) => {
                    const cell = heatmapMatrix.matrix[dayIdx][timeIdx];
                    const rawVal = cell.value;
                    const ratio = heatmapMatrix.maxValue > 0 ? rawVal / heatmapMatrix.maxValue : 0;

                    let bgClass = 'bg-slate-950/40 text-slate-500 border border-white/5';
                    if (ratio > 0.75) {
                      bgClass = 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 border border-amber-400';
                    } else if (ratio > 0.45) {
                      bgClass = 'bg-amber-500/60 text-amber-100 font-bold border border-amber-500/40';
                    } else if (ratio > 0.20) {
                      bgClass = 'bg-amber-500/30 text-amber-300 border border-amber-500/20';
                    } else if (ratio > 0) {
                      bgClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/10';
                    }

                    return (
                      <td key={slot.label} className="p-1.5">
                        <div 
                          className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105 ${bgClass}`}
                          title={`${dayName} às ${slot.label}: ${heatmapMetric === 'paid_value' ? formatCurrency(rawVal) : `${rawVal} registros`}`}
                        >
                          <span className="text-[11px]">
                            {heatmapMetric === 'paid_value' 
                              ? (rawVal > 0 ? formatCurrency(rawVal) : '-') 
                              : (rawVal > 0 ? rawVal : '-')}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📊 PARETO ROSCA DOS MOTIVOS TABULADOS */}
      {reasonBreakdown.length > 0 && (
        <div className={`p-6 rounded-[2rem] border ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Tag size={16} className="text-sky-400" />
                <span>BI de Motivos: Pareto de Ofensores e Oportunidades</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribuição percentual dos motivos tabulados na operação</p>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-widest">
              {reasonBreakdown.length} motivos registrados
            </span>
          </div>

          <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-800 border border-slate-700/50 mb-5 shadow-inner">
            {reasonBreakdown.map((item, idx) => (
              <div
                key={item.title}
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: REASON_COLORS[idx % REASON_COLORS.length]
                }}
                className="h-full transition-all hover:brightness-125 relative group cursor-pointer"
                title={`${item.title}: ${item.count} (${item.percentage}%)`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {reasonBreakdown.map((item, idx) => (
              <div 
                key={item.title}
                className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                  theme === 'dark' ? 'bg-slate-950/40 border-white/5 hover:border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span 
                  className="w-3 h-3 rounded-full shrink-0 mt-0.5 shadow-sm"
                  style={{ backgroundColor: REASON_COLORS[idx % REASON_COLORS.length] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-200 truncate text-[11px]" title={item.title}>
                      {item.title}
                    </span>
                    <span className="font-mono font-black text-sky-400 text-[11px]">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{item.count} chamadas</span>
                    <span className={`font-semibold ${item.isSuccess ? 'text-emerald-400' : item.isNegotiation ? 'text-amber-400' : 'text-slate-400'}`}>
                      {item.isSuccess ? 'Sucesso' : item.isNegotiation ? 'Negociação' : 'Institucional'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔮 ESTATÍSTICAS PREDITIVAS & INSIGHTS (ADVANCED INSIGHTS) */}
      <div className={`glass-card p-6 rounded-[2rem] border ${
        theme === 'dark' ? 'border-white/5 bg-slate-900/10' : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <AdvancedInsights 
          stats={stats}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
};
