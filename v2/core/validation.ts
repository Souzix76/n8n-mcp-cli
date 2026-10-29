export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateEnvironmentConfig(input: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!input.N8N_BASE_URL || typeof input.N8N_BASE_URL !== 'string') {
    issues.push({
      path: 'N8N_BASE_URL',
      message: 'Environment variable N8N_BASE_URL is required.',
      severity: 'error',
    });
  }

  if (!input.N8N_API_KEY || typeof input.N8N_API_KEY !== 'string') {
    issues.push({
      path: 'N8N_API_KEY',
      message: 'Environment variable N8N_API_KEY is required.',
      severity: 'error',
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
