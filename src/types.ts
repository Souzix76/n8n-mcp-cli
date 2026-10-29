export type TriggerMode = 'webhook' | 'execute';

export interface TestPayload {
  name: string;
  data: Record<string, unknown>;
  expectedFields?: string[];
}

export interface Tier3Check {
  name: string;
  field: string;
  check: 'contains' | 'not_contains' | 'min_length' | 'max_length' | 'equals' | 'not_empty';
  value?: string | number | boolean;
  severity?: 'error' | 'warning';
  message?: string;
}

export interface WorkflowTestConfig {
  workflowId?: string;
  workflowName?: string;
  triggerMode: TriggerMode;
  webhookPath?: string;
  timeoutMs?: number;
  qualityThreshold?: number;
  testPayloads: TestPayload[];
  tier3Checks?: Tier3Check[];
}

export interface TestRunResult {
  payloadName: string;
  ok: boolean;
  status: number;
  durationMs: number;
  output: unknown;
  error?: string;
}

export interface EvaluationIssue {
  tier: 'tier1' | 'tier3';
  severity: 'error' | 'warning';
  check: string;
  message: string;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  tier1Score: number;
  tier3Score: number;
  issues: EvaluationIssue[];
}
