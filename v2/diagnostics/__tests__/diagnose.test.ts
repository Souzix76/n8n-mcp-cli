import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiagnoseEngine } from '../diagnose.js';
import { N8nClient } from '../../core/n8n-client.js';
import type { ExecutionData, WorkflowSummary } from '../../core/n8n-client.js';
import type { DiagnoseResult, DiagnoseConfig, RegressionReport } from '../types.js';

describe('DiagnoseEngine', () => {
  let mockClient: {
    getWorkflow: ReturnType<typeof vi.fn>;
    getExecution: ReturnType<typeof vi.fn>;
    getExecutions: ReturnType<typeof vi.fn>;
    healthCheck: ReturnType<typeof vi.fn>;
  };
  let defaultWorkflow: WorkflowSummary;
  let defaultExecution: ExecutionData;
  let defaultHistory: ExecutionData[];

  beforeEach(() => {
    defaultWorkflow = {
      id: 'wf-1',
      name: 'Test Workflow',
      active: true,
      nodes: ['Start', 'HTTP Request', 'Set', 'End'],
    };

    defaultExecution = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'success',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            Start: [{ data: { main: [{ json: {} }] } }],
            'HTTP Request': [{ data: { main: [{ json: { response: { data: 'ok' } } }] } }],
            Set: [{ data: { main: [{ json: { value: 'processed' } }] } }],
            End: [{ data: { main: [{ json: {} }] } }],
          },
        },
      },
    };

    // Create 10 historical executions for regression detection
    defaultHistory = [];
    for (let i = 0; i < 10; i++) {
      defaultHistory.push({
        id: `exec-hist-${i}`,
        workflowId: 'wf-1',
        status: 'success',
        startedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        stoppedAt: new Date(Date.now() - (i + 1) * 86400000 + 1000).toISOString(),
        data: {
          resultData: {
            runData: {
              'HTTP Request': [{ status: 'success', executionTime: 100 }],
              Set: [{ status: 'success', executionTime: 50 }],
            },
          },
        },
      } as ExecutionData);
    }

    mockClient = {
      getWorkflow: vi.fn().mockResolvedValue(defaultWorkflow),
      getExecution: vi.fn().mockResolvedValue(defaultExecution),
      getExecutions: vi.fn().mockResolvedValue({ data: defaultHistory }),
      healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }),
    };
  });

  describe('diagnose', () => {
    it('returns healthy result for successful execution with no issues', async () => {
      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-1');

      expect(result.workflowId).toBe('wf-1');
      expect(result.environment).toBe('production');
      expect(result.timestamp).toBeDefined();
      expect(result.overallHealth).toBe('healthy');
      expect(result.trace).toBeDefined();
      expect(result.trace.totalNodes).toBe(4);
      expect(result.classification).toBeDefined();
      expect(result.regression).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('returns critical for crashed execution', async () => {
      const crashedExecution: ExecutionData = {
        ...defaultExecution,
        id: 'exec-crashed',
        status: 'crashed',
      };
      mockClient.getExecution = vi.fn().mockResolvedValue(crashedExecution);

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-crashed');

      expect(result.overallHealth).toBe('critical');
    });

    it('returns degraded for error execution', async () => {
      const failedExecution: ExecutionData = {
        ...defaultExecution,
        id: 'exec-failed',
        status: 'error',
        data: {
          resultData: {
            runData: {
              Start: [{ data: { main: [{ json: {} }] } }],
              'HTTP Request': [
                { data: { main: [{ json: { error: { message: 'timeout', code: 'ETIMEDOUT' } } }] } },
              ],
              Set: [{ data: { main: [{ json: {} }] } }],
              End: [{ data: { main: [{ json: {} }] } }],
            },
          },
        },
      };
      mockClient.getExecution = vi.fn().mockResolvedValue(failedExecution);

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-failed');

      expect(result.overallHealth).toBe('degraded');
      expect(result.classification.message).toContain('timeout');
    });

    it('includes classification suggested actions in recommendations', async () => {
      const failedExecution: ExecutionData = {
        ...defaultExecution,
        id: 'exec-failed',
        status: 'error',
        data: {
          resultData: {
            runData: {
              Start: [{ data: { main: [{ json: {} }] } }],
              'HTTP Request': [
                { data: { main: [{ json: { error: { message: 'connection refused', code: 'ECONNREFUSED' } } }] } },
              ],
            },
          },
        },
      };
      mockClient.getExecution = vi.fn().mockResolvedValue(failedExecution);

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-failed');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('service')
      );
    });

    it('includes bottleneck optimization in recommendations', async () => {
      // HTTP Request node will be identified as bottleneck due to 5x weight multiplier
      const slowExecution: ExecutionData = {
        ...defaultExecution,
        id: 'exec-slow',
        startedAt: '2026-10-29T10:00:00Z',
        stoppedAt: '2026-10-29T10:00:10Z',
      };
      mockClient.getExecution = vi.fn().mockResolvedValue(slowExecution);

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-slow');

      expect(result.trace.bottlenecks.length).toBeGreaterThan(0);
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('bottleneck')
      );
    });

    it('includes regression investigation in recommendations', async () => {
      // Create flaky node history
      const flakyHistory = defaultHistory.map((h, i) => ({
        ...h,
        id: `exec-flaky-${i}`,
        data: {
          resultData: {
            runData: {
              'HTTP Request': [
                {
                  status: i < 3 ? 'error' : 'success',
                  executionTime: 100,
                  error: i < 3 ? { message: 'timeout', code: 'ETIMEDOUT' } : undefined,
                },
              ],
            },
          },
        },
      }));
      mockClient.getExecutions = vi.fn().mockResolvedValue({ data: flakyHistory });

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-1');

      expect(result.regression.flakyNodes || []).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ nodeId: 'HTTP Request' }),
        ])
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Investigate')
      );
    });

    it('respects DiagnoseConfig to disable modules', async () => {
      const config: DiagnoseConfig = {
        trace: { enabled: false, maxNodes: 50, includeTiming: false, includeErrors: false },
        classify: { enabled: false, severityThreshold: 'error', taxonomy: ['logic'] },
        regression: { enabled: false, historyWindow: 10, recurrenceThreshold: 3 },
      };

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-1', config);

      expect(result.overallHealth).toBe('healthy');
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Monitor')
        ])
      );
    });

    it('handles empty execution data gracefully', async () => {
      const emptyExecution: ExecutionData = {
        id: 'exec-empty',
        workflowId: 'wf-1',
        status: 'success',
        startedAt: '2026-10-29T10:00:00Z',
        stoppedAt: '2026-10-29T10:00:01Z',
        data: { resultData: { runData: {} } },
      };
      mockClient.getExecution = vi.fn().mockResolvedValue(emptyExecution);

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-empty');

      expect(result.overallHealth).toBe('healthy');
      expect(result.trace.totalNodes).toBe(4);
      expect(result.trace.executedNodes).toBe(0);
    });

    it('populates DiagnoseResult with all required fields', async () => {
      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result: DiagnoseResult = await engine.diagnose('wf-1', 'exec-1');

      expect(result.workflowId).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.trace).toBeDefined();
      expect(result.classification).toBeDefined();
      expect(result.regression).toBeDefined();
      expect(result.overallHealth).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('transforms regression detector output to RegressionReport shape', async () => {
      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-1');

      const regression = result.regression as RegressionReport;
      expect(regression.workflowId).toBe('wf-1');
      expect(regression.currentRun).toBeDefined();
      expect(regression.currentRun.executionId).toBe('exec-1');
      expect(regression.history).toBeDefined();
      expect(regression.regressions).toBeDefined();
      expect(regression.policyDrift).toBeDefined();
      expect(regression.recommendation).toBeDefined();
    });

    it('passes config defaults when config not provided', async () => {
      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-1');

      // Should work with default config (all modules enabled)
      expect(result.overallHealth).toBe('healthy');
    });

    it('includes environment from health check', async () => {
      mockClient.healthCheck = vi.fn().mockResolvedValue({ status: 'ok' });

      const engine = new DiagnoseEngine(mockClient as unknown as N8nClient);
      const result = await engine.diagnose('wf-1', 'exec-1');

      expect(result.environment).toBe('production');
    });
  });
});
