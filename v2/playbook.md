# v2 Playbook

## Mission

`n8n-workflow-tester-safe v2` exists to make n8n workflow validation, health assessment, and operational safety reliable, evidence-based, and production-aware.

This product line is intentionally isolated from the original v1 implementation.

## Core objectives

- validate workflows before release or production use
- detect operational risk early
- explain why a workflow failed and where it failed
- recommend safe next actions based on context
- keep workflows and automation actions within safe boundaries
- provide CI and operational reporting that teams can trust

## Non-goals

- credential lifecycle management
- secret administration
- destructive recovery flows
- autonomous repair loops
- uncontrolled mutation of production workflows
- broad admin-style control beyond the intended safe surface

## Product principles

1. Read-only by default
2. Dry-run for mutation paths
3. Human approval for riskier actions
4. Environment-aware validation
5. Evidence-based diagnostics over raw logs
6. Production safety over feature volume
7. Structured reporting and traceability
8. Keep v1 stable and untouched

## Scope boundary

The v2 branch is the only place for this product line.

The following are out of scope for v2 work unless explicitly planned later:

- modifying the original v1 codebase
- expanding v1 features into v2 without a clean design decision
- introducing destructive workflow automation beyond safe validation
- credential or secret lifecycle logic

## Working model

### 1. Security first

The default posture for all operations is safe and restricted.

- no implicit mutations
- no production writes without explicit guardrails
- no destructive recovery assumptions
- no secret handling

### 2. Validation before execution

Before a workflow action is considered operationally valid:

- environment policy is checked
- config is validated
- runtime health is evaluated
- assertions are applied
- reporting is generated

### 3. Evidence over confidence

A workflow should not be considered healthy only because a request succeeded.

The v2 must prefer:

- structured diagnostics
- traceable evidence
- clear pass/fail logic
- risk-aware recommendations

### 4. Reports as first-class output

The v2 outputs should be machine- and human-readable.

Supported output classes:

- JSON for automation
- Markdown for human review
- JUnit for CI pipelines
- HTML for richer inspection if needed

## Architecture map

### Core layer

`v2/core/`

This layer contains the reusable product logic:

- security and policy evaluation
- health checks
- retry helpers
- structured logging
- audit trail
- validation utilities
- environment-aware checks

### Testing layer

`v2/testing/`

This layer contains quality and validation execution logic:

- assertion rules
- suite execution
- environment rule generation
- result aggregation

### Reports layer

`v2/reports/`

This layer contains report generation and export logic.

### CLI layer

`v2/cli/`

This layer contains entrypoints for:

- validation
- safe execution workflows
- operational health checks
- report dispatch

### MCP layer

`v2/mcp/`

This layer is intended for AI-safe tool exposure and contextual workflow inspection without broad admin access.

## Required implementation sequence

### Phase 1 — Governance and safety foundation

Complete and maintain:

- policy engine
- environment classification
- read-only and dry-run guardrails
- health checks
- audit and logger primitives
- validation of environment config

Status: implemented in foundation form

### Phase 2 — Validation and suite execution

Target outcomes:

- nested path assertion support
- environment-specific rule generation
- suite runner for validation scenarios
- report output generation by format
- pass/fail and summary computation

Status: implemented in early operational form

### Phase 3 — Diagnosis and regression analysis

Target outcomes:

- classify failures by type
- identify likely root-cause groups
- compare execution traces across runs
- map findings back to workflow structure
- expose operational evidence for release review

### Phase 4 — Recommendations and compatibility

Target outcomes:

- workflow health scoring
- recommendations with evidence
- compatibility hints by environment and node type
- risk ranking for recommended next actions

### Phase 5 — Operational maturity

Target outcomes:

- CI pipeline readiness
- release review reporting
- stable CLI behavior
- operationally useful docs and handoff materials

## Contribution rules

1. Never work on the v1 implementation
2. Keep all edits in the v2 branch
3. Prefer safe defaults in all logic
4. Keep policy checks explicit and visible
5. Do not add destructive automation paths without approval
6. Prefer evidence and diagnostics over silent assumptions
7. Preserve clean file boundaries between core, testing, reports, and CLI

## Decision framework

When in doubt, choose the safer option:

- read-only instead of mutating
- dry-run instead of execution
- validation before mutation
- report before confidence
- evidence before recommendation

## Definition of done for v2 features

A feature is ready when:

- it is isolated to the v2 branch
- it respects the default safety posture
- it has validation and reporting hooks
- its output is explainable and reviewable
- it does not degrade v1 behavior or assumptions

## Handoff checklist

Before moving work to the next stage, confirm:

- v2 scope remains isolated
- no v1 files were modified
- policy and safety checks are present
- validation is evidence-based
- reports are generated in a reviewable format
- the next task is clearly scoped and safe

## Final operating rule

The v2 product line is a safe QA and operational diagnostics platform, not a broad admin automation layer.

The mission is to help humans reason about workflow health and operational risk with clarity, evidence, and safe execution boundaries.
