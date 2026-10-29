import { describe, it, expect } from 'vitest';
import { evaluateRun } from '../evaluator.js';
import type { WorkflowTestConfig, TestRunResult } from '../types.js';

function makeConfig(overrides: Partial<WorkflowTestConfig> = {}): WorkflowTestConfig {
  return {
    triggerMode: 'webhook',
    webhookPath: '/test',
    testPayloads: [{ name: 'default', data: {} }],
    ...overrides,
  };
}

function makeResult(overrides: Partial<TestRunResult> = {}): TestRunResult {
  return {
    payloadName: 'default',
    ok: true,
    status: 200,
    durationMs: 100,
    output: { message: 'hello' },
    ...overrides,
  };
}

describe('evaluateRun', () => {
  describe('tier1 checks', () => {
    it('returns perfect score for a healthy run', () => {
      const result = evaluateRun(makeConfig(), makeResult());
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.tier1Score).toBe(100);
      expect(result.tier3Score).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('deducts 50 points for non-ok response', () => {
      const result = evaluateRun(makeConfig(), makeResult({ ok: false, status: 500 }));
      expect(result.tier1Score).toBe(50);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ tier: 'tier1', check: 'http_ok' }),
      );
    });

    it('deducts 25 points when duration exceeds timeout', () => {
      const config = makeConfig({ timeoutMs: 1000 });
      const result = evaluateRun(config, makeResult({ durationMs: 2000 }));
      expect(result.tier1Score).toBe(75);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ check: 'timeout' }),
      );
    });

    it('uses default 30s timeout when not specified', () => {
      const result = evaluateRun(makeConfig(), makeResult({ durationMs: 31000 }));
      expect(result.tier1Score).toBe(75);
    });

    it('deducts 25 points for null output', () => {
      const result = evaluateRun(makeConfig(), makeResult({ output: null }));
      expect(result.tier1Score).toBe(75);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ check: 'not_empty' }),
      );
    });

    it('deducts 25 points for empty string output', () => {
      const result = evaluateRun(makeConfig(), makeResult({ output: '' }));
      expect(result.tier1Score).toBe(75);
    });

    it('accumulates all tier1 deductions (minimum 0)', () => {
      const config = makeConfig({ timeoutMs: 100 });
      const result = evaluateRun(
        config,
        makeResult({ ok: false, status: 500, durationMs: 200, output: null }),
      );
      expect(result.tier1Score).toBe(0);
      expect(result.issues).toHaveLength(3);
    });
  });

  describe('tier3 checks', () => {
    it('passes contains check', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'has-hello', field: 'message', check: 'contains', value: 'hello' }],
      });
      const result = evaluateRun(config, makeResult({ output: { message: 'hello world' } }));
      expect(result.tier3Score).toBe(100);
    });

    it('fails contains check', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'has-hello', field: 'message', check: 'contains', value: 'goodbye' }],
      });
      const result = evaluateRun(config, makeResult({ output: { message: 'hello world' } }));
      expect(result.tier3Score).toBe(80);
    });

    it('handles not_contains check', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'no-error', field: 'message', check: 'not_contains', value: 'error' }],
      });
      const passing = evaluateRun(config, makeResult({ output: { message: 'ok' } }));
      expect(passing.tier3Score).toBe(100);

      const failing = evaluateRun(config, makeResult({ output: { message: 'error occurred' } }));
      expect(failing.tier3Score).toBe(80);
    });

    it('handles min_length check', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'long-enough', field: 'message', check: 'min_length', value: 5 }],
      });
      const passing = evaluateRun(config, makeResult({ output: { message: 'hello' } }));
      expect(passing.tier3Score).toBe(100);

      const failing = evaluateRun(config, makeResult({ output: { message: 'hi' } }));
      expect(failing.tier3Score).toBe(80);
    });

    it('handles max_length check', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'short-enough', field: 'message', check: 'max_length', value: 5 }],
      });
      const passing = evaluateRun(config, makeResult({ output: { message: 'hi' } }));
      expect(passing.tier3Score).toBe(100);

      const failing = evaluateRun(config, makeResult({ output: { message: 'toolongmessage' } }));
      expect(failing.tier3Score).toBe(80);
    });

    it('handles equals check', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'exact', field: 'status', check: 'equals', value: 'done' }],
      });
      const passing = evaluateRun(config, makeResult({ output: { status: 'done' } }));
      expect(passing.tier3Score).toBe(100);

      const failing = evaluateRun(config, makeResult({ output: { status: 'pending' } }));
      expect(failing.tier3Score).toBe(80);
    });

    it('handles not_empty check', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'has-value', field: 'data', check: 'not_empty' }],
      });
      const passing = evaluateRun(config, makeResult({ output: { data: 'something' } }));
      expect(passing.tier3Score).toBe(100);

      const failing = evaluateRun(config, makeResult({ output: { data: '' } }));
      expect(failing.tier3Score).toBe(80);
    });

    it('deducts 10 points for warning severity', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'warn', field: 'x', check: 'not_empty', severity: 'warning' }],
      });
      const result = evaluateRun(config, makeResult({ output: { x: '' } }));
      expect(result.tier3Score).toBe(90);
    });

    it('supports nested field access with dot notation', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'nested', field: 'a.b.c', check: 'equals', value: 42 }],
      });
      const result = evaluateRun(config, makeResult({ output: { a: { b: { c: 42 } } } }));
      expect(result.tier3Score).toBe(100);
    });

    it('treats missing nested fields as undefined', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'missing', field: 'a.b.c', check: 'not_empty' }],
      });
      const result = evaluateRun(config, makeResult({ output: { a: {} } }));
      expect(result.tier3Score).toBe(80);
    });

    it('contains check with undefined actual value defaults to empty string', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'missing', check: 'contains', value: 'x' }],
      });
      const result = evaluateRun(config, makeResult({ output: {} }));
      expect(result.tier3Score).toBe(80);
    });

    it('not_contains check passes when field is missing', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'missing', check: 'not_contains', value: 'x' }],
      });
      const result = evaluateRun(config, makeResult({ output: {} }));
      expect(result.tier3Score).toBe(100);
    });

    it('min_length check with undefined value defaults to 0', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'msg', check: 'min_length' }],
      });
      const result = evaluateRun(config, makeResult({ output: { msg: '' } }));
      // min_length with value=undefined → Number(undefined)=NaN → 0, empty string length 0 >= 0 → pass
      expect(result.tier3Score).toBe(100);
    });

    it('max_length check with undefined value uses MAX_SAFE_INTEGER', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'msg', check: 'max_length' }],
      });
      const result = evaluateRun(config, makeResult({ output: { msg: 'very long string' } }));
      expect(result.tier3Score).toBe(100);
    });

    it('equals check fails when actual is undefined and value is set', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'missing', check: 'equals', value: 'expected' }],
      });
      const result = evaluateRun(config, makeResult({ output: {} }));
      expect(result.tier3Score).toBe(80);
    });

    it('not_empty check fails when field value is null', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'val', check: 'not_empty' }],
      });
      const result = evaluateRun(config, makeResult({ output: { val: null } }));
      expect(result.tier3Score).toBe(80);
    });

    it('uses default error severity when severity is not specified', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'x', check: 'not_empty' }],
      });
      const result = evaluateRun(config, makeResult({ output: {} }));
      expect(result.issues[0].severity).toBe('error');
      expect(result.tier3Score).toBe(80); // -20 for error
    });

    it('uses default message when check message is not specified', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'check-name', field: 'x.y', check: 'not_empty' }],
      });
      const result = evaluateRun(config, makeResult({ output: {} }));
      expect(result.issues[0].message).toContain('x.y');
    });

    it('uses custom message when provided', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'c', field: 'x', check: 'not_empty', message: 'Custom fail msg' }],
      });
      const result = evaluateRun(config, makeResult({ output: {} }));
      expect(result.issues[0].message).toBe('Custom fail msg');
    });
  });

  describe('scoring formula', () => {
    it('applies 70/30 weighting between tier1 and tier3', () => {
      // tier1 = 100, tier3 = 0 → score = 70
      const config = makeConfig({
        tier3Checks: Array.from({ length: 5 }, (_, i) => ({
          name: `check-${i}`,
          field: 'missing',
          check: 'not_empty' as const,
        })),
      });
      const result = evaluateRun(config, makeResult({ output: {} }));
      expect(result.tier1Score).toBe(100);
      expect(result.tier3Score).toBe(0);
      expect(result.score).toBe(70);
    });
  });

  describe('passed flag', () => {
    it('fails when tier1 is not 100', () => {
      const result = evaluateRun(makeConfig(), makeResult({ ok: false }));
      expect(result.passed).toBe(false);
    });

    it('fails when score is below qualityThreshold', () => {
      const config = makeConfig({
        qualityThreshold: 95,
        tier3Checks: [{ name: 'check', field: 'x', check: 'not_empty' }],
      });
      const result = evaluateRun(config, makeResult({ output: { x: '' } }));
      expect(result.passed).toBe(false);
    });

    it('fails when any error-severity issue exists', () => {
      const config = makeConfig({
        tier3Checks: [{ name: 'err', field: 'x', check: 'not_empty', severity: 'error' }],
      });
      const result = evaluateRun(config, makeResult({ output: { x: '' } }));
      expect(result.passed).toBe(false);
    });

    it('passes with only warning-severity issues if score is high enough', () => {
      const config = makeConfig({
        qualityThreshold: 80,
        tier3Checks: [{ name: 'warn', field: 'x', check: 'not_empty', severity: 'warning' }],
      });
      const result = evaluateRun(config, makeResult({ output: { x: '' } }));
      expect(result.passed).toBe(true);
    });
  });
});
