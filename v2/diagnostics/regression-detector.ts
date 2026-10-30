import type {
  Execution,
  FlakyNodeResult,
  DriftingNodeResult,
  NewFailureResult,
  RegressionReport,
  RegressionDetectorConfig,
} from './types.js';

export class RegressionDetector {
  detectFlakyNodes(
    executions: Execution[],
    config: { threshold: number; minRuns: number }
  ): { flakyNodes: FlakyNodeResult[] } {
    if (executions.length === 0) {
      return { flakyNodes: [] };
    }

    // Group executions by node
    const nodeRuns = new Map<string, { total: number; failures: number }>();

    for (const execution of executions) {
      const runData = execution.data?.resultData?.runData;
      if (!runData) continue;

      for (const [nodeId, nodeRunsArray] of Object.entries(runData as Record<string, unknown[]>)) {
        if (!Array.isArray(nodeRunsArray) || nodeRunsArray.length === 0) continue;

        const nodeRun = nodeRunsArray[0] as { status?: string; executionTime?: unknown };
        const existing = nodeRuns.get(nodeId) || { total: 0, failures: 0 };
        existing.total += 1;
        if (nodeRun.status === 'error') {
          existing.failures += 1;
        }
        nodeRuns.set(nodeId, existing);
      }
    }

    const flakyNodes: FlakyNodeResult[] = [];

    for (const [nodeId, stats] of nodeRuns.entries()) {
      if (stats.total < config.minRuns) continue;

      const failureRate = stats.failures / stats.total;
      if (failureRate >= config.threshold) {
        flakyNodes.push({
          nodeId,
          failureRate,
          totalRuns: stats.total,
          failedRuns: stats.failures,
        });
      }
    }

    return { flakyNodes };
  }

  detectPerformanceDrift(
    executions: Execution[],
    config: { thresholdPercent: number; minRuns: number }
  ): { driftingNodes: DriftingNodeResult[] } {
    if (executions.length === 0) {
      return { driftingNodes: [] };
    }

    // Group execution times by node
    const nodeTimes = new Map<string, number[]>();

    for (const execution of executions) {
      const runData = execution.data?.resultData?.runData;
      if (!runData) continue;

      for (const [nodeId, nodeRunsArray] of Object.entries(runData as Record<string, unknown[]>)) {
        if (!Array.isArray(nodeRunsArray) || nodeRunsArray.length === 0) continue;

        const nodeRun = nodeRunsArray[0] as { status?: string; executionTime?: unknown };
        if (typeof nodeRun.executionTime !== 'number') continue;

        const existing = nodeTimes.get(nodeId) || [];
        existing.push(nodeRun.executionTime);
        nodeTimes.set(nodeId, existing);
      }
    }

    const driftingNodes: DriftingNodeResult[] = [];

    for (const [nodeId, times] of nodeTimes.entries()) {
      if (times.length < config.minRuns) continue;

      // Split into first half (baseline) and second half (recent)
      const mid = Math.floor(times.length / 2);
      const baseline = times.slice(0, mid);
      const recent = times.slice(mid);

      if (baseline.length === 0 || recent.length === 0) continue;

      const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

      if (baselineAvg === 0) continue;

      const driftPercent = ((recentAvg - baselineAvg) / baselineAvg) * 100;

      if (driftPercent >= config.thresholdPercent) {
        driftingNodes.push({
          nodeId,
          baselineAvgMs: Math.round(baselineAvg),
          recentAvgMs: Math.round(recentAvg),
          driftPercent: Math.round(driftPercent),
        });
      }
    }

    return { driftingNodes };
  }

  detectNewFailures(
    executions: Execution[],
    config: { window: number }
  ): { newFailures: NewFailureResult[] } {
    if (executions.length === 0) {
      return { newFailures: [] };
    }

    // Sort executions by start time (newest first)
    const sortedExecutions = [...executions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // Track failures per node in the window
    const nodeFailures = new Map<string, { recent: number; historical: boolean }>();

    for (let i = 0; i < sortedExecutions.length; i++) {
      const execution = sortedExecutions[i];
      const runData = execution.data?.resultData?.runData;
      if (!runData) continue;

      for (const [nodeId, nodeRunsArray] of Object.entries(runData as Record<string, unknown[]>)) {
        if (!Array.isArray(nodeRunsArray) || nodeRunsArray.length === 0) continue;

        const nodeRun = nodeRunsArray[0] as { status?: string; executionTime?: unknown };
        const existing = nodeFailures.get(nodeId) || { recent: 0, historical: false };

        if (nodeRun.status === 'error') {
          if (i < config.window) {
            existing.recent += 1;
          } else {
            existing.historical = true;
          }
        }
        nodeFailures.set(nodeId, existing);
      }
    }

    const newFailures: NewFailureResult[] = [];

    for (const [nodeId, stats] of nodeFailures.entries()) {
      if (stats.recent >= 2 && !stats.historical) {
        newFailures.push({
          nodeId,
          recentFailureCount: stats.recent,
          windowSize: config.window,
        });
      }
    }

    return { newFailures };
  }

  analyze(
    executions: Execution[],
    config: RegressionDetectorConfig
  ): {
    flakyNodes: FlakyNodeResult[];
    driftingNodes: DriftingNodeResult[];
    newFailures: NewFailureResult[];
    summary: {
      totalNodesAnalyzed: number;
      flakyCount: number;
      driftingCount: number;
      newFailureCount: number;
    };
  } {
    const flakyResult = this.detectFlakyNodes(executions, {
      threshold: config.flakyThreshold ?? 0.2,
      minRuns: config.minRuns ?? 5,
    });

    const driftResult = this.detectPerformanceDrift(executions, {
      thresholdPercent: config.driftThresholdPercent ?? 50,
      minRuns: config.minRuns ?? 5,
    });

    const newFailureResult = this.detectNewFailures(executions, {
      window: config.newFailureWindow ?? 5,
    });

    // Count unique nodes analyzed
    const allNodes = new Set<string>();
    for (const execution of executions) {
      const runData = execution.data?.resultData?.runData;
      if (!runData) continue;
      for (const nodeId of Object.keys(runData)) {
        allNodes.add(nodeId);
      }
    }

    return {
      flakyNodes: flakyResult.flakyNodes,
      driftingNodes: driftResult.driftingNodes,
      newFailures: newFailureResult.newFailures,
      summary: {
        totalNodesAnalyzed: allNodes.size,
        flakyCount: flakyResult.flakyNodes.length,
        driftingCount: driftResult.driftingNodes.length,
        newFailureCount: newFailureResult.newFailures.length,
      },
    };
  }
}