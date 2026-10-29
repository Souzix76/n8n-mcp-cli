import { describe, it, expect, vi, beforeEach } from 'vitest';
import { N8nClient } from '../n8n-client.js';

describe('N8nClient', () => {
  let client: N8nClient;
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: 'test-key' });
  });

  it('getWorkflows returns typed workflows', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: '1', name: 'Test', active: true }] })
    });
    const result = await client.getWorkflows();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Test');
  });

  it('executeWorkflow returns execution data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'exec-1', finished: true, data: { result: 'ok' } })
    });
    const result = await client.executeWorkflow('wf-1', { payload: 'test' });
    expect(result.id).toBe('exec-1');
  });

  it('getExecution returns execution data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'exec-1', status: 'success', data: { output: 'done' } })
    });
    const result = await client.getExecution('exec-1');
    expect(result.id).toBe('exec-1');
    expect(result.status).toBe('success');
  });

  it('getExecutions returns execution list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'exec-1' }, { id: 'exec-2' }] })
    });
    const result = await client.getExecutions('wf-1', 10);
    expect(result.data).toHaveLength(2);
  });

  it('healthCheck returns status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
    const result = await client.healthCheck();
    expect(result.status).toBe('ok');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found')
    });
    await expect(client.getWorkflow('missing')).rejects.toThrow('n8n API error: 404 Not Found');
  });

  it('respects timeout config', () => {
    const fastClient = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: 'test', timeout: 5000 });
    // @ts-ignore - accessing private for test
    expect(fastClient.timeout).toBe(5000);
  });
});