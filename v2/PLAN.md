# v2 plan

## Objective

Build a production-safe n8n workflow QA and diagnostic platform in a dedicated v2 line, without modifying the v1 implementation.

The v2 must be positioned as:
- a safe validation and diagnostic layer for workflows
- a governance and risk control layer
- a platform for workflow health, evidence, and recommendations
- a system with MCP for AI-assisted interaction and CLI for operational automation

## Non-goals

- no changes to the v1 codebase
- no destructive auto-repair loops
- no credential lifecycle management
- no uncontrolled mutation in production environments
- no feature bloat for the sake of tool count

## Product direction

The v2 is not a generic workflow builder MCP.
The v2 is a production-safe workflow health and validation platform.

It answers:
- Is this workflow safe for this environment?
- Why did it fail?
- Where did it fail?
- What is the workflow health and risk level?
- What is the safest next action?

## Strategic pillars

### 1. Governance and safety
- read-only by default
- dry-run for mutating actions
- explicit environment policies
- mutation blocking when unsafe
- logs and audit trail for decisions

### 2. Validation and quality
- stronger assertion engine
- structured payload validation
- environment-aware rule sets
- workflow health scoring
- suite execution for QA scenarios

### 3. Diagnostics and observability
- execution traces per node
- failure classification taxonomy
- regression detection over time
- comparison across environments
- explainable failure summaries

### 4. Recommendations and compatibility
- contextual recommendations by failure type
- node suggestions by task intent
- compatibility checks
- anti-pattern detection
- confidence and risk scoring

### 5. Reporting and automation
- JSON, Markdown, HTML, JUnit reports
- execution history and trends
- CLI for CI and automation
- MCP layer for AI-assisted workflows

## Architecture

### Shared core
- security
- validation
- logging
- errors
- retry
- health checks
- policy engine
- reports
- recommendations

### MCP layer
- AI conversational entrypoint
- safe read-only tools
- contextual workflow summaries
- explainable diagnostics
- suggestions without destructive behavior

### CLI layer
- validation commands
- report generation
- environment checks
- suite execution
- dry-run and read-only enforcement
- CI integration

## Delivery order

### Phase 1 — Governance and safety foundation
Priority goals:
- global read-only mode
- environment policy system
- dry-run for unsafe actions
- structured logging
- typed error model
- retry and backoff
- health check for n8n
- config validation

Acceptance criteria:
- all operations default to read-only
- environment-specific policy enforcement exists
- failing calls are classified and logged clearly
- CLI and MCP can validate without mutating
- n8n health is checked before execution

### Phase 2 — Validation and quality
Priority goals:
- richer assertions
- payload contract checks
- environment presets
- suite runner
- workflow health score

Acceptance criteria:
- assertions support regex, deep equality, nested paths, arrays, and length checks
- workflow health can be scored over multiple checks
- validation results are explainable and environment-aware

### Phase 3 — Diagnostics and regression
Priority goals:
- node-level trace analysis
- failure taxonomy
- execution history
- regression comparison
- environment comparison

Acceptance criteria:
- failures are categorized and explained
- historical runs can be compared
- recurring regressions are detectable

### Phase 4 — Recommendation and compatibility
Priority goals:
- recommendation engine
- node suggestion by task intent
- compatibility validation
- workflow anti-pattern detection
- confidence scoring

Acceptance criteria:
- safe recommendations are contextual and evidence-based
- compatibility issues are surfaced before production use
- suggestions are explainable

### Phase 5 — Reporting and operational maturity
Priority goals:
- JSON / Markdown / HTML / JUnit reports
- execution history and trends
- professional CLI
- CI integration
- documentation and release readiness

Acceptance criteria:
- reports are generated from execution results
- CLI supports validate, run, report, history
- CI can integrate the tool without requiring a chat client

## v2 milestone sequence

1. security policy engine
2. validation layer
3. structured logs and errors
4. retries and health checks
5. richer assertions and suites
6. reports and history
7. recommendation engine
8. CLI polish and CI integration

## Practical project rule

All v2 development happens in the dedicated branch:
- v2/production-safe-qa

No v1 files are modified.
No v1 runtime is changed.
The v2 is a completely separate product line with its own architecture, modules, and roadmap.

## Success definition

The v2 is successful when it becomes a trustworthy operational layer for n8n workflows that:
- validates safely
- explains failures clearly
- scores workflow health
- supports CI and release gates
- works in AI-assisted and automation contexts
- respects safety boundaries without acting destructively

## Immediate next actions

1. finalize the Fase 1 scope and contracts
2. implement policy engine + validation engine
3. add logging + error handler
4. add retry/backoff and health check
5. create first CLI validate and run flows
6. validate MCP read-only tools against the same core engine
