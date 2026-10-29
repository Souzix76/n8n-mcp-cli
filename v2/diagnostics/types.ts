import type { ExecutionData } from '../core/n8n-client.js';

export type Execution = ExecutionData;

export interface NodeExecution {
  status: 'success' | 'error' | 'crashed';
  executionTime?: number;
  error?: { message: string; code?: string };
}

export interface Workflow {
  id: string;
  name: string;
  nodes?: string[];
}

export interface TraceNode {
  id: string;
  name: string;
  type: string;
  status: 'success' | 'error' | 'skipped' | 'waiting';
  durationMs: number;
  inputSize: number;
  outputSize: number;
  error: { message: string; code?: string } | null;
}

export interface TraceAnalysis {
  workflowId: string;
  totalNodes: number;
  executedNodes: number;
  failedNodes: number;
  totalDurationMs: number;
  nodes: TraceNode[];
  bottlenecks: string[];
  errorCorrelation: Record<string, string[]>;
}

export type FailureCategory = 'logic' | 'infrastructure' | 'data' | 'permission' | 'timeout';
export type FailureSeverity = 'info' | 'warning' | 'error';

export interface ClassifyConfig {
  enabled: boolean;
  severityThreshold: FailureSeverity;
  taxonomy: FailureCategory[];
}

export interface FailureClassification {
  workflowId: string;
  executionId: string;
  category: FailureCategory;
  severity: FailureSeverity;
  confidence: number;
  message: string;
  rootCause: string;
  suggestedActions: string[];
  relatedNodes: string[];
}

export interface RegressionEntry {
  executionId: string;
  status: 'success' | 'error' | 'crashed';
  score: number;
  failedNodes: string[];
  timestamp: string;
}

export interface FlakyNodeResult {
  nodeId: string;
  failureRate: number;
  totalRuns: number;
  failedRuns: number;
}

export interface DriftingNodeResult {
  nodeId: string;
  baselineAvgMs: number;
  recentAvgMs: number;
  driftPercent: number;
}

export interface NewFailureResult {
  nodeId: string;
  recentFailureCount: number;
  windowSize: number;
}

export interface RegressionDetectorConfig {
  flakyThreshold?: number;
  driftThresholdPercent?: number;
  newFailureWindow?: number;
  minRuns?: number;
}

export interface RegressionItem {
  type: 'new_failure' | 'recurring_failure' | 'score_degradation' | 'new_bottleneck';
  nodeId: string;
  firstSeen: string;
  occurrences: number;
  severity: 'low' | 'medium' | 'high';
}

export interface RegressionReport {
  workflowId: string;
  currentRun: RegressionEntry;
  history: RegressionEntry[];
  regressions: RegressionItem[];
  policyDrift: boolean;
  recommendation: string;
  // Detector output passthrough
  flakyNodes?: FlakyNodeResult[];
  driftingNodes?: DriftingNodeResult[];
  newFailures?: NewFailureResult[];
}

export interface DiagnoseResult {
  workflowId: string;
  environment: string;
  timestamp: string;
  trace: TraceAnalysis;
  classification: FailureClassification;
  regression: RegressionReport;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

export interface DiagnoseConfig {
  trace: {
    enabled: boolean;
    maxNodes: number;
    includeTiming: boolean;
    includeErrors: boolean;
  };
  classify: {
    enabled: boolean;
    severityThreshold: 'info' | 'warning' | 'error';
    taxonomy: ('logic' | 'infrastructure' | 'data' | 'permission' | 'timeout')[];
  };
  regression: {
    enabled: boolean;
    historyWindow: number;
    recurrenceThreshold: number;
  };
}