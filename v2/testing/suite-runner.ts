export interface SuiteResult {
  workflowId: string;
  environment: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  issues: string[];
}

export interface SuiteRunConfig {
  workflowId: string;
  environment: string;
  payloads: Array<Record<string, unknown>>;
}

export class SuiteRunner {
  static async run(config: SuiteRunConfig): Promise<SuiteResult> {
    const issues: string[] = [];

    if (!config.workflowId) {
      issues.push('Workflow id is missing.');
    }

    if (!config.payloads.length) {
      issues.push('No payloads provided for the suite.');
    }

    return {
      workflowId: config.workflowId,
      environment: config.environment,
      status: issues.length > 0 ? 'fail' : 'pass',
      score: issues.length > 0 ? 50 : 100,
      issues,
    };
  }
}
