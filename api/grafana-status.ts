import { VercelRequest, VercelResponse } from '@vercel/node';

interface StatusResponse {
  timestamp: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  grafanaConnected: boolean;
  services: {
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    description: string;
  }[];
  details?: {
    grafanaVersion?: string;
    databaseHealth?: string;
    message?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const grafanaUrl = process.env.GRAFANA_URL || 'https://lankyquokka3421.grafana.net';
  const grafanaToken = process.env.GRAFANA_API_TOKEN;

  const now = new Date().toISOString();

  // Lista base de serviços monitorados
  const defaultServices = [
    { name: 'Aplicação Web', status: 'operational' as const, description: 'Interface do Usuário e Frontend' },
    { name: 'Banco de Dados Firestore', status: 'operational' as const, description: 'Leitura e escrita de dados' },
    { name: 'Autenticação Firebase', status: 'operational' as const, description: 'Login e controle de acessos' },
    { name: 'API Serverless Vercel', status: 'operational' as const, description: 'Rotas de integração e rotinas' }
  ];

  if (!grafanaToken) {
    // Caso as credenciais do Grafana não estejam configuradas na Vercel
    return res.status(200).json({
      timestamp: now,
      status: 'operational',
      grafanaConnected: false,
      services: defaultServices,
      details: {
        message: 'Variável GRAFANA_API_TOKEN não configurada na Vercel. Exibindo status padrão.'
      }
    } as StatusResponse);
  }

  try {
    // 1. Consultar a API de Saúde nativa do Grafana (/api/health)
    const healthUrl = `${grafanaUrl.replace(/\/$/, '')}/api/health`;
    const healthRes = await fetch(healthUrl, {
      headers: {
        'Authorization': `Bearer ${grafanaToken}`,
        'Accept': 'application/json'
      }
    });

    let grafanaHealthData: any = {};
    if (healthRes.ok) {
      grafanaHealthData = await healthRes.json().catch(() => ({}));
    }

    // 2. Consultar Alertas Ativos no Grafana Prometheus Alerting (/api/prometheus/grafana/api/v1/alerts)
    const alertsUrl = `${grafanaUrl.replace(/\/$/, '')}/api/prometheus/grafana/api/v1/alerts`;
    const alertsRes = await fetch(alertsUrl, {
      headers: {
        'Authorization': `Bearer ${grafanaToken}`,
        'Accept': 'application/json'
      }
    });

    let activeAlerts: any[] = [];
    if (alertsRes.ok) {
      const alertsData = await alertsRes.json().catch(() => ({}));
      if (alertsData && alertsData.data && Array.isArray(alertsData.data.alerts)) {
        activeAlerts = alertsData.data.alerts.filter((a: any) => a.state === 'firing');
      }
    }

    // Calcular status geral com base no Grafana
    const isGrafanaOk = healthRes.ok && grafanaHealthData.database === 'ok';
    const hasFiringAlerts = activeAlerts.length > 0;

    let overallStatus: 'operational' | 'degraded' | 'outage' = 'operational';
    if (hasFiringAlerts) {
      overallStatus = 'degraded';
    } else if (!isGrafanaOk) {
      overallStatus = 'degraded';
    }

    const updatedServices = defaultServices.map(service => {
      // Se houver algum alerta disparado para o serviço específico
      const alert = activeAlerts.find((a: any) => 
        a.labels && a.labels.alertname && a.labels.alertname.toLowerCase().includes(service.name.toLowerCase())
      );
      if (alert) {
        return {
          ...service,
          status: 'degraded' as const,
          description: alert.annotations?.summary || alert.annotations?.description || 'Alerta ativado no Grafana'
        };
      }
      return service;
    });

    return res.status(200).json({
      timestamp: now,
      status: overallStatus,
      grafanaConnected: true,
      services: updatedServices,
      details: {
        grafanaVersion: grafanaHealthData.version || 'Grafana Cloud',
        databaseHealth: grafanaHealthData.database || 'ok',
        message: hasFiringAlerts 
          ? `Atenção: ${activeAlerts.length} alerta(s) ativado(s) no Grafana.` 
          : 'Todos os sistemas operando normalmente.'
      }
    } as StatusResponse);

  } catch (error: any) {
    console.error('Erro ao comunicar com a API do Grafana:', error);

    return res.status(200).json({
      timestamp: now,
      status: 'operational',
      grafanaConnected: false,
      services: defaultServices,
      details: {
        message: `Falha na conexão com Grafana: ${error.message || 'Erro de rede'}`
      }
    } as StatusResponse);
  }
}
