import type { WorkflowTestConfig, TestRunResult } from './types.js';
import { getEnv } from './config.js';

function buildHeaders() {
  const { apiKey } = getEnv();
  return {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': apiKey,
  };
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function testPayload(config: WorkflowTestConfig, payloadName: string): Promise<TestRunResult> {
  const payload = config.testPayloads.find((p) => p.name === payloadName);
  if (!payload) throw new Error(`Payload not found: ${payloadName}`);

  const { baseUrl, defaultTimeoutMs } = getEnv();
  const timeoutMs = config.timeoutMs ?? defaultTimeoutMs;
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    if (config.triggerMode === 'webhook') {
      if (!config.webhookPath) throw new Error('webhookPath is required in webhook mode');
      const url = config.webhookPath.startsWith('http')
        ? config.webhookPath
        : `${baseUrl}${config.webhookPath.startsWith('/') ? '' : '/'}${config.webhookPath}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
        signal: controller.signal,
      });
    } else {
      if (!config.workflowId) throw new Error('workflowId is required in execute mode');
      response = await fetch(`${baseUrl}/api/v1/workflows/${config.workflowId}/execute`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ inputData: payload.data }),
        signal: controller.signal,
      });
    }

    return {
      payloadName,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - start,
      output: await safeJson(response),
    };
  } catch (error) {
    return {
      payloadName,
      ok: false,
      status: 0,
      durationMs: Date.now() - start,
      output: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getWorkflow(workflowId: string) {
  const { baseUrl } = getEnv();
  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: buildHeaders(),
  });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  return (await response.json()) as any;
}

export async function getWorkflowSummary(workflowId: string) {
  const data = await getWorkflow(workflowId);
  return {
    id: data.id,
    name: data.name,
    active: data.active,
    nodeCount: Array.isArray(data.nodes) ? data.nodes.length : 0,
    nodes: Array.isArray(data.nodes)
      ? data.nodes.map((node: any) => ({ name: node.name, type: node.type, disabled: !!node.disabled }))
      : [],
  };
}

export async function createWorkflow(workflow: Record<string, unknown>) {
  const { baseUrl } = getEnv();
  const response = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(workflow),
  });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  return (await response.json()) as any;
}

export async function updateWorkflow(workflowId: string, workflow: Record<string, unknown>) {
  const { baseUrl } = getEnv();
  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(workflow),
  });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  return (await response.json()) as any;
}

export async function deleteWorkflow(workflowId: string) {
  const { baseUrl } = getEnv();
  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  return { deleted: true, workflowId };
}

export async function addNodeToWorkflow(workflowId: string, node: Record<string, unknown>) {
  const workflow = await getWorkflow(workflowId);
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  workflow.nodes = [...nodes, node];
  return await updateWorkflow(workflowId, workflow);
}

export async function connectNodes(workflowId: string, source: string, target: string, sourceIndex = 0, targetIndex = 0) {
  const workflow = await getWorkflow(workflowId);
  const connections = workflow.connections && typeof workflow.connections === 'object' ? workflow.connections : {};
  const existing = (connections[source] && connections[source].main) ? connections[source].main : [];
  const next = [...existing];
  while (next.length <= sourceIndex) next.push([]);
  next[sourceIndex] = [
    ...(Array.isArray(next[sourceIndex]) ? next[sourceIndex] : []),
    { node: target, type: 'main', index: targetIndex },
  ];
  workflow.connections = { ...connections, [source]: { main: next } };
  return await updateWorkflow(workflowId, workflow);
}

export async function listNodeTypes() {
  const { baseUrl } = getEnv();
  const response = await fetch(`${baseUrl}/api/v1/node-types`, {
    headers: buildHeaders(),
  });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  const data = await response.json() as any;
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return items.map((item: any) => ({
    name: item.name,
    displayName: item.displayName,
    group: item.group,
    version: item.version,
    description: item.description,
  }));
}

export async function getNodeType(nodeType: string) {
  const { baseUrl } = getEnv();
  const response = await fetch(`${baseUrl}/api/v1/node-types/${encodeURIComponent(nodeType)}`, {
    headers: buildHeaders(),
  });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  return await response.json() as any;
}

export async function listExecutions(workflowId?: string, limit = 20, status?: string) {
  const { baseUrl } = getEnv();
  const url = new URL(`${baseUrl}/api/v1/executions`);
  url.searchParams.set('limit', String(limit));
  if (workflowId) url.searchParams.set('workflowId', workflowId);
  if (status) url.searchParams.set('status', status);
  const response = await fetch(url.toString(), { headers: buildHeaders() });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  return await response.json() as any;
}

export async function getExecution(executionId: string) {
  const { baseUrl } = getEnv();
  const response = await fetch(`${baseUrl}/api/v1/executions/${executionId}`, {
    headers: buildHeaders(),
  });
  if (!response.ok) throw new Error(`n8n API returned ${response.status}`);
  return await response.json() as any;
}

export async function getExecutionTrace(executionId: string) {
  const data = await getExecution(executionId);
  const executionData = data?.data?.resultData?.runData ?? data?.resultData?.runData ?? {};
  const trace = Object.entries(executionData).map(([nodeName, runs]) => ({
    nodeName,
    runs: Array.isArray(runs) ? runs.length : 0,
    lastRunSummary: Array.isArray(runs) && runs.length > 0
      ? {
          startTime: (runs as any[])[runs.length - 1]?.startTime,
          executionTime: (runs as any[])[runs.length - 1]?.executionTime,
          hasError: Boolean((runs as any[])[runs.length - 1]?.error),
          items: Array.isArray((runs as any[])[runs.length - 1]?.data?.main?.[0])
            ? (runs as any[])[runs.length - 1].data.main[0].length
            : undefined,
        }
      : null,
  }));
  return {
    id: data.id ?? executionId,
    finished: data.finished,
    mode: data.mode,
    status: data.status,
    trace,
  };
}
