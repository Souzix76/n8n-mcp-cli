export type EnvironmentName = 'dev' | 'staging' | 'prod-safe' | 'production';

export interface PolicyDefinition {
  environment: EnvironmentName;
  defaultMode: 'read-only' | 'dry-run' | 'mutating';
  allowMutations: boolean;
  requireConfirmation: boolean;
  requireDryRun: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  mode: 'read-only' | 'dry-run' | 'mutating';
  reason?: string;
  requiresConfirmation: boolean;
}

export interface PolicyContext {
  environment: EnvironmentName;
  operation: string;
  allowMutation?: boolean;
  explicitDryRun?: boolean;
}

export const environmentPolicies: Record<EnvironmentName, PolicyDefinition> = {
  dev: {
    environment: 'dev',
    defaultMode: 'dry-run',
    allowMutations: false,
    requireConfirmation: false,
    requireDryRun: true,
  },
  staging: {
    environment: 'staging',
    defaultMode: 'dry-run',
    allowMutations: false,
    requireConfirmation: true,
    requireDryRun: true,
  },
  'prod-safe': {
    environment: 'prod-safe',
    defaultMode: 'read-only',
    allowMutations: false,
    requireConfirmation: true,
    requireDryRun: true,
  },
  production: {
    environment: 'production',
    defaultMode: 'read-only',
    allowMutations: false,
    requireConfirmation: true,
    requireDryRun: true,
  },
};

export function getEnvironmentPolicy(environment: string): PolicyDefinition {
  const normalized = (environment || 'prod-safe') as EnvironmentName;
  return environmentPolicies[normalized] ?? environmentPolicies['prod-safe'];
}

export function evaluatePolicy(context: PolicyContext): PolicyDecision {
  const policy = getEnvironmentPolicy(context.environment);

  if (context.allowMutation && policy.defaultMode === 'read-only') {
    return {
      allowed: false,
      mode: 'read-only',
      reason: 'Mutations are blocked by policy in this environment.',
      requiresConfirmation: true,
    };
  }

  if (context.explicitDryRun || policy.defaultMode === 'dry-run') {
    return {
      allowed: true,
      mode: 'dry-run',
      reason: 'Operation is allowed only in dry-run mode.',
      requiresConfirmation: policy.requireConfirmation,
    };
  }

  if (!policy.allowMutations && !context.allowMutation) {
    return {
      allowed: false,
      mode: 'read-only',
      reason: `Operation '${context.operation}' is blocked in read-only mode.`,
      requiresConfirmation: policy.requireConfirmation,
    };
  }

  return {
    allowed: true,
    mode: 'mutating',
    requiresConfirmation: policy.requireConfirmation,
  };
}
