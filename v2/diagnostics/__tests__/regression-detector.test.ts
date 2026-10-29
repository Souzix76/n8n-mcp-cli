import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegressionDetector } from '../regression-detector.js';
import type { Execution, Workflow, NodeExecution } from '../types.js';

describe('RegressionDetector', () => {
  let detector: RegressionDetector;

  beforeEach(() => {
    detector = new RegressionDetector();
  });

  describe('detectFlakyNodes', () => {
    it('identifies nodes that fail intermittently across executions', () => {
      const executions = createExecutionsWithFlakyNode('http-request-1', 0.3); // 30% failure rate
      const result = detector.detectFlakyNodes(executions, { threshold: 0.2, minRuns: 5 });

      expect(result.flakyNodes).toContainEqual(
        expect.objectContaining({
          nodeId: 'http-request-1',
          failureRate: expect.any(Number),
          totalRuns: expect.any(Number),
        })
      );
      expect(result.flakyNodes[0].failureRate).toBeGreaterThanOrEqual(0.2);
    });

    it('ignores nodes with failure rate below threshold', () => {
      const executions = createExecutionsWithFlakyNode('http-request-1', 0.1); // 10% failure rate
      const result = detector.detectFlakyNodes(executions, { threshold: 0.2, minRuns: 5 });

      expect(result.flakyNodes).toHaveLength(0);
    });

    it('requires minimum number of runs', () => {
      const executions = createExecutionsWithFlakyNode('http-request-1', 0.5, 3); // Only 3 runs
      const result = detector.detectFlakyNodes(executions, { threshold: 0.2, minRuns: 5 });

      expect(result.flakyNodes).toHaveLength(0);
    });

    it('returns empty array for no executions', () => {
      const result = detector.detectFlakyNodes([], { threshold: 0.2, minRuns: 5 });
      expect(result.flakyNodes).toHaveLength(0);
    });
  });

  describe('detectPerformanceDrift', () => {
    it('detects nodes getting slower over time', () => {
      const executions = createExecutionsWithDriftingNode('function-1', 100, 500); // 100ms → 500ms
      const result = detector.detectPerformanceDrift(executions, { thresholdPercent: 50, minRuns: 5 });

      expect(result.driftingNodes).toContainEqual(
        expect.objectContaining({
          nodeId: 'function-1',
          baselineAvgMs: expect.any(Number),
          recentAvgMs: expect.any(Number),
          driftPercent: expect.any(Number),
        })
      );
      expect(result.driftingNodes[0].driftPercent).toBeGreaterThanOrEqual(50);
    });

    it('ignores nodes within threshold', () => {
      const executions = createExecutionsWithDriftingNode('function-1', 100, 130); // 100ms → 130ms (30% drift)
      const result = detector.detectPerformanceDrift(executions, { thresholdPercent: 50, minRuns: 5 });

      expect(result.driftingNodes).toHaveLength(0);
    });

    it('handles nodes with missing timing data', () => {
      const executions = createExecutionsWithoutTiming('function-1');
      const result = detector.detectPerformanceDrift(executions, { thresholdPercent: 50, minRuns: 5 });

      expect(result.driftingNodes).toHaveLength(0);
    });
  });

  describe('detectNewFailures', () => {
    it('identifies nodes that started failing recently', () => {
      const executions = createExecutionsWithNewFailure('webhook-1', 2); // Last 2 executions failed
      const result = detector.detectNewFailures(executions, { window: 5 });

      expect(result.newFailures).toContainEqual(
        expect.objectContaining({
          nodeId: 'webhook-1',
          recentFailureCount: 2,
          windowSize: 5,
        })
      );
    });

    it('ignores nodes with historical failures', () => {
      const executions = createExecutionsWithHistoricalFailure('webhook-1');
      const result = detector.detectNewFailures(executions, { window: 5 });

      expect(result.newFailures).toHaveLength(0);
    });

    it('respects window size', () => {
      const executions = createExecutionsWithNewFailure('webhook-1', 3);
      const result = detector.detectNewFailures(executions, { window: 2 });

      expect(result.newFailures).toHaveLength(0); // Only 2 in window, need 3+
    });
  });

  describe('analyze', () => {
    it('runs all detectors and returns combined report', () => {
      // Use non-overlapping time ranges to avoid interference
      const flakyExecutions = createExecutionsWithFlakyNode('http-request-1', 0.3, 10);
      const driftExecutions = createExecutionsWithDriftingNode('function-1', 100, 500, 10);
      const newFailExecutions = createExecutionsWithNewFailure('webhook-1', 2, 20);

      // Shift flaky executions to be oldest (20-29 days ago)
      const shiftedFlaky = flakyExecutions.map((e, i) => ({
        ...e,
        id: `flaky-${i}`,
        startedAt: new Date(Date.now() - (i + 20) * 86400000).toISOString(),
        stoppedAt: new Date(Date.now() - (i + 20) * 86400000 + 1000).toISOString(),
      }));

      // Shift drift executions to be middle (10-19 days ago)
      const shiftedDrift = driftExecutions.map((e, i) => ({
        ...e,
        id: `drift-${i}`,
        startedAt: new Date(Date.now() - (i + 10) * 86400000).toISOString(),
        stoppedAt: new Date(Date.now() - (i + 10) * 86400000 + 1000).toISOString(),
      }));

      // New fail executions are newest (0-19 days ago) - they already are
      const executions = [...shiftedFlaky, ...shiftedDrift, ...newFailExecutions];

      const result = detector.analyze(executions, {
        flakyThreshold: 0.2,
        driftThresholdPercent: 50,
        newFailureWindow: 5,
        minRuns: 5,
      });

      expect(result.flakyNodes).toHaveLength(1);
      expect(result.driftingNodes).toHaveLength(1);
      expect(result.newFailures).toHaveLength(1);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalNodesAnalyzed).toBeGreaterThan(0);
    });
  });
});

// Helper functions to create test data
function createExecutionsWithFlakyNode(nodeId: string, failureRate: number, runCount = 10): Execution[] {
  const executions: Execution[] = [];
  const failureCount = Math.round(runCount * failureRate);
  for (let i = 0; i < runCount; i++) {
    const shouldFail = i < failureCount; // Deterministic: first N executions fail
    executions.push({
      id: `exec-${i}`,
      workflowId: 'wf-1',
      status: shouldFail ? 'error' : 'success',
      startedAt: new Date(Date.now() - i * 86400000).toISOString(),
      stoppedAt: new Date(Date.now() - i * 86400000 + 1000).toISOString(),
      data: {
        resultData: {
          runData: {
            [nodeId]: [{
              status: shouldFail ? 'error' : 'success',
              error: shouldFail ? { message: 'Random failure', code: 'RANDOM_ERROR' } : undefined,
              executionTime: 100,
            }],
          },
        },
      },
    } as Execution);
  }
  return executions;
}

function createExecutionsWithDriftingNode(nodeId: string, startMs: number, endMs: number, runCount = 10): Execution[] {
  const executions: Execution[] = [];
  for (let i = 0; i < runCount; i++) {
    const progress = i / (runCount - 1);
    const execTime = Math.round(startMs + (endMs - startMs) * progress);
    executions.push({
      id: `exec-${i}`,
      workflowId: 'wf-1',
      status: 'success',
      startedAt: new Date(Date.now() - i * 86400000).toISOString(),
      stoppedAt: new Date(Date.now() - i * 86400000 + execTime).toISOString(),
      data: {
        resultData: {
          runData: {
            [nodeId]: [{
              status: 'success',
              executionTime: execTime,
            }],
          },
        },
      },
    } as Execution);
  }
  return executions;
}

function createExecutionsWithNewFailure(nodeId: string, recentFailureCount: number, totalRuns = 10): Execution[] {
  const executions: Execution[] = [];
  for (let i = 0; i < totalRuns; i++) {
    const isRecentFailure = i < recentFailureCount;
    executions.push({
      id: `exec-${i}`,
      workflowId: 'wf-1',
      status: isRecentFailure ? 'error' : 'success',
      startedAt: new Date(Date.now() - i * 86400000).toISOString(),
      stoppedAt: new Date(Date.now() - i * 86400000 + 1000).toISOString(),
      data: {
        resultData: {
          runData: {
            [nodeId]: [{
              status: isRecentFailure ? 'error' : 'success',
              error: isRecentFailure ? { message: 'New failure', code: 'NEW_ERROR' } : undefined,
              executionTime: 100,
            }],
          },
        },
      },
    } as Execution);
  }
  return executions;
}

function createExecutionsWithHistoricalFailure(nodeId: string): Execution[] {
  const executions: Execution[] = [];
  for (let i = 0; i < 10; i++) {
    const shouldFail = i >= 5; // First 5 (newest) succeeded, last 5 (oldest) failed
    executions.push({
      id: `exec-${i}`,
      workflowId: 'wf-1',
      status: shouldFail ? 'error' : 'success',
      startedAt: new Date(Date.now() - i * 86400000).toISOString(),
      stoppedAt: new Date(Date.now() - i * 86400000 + 1000).toISOString(),
      data: {
        resultData: {
          runData: {
            [nodeId]: [{
              status: shouldFail ? 'error' : 'success',
              error: shouldFail ? { message: 'Historical failure', code: 'OLD_ERROR' } : undefined,
              executionTime: 100,
            }],
          },
        },
      },
    } as Execution);
  }
  return executions;
}

function createExecutionsWithoutTiming(nodeId: string): Execution[] {
  return [{
    id: 'exec-1',
    workflowId: 'wf-1',
    status: 'success',
    startedAt: new Date().toISOString(),
    stoppedAt: new Date().toISOString(),
    data: {
      resultData: {
        runData: {
          [nodeId]: [{
            status: 'success',
            // No executionTime
          }],
        },
      },
    },
  } as Execution];
}