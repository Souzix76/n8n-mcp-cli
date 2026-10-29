# DiagnoseEngine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `DiagnoseEngine` that orchestrates `TraceAnalyzer`, `FailureClassifier`, and `RegressionDetector` into a unified `DiagnoseResult` with `overallHealth` and `recommendations`.

**Architecture:** DiagnoseEngine is a facade that delegates to the three existing diagnostic modules, transforming their outputs into the `DiagnoseResult` shape already defined in `types.ts`. It handles partial results when modules are disabled or return empty data, computes overall health, and synthesizes recommendations from all findings.

**Tech Stack:** TypeScript, vitest, existing n8n-v2 diagnostics modules.

**Spec:** `/root/.hermes/workspace/n8n-mcp-cli/docs/superpowers/plans/2026-10-29-diagnose-engine.md`

## Global Constraints
- All code in `v2/` directory
- TypeScript with ES modules (`.js` imports)
- vitest test runner already configured
- 61 existing tests must continue passing
- Follow existing test patterns (mocks, factory functions, `as` casts)

## Review Focus
1. Empty execution data — should produce a healthy/degraded result without crashing
2. TraceAnalyzer returns empty nodes — classify and regression should still work
3. FailureClassifier returns default 'Unknown error' — DiagnoseEngine should still report it
4. RegressionDetector returns empty arrays — overallHealth should not be escalated
5. All three modules disabled — should return healthy with default recommendations

---

## Task 1: Fix types.ts

**Files:**
- Modify: `v2/diagnostics/types.ts`

**Problem:** `types.ts` has two conflicting `RegressionReport` definitions (lines 79-89 and 99-106). The `DiagnoseResult` interface (line 108) references the second `RegressionReport` (line 99-106 shape). The `RegressionDetector` returns the first shape (line 79-89). The `regression-detector.test.ts` imports `Execution` from types.ts but it doesn't exist there.

**Approach:**
- Add `Execution` type as an alias for `ExecutionData` from `../../core/n8n-client.js` (the regression-detector test uses `Execution` with `status` field)
- Remove the first `RegressionReport` (lines 79-89) — keep the second (lines 99-106) that `DiagnoseResult` expects
- The `RegressionDetector.analyze()` already returns the first shape; DiagnoseEngine will transform it to the second shape

```typescript
// Add this import
import type { ExecutionData } from '../../core/n8n-client.js';

// Add this type
export type Execution = ExecutionData;
```

**Consumes:** `ExecutionData` from core
**Produces:** `Execution` type, single `RegressionReport` definition

- [ ] **Step 1: Add `Execution` type alias** to `types.ts`
- [ ] **Step 2: Remove the first `RegressionReport` (lines 79-89)** — keep the one matching `DiagnoseResult`
- [ ] **Step 3: Run tests** — `npx vitest run` — verify 61 tests still pass

---

## Task 2: Create DiagnoseEngine

**Files:**
- Create: `v2/diagnostics/diagnose.ts`
- Test: `v2/diagnostics/__tests__/diagnose.test.ts`

**Interfaces:**
- `DiagnoseEngine` class constructor takes `N8nClient`
- `diagnose(workflowId: string, executionId: string, config?: DiagnoseConfig): Promise<DiagnoseResult>`

**DiagnoseResult shape** (from types.ts):
```typescript
{
  workflowId: string;
  environment: string;
  timestamp: string;
  trace: TraceAnalysis;           // from TraceAnalyzer
  classification: FailureClassification;  // from FailureClassifier
  regression: RegressionReport;   // transformed from RegressionDetector output
  overallHealth: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}
```

**RegressionDetector output** → **RegressionReport transform:**
- Input: `{ flakyNodes, driftingNodes, newFailures, summary }`
- Output: `{ workflowId, currentRun, history, regressions, policyDrift, recommendation }`
  - `regressions`: build from flaky/drifting/newFailure results as `RegressionItem[]`
  - `policyDrift`: true if any flaky node exceeds 50% failure rate
  - `recommendation`: generate based on regression severity

**overallHealth logic:**
- `'critical'` if execution status is `'crashed'` OR classification severity is `'error'`
- `'degraded'` if execution status is `'error'` OR bottlenecks found OR regressions detected
- `'healthy'` otherwise

**recommendations logic:**
- From `FailureClassification.suggestedActions`
- From `TraceAnalysis.bottlenecks` → add "Optimize {node} — identified as bottleneck"
- From `RegressionReport.regressions` → add "Investigate {nodeId} — {type} detected"
- Generic fallbacks if no issues found

### Test data factories:
```typescript
// Mock ExecutionData
const mockExecution = (overrides = {}): ExecutionData => ({
  id: 'exec-1',
  workflowId: 'wf-1',
  status: 'success',
  startedAt: '2026-10-29T10:00:00Z',
  stoppedAt: '2026-10-29T10:00:05Z',
  data: { resultData: { runData: {} } },
  ...overrides,
});

// Mock WorkflowSummary
const mockWorkflow = (overrides = {}): WorkflowSummary => ({
  id: 'wf-1',
  name: 'Test Workflow',
  active: true,
  nodes: ['Start', 'HTTP Request', 'End'],
  ...overrides,
});
```

- [ ] **Step 1: Write failing tests** in `diagnose.test.ts`
  - Test: healthy execution → overallHealth 'healthy', empty recommendations
  - Test: failed execution → overallHealth 'degraded'/'critical', recommendations include classify suggestions
  - Test: bottleneck detected → recommendations include bottleneck optimization
  - Test: regression detected → recommendations include regression investigation
  - Test: empty execution data → doesn't crash, returns degraded/healthy
  - Test: disabled modules → returns healthy with default recommendations
  - Test: execution result has all required fields
- [ ] **Step 2: Run tests** — verify FAIL
- [ ] **Step 3: Implement `DiagnoseEngine`** in `diagnose.ts`
  - Constructor stores `N8nClient` and initializes `TraceAnalyzer`, `FailureClassifier`, `RegressionDetector`
  - `diagnose()` method: fetch workflow + execution, run enabled modules in parallel, transform results, compute health + recommendations
  - `private transformRegression()` — converts detector output to `RegressionReport`
  - `private computeHealth()` — derives overallHealth
  - `private generateRecommendations()` — synthesizes recommendation strings
  - `private getExecutionHistory()` — fetch historical executions for regression detection
- [ ] **Step 4: Run tests** — verify PASS
- [ ] **Step 5: Run full suite** — `npx vitest run` — verify 61 + new tests pass

---

## Task 3: Create diagnostics index.ts exports

**Files:**
- Create: `v2/diagnostics/index.ts`

**Exports:**
- `DiagnoseEngine` from `./diagnose.js`
- `TraceAnalyzer` from `./trace-analyzer.js`
- `FailureClassifier` from `./failure-classifier.js`
- `RegressionDetector` from `./regression-detector.js`
- Re-export all types from `./types.js`

- [ ] **Step 1: Create `index.ts`** with all exports
- [ ] **Step 2: Run tests** — verify PASS

---

## Self-Review Checklist
- [ ] All 61 existing tests still pass
- [ ] New diagnose tests cover healthy/critical/degraded paths
- [ ] RegressionReport transform produces valid RegressionItem[] entries
- [ ] DiagnoseEngine handles disabled modules correctly
- [ ] No runtime crashes on empty/missing data