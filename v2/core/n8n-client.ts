export interface N8nConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  nodes?: Array<{ name?: string; id?: string; type?: string } | string>;
  tags?: string[];
}

export interface WorkflowListResponse {
  data: WorkflowSummary[];
  nextCursor?: string;
}

export interface ExecutionData {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error' | 'crashed';
  startedAt: string;
  stoppedAt?: string;
  data?: {
    resultData?: {
      runData?: Record<string, unknown[]>;
    };
  } & Record<string, unknown>;
}

export interface ExecuteWorkflowOptions {
  workflowId: string;
  payload?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export class N8nClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: N8nConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text().catch(() => response.statusText);
        throw new Error(`n8n API error: ${response.status} ${error}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getWorkflows(cursor?: string): Promise<WorkflowListResponse> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<WorkflowListResponse>(`/api/v1/workflows${query}`);
  }

  async getWorkflow(id: string): Promise<WorkflowSummary> {
    return this.request<WorkflowSummary>(`/api/v1/workflows/${id}`);
  }

  async executeWorkflow(options: ExecuteWorkflowOptions): Promise<ExecutionData> {
    return this.request<ExecutionData>(`/api/v1/workflows/${options.workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ data: options.payload, options: options.options }),
    });
  }

  async getExecution(id: string): Promise<ExecutionData> {
    return this.request<ExecutionData>(`/api/v1/executions/${id}`);
  }

  async getExecutions(workflowId?: string, limit = 50): Promise<{ data: ExecutionData[] }> {
    const params = new URLSearchParams();
    if (workflowId) params.set('workflowId', workflowId);
    params.set('limit', String(limit));
    return this.request<{ data: ExecutionData[] }>(`/api/v1/executions?${params.toString()}`);
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/healthz`, { signal: AbortSignal.timeout(5000) });
    return response.json() as Promise<{ status: string }>;
  }

  async getVersion(): Promise<{ version: string; source: string }> {
    try {
      const result = await this.request<{ version: string }>('/api/v1/version');
      return { version: result.version, source: 'api' };
    } catch (error) {
      // n8n v1 API doesn't have a version endpoint
      // Try to get version from health check headers or return unknown
      return { 
        version: 'unknown (n8n API does not expose version endpoint)',
        source: 'api-unavailable'
      };
    }
  }
}