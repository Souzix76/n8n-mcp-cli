import { describe, it, expect, beforeEach } from 'vitest';
import { TraceAnalyzer } from '../trace-analyzer.js';
import { ExecutionData, WorkflowSummary } from '../../core/n8n-client.js';

describe('TraceAnalyzer', () => {
  let analyzer: TraceAnalyzer;
  let mockWorkflow: WorkflowSummary;
  let mockExecution: ExecutionData;

  beforeEach(() => {
    analyzer = new TraceAnalyzer();
    mockWorkflow = {
      id: 'wf-1',
      name: 'Test Workflow',
      active: true,
      nodes: ['Start', 'HTTP Request', 'Set', 'IF', 'End'],
    };

    mockExecution = {
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
            IF: [{ data: { main: [{ json: { condition: true } }] } }],
            End: [{ data: { main: [{ json: {} }] } }],
          },
        },
      },
    };
  });

  it('analyzes successful execution trace', async () => {
    const result = await analyzer.analyze(mockWorkflow, mockExecution);

    expect(result.workflowId).toBe('wf-1');
    expect(result.totalNodes).toBe(5);
    expect(result.executedNodes).toBe(5);
    expect(result.failedNodes).toBe(0);
    expect(result.totalDurationMs).toBeGreaterThan(0);
    expect(result.nodes).toHaveLength(5);
    expect(result.bottlenecks).toEqual([]);
    expect(result.errorCorrelation).toEqual({});
  });

  it('detects failed nodes in execution', async () => {
    const failedExecution: ExecutionData = {
      id: 'exec-2',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:05:00Z',
      stoppedAt: '2026-10-29T10:05:03Z',
      data: {
        resultData: {
          runData: {
            Start: [{ data: { main: [{ json: {} }] } }],
            'HTTP Request': [
              { data: { main: [{ json: { error: { message: 'timeout', code: 'ETIMEDOUT' } } }] } },
            ],
            Set: [{ data: { main: [{ json: {} }] } }],
          },
        },
      },
    };

    const result = await analyzer.analyze(mockWorkflow, failedExecution);

    expect(result.failedNodes).toBeGreaterThan(0);
    expect(result.nodes.some((n) => n.status === 'error')).toBe(true);
    const failedNode = result.nodes.find((n) => n.status === 'error');
    expect(failedNode?.error).not.toBeNull();
    expect(failedNode?.error?.message).toContain('timeout');
  });

  it('identifies bottlenecks by duration', async () => {
    const slowExecution: ExecutionData = {
      id: 'exec-slow',
      workflowId: 'wf-1',
      status: 'success',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:10Z',
      data: {
        resultData: {
          runData: {
            Start: [{ data: { main: [{ json: {} }] } }],
            'HTTP Request': [{ data: { main: [{ json: { response: { data: 'ok' } } }] } }],
            Set: [{ data: { main: [{ json: { value: 'processed' } }] } }],
            IF: [{ data: { main: [{ json: { condition: true } }] } }],
            End: [{ data: { main: [{ json: {} }] } }],
          },
        },
      },
    };

    const result = await analyzer.analyze(mockWorkflow, slowExecution);

    expect(result.bottlenecks).toContain('HTTP Request');
  });

  it('correlates errors with upstream nodes', async () => {
    const failedExecution: ExecutionData = {
      id: 'exec-2',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:05:00Z',
      stoppedAt: '2026-10-29T10:05:03Z',
      data: {
        resultData: {
          runData: {
            Start: [{ data: { main: [{ json: {} }] } }],
            'HTTP Request': [
              { data: { main: [{ json: { error: { message: 'timeout', code: 'ETIMEDOUT' } } }] } },
            ],
            Set: [{ data: { main: [{ json: {} }] } }],
          },
        },
      },
    };

    const result = await analyzer.analyze(mockWorkflow, failedExecution);

    expect(result.errorCorrelation).toBeDefined();
    const errorNode = result.nodes.find((n) => n.status === 'error');
    if (errorNode && errorNode.id !== 'Start') {
      expect(result.errorCorrelation[errorNode.id]).toBeDefined();
    }
  });

  it('calculates per-node timing correctly', async () => {
    const result = await analyzer.analyze(mockWorkflow, mockExecution);

    const totalNodeDuration = result.nodes.reduce((sum, n) => sum + n.durationMs, 0);
    expect(totalNodeDuration).toBeLessThanOrEqual(result.totalDurationMs);
  });

  it('handles missing execution data gracefully', async () => {
    const emptyExecution: ExecutionData = {
      id: 'exec-empty',
      workflowId: 'wf-1',
      status: 'success',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:01Z',
      data: { resultData: { runData: {} } },
    };

    const result = await analyzer.analyze(mockWorkflow, emptyExecution);

    expect(result.workflowId).toBe('wf-1');
    expect(result.totalNodes).toBe(5);
    expect(result.executedNodes).toBe(0);
    expect(result.nodes.every((n) => n.status === 'skipped' || n.status === 'waiting')).toBe(true);
  });
});