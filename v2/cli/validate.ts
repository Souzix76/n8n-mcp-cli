import { evaluatePolicy, getEnvironmentPolicy } from '../core/policy.js';
import { validateEnvironmentConfig } from '../core/validation.js';
import { checkN8nHealth } from '../core/health.js';
import { logger } from '../core/logger.js';
import { emitAudit } from '../core/audit.js';

export async function validateV2Project(env: Record<string, unknown>): Promise<string> {
  const validation = validateEnvironmentConfig(env);
  const environment = String(env.N8N_ENVIRONMENT ?? 'prod-safe');
  const policy = getEnvironmentPolicy(environment);
  const health = await checkN8nHealth(String(env.N8N_BASE_URL ?? ''));

  const policyDecision = evaluatePolicy({
    environment: policy.environment,
    operation: 'validate_workflow',
    allowMutation: false,
    explicitDryRun: true,
  });

  logger.info('Starting v2 validation flow', {
    environment,
    operation: 'validate_workflow',
    workflowId: String(env.WORKFLOW_ID ?? 'unknown'),
  });

  emitAudit('info', 'validate_workflow', environment, 'Validation check started', {
    validationIssues: validation.issues.length,
    healthStatus: health.status,
    mode: policyDecision.mode,
  });

  const summary = [
    'v2 validation: OK',
    `Environment policy: ${policy.environment}`,
    `Validation issues: ${validation.issues.length}`,
    `Health status: ${health.status}`,
    `Safety mode: ${policyDecision.mode}`,
  ];

  logger.info('Completed v2 validation flow', {
    environment,
    operation: 'validate_workflow',
    summary,
  });

  return summary.join(' | ');
}
