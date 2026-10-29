# v2 roadmap

## Product vision

Build a production-safe QA and operational diagnosis platform for n8n workflows that can validate workflow integrity, detect risk, explain failures, and recommend safe next steps without destructive behavior.

## Strategic goal

Create a platform that helps engineering, operations, and QA teams answer four questions reliably:

1. Is this workflow safe to run in this environment?
2. Where and why did it fail?
3. What is the health and risk level of the workflow?
4. What is the safest next action?

## Epic 1 — Governance and safety

Goal: establish the product guardrails.

### Milestone 1.1: read-only foundation
- global read-only mode
- mutation blocking by default
- environment-level policy checks
- dry-run enforcement for any mutation path

### Milestone 1.2: operational safety
- structured logging
- typed error model
- retry/backoff for transient failures
- health check for n8n connectivity

### Milestone 1.3: validation contracts
- strict configuration schema
- environment validation
- preflight checks before execution

## Epic 2 — Quality and validation

Goal: move from basic assertions to production QA.

### Milestone 2.1: evidence-based assertions
- regex checks
- deep-equality checks
- path-based validation
- array and list checks
- null/empty handling

### Milestone 2.2: scenarios and suites
- payload suites by environment
- multi-scenario execution
- report grouping by workflow and environment

### Milestone 2.3: workflow health score
- reliability score
- data integrity score
- compatibility score
- operational risk score

## Epic 3 — Operational diagnostics

Goal: explain failures clearly and with evidence.

### Milestone 3.1: execution traces
- per-node execution tracking
- error correlation
- failure classification taxonomy

### Milestone 3.2: regression detection
- compare historical runs
- detect recurring issues
- highlight policy drift

### Milestone 3.3: environment-aware diagnosis
- dev vs staging vs prod-safe checks
- severity tuning by environment

## Epic 4 — Recommendations and compatibility

Goal: turn diagnostics into next actions.

### Milestone 4.1: recommendation engine
- contextual suggestions by error type
- node recommendation by task intent
- confidence scoring

### Milestone 4.2: compatibility checks
- evaluate node compatibility
- detect workflow anti-patterns
- score workflow maintainability

## Epic 5 — Reporting and product maturity

Goal: make output useful for engineering and operations.

### Milestone 5.1: report output formats
- JSON
- Markdown
- HTML
- JUnit

### Milestone 5.2: history and visibility
- execution history
- trend reporting
- failure summaries over time

### Milestone 5.3: CLI and CI readiness
- init command
- validate command
- run command
- report command
- history command
- GitHub Actions support

## Delivery order

1. Governance and safety
2. Quality and validation
3. Diagnostics
4. Recommendations
5. Reporting and CLI maturity

## Exit criteria for v2

The v2 is ready for broader adoption when:

- read-only behavior is mandatory and enforced
- execution failures are explainable
- reports are useful across human and CI workflows
- validation is richer than a single happy path
- workflow health can be reasoned about and compared over time
- recommendations are contextual and evidence-based
