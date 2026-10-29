import type { AssertionRule } from './assertions.js';

export const baseEnvironmentRules: AssertionRule[] = [
  { path: 'N8N_ENVIRONMENT', operator: 'exists', message: 'Environment name must exist.' },
  { path: 'N8N_BASE_URL', operator: 'regex', expected: '^https?://', message: 'Base URL must be valid HTTP or HTTPS' },
  { path: 'N8N_API_KEY', operator: 'minLength', expected: 8, message: 'API key too short.' },
];

export function createEnvironmentRules(environment: string): AssertionRule[] {
  const baseRules = [...baseEnvironmentRules];
  const expectedEnvironment =
    environment === 'production'
      ? 'production'
      : environment === 'prod-safe'
        ? 'prod-safe'
        : environment === 'staging'
          ? 'staging'
          : 'dev';

  baseRules.push({
    path: 'N8N_ENVIRONMENT',
    operator: 'equals',
    expected: expectedEnvironment,
    message: `Environment must be '${expectedEnvironment}'.`,
  });

  return baseRules;
}
