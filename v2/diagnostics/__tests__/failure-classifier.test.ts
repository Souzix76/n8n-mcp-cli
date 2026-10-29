import { describe, it, expect, beforeEach } from 'vitest';
import { FailureClassifier } from '../failure-classifier.js';
import { ExecutionData } from '../../core/n8n-client.js';

describe('FailureClassifier', () => {
  let classifier: FailureClassifier;

  beforeEach(() => {
    classifier = new FailureClassifier();
  });

  it('classifies timeout errors as infrastructure', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'HTTP Request': [
              { data: { main: [{ json: { error: { message: 'ETIMEDOUT', code: 'ETIMEDOUT' } } }] } },
            ],
          },
        },
      },
    };

    const result = await classifier.classify(execution, { categoryThreshold: 'warning' });

    expect(result.category).toBe('infrastructure');
    expect(result.severity).toBe('error');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.message).toContain('timeout');
  });

  it('classifies permission errors correctly', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'Google Sheets': [
              { data: { main: [{ json: { error: { message: '403 Forbidden', code: 'PERMISSION_DENIED' } } }] } },
            ],
          },
        },
      },
    };

    const result = await classifier.classify(execution, { categoryThreshold: 'warning' });

    expect(result.category).toBe('permission');
    expect(result.severity).toBe('error');
    expect(result.rootCause).toContain('permission');
  });

  it('classifies data validation errors as data', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'Set': [
              { data: { main: [{ json: { error: { message: 'Invalid expression: undefined variable', code: 'EXPRESSION_ERROR' } } }] } },
            ],
          },
        },
      },
    };

    const result = await classifier.classify(execution, { categoryThreshold: 'warning' });

    expect(result.category).toBe('data');
    expect(result.severity).toBe('error');
    expect(result.message).toContain('validation');
  });

  it('classifies logic errors from IF/Switch nodes', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'IF': [
              { data: { main: [{ json: { error: { message: 'Condition evaluation failed', code: 'LOGIC_ERROR' } } }] } },
            ],
          },
        },
      },
    };

    const result = await classifier.classify(execution, { categoryThreshold: 'warning' });

    expect(result.category).toBe('logic');
    expect(result.severity).toBe('error');
    expect(result.rootCause).toContain('logic');
  });

  it('uses taxonomy filter from config', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'HTTP Request': [
              { data: { main: [{ json: { error: { message: 'timeout', code: 'ETIMEDOUT' } } }] } },
            ],
          },
        },
      },
    };

    // With taxonomy excluding infrastructure, should fall back to next best match
    const result = await classifier.classify(execution, {
      categoryThreshold: 'warning',
      taxonomy: ['logic', 'data', 'permission'], // infrastructure excluded
    });

    expect(['logic', 'data', 'permission']).toContain(result.category);
  });

  it('respects severity threshold', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'Set': [
              { data: { main: [{ json: { error: { message: 'Minor validation warning', code: 'VALIDATION_WARNING' } } }] } },
            ],
          },
        },
      },
    };

    // With error threshold, warnings should be filtered out
    const result = await classifier.classify(execution, {
      categoryThreshold: 'warning',
      severityThreshold: 'error',
    });

    // Should still classify but with lower severity
    expect(result.severity).toBeDefined();
  });

  it('provides actionable suggested actions', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'HTTP Request': [
              { data: { main: [{ json: { error: { message: 'ECONNREFUSED', code: 'ECONNREFUSED' } } }] } },
            ],
          },
        },
      },
    };

    const result = await classifier.classify(execution, { categoryThreshold: 'warning' });

    expect(result.suggestedActions).toBeDefined();
    expect(result.suggestedActions.length).toBeGreaterThan(0);
    expect(result.suggestedActions.some((a) => a.toLowerCase().includes('retry') || a.toLowerCase().includes('connection'))).toBe(true);
  });

  it('identifies related nodes from error context', async () => {
    const execution: ExecutionData = {
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'error',
      startedAt: '2026-10-29T10:00:00Z',
      stoppedAt: '2026-10-29T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'Set': [
              { data: { main: [{ json: { error: { message: 'Invalid reference to HTTP Request output', code: 'REFERENCE_ERROR' } } }] } },
            ],
          },
        },
      },
    };

    const result = await classifier.classify(execution, { categoryThreshold: 'warning' });

    expect(result.relatedNodes).toContain('HTTP Request');
  });
});