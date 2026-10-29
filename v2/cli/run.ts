import { buildDryRunPreview, requiresDryRun } from '../core/dry-run.js';
import { getEnvironmentPolicy } from '../core/policy.js';
import { logger } from '../core/logger.js';
import { emitAudit } from '../core/audit.js';

export async function runV2Suite(environment: string): Promise<string> {
  const policy = getEnvironmentPolicy(environment);
  const preview = buildDryRunPreview('run_suite', environment);
  const dryRunRequired = requiresDryRun('run_suite');

  logger.info('Preparing v2 suite execution', {
    environment,
    operation: 'run_suite',
    dryRunRequired,
    safeMode: policy.defaultMode,
  });

  emitAudit('info', 'run_suite', environment, 'Dry-run suite preview generated', {
    defaultMode: policy.defaultMode,
    dryRunRequired,
    preview,
  });

  return [
    'v2 suite execution scaffold',
    `Environment: ${environment}`,
    `Policy: ${policy.defaultMode}`,
    `Preview: ${preview.preview}`,
    `Mutations allowed: ${String(policy.allowMutations)}`,
    `Dry-run required: ${String(dryRunRequired)}`,
  ].join(' | ');
}
