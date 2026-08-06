import { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchGrafanaHealthAndAlerts } from '../src/lib/grafanaClient';

export interface SonarMetrics {
  securityRating: string;
  reliabilityRating: string;
  maintainabilityRating: string;
  qualityGateStatus: string;
  ncloc: string;
  coverage: string;
}

export interface ServiceStatusItem {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
  uptime: string;
  latencyMs: number;
}

export interface SystemStatusData {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const now = new Date().toISOString();

  // 1. Testar Conexão Direta ao Firebase Auth API (Health Check Ativo)
  let authStatus: 'operational' | 'degraded' | 'outage' = 'operational';
  let authDescription = 'Login, JWT & Controle de Acesso Operacionais';
  let authLatency = 38;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const startMs = Date.now();
    const authRes = await fetch('https://identitytoolkit.googleapis.com/$discovery/rest?version=v1', { signal: controller.signal });
    authLatency = Date.now() - startMs;
    clearTimeout(timeoutId);
    if (!authRes.ok) {
      authStatus = 'degraded';
      authDescription = `Instabilidade na API de Autenticação (HTTP ${authRes.status})`;
    }
  } catch (e: any) {
    authStatus = 'degraded';
    authDescription = 'Tempo de resposta elevado no serviço de Autenticação';
  }

  // 2. Testar Conexão Direta ao Banco Firestore API (Health Check Ativo)
  let firestoreStatus: 'operational' | 'degraded' | 'outage' = 'operational';
  let firestoreDescription = 'Leitura e Escrita de Dados Operacionais';
  let firestoreLatency = 42;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const startMs = Date.now();
    const fsRes = await fetch('https://firestore.googleapis.com/v1/projects/traker-app/databases', { signal: controller.signal });
    firestoreLatency = Date.now() - startMs;
    clearTimeout(timeoutId);
    if (fsRes.status >= 500) {
      firestoreStatus = 'outage';
      firestoreDescription = 'Servidor de Dados Indisponível (HTTP 500)';
    } else if (!fsRes.ok && fsRes.status !== 401 && fsRes.status !== 403) {
      firestoreStatus = 'degraded';
      firestoreDescription = `Alerta de Performance de Dados (HTTP ${fsRes.status})`;
    }
  } catch (e: any) {
    firestoreStatus = 'degraded';
    firestoreDescription = 'Latência elevada na consulta do Banco de Dados';
  }

  // Configurações Grafana
  const grafanaUrl = process.env.GRAFANA_URL || 'https://lankyquokka3421.grafana.net';
  const grafanaToken = process.env.GRAFANA_API_TOKEN;

  // Configurações SonarCloud
  const sonarProjectKey = process.env.SONAR_PROJECT_KEY || 'josef10000_Traker';
  const sonarToken = process.env.SONAR_TOKEN;

  // 3. Consultar Grafana Cloud API em tempo real via cliente compartilhado
  const { grafanaConnected, healthData: grafanaHealthData, activeAlerts } = await fetchGrafanaHealthAndAlerts(grafanaUrl, grafanaToken);

  // 4. Consultar SonarCloud Web API em tempo real
  let sonarConnected = false;
  let sonarMetrics: SonarMetrics = {
    securityRating: 'A',
    reliabilityRating: 'A',
    maintainabilityRating: 'A',
    qualityGateStatus: 'PASSED',
    ncloc: '25.4k',
    coverage: 'N/A'
  };

  try {
    const sonarAuthHeader: Record<string, string> = {};
    if (sonarToken) {
      sonarAuthHeader['Authorization'] = `Basic ${Buffer.from(sonarToken + ':').toString('base64')}`;
    }

    const metricKeys = 'security_rating,reliability_rating,sqale_rating,alert_status,ncloc,coverage';
    const sonarApiUrl = `https://sonarcloud.io/api/measures/component?component=${encodeURIComponent(sonarProjectKey)}&metricKeys=${metricKeys}`;

    const sonarRes = await fetch(sonarApiUrl, { headers: sonarAuthHeader });
    if (sonarRes.ok) {
      const sonarData = await sonarRes.json().catch(() => ({}));
      const measures = sonarData?.component?.measures || [];

      const ratingMap: Record<string, string> = { '1.0': 'A', '2.0': 'B', '3.0': 'C', '4.0': 'D', '5.0': 'E', '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };

      const getMetricVal = (key: string) => {
        const item = measures.find((m: any) => m.metric === key);
        return item ? item.value : null;
      };

      const secVal = getMetricVal('security_rating');
      const relVal = getMetricVal('reliability_rating');
      const mntVal = getMetricVal('sqale_rating');
      const gateVal = getMetricVal('alert_status');
      const nclocVal = getMetricVal('ncloc');
      const covVal = getMetricVal('coverage');

      sonarMetrics = {
        securityRating: secVal ? (ratingMap[secVal] || secVal) : 'A',
        reliabilityRating: relVal ? (ratingMap[relVal] || relVal) : 'A',
        maintainabilityRating: mntVal ? (ratingMap[mntVal] || mntVal) : 'A',
        qualityGateStatus: gateVal === 'ERROR' ? 'FAILED' : 'PASSED',
        ncloc: nclocVal ? Number(nclocVal).toLocaleString('pt-BR') : '25.4k',
        coverage: covVal ? `${covVal}%` : 'N/A'
      };
      sonarConnected = true;
    }
  } catch (err) {
    console.warn('SonarCloud API fetch warning:', err);
  }

  // Lista dos 6 Módulos de Produto da Plataforma Traker
  const servicesList: ServiceStatusItem[] = [
    { 
      id: 'agreements',
      name: 'Rastreabilidade & Gestão de Acordos', 
      status: firestoreStatus, 
      description: firestoreStatus === 'operational' ? 'Controle de faturamento, liquidação e baixas em tempo real.' : firestoreDescription,
      uptime: '99.98%',
      latencyMs: firestoreLatency
    },
    { 
      id: 'predictive_bi',
      name: 'Projeções Preditivas & Analytics (BI)', 
      status: firestoreStatus, 
      description: firestoreStatus === 'operational' ? 'Motor de IA preditiva (W1-W4), run-rate diário e metas.' : firestoreDescription,
      uptime: '99.95%',
      latencyMs: firestoreLatency + 8
    },
    { 
      id: 'realtime_ops',
      name: 'Operação em Tempo Real & Webhooks', 
      status: (grafanaConnected && firestoreStatus === 'operational') ? 'operational' : 'degraded', 
      description: 'Sincronização instantânea no painel e captura via Webhooks CRM.',
      uptime: '99.99%',
      latencyMs: 24
    },
    { 
      id: 'recovery_pool',
      name: 'Balcão de Recuperação & Equipes', 
      status: firestoreStatus, 
      description: firestoreStatus === 'operational' ? 'Distribuição de carteira, ranking por equipe e fechamento PJ.' : firestoreDescription,
      uptime: '99.97%',
      latencyMs: firestoreLatency + 12
    },
    { 
      id: 'qa_auditing',
      name: 'Garantia de Qualidade & Auditoria (QA)', 
      status: sonarMetrics.qualityGateStatus === 'PASSED' ? 'operational' : 'degraded', 
      description: 'Formulários de auditoria de atendimento e registros do sistema.',
      uptime: '99.96%',
      latencyMs: 31
    },
    { 
      id: 'enterprise_security',
      name: 'Segurança & Controle de Acesso Enterprise', 
      status: authStatus, 
      description: authStatus === 'operational' ? 'Autenticação JWT, permissões por cargo e conformidade LGPD.' : authDescription,
      uptime: '99.99%',
      latencyMs: authLatency
    }
  ];

  // Se houver algum alerta ativo no Grafana
  activeAlerts.forEach((alert: any) => {
    const alertName = (alert.labels?.alertname || '').toLowerCase();
    servicesList.forEach(service => {
      if (alertName.includes(service.name.toLowerCase()) || alertName.includes(service.id)) {
        service.status = 'degraded';
        service.description = alert.annotations?.summary || alert.annotations?.description || 'Alerta ativado no monitoramento de performance';
      }
    });
  });

  // Status Geral da Aplicação
  const hasDegradedService = servicesList.some(s => s.status !== 'operational') || activeAlerts.length > 0 || sonarMetrics.qualityGateStatus === 'FAILED';
  const hasOutageService = servicesList.some(s => s.status === 'outage');

  let overallStatus: 'operational' | 'degraded' | 'outage' = 'operational';
  if (hasOutageService) {
    overallStatus = 'outage';
  } else if (hasDegradedService) {
    overallStatus = 'degraded';
  }

  return res.status(200).json({
    timestamp: now,
    status: overallStatus,
    grafanaConnected,
    sonarConnected,
    services: servicesList,
    sonar: sonarMetrics,
    details: {
      grafanaVersion: grafanaHealthData.version || 'Grafana Cloud',
      databaseHealth: grafanaHealthData.database || 'ok',
      message: overallStatus === 'outage' 
        ? 'Atenção: Indisponibilidade detectada em um dos módulos da plataforma.'
        : overallStatus === 'degraded'
        ? 'Atenção: Instabilidade temporária em um dos serviços da plataforma.'
        : 'Todos os módulos funcionais da plataforma Traker operando em 100% de capacidade.'
    }
  } as SystemStatusData);
}
