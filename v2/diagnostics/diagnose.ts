import { TraceAnalyzer } from './trace-analyzer.js';
import { FailureClassifier } from './failure-classifier.js';
import { RegressionDetector } from './regression-detector.js';
import type { N8nClient, ExecutionData, WorkflowSummary } from '../core/n8n-client.js';
import type {
  DiagnoseResult,
  DiagnoseConfig,
  RegressionReport,
  RegressionEntry,
  RegressionItem,
  FlakyNodeResult,
  DriftingNodeResult,
  NewFailureResult,
} from './types.js';

const DEFAULT_CONFIG: DiagnoseConfig = {
  trace: {
    enabled: true,
    maxNodes: 50,
    includeTiming: true,
    includeErrors: true,
  },
  classify: {
    enabled: true,
    severityThreshold: 'warning',
    taxonomy: ['logic', 'infrastructure', 'data', 'permission', 'timeout'],
  },
  regression: {
    enabled: true,
    historyWindow: 10,
    recurrenceThreshold: 3,
  },
};

export class DiagnoseEngine {
  private client: N8nClient;
  private traceAnalyzer: TraceAnalyzer;
  private classifier: FailureClassifier;
  private regressionDetector: RegressionDetector;

  constructor(client: N8nClient) {
    this.client = client;
    this.traceAnalyzer = new TraceAnalyzer();
    this.classifier = new FailureClassifier();
    this.regressionDetector = new RegressionDetector();
  }

  async diagnose(
    workflowId: string,
    executionId: string,
    config: DiagnoseConfig = DEFAULT_CONFIG
  ): Promise<DiagnoseResult> {
    const mergedConfig = this.mergeConfig(config);

    // Fetch workflow and execution data
    const workflow = await this.client.getWorkflow(workflowId);
    const execution = await this.client.getExecution(executionId);
    const environment = await this.determineEnvironment();

    // Run trace analysis (if enabled)
    const trace = mergedConfig.trace.enabled
      ? await this.traceAnalyzer.analyze(workflow, execution)
      : this.emptyTrace(workflowId);

    // Run failure classification (if enabled)
    const classification = mergedConfig.classify.enabled
      ? await this.classifier.classify(execution, {
          severityThreshold: mergedConfig.classify.severityThreshold,
          categoryThreshold: mergedConfig.classify.severityThreshold,
          taxonomy: mergedConfig.classify.taxonomy,
        })
      : this.emptyClassification(workflowId, executionId);

    // Run regression detection (if enabled)
    const regression = mergedConfig.regression.enabled
      ? await this.runRegressionAnalysis(workflowId, execution, mergedConfig)
      : this.emptyRegressionReport(workflowId, executionId, execution);

    // Compute overall health
    const overallHealth = this.computeHealth(execution.status, trace, classification, regression);

    // Generate recommendations
    const recommendations = this.generateRecommendations(trace, classification, regression);

    return {
      workflowId,
      environment,
      timestamp: new Date().toISOString(),
      trace,
      classification,
      regression,
      overallHealth,
      recommendations,
    };
  }

  private mergeConfig(config?: DiagnoseConfig): DiagnoseConfig {
    if (!config) return DEFAULT_CONFIG;
    return {
      trace: { ...DEFAULT_CONFIG.trace, ...config.trace },
      classify: { ...DEFAULT_CONFIG.classify, ...config.classify },
      regression: { ...DEFAULT_CONFIG.regression, ...config.regression },
    };
  }

  private async determineEnvironment(): Promise<string> {
    try {
      const health = await this.client.healthCheck();
      return health.status === 'ok' ? 'production' : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private runRegressionAnalysis = async (
    workflowId: string,
    execution: ExecutionData,
    config: DiagnoseConfig
  ): Promise<RegressionReport> => {
    const limit = config.regression.historyWindow * 5;
    const { data: history } = await this.client.getExecutions(workflowId, limit);

    const detectorResult = this.regressionDetector.analyze(history, {
      flakyThreshold: 0.2,
      driftThresholdPercent: 50,
      newFailureWindow: config.regression.historyWindow,
      minRuns: config.regression.recurrenceThreshold,
    });

    return this.transformRegression(workflowId, execution, history, detectorResult);
  };

  private transformRegression(
    workflowId: string,
    execution: ExecutionData,
    history: ExecutionData[],
    detectorOutput: {
      flakyNodes: FlakyNodeResult[];
      driftingNodes: DriftingNodeResult[];
      newFailures: NewFailureResult[];
      summary: {
        totalNodesAnalyzed: number;
        flakyCount: number;
        driftingCount: number;
        newFailureCount: number;
      };
    }
  ): RegressionReport {
    const currentRun = this.toRegressionEntry(execution);
    const historyEntries = history.map((h) => this.toRegressionEntry(h));

    const regressions = this.buildRegressionItems(
      detectorOutput.flakyNodes,
      detectorOutput.driftingNodes,
      detectorOutput.newFailures
    );

    const policyDrift =
      detectorOutput.flakyNodes.some((f) => f.failureRate > 0.5) ||
      detectorOutput.driftingNodes.length > 0;

    const recommendation = this.generateRegressionRecommendation(
      detectorOutput.flakyNodes,
      detectorOutput.driftingNodes,
      detectorOutput.newFailures,
      execution
    );

    return {
      workflowId,
      currentRun,
      history: historyEntries,
      regressions,
      policyDrift,
      recommendation,
      flakyNodes: detectorOutput.flakyNodes,
      driftingNodes: detectorOutput.driftingNodes,
      newFailures: detectorOutput.newFailures,
    };
  }

  private toRegressionEntry(execution: ExecutionData): RegressionEntry {
    const runData = execution.data?.resultData?.runData as Record<string, unknown[]> | undefined;
    const failedNodes: string[] = [];

    if (runData) {
      for (const [nodeName, nodeRuns] of Object.entries(runData)) {
        if (Array.isArray(nodeRuns) && nodeRuns.length > 0) {
          const nodeData = nodeRuns[0] as Record<string, unknown> | undefined;
          // Extract json from nested data.main[0].json structure
          const dataObj = nodeData ? (nodeData['data'] as Record<string, unknown> | undefined) : undefined;
          const mainArr = dataObj ? (dataObj['main'] as Array<Record<string, unknown>> | undefined) : undefined;
          const jsonObj = mainArr && mainArr[0] ? (mainArr[0]['json']) : undefined;
          if (jsonObj && typeof jsonObj === 'object' && 'error' in jsonObj) {
            failedNodes.push(nodeName);
          } else if (nodeData ? nodeData['status'] : undefined === 'error') {
            failedNodes.push(nodeName);
          }
        }
      }
    }

    const score = Math.max(0, 100 - failedNodes.length * 20);

    return {
      executionId: execution.id,
      status: execution.status as 'success' | 'error' | 'crashed',
      score,
      failedNodes,
      timestamp: execution.startedAt,
    };
  }

  private buildRegressionItems(
    flakyNodes: FlakyNodeResult[],
    driftingNodes: DriftingNodeResult[],
    newFailures: NewFailureResult[]
  ): RegressionItem[] {
    const items: RegressionItem[] = [];

    for (const flaky of flakyNodes) {
      items.push({
        type: 'recurring_failure',
        nodeId: flaky.nodeId,
        firstSeen: new Date().toISOString(),
        occurrences: flaky.failedRuns,
        severity: flaky.failureRate >= 0.5 ? 'high' : flaky.failureRate >= 0.3 ? 'medium' : 'low',
      });
    }

    for (const drift of driftingNodes) {
      items.push({
        type: 'score_degradation',
        nodeId: drift.nodeId,
        firstSeen: new Date().toISOString(),
        occurrences: 1,
        severity: drift.driftPercent >= 100 ? 'high' : drift.driftPercent >= 50 ? 'medium' : 'low',
      });
    }

    for (const nf of newFailures) {
      items.push({
        type: 'new_failure',
        nodeId: nf.nodeId,
        firstSeen: new Date().toISOString(),
        occurrences: nf.recentFailureCount,
        severity: nf.recentFailureCount >= 5 ? 'high' : nf.recentFailureCount >= 2 ? 'medium' : 'low',
      });
    }

    return items;
  }

  private generateRegressionRecommendation(
    flakyNodes: FlakyNodeResult[],
    driftingNodes: DriftingNodeResult[],
    newFailures: NewFailureResult[],
    execution: ExecutionData
  ): string {
    if (flakyNodes.length > 0) {
      const node = flakyNodes[0]!;
      return `Investigate ${node.nodeId} — flaky with ${Math.round(node.failureRate * 100)}% failure rate`;
    }
    if (driftingNodes.length > 0) {
      const node = driftingNodes[0]!;
      return `Monitor ${node.nodeId} — performance drift of ${node.driftPercent}%`;
    }
    if (newFailures.length > 0) {
      return 'Review recent failures — new error patterns detected';
    }
    return 'No regressions detected in historical data';
  }

  private computeHealth(
    executionStatus: ExecutionData['status'],
    trace: { bottlenecks: string[]; failedNodes: number },
    classification: { severity: 'info' | 'warning' | 'error'; message: string },
    regression: RegressionReport
  ): 'healthy' | 'degraded' | 'critical' {
    // Critical: crashed execution or error severity with execution failure
    if (executionStatus === 'crashed') return 'critical';

    // Degraded: error execution, bottlenecks, or regressions
    if (executionStatus === 'error') return 'degraded';
    if (trace.failedNodes > 0) return 'degraded';
    if (trace.bottlenecks.length > 0) return 'degraded';
    if (regression.regressions.length > 0) return 'degraded';
    if (regression.policyDrift) return 'degraded';

    // Healthy by default
    return 'healthy';
  }

  private generateRecommendations(
    trace: { bottlenecks: string[]; failedNodes: number; nodes: { name: string; status: string }[] },
    classification: { severity: 'info' | 'warning' | 'error'; message: string; suggestedActions: string[]; rootCause: string },
    regression: RegressionReport
  ): string[] {
    const recommendations: string[] = [];

    // Add classification suggested actions
    if (classification.suggestedActions.length > 0 && classification.message !== 'Unknown error') {
      for (const action of classification.suggestedActions) {
        recommendations.push(action);
      }
    }

    // Add bottleneck recommendations
    for (const bottleneck of trace.bottlenecks) {
      recommendations.push(`Optimize ${bottleneck} — identified as a performance bottleneck`);
    }

    // Add regression recommendations
    for (const item of regression.regressions) {
      recommendations.push(`Investigate ${item.nodeId} — ${item.type} detected`);
    }

    const hasIssues = recommendations.length > 0;

    if (!hasIssues) {
      recommendations.push(
        'Monitor workflow health — no issues detected in current run',
        'Review periodically for regression trends and performance drift'
      );
    }

    return recommendations;
  }

  private emptyTrace(workflowId: string) {
    return {
      workflowId,
      totalNodes: 0,
      executedNodes: 0,
      failedNodes: 0,
      totalDurationMs: 0,
      nodes: [],
      bottlenecks: [],
      errorCorrelation: {},
    };
  }

  private emptyClassification(workflowId: string, executionId: string) {
    return {
      workflowId,
      executionId,
      category: 'logic' as const,
      severity: 'info' as const,
      confidence: 0,
      message: 'No errors detected',
      rootCause: 'No root cause identified',
      suggestedActions: [],
      relatedNodes: [],
    };
  }

  private emptyRegressionReport(workflowId: string, executionId: string, execution: ExecutionData): RegressionReport {
    return {
      workflowId,
      currentRun: this.toRegressionEntry(execution),
      history: [],
      regressions: [],
      policyDrift: false,
      recommendation: 'No regression analysis performed',
      flakyNodes: [],
      driftingNodes: [],
      newFailures: [],
    };
  }
}
