import { describe, it, expect } from 'vitest';
import {
  EnvironmentPolicySchema,
  HealthCheckSchema,
  TraceConfigSchema,
  ClassifyConfigSchema,
  RegressionConfigSchema,
  DiagnoseConfigSchema,
} from '../config-schema.js';

describe('ConfigSchema', () => {
  it('EnvironmentPolicySchema validates valid policy', () => {
    const valid = {
      readOnly: true,
      dryRun: true,
      allowedMutations: [],
      environment: 'production',
    };
    const result = EnvironmentPolicySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('EnvironmentPolicySchema applies defaults', () => {
    const minimal = { environment: 'staging' };
    const result = EnvironmentPolicySchema.safeParse(minimal);
    expect(result.success).toBe(true);
    expect(result.data.readOnly).toBe(true);
    expect(result.data.dryRun).toBe(true);
    expect(result.data.allowedMutations).toEqual([]);
  });

  it('EnvironmentPolicySchema rejects invalid environment', () => {
    const invalid = { environment: 'invalid' };
    const result = EnvironmentPolicySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('EnvironmentPolicySchema rejects invalid readOnly type', () => {
    const invalid = { environment: 'production', readOnly: 'yes' };
    const result = EnvironmentPolicySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('HealthCheckSchema validates valid config', () => {
    const valid = { endpoint: '/healthz', interval: 30000, timeout: 5000, retries: 3 };
    expect(HealthCheckSchema.safeParse(valid).success).toBe(true);
  });

  it('HealthCheckSchema applies defaults', () => {
    const minimal = { endpoint: '/custom' };
    const result = HealthCheckSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    expect(result.data.interval).toBe(30000);
    expect(result.data.timeout).toBe(5000);
    expect(result.data.retries).toBe(3);
  });

  it('TraceConfigSchema validates valid config', () => {
    const valid = { enabled: true, maxNodes: 100, includeTiming: true, includeErrors: true };
    expect(TraceConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('TraceConfigSchema applies defaults', () => {
    const result = TraceConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.enabled).toBe(true);
    expect(result.data.maxNodes).toBe(100);
    expect(result.data.includeTiming).toBe(true);
    expect(result.data.includeErrors).toBe(true);
  });

  it('ClassifyConfigSchema validates valid config', () => {
    const valid = { enabled: true, severityThreshold: 'warning', taxonomy: ['logic', 'infrastructure'] };
    expect(ClassifyConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('ClassifyConfigSchema applies defaults', () => {
    const result = ClassifyConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.enabled).toBe(true);
    expect(result.data.severityThreshold).toBe('warning');
    expect(result.data.taxonomy).toEqual(['logic', 'infrastructure', 'data', 'permission', 'timeout']);
  });

  it('RegressionConfigSchema validates valid config', () => {
    const valid = { enabled: true, historyWindow: 10, recurrenceThreshold: 3 };
    expect(RegressionConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('RegressionConfigSchema applies defaults', () => {
    const result = RegressionConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.enabled).toBe(true);
    expect(result.data.historyWindow).toBe(10);
    expect(result.data.recurrenceThreshold).toBe(3);
  });

  it('DiagnoseConfigSchema validates full config', () => {
    const valid = {
      trace: { enabled: true, maxNodes: 50 },
      classify: { enabled: true, severityThreshold: 'error' },
      regression: { enabled: false, historyWindow: 5 },
    };
    expect(DiagnoseConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('DiagnoseConfigSchema applies all defaults', () => {
    const result = DiagnoseConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.trace.enabled).toBe(true);
    expect(result.data.classify.severityThreshold).toBe('warning');
    expect(result.data.regression.historyWindow).toBe(10);
  });
});