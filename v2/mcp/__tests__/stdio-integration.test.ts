import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MCP Server stdio Integration', () => {
  let serverProcess: ChildProcess;
  let requestId = 0;

  beforeAll(() => {
    // Build first
    // Note: This test assumes dist/ is already built
    const serverPath = join(__dirname, '..', '..', '..', 'dist', 'v2', 'mcp', 'stdio-entry.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        N8N_BASE_URL: 'http://localhost:5678',
        N8N_API_KEY: 'test-key',
      },
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('[MCP Server stderr]:', data.toString());
    });
  }, 10000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  function sendRequest(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const request = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      
      const timeout = setTimeout(() => {
        reject(new Error(`Request ${id} timed out`));
      }, 5000);

      function onData(data: Buffer) {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === id) {
              serverProcess.stdout?.off('data', onData);
              clearTimeout(timeout);
              if (response.error) {
                reject(new Error(response.error.message));
              } else {
                resolve(response.result);
              }
              return;
            }
          } catch {
            // Not JSON, ignore
          }
        }
      }

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin?.write(request);
    });
  }

  it('should initialize', async () => {
    const result = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });
    expect(result).toBeDefined();
    expect(result.protocolVersion).toBe('2024-11-05');
  });

  it('should list tools', async () => {
    const result = await sendRequest('tools/list');
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(0);
    
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('validate_workflow');
    expect(toolNames).toContain('get_workflow_health');
    expect(toolNames).toContain('suggest_nodes');
    expect(toolNames).toContain('diagnose_workflow');
    expect(toolNames).toContain('get_n8n_version');
    expect(toolNames).toContain('create_workflow');
  });

  it('should call validate_workflow in read-only mode', async () => {
    const result = await sendRequest('tools/call', {
      name: 'validate_workflow',
      arguments: { workflowId: 'test-wf' },
    });
    expect(result).toBeDefined();
    expect(result.workflowId).toBe('test-wf');
    expect(result.status).toBe('safe-check');
  });

  it('should block create_workflow in read-only mode', async () => {
    await expect(sendRequest('tools/call', {
      name: 'create_workflow',
      arguments: { name: 'Test Workflow' },
    })).rejects.toThrow(/not allowed in read-only/);
  });

  it('should call get_n8n_version', async () => {
    const result = await sendRequest('tools/call', {
      name: 'get_n8n_version',
      arguments: {},
    });
    expect(result).toBeDefined();
    expect(result.version).toBeDefined();
  });
});