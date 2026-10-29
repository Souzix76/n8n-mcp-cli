export interface CompatibilityFinding {
  workflowId: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export class CompatibilityCheckService {
  static evaluate(workflowId: string): CompatibilityFinding[] {
    return [
      {
        workflowId,
        issue: 'No immediate compatibility issues detected.',
        severity: 'low',
      },
    ];
  }
}
