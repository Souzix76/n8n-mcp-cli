export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface HealthCheckResult {
  status: ServiceHealthStatus;
  latencyMs?: number;
  message: string;
}

export async function checkN8nHealth(baseUrl: string): Promise<HealthCheckResult> {
  const normalizedUrl = (baseUrl || '').replace(/\/$/, '');

  if (!normalizedUrl) {
    return {
      status: 'unavailable',
      message: 'N8N_BASE_URL is not configured.',
    };
  }

  try {
    const startedAt = Date.now();
    const response = await fetch(`${normalizedUrl}/healthz`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }).catch(() => null);

    const latencyMs = Date.now() - startedAt;

    if (!response || !response.ok) {
      return {
        status: 'degraded',
        latencyMs,
        message: 'n8n responded with an unhealthy or unreachable status.',
      };
    }

    return {
      status: 'healthy',
      latencyMs,
      message: 'n8n health check passed.',
    };
  } catch {
    return {
      status: 'unavailable',
      message: 'n8n health check could not be completed.',
    };
  }
}
