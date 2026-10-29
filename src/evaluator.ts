import type { EvaluationIssue, EvaluationResult, TestRunResult, WorkflowTestConfig } from './types.js';

function getField(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function evaluateRun(config: WorkflowTestConfig, result: TestRunResult): EvaluationResult {
  const issues: EvaluationIssue[] = [];
  let tier1 = 100;
  let tier3 = 100;

  if (!result.ok) {
    tier1 -= 50;
    issues.push({ tier: 'tier1', severity: 'error', check: 'http_ok', message: result.error || `HTTP ${result.status}` });
  }

  if (result.durationMs > (config.timeoutMs ?? 30000)) {
    tier1 -= 25;
    issues.push({ tier: 'tier1', severity: 'error', check: 'timeout', message: `Response exceeded timeout: ${result.durationMs}ms` });
  }

  if (result.output == null || result.output === '') {
    tier1 -= 25;
    issues.push({ tier: 'tier1', severity: 'error', check: 'not_empty', message: 'Output is empty' });
  }

  for (const check of config.tier3Checks ?? []) {
    const actual = getField(result.output, check.field);
    let failed = false;
    switch (check.check) {
      case 'contains':
        failed = !String(actual ?? '').includes(String(check.value ?? ''));
        break;
      case 'not_contains':
        failed = String(actual ?? '').includes(String(check.value ?? ''));
        break;
      case 'min_length':
        failed = String(actual ?? '').length < Number(check.value ?? 0);
        break;
      case 'max_length':
        failed = String(actual ?? '').length > Number(check.value ?? Number.MAX_SAFE_INTEGER);
        break;
      case 'equals':
        failed = actual !== check.value;
        break;
      case 'not_empty':
        failed = actual == null || String(actual) === '';
        break;
    }

    if (failed) {
      tier3 -= check.severity === 'warning' ? 10 : 20;
      issues.push({
        tier: 'tier3',
        severity: check.severity ?? 'error',
        check: check.name,
        message: check.message ?? `Check failed on field ${check.field}`,
      });
    }
  }

  tier1 = Math.max(0, tier1);
  tier3 = Math.max(0, tier3);
  const score = Math.round((tier1 * 0.7) + (tier3 * 0.3));
  const passed = tier1 === 100 && score >= (config.qualityThreshold ?? 85) && !issues.some(i => i.severity === 'error');

  return { passed, score, tier1Score: tier1, tier3Score: tier3, issues };
}
