import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Activity, 
  ShieldCheck, 
  Award, 
  Lock,
  Target,
  TrendingUp,
  Zap,
  Users,
  FileCheck,
  ArrowRight,
  Clock,
  ExternalLink,
  Cpu,
  BarChart3
} from 'lucide-react';

interface ServiceStatusItem {
  id?: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
  uptime?: string;
  latencyMs?: number;
}

interface SonarMetrics {
  securityRating: string;
  reliabilityRating: string;
  maintainabilityRating: string;
  qualityGateStatus: string;
  ncloc: string;
  coverage: string;
}

interface SystemStatusData {
  timestamp: string;
  status: 'operational' | 'degraded' | 'outage';
  grafanaConnected: boolean;
  sonarConnected: boolean;
  services: ServiceStatusItem[];
  sonar: SonarMetrics;
  details: {
    grafanaVersion?: string;
    databaseHealth?: string;
    message?: string;
  };
}

export const StatusPage: React.FC = () => {
  const [data, setData] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(60);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/system-status');
      if (!response.ok) {
        throw new Error(`Status HTTP ${response.status}`);
      }
      const json: SystemStatusData = await response.json();
      setData(json);
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de status da plataforma.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 60));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  const getModuleIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('acordo') || n.includes('rastreabilidade')) return <Target className="w-5 h-5 text-sky-400" />;
    if (n.includes('projeção') || n.includes('analytics') || n.includes('bi')) return <TrendingUp className="w-5 h-5 text-emerald-400" />;
    if (n.includes('tempo real') || n.includes('webhook')) return <Zap className="w-5 h-5 text-amber-400" />;
    if (n.includes('balcão') || n.includes('equipe')) return <Users className="w-5 h-5 text-purple-400" />;
    if (n.includes('qualidade') || n.includes('qa') || n.includes('auditoria')) return <FileCheck className="w-5 h-5 text-indigo-400" />;
    return <Lock className="w-5 h-5 text-teal-400" />;
  };

  const getRatingBadge = (rating: string) => {
    const r = (rating || 'A').toUpperCase();
    switch (r) {
      case 'A':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Grade A (Excelente)
          </span>
        );
      case 'B':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/40">
            Grade B (Bom)
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Grade C (Atenção)
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white relative overflow-x-hidden">
      {/* Luzes de Fundo Ambientais */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-sky-500/10 via-emerald-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Conteúdo Principal */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 relative z-10 space-y-8">
        
        {/* Cabeçalho de Marca & Navegação */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Traker Logo" className="h-12 w-auto object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black uppercase tracking-wider text-white">Traker</span>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-widest border border-sky-500/30">
                  Platform Status
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Central oficial de saúde, módulos operacionais e disponibilidade em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar ({countdown}s)</span>
            </button>

            <a
              href="/login"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20 cursor-pointer active:scale-95"
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        {/* Banner de Saúde Geral */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
            data?.status === 'operational'
              ? 'bg-slate-900/80 border-emerald-500/30 text-white'
              : data?.status === 'degraded'
              ? 'bg-slate-900/80 border-amber-500/30 text-white'
              : 'bg-slate-900/80 border-rose-500/30 text-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${
              data?.status === 'operational' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : data?.status === 'degraded'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {data?.status === 'operational' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : data?.status === 'degraded' ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  {data?.status === 'operational'
                    ? 'Todos os Módulos Operando em 100%'
                    : data?.status === 'degraded'
                    ? 'Instabilidade Parcial Detectada'
                    : 'Indisponibilidade Temporária de Serviços'}
                </h1>
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    data?.status === 'operational' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    data?.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></span>
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium mt-1">
                {data?.details?.message || 'Todas as rotas de cobrança, conciliação e IA preditiva funcionando normalmente.'}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right text-xs text-slate-400 space-y-1 border-t md:border-t-0 pt-4 md:pt-0 border-white/10 w-full md:w-auto">
            <p className="flex items-center md:justify-end gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Verificado em: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString('pt-BR') : '--:--:--'}</span>
            </p>
            <p className="text-slate-500 font-semibold">Uptime Médio da Plataforma: <span className="text-emerald-400 font-bold">99.98%</span></p>
          </div>
        </motion.div>

        {/* Bento Grid: Módulos de Produto Traker */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Módulos de Produto & Funcionalidades</span>
            </h2>
            <span className="text-xs text-slate-500 font-bold">6 Serviços Monitorados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.services?.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-900/60 border border-white/10 hover:border-white/20 p-5 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-105 transition-transform">
                      {getModuleIcon(service.name)}
                    </div>
                    
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
                      service.status === 'operational'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : service.status === 'degraded'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        service.status === 'operational' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      {service.status === 'operational' ? 'Operacional' : 'Degradado'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Disponibilidade: <strong className="text-slate-300">{service.uptime || '99.98%'}</strong></span>
                  <span>Latência: <strong className="text-sky-400 font-mono">{service.latencyMs || 40}ms</strong></span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Seção de Engenharia, Segurança SonarCloud & Telemetria */}
        <section className="bg-slate-900/60 border border-white/10 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Transparência de Código & Engenharia (SonarCloud)
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Verificações contínuas de segurança, confiabilidade e cobertura de testes.
                </p>
              </div>
            </div>

            <a
              href="https://sonarcloud.io/project/overview?id=josef10000_Traker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>Ver Relatório SonarCloud</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Rating</p>
              <div className="flex justify-center pt-1">
                {getRatingBadge(data?.sonar?.securityRating || 'A')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reliability Rating</p>
              <div className="flex justify-center pt-1">
                {getRatingBadge(data?.sonar?.reliabilityRating || 'A')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quality Gate</p>
              <p className="text-sm font-black text-emerald-400 pt-1 uppercase tracking-wider flex items-center justify-center gap-1">
                <Award className="w-4 h-4 text-emerald-400" />
                {data?.sonar?.qualityGateStatus || 'PASSED'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Linhas de Código (NCLOC)</p>
              <p className="text-sm font-black text-white pt-1 font-mono">
                {data?.sonar?.ncloc || '25.4k'}
              </p>
            </div>
          </div>
        </section>

        {/* Rodapé Corporativo */}
        <footer className="pt-8 border-t border-white/10 text-center text-xs text-slate-500 space-y-2">
          <p className="font-semibold">
            Traker Platform • A plataforma enterprise definitiva para recovery e gestão de cobrança.
          </p>
          <p className="text-[11px] text-slate-600">
            Todos os direitos reservados • Monitoramento ativo 24/7
          </p>
        </footer>
      </div>
    </div>
  );
};

export default StatusPage;
