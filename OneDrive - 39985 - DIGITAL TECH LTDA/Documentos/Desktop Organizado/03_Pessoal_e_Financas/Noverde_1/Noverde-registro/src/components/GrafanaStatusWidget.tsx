import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Activity, ShieldCheck, Server } from 'lucide-react';

interface ServiceItem {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
}

interface StatusData {
  timestamp: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  grafanaConnected: boolean;
  services: ServiceItem[];
  details?: {
    grafanaVersion?: string;
    databaseHealth?: string;
    message?: string;
  };
}

export const GrafanaStatusWidget: React.FC = () => {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/grafana-status');
      if (!response.ok) {
        throw new Error(`Status HTTP ${response.status}`);
      }
      const json: StatusData = await response.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Atualização automática a cada 60 segundos
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: 'operational' | 'degraded' | 'outage' | 'unknown') => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Todos os Sistemas Operacionais
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Desempenho Degradado
          </span>
        );
      case 'outage':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <XCircle className="w-4 h-4 text-red-500" />
            Serviço Indisponível
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Activity className="w-4 h-4 text-slate-500" />
            Status Desconhecido
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Status do Sistema
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoramento via Grafana Cloud API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && getStatusBadge(data.status)}
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Atualizar Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="text-xs">Verificando métricas no Grafana...</span>
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.services.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80"
              >
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {service.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {service.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {service.status === 'operational' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Operacional" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Degradado" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Grafana Cloud: {data.grafanaConnected ? 'Conectado' : 'Modo Padrão'}
            </span>
            <span>
              Última checagem: {new Date(data.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
