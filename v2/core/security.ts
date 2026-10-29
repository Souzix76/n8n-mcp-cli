export type SafetyMode = 'read-only' | 'dry-run' | 'mutating';

export interface SafetyPolicy {
  mode: SafetyMode;
  allowMutations: boolean;
  requireDryRunConfirmation: boolean;
  environment: string;
}

export interface SafetyDecision {
  allowed: boolean;
  reason?: string;
  mode: SafetyMode;
}

export function createDefaultSafetyPolicy(environment: string): SafetyPolicy {
  return {
    mode: 'read-only',
    allowMutations: false,
    requireDryRunConfirmation: true,
    environment,
  };
}

export function evaluateSafetyPolicy(policy: SafetyPolicy, action: string): SafetyDecision {
  if (policy.mode === 'read-only' || !policy.allowMutations) {
    return {
      allowed: false,
      reason: `Action '${action}' is blocked in read-only mode.`,
      mode: 'read-only',
    };
  }

  return {
    allowed: true,
    mode: policy.mode,
  };
}
