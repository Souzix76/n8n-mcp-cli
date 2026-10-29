import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkflowTestConfig } from '../types.js';

// Mock config.getEnv before importing n8n-client
vi.mock('../config.js', () => ({
  getEnv: vi.fn(() => ({
    baseUrl: 'http://localhost:5678',
    apiKey: 'test-api-key',
    defaultTimeoutMs: 30000,
  })),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  testPayload,
  getWorkflow,
  getWorkflowSummary,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  addNodeToWorkflow,
  connectNodes,
  listNodeTypes,
  getNodeType,
  listExecutions,
  getExecution,
  getExecutionTrace,
} from '../n8n-client.js';

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

function textResponse(text: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.reject(new Error('not json')),
  };
}

function makeConfig(overrides: Partial<WorkflowTestConfig> = {}): WorkflowTestConfig {
  return {
    triggerMode: 'webhook',
    webhookPath: '/webhook/test',
    testPayloads: [
      { name: 'default', data: { key: 'value' } },
      { name: 'empty', data: {} },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── testPayload ────────────────────────────────────────────────

describe('testPayload', () => {
  it('sends webhook POST and returns result', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'ok' }));

    const result = await testPayload(makeConfig(), 'default');

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.output).toEqual({ message: 'ok' });
    expect(result.payloadName).toBe('default');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/webhook/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      }),
    );
  });

  it('uses full URL when webhookPath is absolute', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    const config = makeConfig({ webhookPath: 'https://custom.host/hook' });
    await testPayload(config, 'default');
    expect(mockFetch).toHaveBeenCalledWith('https://custom.host/hook', expect.anything());
  });

  it('prepends slash when webhookPath has no leading slash', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    const config = makeConfig({ webhookPath: 'webhook/test' });
    await testPayload(config, 'default');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:5678/webhook/test', expect.anything());
  });

  it('uses execute mode when triggerMode is execute', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: 'result' }));
    const config = makeConfig({
      triggerMode: 'execute',
      workflowId: 'wf-123',
    });

    const result = await testPayload(config, 'default');

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/api/v1/workflows/wf-123/execute',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-N8N-API-KEY': 'test-api-key' }),
        body: JSON.stringify({ inputData: { key: 'value' } }),
      }),
    );
  });

  it('throws when payload name not found', async () => {
    await expect(testPayload(makeConfig(), 'nonexistent')).rejects.toThrow('Payload not found');
  });

  it('returns error when webhook mode lacks webhookPath', async () => {
    const config = makeConfig({ webhookPath: undefined });
    const result = await testPayload(config, 'default');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('webhookPath is required');
  });

  it('returns error when execute mode lacks workflowId', async () => {
    const config = makeConfig({ triggerMode: 'execute', workflowId: undefined });
    const result = await testPayload(config, 'default');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('workflowId is required');
  });

  it('returns error result on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await testPayload(makeConfig(), 'default');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('Network error');
    expect(result.output).toBeNull();
  });

  it('returns error result on non-Error throw', async () => {
    mockFetch.mockRejectedValue('string error');
    const result = await testPayload(makeConfig(), 'default');
    expect(result.error).toBe('string error');
  });

  it('handles non-ok HTTP response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'bad' }, 500));
    const result = await testPayload(makeConfig(), 'default');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it('handles empty response body via safeJson', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });
    const result = await testPayload(makeConfig(), 'default');
    expect(result.output).toBeNull();
  });

  it('falls back to text when response is not valid JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('plain text response'),
    });
    const result = await testPayload(makeConfig(), 'default');
    expect(result.output).toBe('plain text response');
  });
});

// ── getWorkflow ────────────────────────────────────────────────

describe('getWorkflow', () => {
  it('fetches workflow by ID', async () => {
    const workflow = { id: 'wf-1', name: 'Test', nodes: [] };
    mockFetch.mockResolvedValue(jsonResponse(workflow));
    const result = await getWorkflow('wf-1');
    expect(result).toEqual(workflow);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/api/v1/workflows/wf-1',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-N8N-API-KEY': 'test-api-key' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 404));
    await expect(getWorkflow('bad-id')).rejects.toThrow('n8n API returned 404');
  });
});

// ── getWorkflowSummary ─────────────────────────────────────────

describe('getWorkflowSummary', () => {
  it('returns summary with node details', async () => {
    const workflow = {
      id: 'wf-1',
      name: 'My Workflow',
      active: true,
      nodes: [
        { name: 'Start', type: 'n8n-nodes-base.start', disabled: false },
        { name: 'HTTP', type: 'n8n-nodes-base.httpRequest', disabled: true },
      ],
    };
    mockFetch.mockResolvedValue(jsonResponse(workflow));
    const summary = await getWorkflowSummary('wf-1');
    expect(summary.id).toBe('wf-1');
    expect(summary.name).toBe('My Workflow');
    expect(summary.active).toBe(true);
    expect(summary.nodeCount).toBe(2);
    expect(summary.nodes[1].disabled).toBe(true);
  });

  it('handles workflow with no nodes array', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'wf-1', name: 'Empty' }));
    const summary = await getWorkflowSummary('wf-1');
    expect(summary.nodeCount).toBe(0);
    expect(summary.nodes).toEqual([]);
  });
});

// ── createWorkflow ─────────────────────────────────────────────

describe('createWorkflow', () => {
  it('posts workflow and returns response', async () => {
    const created = { id: 'new-1', name: 'Created' };
    mockFetch.mockResolvedValue(jsonResponse(created));
    const result = await createWorkflow({ name: 'Created', nodes: [] });
    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/api/v1/workflows',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on failure', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 400));
    await expect(createWorkflow({})).rejects.toThrow('n8n API returned 400');
  });
});

// ── updateWorkflow ─────────────────────────────────────────────

describe('updateWorkflow', () => {
  it('puts workflow update', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'wf-1', updated: true }));
    const result = await updateWorkflow('wf-1', { name: 'Updated' });
    expect(result.updated).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/api/v1/workflows/wf-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

// ── deleteWorkflow ─────────────────────────────────────────────

describe('deleteWorkflow', () => {
  it('deletes workflow and returns confirmation', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    const result = await deleteWorkflow('wf-1');
    expect(result).toEqual({ deleted: true, workflowId: 'wf-1' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/api/v1/workflows/wf-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on failure', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 404));
    await expect(deleteWorkflow('bad')).rejects.toThrow('n8n API returned 404');
  });
});

// ── addNodeToWorkflow ──────────────────────────────────────────

describe('addNodeToWorkflow', () => {
  it('appends node to existing workflow', async () => {
    const existing = { id: 'wf-1', nodes: [{ name: 'Start' }] };
    const updated = { id: 'wf-1', nodes: [{ name: 'Start' }, { name: 'New' }] };
    mockFetch
      .mockResolvedValueOnce(jsonResponse(existing)) // getWorkflow
      .mockResolvedValueOnce(jsonResponse(updated));  // updateWorkflow
    const result = await addNodeToWorkflow('wf-1', { name: 'New' });
    expect(result.nodes).toHaveLength(2);
  });

  it('handles workflow with no nodes array', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ id: 'wf-1' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'wf-1', nodes: [{ name: 'New' }] }));
    const result = await addNodeToWorkflow('wf-1', { name: 'New' });
    expect(result.nodes).toHaveLength(1);
  });
});

// ── connectNodes ───────────────────────────────────────────────

describe('connectNodes', () => {
  it('creates connection between two nodes', async () => {
    const workflow = { id: 'wf-1', connections: {} };
    mockFetch
      .mockResolvedValueOnce(jsonResponse(workflow))
      .mockResolvedValueOnce(jsonResponse({ ...workflow, connections: { Source: { main: [[{ node: 'Target', type: 'main', index: 0 }]] } } }));

    const result = await connectNodes('wf-1', 'Source', 'Target');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Verify the PUT body contains the connection
    const putCall = mockFetch.mock.calls[1];
    const body = JSON.parse(putCall[1].body);
    expect(body.connections.Source.main[0]).toContainEqual(
      expect.objectContaining({ node: 'Target', type: 'main', index: 0 }),
    );
  });

  it('adds to existing connections', async () => {
    const workflow = {
      id: 'wf-1',
      connections: {
        Source: { main: [[{ node: 'Existing', type: 'main', index: 0 }]] },
      },
    };
    mockFetch
      .mockResolvedValueOnce(jsonResponse(workflow))
      .mockResolvedValueOnce(jsonResponse({}));

    await connectNodes('wf-1', 'Source', 'NewTarget');
    const putBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(putBody.connections.Source.main[0]).toHaveLength(2);
  });

  it('pads array when sourceIndex is beyond current length', async () => {
    const workflow = { id: 'wf-1', connections: {} };
    mockFetch
      .mockResolvedValueOnce(jsonResponse(workflow))
      .mockResolvedValueOnce(jsonResponse({}));

    await connectNodes('wf-1', 'Source', 'Target', 2, 0);
    const putBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    // Should have empty arrays at index 0, 1 and the connection at index 2
    expect(putBody.connections.Source.main).toHaveLength(3);
    expect(putBody.connections.Source.main[0]).toEqual([]);
    expect(putBody.connections.Source.main[1]).toEqual([]);
    expect(putBody.connections.Source.main[2]).toContainEqual(
      expect.objectContaining({ node: 'Target' }),
    );
  });

  it('handles workflow with null connections', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ id: 'wf-1', connections: null }))
      .mockResolvedValueOnce(jsonResponse({}));

    await connectNodes('wf-1', 'A', 'B');
    const putBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(putBody.connections.A).toBeDefined();
  });
});

// ── listNodeTypes ──────────────────────────────────────────────

describe('listNodeTypes', () => {
  it('returns mapped node types from data wrapper', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      data: [
        { name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP', group: ['transform'], version: 1, description: 'Make HTTP requests' },
      ],
    }));
    const result = await listNodeTypes();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('n8n-nodes-base.httpRequest');
    expect(result[0].displayName).toBe('HTTP');
  });

  it('handles direct array response', async () => {
    mockFetch.mockResolvedValue(jsonResponse([
      { name: 'node1', displayName: 'Node 1', group: [], version: 1, description: 'desc' },
    ]));
    const result = await listNodeTypes();
    expect(result).toHaveLength(1);
  });

  it('handles empty/unexpected response shape', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ something: 'else' }));
    const result = await listNodeTypes();
    expect(result).toEqual([]);
  });
});

// ── getNodeType ────────────────────────────────────────────────

describe('getNodeType', () => {
  it('fetches node type with encoded name', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ name: 'n8n-nodes-base.httpRequest' }));
    await getNodeType('n8n-nodes-base.httpRequest');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('n8n-nodes-base.httpRequest'),
      expect.anything(),
    );
  });
});

// ── listExecutions ─────────────────────────────────────────────

describe('listExecutions', () => {
  it('lists executions with default params', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }));
    await listExecutions();
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('limit=20');
  });

  it('applies workflowId and status filters', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }));
    await listExecutions('wf-1', 10, 'success');
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('workflowId=wf-1');
    expect(url).toContain('limit=10');
    expect(url).toContain('status=success');
  });
});

// ── getExecution ───────────────────────────────────────────────

describe('getExecution', () => {
  it('fetches execution by ID', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'exec-1', finished: true }));
    const result = await getExecution('exec-1');
    expect(result.id).toBe('exec-1');
  });
});

// ── getExecutionTrace ──────────────────────────────────────────

describe('getExecutionTrace', () => {
  it('extracts trace from data.resultData.runData', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      id: 'exec-1',
      finished: true,
      mode: 'manual',
      status: 'success',
      data: {
        resultData: {
          runData: {
            Start: [{ startTime: '2024-01-01', executionTime: 10, data: { main: [[{ json: {} }]] } }],
            HTTP: [
              { startTime: '2024-01-01', executionTime: 5, error: null, data: { main: [[{ json: {} }, { json: {} }]] } },
              { startTime: '2024-01-02', executionTime: 15, error: null, data: { main: [[{ json: {} }]] } },
            ],
          },
        },
      },
    }));

    const trace = await getExecutionTrace('exec-1');
    expect(trace.id).toBe('exec-1');
    expect(trace.finished).toBe(true);
    expect(trace.trace).toHaveLength(2);

    const httpTrace = trace.trace.find((t: any) => t.nodeName === 'HTTP');
    expect(httpTrace!.runs).toBe(2);
    expect(httpTrace!.lastRunSummary.items).toBe(1); // last run has 1 item
  });

  it('handles fallback path resultData.runData (no data wrapper)', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      id: 'exec-2',
      finished: false,
      resultData: {
        runData: {
          Node1: [{ startTime: '2024-01-01', executionTime: 100, error: { message: 'fail' }, data: {} }],
        },
      },
    }));

    const trace = await getExecutionTrace('exec-2');
    expect(trace.trace).toHaveLength(1);
    expect(trace.trace[0].lastRunSummary.hasError).toBe(true);
  });

  it('handles empty execution data', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      id: 'exec-3',
      finished: true,
    }));

    const trace = await getExecutionTrace('exec-3');
    expect(trace.trace).toEqual([]);
  });

  it('handles node with no runs', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      id: 'exec-4',
      data: { resultData: { runData: { EmptyNode: 'not-an-array' } } },
    }));

    const trace = await getExecutionTrace('exec-4');
    const node = trace.trace.find((t: any) => t.nodeName === 'EmptyNode');
    expect(node!.runs).toBe(0);
    expect(node!.lastRunSummary).toBeNull();
  });
});
