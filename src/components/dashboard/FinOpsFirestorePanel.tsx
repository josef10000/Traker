import React, { useState, useEffect } from 'react';
import { 
  ChartLineUp, 
  Database, 
  Lightning, 
  Clock, 
  ArrowClockwise, 
  ShieldCheck, 
  Coins, 
  Speedometer, 
  Devices,
  Sparkle
} from '@phosphor-icons/react';
import { firestoreMetrics, FirestoreTelemetryData } from '../../lib/firestoreMetrics';

interface FinOpsFirestorePanelProps {
  theme?: 'light' | 'dark';
}

export const FinOpsFirestorePanel: React.FC<FinOpsFirestorePanelProps> = ({
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [metrics, setMetrics] = useState<FirestoreTelemetryData>(firestoreMetrics.getMetrics());

  useEffect(() => {
    const unsub = firestoreMetrics.subscribe(data => {
      setMetrics(data);
    });
    return () => unsub();
  }, []);

  const handleReset = () => {
    firestoreMetrics.resetMetrics();
  };

  const handleSimulateHits = () => {
    // Simula 10 consultas atendidas diretamente por cache local
    firestoreMetrics.recordRead('dashboard', 10, true, 3);
  };

  const totalOps = metrics.totalReads + metrics.totalWrites + metrics.totalCacheHits;

  return (
    <div className={`p-6 rounded-3xl border space-y-6 shadow-xl ${
      isDark ? 'bg-slate-900/70 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Cabeçalho FinOps */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shrink-0">
            <Speedometer size={26} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FinOps & Telemetria do Firestore
              </span>
              <span className="text-xs text-slate-400 font-bold">Monitor de Consumo</span>
            </div>
            <h3 className="text-xl font-black tracking-tight mt-0.5">
              Auditoria de Leituras, Gravações & Cache
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateHits}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark ? 'bg-slate-800 border-white/10 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
            title="Simula 10 leituras resolvidas via cache local"
          >
            <Lightning size={14} className="text-amber-400" />
            <span>Testar Cache Hit</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-slate-400 transition-all cursor-pointer"
            title="Resetar métricas da sessão"
          >
            <ArrowClockwise size={16} />
          </button>
        </div>
      </div>

      {/* Grid de KPIs de Consumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Taxa de Cache Hit */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-slate-950/80 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Lightning size={16} className="text-amber-400" />
              Taxa de Cache Hit
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300">
              Economia
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {metrics.cacheHitRatePercent}%
            </span>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(metrics.cacheHitRatePercent, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {metrics.totalCacheHits} consultas servidas sem custo de Firestore
          </span>
        </div>

        {/* Card 2: Leituras Reais no Banco */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-slate-950/80 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Database size={16} className="text-sky-400" />
              Leituras Reais (Reads)
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              Firestore
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black font-mono text-sky-400">
              {metrics.totalReads}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Misses de cache ou primeiras cargas
          </span>
        </div>

        {/* Card 3: Gravações (Writes) */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-slate-950/80 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Coins size={16} className="text-emerald-400" />
              Gravações (Writes)
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              Modificações
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {metrics.totalWrites}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Acordos criados, baixas e logs
          </span>
        </div>

        {/* Card 4: Economia FinOps Estimada */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-slate-950/80 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-400" />
              Eficiência FinOps
            </span>
            <span className="text-[10px] font-mono text-indigo-300 font-bold">
              Escala
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black font-mono text-indigo-400">
              {totalOps > 0 ? `${((metrics.totalCacheHits / totalOps) * 100).toFixed(0)}%` : '100%'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Economia gerada por cache & views
          </span>
        </div>
      </div>

      {/* Tabela de Consumo por Tela/Módulo */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Devices size={16} className="text-sky-400" />
          Consumo Desagregado por Tela
        </h4>

        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isDark ? 'bg-slate-950/80 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
              <tr>
                <th className="p-3 font-bold">Tela / Módulo</th>
                <th className="p-3 font-bold text-center">Reads Reais</th>
                <th className="p-3 font-bold text-center">Cache Hits</th>
                <th className="p-3 font-bold text-center">Writes</th>
                <th className="p-3 font-bold text-right">Latência Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.keys(metrics.screens).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 font-medium">
                    Nenhuma operação registrada na sessão atual. Navegue pelo sistema para ver o consumo.
                  </td>
                </tr>
              ) : (
                Object.entries(metrics.screens).map(([screenName, s]) => {
                  const screenTotal = s.cacheHits + s.cacheMisses;
                  const screenHitRate = screenTotal > 0 ? Math.round((s.cacheHits / screenTotal) * 100) : 100;
                  return (
                    <tr key={screenName} className={isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-bold capitalize text-slate-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        {screenName}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-sky-400">
                        {s.reads}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">
                        {s.cacheHits} <span className="text-[10px] text-slate-500">({screenHitRate}%)</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        {s.writes}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {s.avgTimeMs > 0 ? `${s.avgTimeMs} ms` : '< 5 ms'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
