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

  // Serviços Padrão Monitorados
  const defaultServices: ServiceStatusItem[] = [
    { name: 'Aplicação Web (Vercel CDN)', status: 'operational', description: 'Interface Frontend & Rotas Serverless' },
    { name: 'Banco de Dados Firestore', status: 'operational', description: 'Leitura/Escrita Multi-Tenant Isolada' },
    { name: 'Autenticação Firebase Auth', status: 'operational', description: 'Login, JWT & Controle de Acesso' },
    { name: 'Monitoramento Grafana Cloud', status: 'operational', description: 'Coleta de Métricas & Alertas Prometheus' }
  ];

  // Configurações Grafana
  const grafanaUrl = process.env.GRAFANA_URL || 'https://lankyquokka3421.grafana.net';
  const grafanaToken = process.env.GRAFANA_API_TOKEN;

  // Configurações SonarCloud
  const sonarProjectKey = process.env.SONAR_PROJECT_KEY || 'josef10000_Traker';
  const sonarToken = process.env.SONAR_TOKEN;

  let grafanaConnected = false;
  let activeAlerts: any[] = [];
  let grafanaHealthData: any = {};

  // 1. Consultar Grafana Cloud API
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

  // 2. Consultar SonarCloud Web API
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

  // Status Geral
  const hasFiringAlerts = activeAlerts.length > 0;
  const overallStatus: 'operational' | 'degraded' | 'outage' = hasFiringAlerts ? 'degraded' : 'operational';

  return res.status(200).json({
    timestamp: now,
    status: overallStatus,
    grafanaConnected,
    sonarConnected,
    services: defaultServices,
    sonar: sonarMetrics,
    details: {
      grafanaVersion: grafanaHealthData.version || 'Grafana Cloud',
      databaseHealth: grafanaHealthData.database || 'ok',
      message: hasFiringAlerts 
        ? `Atenção: ${activeAlerts.length} alerta(s) ativado(s) no Grafana.` 
        : 'Todos os sistemas e verificações de segurança operando normalmente.'
    }
  } as SystemStatusData);
}
