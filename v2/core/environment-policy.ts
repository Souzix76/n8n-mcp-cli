export type EnvironmentName = 'dev' | 'staging' | 'prod-safe' | 'production';

export interface EnvironmentProfile {
  name: EnvironmentName;
  classification: 'safe-dev' | 'pre-prod' | 'prod-safe';
  mutationAllowed: boolean;
  dryRunRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export const environmentProfiles: Record<EnvironmentName, EnvironmentProfile> = {
  dev: {
    name: 'dev',
    classification: 'safe-dev',
    mutationAllowed: false,
    dryRunRequired: true,
    riskLevel: 'low',
  },
  staging: {
    name: 'staging',
    classification: 'pre-prod',
    mutationAllowed: false,
    dryRunRequired: true,
    riskLevel: 'medium',
  },
  'prod-safe': {
    name: 'prod-safe',
    classification: 'prod-safe',
    mutationAllowed: false,
    dryRunRequired: true,
    riskLevel: 'high',
  },
  production: {
    name: 'production',
    classification: 'prod-safe',
    mutationAllowed: false,
    dryRunRequired: true,
    riskLevel: 'high',
  },
};

export function getEnvironmentProfile(environment: string): EnvironmentProfile {
  return environmentProfiles[(environment as EnvironmentName) ?? 'prod-safe'] ?? environmentProfiles['prod-safe'];
}
