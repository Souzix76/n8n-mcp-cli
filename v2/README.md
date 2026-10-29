# n8n-workflow-tester-safe v2

<p align="center">
  <img src="../assets/banner.svg" alt="n8n-workflow-tester-safe v2" width="100%"/>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-E8784A.svg" alt="License: MIT"/></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Compatible-D4A574.svg" alt="MCP Compatible"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript"/></a>
  <a href="https://n8n.io"><img src="https://img.shields.io/badge/n8n-2.12+-FF6D5A.svg" alt="n8n"/></a>
</p>

<p align="center">
  <strong>Production-safe QA and workflow health platform for n8n</strong><br/>
  <em>Governed validation, diagnostics, and operational readiness for workflow automation.</em>
</p>

---

## Why v2?

Most n8n integrations optimize for speed and access, but that often means broad admin permissions, destructive operations, and weak operational safety.

This v2 takes a different approach:

| Concern | v1 style approach | v2 approach |
|---------|-------------------|------------|
| Workflow creation | Often AI-driven and broad | Safe, policy-aware, environment-scoped |
| Execution safety | Reactive | Proactive validation before run |
| Failure diagnosis | Basic logs | Evidence-based operational trace |
| Risk posture | Often implicit | Explicit and governed |
| Production readiness | Not always enforced | Policy-gated and CI-friendly |

The v2 is designed to answer the questions operators, QA teams, and AI assistants actually need:

- Is this workflow safe for this environment?
- Why did it fail?
- Where did it fail?
- What is the workflow health score?
- What is the safest next action?

---

## Product identity

`n8n-workflow-tester-safe v2` is a dedicated product line on branch `v2/production-safe-qa`.

It is intentionally separate from the original v1 implementation and focuses on:

- production-safe validation
- workflow health assessment
- operational diagnostics
- environment-aware execution checks
- recommendations based on evidence
- read-only governance by default

This v2 is not a full admin wrapper and it is not an autonomous destructive agent.
It is a trusted operational layer for n8n workflows.

---

## Strategic goals

1. Validate workflow health before production use
2. Detect operational risk early and with evidence
3. Explain why a workflow failed and where it failed
4. Recommend safe next steps based on context
5. Keep workflow automation inside safe boundaries

---

## Design principles

- Read-only by default
- Dry-run for mutation paths
- Human approval for riskier actions
- Structured diagnostics over raw logs
- Environment-aware validation
- Production safety over feature volume
- No credential lifecycle management
- No destructive auto-repair loops

---

## Architecture

The v2 is composed of three layers:

### 1. Shared core

The shared core holds the product logic:

- security and policies
- validation rules
- health checks
- retry and backoff
- structured logging and audit
- runtime error handling
- workflow health scoring
- recommendation engine foundation
- reporting and evidence generation

### 2. MCP layer

The MCP layer is the AI-assisted interface.

It is optimized for:

- natural-language workflow inspection
- health summaries
- execution trace interpretation
- safe recommendations
- contextual operational questions

This layer is explicit and safe by default.

### 3. CLI layer

The CLI layer is the operational interface.

It is optimized for:

- CI/CD validation
- scriptable checks
- environment validation
- report generation
- dry-run and policy enforcement
- automation without a chat client

---

## Product pillars

### 1. Production-safe validation
Interpretation happens in the context of the operating environment, not only in local success/failure terms.

### 2. Workflow health scoring
The v2 moves beyond pass/fail by scoring quality in categories such as:

- reliability
- data integrity
- compatibility
- operational risk
- maintainability

### 3. Operational diagnosis
Capture enough evidence to answer:

- what failed
- where it failed
- whether the root cause is logic, infrastructure, or data
- whether the issue matches known regression patterns

### 4. Recommendation engine
Provide actionable guidance based on:

- execution evidence
- previous failures
- environment context
- workflow structure
- compatibility and risk patterns

### 5. Governance and reporting
Generate output that is useful to:

- engineers
- QA teams
- operators
- CI pipelines
- release reviews

---

## Scope of this v2 branch

This branch focuses on:

- architecture and product strategy
- safe validation engine
- workflow health and risk analysis
- reports and evidence generation
- recommendation and compatibility checks
- CLI and MCP safe operational patterns

The v1 implementation remains untouched and continues as the stable baseline.

---

## Current v2 scaffold

This branch includes the initial product foundation for the v2 line:

- `v2/core/` — safety, validation, retry, logging, health
- `v2/cli/` — validation and execution commands
- `v2/mcp/` — AI-safe tool surface
- `v2/testing/` — assertion and suite execution foundations
- `v2/reports/` — JSON, Markdown, HTML, and JUnit reports
- `v2/recommendations/` — health and compatibility recommendations
- `v2/PLAN.md` — roadmap and strategic milestones

---

## Safety posture

### Included
- workflow health checks
- validation before execution
- policy-aware execution flow
- dry-run previews
- structured logs and audit trail
- environment-aware checks

### Deliberately excluded
- credential lifecycle management
- secret administration
- autonomous repair loops
- destructive recovery actions
- uncontrolled mutation of production workflows

---

## Roadmap

- [ ] Phase 1 — Governance and safety foundation
- [ ] Phase 2 — Validation and suite execution
- [ ] Phase 3 — Diagnostics and regression analysis
- [ ] Phase 4 — Recommendation and compatibility engine
- [ ] Phase 5 — Reporting and operational maturity

---

## Contributing

1. Work only within the `v2/production-safe-qa` branch
2. Do not modify the original v1 implementation
3. Keep changes aligned with the v2 product identity
4. Prefer safe validation and evidence over automatic correction
5. Keep operational policies explicit and environment-aware

---

## License

[MIT](../LICENSE)

---

<p align="center">
  Built for <a href="https://n8n.io">n8n</a> operators who want traceability, safety, and operational clarity without the risk surface of a broad admin wrapper.<br/>
  Compatible with AI-assisted MCP clients and automation-focused CLI workflows.
</p>
