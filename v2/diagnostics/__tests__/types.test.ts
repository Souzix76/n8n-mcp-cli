import { describe, it, expect } from 'vitest';
import {
  TraceAnalysis,
  TraceNode,
  FailureClassification,
  RegressionReport,
  RegressionEntry,
  DiagnoseResult,
  DiagnoseConfig,
} from '../types.js';

describe('Diagnostics Types', () => {
  it('TraceAnalysis has correct structure', () => {
    const analysis: TraceAnalysis = {
      workflowId: 'wf-1',
      totalNodes: 5,
      executedNodes: 4,
      failedNodes: 1,
      totalDurationMs: 1500,
      nodes: [
        {
          id: 'node-1',
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          status: 'success',
          durationMs: 200,
          inputSize: 1024,
          outputSize: 2048,
          error: null,
        },
        {
          id: 'node-2',
          name: 'Set',
          type: 'n8n-nodes-base.set',
          status: 'error',
          durationMs: 50,
          inputSize: 2048,
          outputSize: 0,
          error: { message: 'Invalid expression', code: 'EXPRESSION_ERROR' },
        },
      ],
      bottlenecks: ['node-1'],
      errorCorrelation: { 'node-2': ['node-1'] },
    };
    expect(analysis.totalNodes).toBe(5);
    expect(analysis.nodes[1].status).toBe('error');
    expect(analysis.bottlenecks).toContain('node-1');
  });

  it('FailureClassification has correct structure', () => {
    const classification: FailureClassification = {
      workflowId: 'wf-1',
      executionId: 'exec-1',
      category: 'infrastructure',
      severity: 'error',
      confidence: 0.9,
      message: 'Connection timeout to external API',
      rootCause: 'Network latency exceeded threshold',
      suggestedActions: ['Increase timeout', 'Add retry policy', 'Check network'],
      relatedNodes: ['node-1'],
    };
    expect(classification.category).toBe('infrastructure');
    expect(classification.severity).toBe('error');
    expect(classification.confidence).toBeGreaterThan(0.8);
  });

  it('RegressionReport has correct structure', () => {
    const report: RegressionReport = {
      workflowId: 'wf-1',
      currentRun: {
        executionId: 'exec-10',
        status: 'error',
        score: 45,
        failedNodes: ['node-3'],
        timestamp: '2026-10-29T10:00:00Z',
      },
      history: [
        { executionId: 'exec-9', status: 'success', score: 95, failedNodes: [], timestamp: '2026-10-28T10:00:00Z' },
        { executionId: 'exec-8', status: 'success', score: 92, failedNodes: [], timestamp: '2026-10-27T10:00:00Z' },
      ],
      regressions: [
        {
          type: 'new_failure',
          nodeId: 'node-3',
          firstSeen: '2026-10-29T10:00:00Z',
          occurrences: 1,
          severity: 'high',
        },
      ],
      policyDrift: false,
      recommendation: 'Investigate node-3 configuration change',
    };
    expect(report.regressions).toHaveLength(1);
    expect(report.policyDrift).toBe(false);
  });

  it('DiagnoseResult aggregates all analyses', () => {
    const result: DiagnoseResult = {
      workflowId: 'wf-1',
      environment: 'production',
      timestamp: '2026-10-29T10:00:00Z',
      trace: {
        workflowId: 'wf-1',
        totalNodes: 5,
        executedNodes: 4,
        failedNodes: 1,
        totalDurationMs: 1500,
        nodes: [],
        bottlenecks: [],
        errorCorrelation: {},
      },
      classification: {
        workflowId: 'wf-1',
        executionId: 'exec-1',
        category: 'logic',
        severity: 'warning',
        confidence: 0.75,
        message: 'Data validation failed',
        rootCause: 'Missing required field',
        suggestedActions: ['Add validation', 'Check upstream data'],
        relatedNodes: ['node-2'],
      },
      regression: {
        workflowId: 'wf-1',
        currentRun: { executionId: 'exec-1', status: 'error', score: 60, failedNodes: ['node-2'], timestamp: '2026-10-29T10:00:00Z' },
        history: [],
        regressions: [],
        policyDrift: false,
        recommendation: 'No historical data',
      },
      overallHealth: 'degraded',
      recommendations: ['Add field validation at node-2', 'Monitor node-2 error rate'],
    };
    expect(result.overallHealth).toBe('degraded');
    expect(result.recommendations).toHaveLength(2);
  });

  it('DiagnoseConfig matches ConfigSchema exports', () => {
    const config: DiagnoseConfig = {
      trace: { enabled: true, maxNodes: 50, includeTiming: true, includeErrors: true },
      classify: { enabled: true, severityThreshold: 'warning', taxonomy: ['logic', 'infrastructure', 'data'] },
      regression: { enabled: true, historyWindow: 10, recurrenceThreshold: 3 },
    };
    expect(config.trace.maxNodes).toBe(50);
    expect(config.classify.taxonomy).toContain('logic');
    expect(config.regression.historyWindow).toBe(10);
  });
});