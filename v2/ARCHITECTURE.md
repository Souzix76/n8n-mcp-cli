# v2 architecture brief

This document defines the intended architecture for the v2 product line.

## Product framing

The v2 is a production-safe governance and validation platform for n8n workflows. It supports:

- workflow health evaluation
- execution trace analysis
- risk-aware validation
- CI and release readiness checks
- recommendations with evidence
- safe operational diagnostics

## Layered architecture

### 1. Core layer
Responsible for the platform-wide safety and runtime correctness.

- security.ts: read-only enforcement, risk gates, dry-run logic
- logger.ts: structured, contextual logs
- errors.ts: typed domain errors and failure classification
- validation.ts: config and execution validation
- retry.ts: network retry and backoff

### 2. Testing and validation layer
Responsible for quality checks and execution evaluation.

- assertions.ts: advanced validation rules
- suite-runner.ts: multi-scenario execution orchestration
- presets.ts: reusable QA presets by environment

### 3. Reporting layer
Responsible for turning execution evidence into useful output.

- report-generator.ts: unified report model
- markdown-generator.ts: human-readable summary
- html-generator.ts: richer visual report
- junit-generator.ts: CI-friendly output

### 4. Recommendation and health layer
Responsible for intelligence and operational guidance.

- recommendation-engine.ts: contextual recommendations
- workflow-health.ts: risk and health scoring
- compatibility-check.ts: node and flow compatibility analysis

### 5. CLI and automation layer
Responsible for product usability and pipeline integration.

- init.ts
- validate.ts
- run.ts
- report.ts
- history.ts
- commands.ts

## Design rules

- The v2 will stay separate from the v1 implementation.
- Mutation paths are blocked unless explicitly safe and dry-run validated.
- Evaluation output must always include evidence, severity, and confidence.
- Health and recommendation output must be explainable.
- The platform is designed for production decision support, not autonomous mutation.

## v2 release direction

The v2 should prioritize:

1. safe production validation
2. operational diagnosis
3. risk classification and workflow health
4. reporting and history
5. recommendations and compatibility checks
6. professional CLI and CI integration

## Current branch status

The v2 work is being developed on:

`v2/production-safe-qa`

This branch is intentionally isolated from the v1 implementation and is the staging area for the v2 strategic direction.
