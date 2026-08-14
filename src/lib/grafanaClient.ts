export interface GrafanaHealthAndAlertsResult {
  grafanaConnected: boolean;
  healthData: {
    database?: string;
    version?: string;
    [key: string]: any;
  };
  activeAlerts: Array<{
    labels?: { alertname?: string; [key: string]: any };
    annotations?: { summary?: string; description?: string; [key: string]: any };
    state?: string;
    [key: string]: any;
  }>;
}

/**
 * Utilitário compartilhado para consultar a API de Saúde e Alertas do Grafana Cloud.
 */
export async function fetchGrafanaHealthAndAlerts(
  grafanaUrl: string,
  grafanaToken?: string
): Promise<GrafanaHealthAndAlertsResult> {
  if (!grafanaToken) {
    return {
      grafanaConnected: false,
      healthData: {},
      activeAlerts: []
    };
  }

  const cleanUrl = grafanaUrl.replace(/\/$/, '');
  const headers = {
    'Authorization': `Bearer ${grafanaToken}`,
    'Accept': 'application/json'
  };

  let grafanaConnected = false;
  let healthData: any = {};
  let activeAlerts: any[] = [];

  try {
    const healthRes = await fetch(`${cleanUrl}/api/health`, { headers });
    if (healthRes.ok) {
      healthData = await healthRes.json().catch(() => ({}));
      grafanaConnected = true;
    }
  } catch (err) {
    console.warn('Grafana health fetch warning:', err);
  }

  try {
    const alertsRes = await fetch(`${cleanUrl}/api/prometheus/grafana/api/v1/alerts`, { headers });
    if (alertsRes.ok) {
      const alertsData = await alertsRes.json().catch(() => ({}));
      if (alertsData?.data?.alerts && Array.isArray(alertsData.data.alerts)) {
        activeAlerts = alertsData.data.alerts.filter((a: any) => a.state === 'firing');
      }
    }
  } catch (err) {
    console.warn('Grafana alerts fetch warning:', err);
  }

  return {
    grafanaConnected,
    healthData,
    activeAlerts
  };
}
