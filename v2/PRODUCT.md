# v2 product model: MCP + CLI

## Core positioning

The v2 is not a generic "MCP tool for workflows". It is a production-safe workflow QA, diagnostics, and governance platform for n8n.

## Why both MCP and CLI are needed

### MCP layer
The MCP layer is the AI-assisted interface.

It is optimized for:
- natural-language interaction
- workflow inspection and health checks
- contextual recommendations
- safe read-only diagnostics
- human-in-the-loop guidance

The MCP layer should not expose destructive capabilities by default.

### CLI layer
The CLI layer is the operational interface.

It is optimized for:
- CI/CD validation
- single-command checks
- batch suite execution
- report generation
- environment-aware validation
- scripted operations in automation pipelines

## Separation of responsibilities

### MCP responsibilities
- explain workflow health
- summarize execution trace
- suggest safe next steps
- answer contextual operational questions
- validate config and workflow risk

### CLI responsibilities
- run validation suites
- generate reports
- compare environments
- enforce read-only and policy gates
- support automation and release checks

## Recommended architecture

The product should share one core engine and expose it through two interfaces:

- MCP: conversational, assistant-friendly layer
- CLI: automation-friendly operational layer

The shared core handles:
- safety policy
- validation
- health scoring
- diagnostics
- reporting
- recommendation logic

## Product rule

If a capability is destructive, unsafe, or environment-altering, it must require:
- explicit policy approval
- dry-run preview
- read-only enforcement by default
- human confirmation in sensitive contexts

## Product promise

The v2 helps teams answer:
- Is this workflow safe to run here?
- Why did it fail?
- What is the current workflow health?
- What is the safest next action?
- Is this an environment-specific risk or a true production issue?

This is the emotional and strategic value of the v2.
