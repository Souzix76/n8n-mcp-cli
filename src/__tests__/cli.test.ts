import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing cli module
const mockReadConfig = vi.fn();
const mockTestPayload = vi.fn();
const mockEvaluateRun = vi.fn();

vi.mock('../config.js', () => ({ readConfig: mockReadConfig }));
vi.mock('../n8n-client.js', () => ({ testPayload: mockTestPayload }));
vi.mock('../evaluator.js', () => ({ evaluateRun: mockEvaluateRun }));

describe('cli', () => {
  const originalArgv = process.argv;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  let consoleOutput: string[];
  let consoleErrors: string[];
  let exitCodes: number[];

  beforeEach(() => {
    consoleOutput = [];
    consoleErrors = [];
    exitCodes = [];
    console.log = vi.fn((...args) => consoleOutput.push(args.join(' ')));
    console.error = vi.fn((...args) => consoleErrors.push(args.join(' ')));
    // Don't throw from process.exit — just record the code
    process.exit = vi.fn((code) => { exitCodes.push(code as number); }) as any;
    mockReadConfig.mockReset();
    mockTestPayload.mockReset();
    mockEvaluateRun.mockReset();
  });

  afterEach(() => {
    process.argv = originalArgv;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  it('exits with error when --config is missing', async () => {
    process.argv = ['node', 'cli.js'];

    vi.resetModules();
    vi.doMock('../config.js', () => ({ readConfig: mockReadConfig }));
    vi.doMock('../n8n-client.js', () => ({ testPayload: mockTestPayload }));
    vi.doMock('../evaluator.js', () => ({ evaluateRun: mockEvaluateRun }));

    await import('../cli.js');
    // Give the async .catch handler time to fire
    await new Promise(r => setTimeout(r, 50));

    expect(exitCodes).toContain(1);
    expect(consoleErrors.some(e => e.includes('--config'))).toBe(true);
  });

  it('runs all payloads when --payload is not specified', async () => {
    process.argv = ['node', 'cli.js', '--config', './test.json'];

    const config = {
      workflowName: 'Test WF',
      triggerMode: 'webhook',
      webhookPath: '/hook',
      testPayloads: [
        { name: 'p1', data: { a: 1 } },
        { name: 'p2', data: { b: 2 } },
      ],
    };
    const runResult = { payloadName: 'p1', ok: true, status: 200, durationMs: 50, output: {} };
    const evalResult = { passed: true, score: 100, tier1Score: 100, tier3Score: 100, issues: [] };

    mockReadConfig.mockReturnValue(config);
    mockTestPayload.mockResolvedValue(runResult);
    mockEvaluateRun.mockReturnValue(evalResult);

    vi.resetModules();
    vi.doMock('../config.js', () => ({ readConfig: mockReadConfig }));
    vi.doMock('../n8n-client.js', () => ({ testPayload: mockTestPayload }));
    vi.doMock('../evaluator.js', () => ({ evaluateRun: mockEvaluateRun }));

    await import('../cli.js');
    await new Promise(r => setTimeout(r, 50));

    expect(mockReadConfig).toHaveBeenCalledWith('./test.json');
    expect(mockTestPayload).toHaveBeenCalledTimes(2);
    expect(mockEvaluateRun).toHaveBeenCalledTimes(2);

    const output = JSON.parse(consoleOutput[0]);
    expect(output.workflow).toBe('Test WF');
    expect(output.mode).toBe('webhook');
    expect(output.results).toHaveLength(2);
  });

  it('runs single payload when --payload is specified', async () => {
    process.argv = ['node', 'cli.js', '--config', './test.json', '--payload', 'p1'];

    const config = {
      workflowName: 'Test WF',
      triggerMode: 'execute',
      workflowId: 'wf-1',
      testPayloads: [
        { name: 'p1', data: {} },
        { name: 'p2', data: {} },
      ],
    };

    mockReadConfig.mockReturnValue(config);
    mockTestPayload.mockResolvedValue({ payloadName: 'p1', ok: true, status: 200, durationMs: 10, output: {} });
    mockEvaluateRun.mockReturnValue({ passed: true, score: 95, tier1Score: 100, tier3Score: 85, issues: [] });

    vi.resetModules();
    vi.doMock('../config.js', () => ({ readConfig: mockReadConfig }));
    vi.doMock('../n8n-client.js', () => ({ testPayload: mockTestPayload }));
    vi.doMock('../evaluator.js', () => ({ evaluateRun: mockEvaluateRun }));

    await import('../cli.js');
    await new Promise(r => setTimeout(r, 50));

    expect(mockTestPayload).toHaveBeenCalledTimes(1);
    expect(mockTestPayload).toHaveBeenCalledWith(config, 'p1');
  });

  it('falls back to workflowId when workflowName is not set', async () => {
    process.argv = ['node', 'cli.js', '--config', './test.json'];

    const config = {
      workflowId: 'wf-abc',
      triggerMode: 'execute',
      testPayloads: [{ name: 'p1', data: {} }],
    };

    mockReadConfig.mockReturnValue(config);
    mockTestPayload.mockResolvedValue({ payloadName: 'p1', ok: true, status: 200, durationMs: 5, output: {} });
    mockEvaluateRun.mockReturnValue({ passed: true, score: 100, tier1Score: 100, tier3Score: 100, issues: [] });

    vi.resetModules();
    vi.doMock('../config.js', () => ({ readConfig: mockReadConfig }));
    vi.doMock('../n8n-client.js', () => ({ testPayload: mockTestPayload }));
    vi.doMock('../evaluator.js', () => ({ evaluateRun: mockEvaluateRun }));

    await import('../cli.js');
    await new Promise(r => setTimeout(r, 50));

    const output = JSON.parse(consoleOutput[0]);
    expect(output.workflow).toBe('wf-abc');
  });

  it('exits with error when main() rejects', async () => {
    process.argv = ['node', 'cli.js', '--config', './test.json'];

    mockReadConfig.mockImplementation(() => { throw new Error('bad config'); });

    vi.resetModules();
    vi.doMock('../config.js', () => ({ readConfig: mockReadConfig }));
    vi.doMock('../n8n-client.js', () => ({ testPayload: mockTestPayload }));
    vi.doMock('../evaluator.js', () => ({ evaluateRun: mockEvaluateRun }));

    await import('../cli.js');
    await new Promise(r => setTimeout(r, 50));

    expect(exitCodes).toContain(1);
    expect(consoleErrors.some(e => e.includes('bad config'))).toBe(true);
  });
});
