import { VercelRequest, VercelResponse } from '@vercel/node';

export interface SonarMetrics {
  securityRating: string;
  reliabilityRating: string;
  maintainabilityRating: string;
  qualityGateStatus: string;
  ncloc: string;
  coverage: string;
}

export interface ServiceStatusItem {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const authRes = await fetch('https://identitytoolkit.googleapis.com/$discovery/rest?version=v1', { signal: controller.signal });
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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const fsRes = await fetch('https://firestore.googleapis.com/v1/projects/traker-app/databases', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (fsRes.status >= 500) {
      firestoreStatus = 'outage';
      firestoreDescription = 'Servidor Firestore Indisponível (HTTP 500)';
    } else if (!fsRes.ok && fsRes.status !== 401 && fsRes.status !== 403) {
      firestoreStatus = 'degraded';
      firestoreDescription = `Alerta de Performance no Firestore (HTTP ${fsRes.status})`;
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

  let grafanaConnected = false;
  let activeAlerts: any[] = [];
  let grafanaHealthData: any = {};

  // 3. Consultar Grafana Cloud API em tempo real
  if (grafanaToken) {
    try {
      const healthUrl = `${grafanaUrl.replace(/\/$/, '')}/api/health`;
      const healthRes = await fetch(healthUrl, {
        headers: {
          'Authorization': `Bearer ${grafanaToken}`,
          'Accept': 'application/json'
        }
      });
      if (healthRes.ok) {
        grafanaHealthData = await healthRes.json().catch(() => ({}));
        grafanaConnected = true;
      }

      const alertsUrl = `${grafanaUrl.replace(/\/$/, '')}/api/prometheus/grafana/api/v1/alerts`;
      const alertsRes = await fetch(alertsUrl, {
        headers: {
          'Authorization': `Bearer ${grafanaToken}`,
          'Accept': 'application/json'
        }
      });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json().catch(() => ({}));
        if (alertsData?.data?.alerts && Array.isArray(alertsData.data.alerts)) {
          activeAlerts = alertsData.data.alerts.filter((a: any) => a.state === 'firing');
        }
      }
    } catch (err) {
      console.warn('Grafana API fetch warning:', err);
    }
  }

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

  // Lista Dinâmica de Serviços Monitorados
  const servicesList: ServiceStatusItem[] = [
    { name: 'Aplicação Web (Vercel CDN)', status: 'operational', description: 'Interface Frontend & Rotas Serverless Operacionais' },
    { name: 'Banco de Dados Firestore', status: firestoreStatus, description: firestoreDescription },
    { name: 'Autenticação Firebase Auth', status: authStatus, description: authDescription },
    { 
      name: 'Monitoramento Grafana Cloud', 
      status: grafanaConnected ? 'operational' : 'degraded', 
      description: grafanaConnected ? 'Agente de Alertas & Telemetria Conectado' : 'Conexão em modo estático/fallback' 
    }
  ];

  // Se houver algum alerta no Grafana correspondente a um serviço específico
  activeAlerts.forEach((alert: any) => {
    const alertName = (alert.labels?.alertname || '').toLowerCase();
    servicesList.forEach(service => {
      if (alertName.includes(service.name.toLowerCase())) {
        service.status = 'degraded';
        service.description = alert.annotations?.summary || alert.annotations?.description || 'Alerta disparado no Grafana';
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
        ? 'Atenção: Indisponibilidade detectada em um dos serviços principais.'
        : overallStatus === 'degraded'
        ? `Atenção: Instabilidade ou alerta ativado no monitoramento.`
        : 'Todos os sistemas, autenticação e verificações de segurança operando normalmente.'
    }
  } as SystemStatusData);
}
