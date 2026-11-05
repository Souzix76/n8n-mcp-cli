# Architecture

## Components

- `v2/mcp/server.ts` — MCP server entrypoint with stdio transport and explicit tool surface
- `v2/cli/index.ts` — CLI runner for config-driven test execution
- `v2/core/n8n-client.ts` — thin REST client around n8n endpoints
- `v2/diagnostics/diagnose.ts` — workflow result evaluation and scoring
- `v2/registry/` — local node catalog helpers
- `v2/core/__tests__/n8n-client.test.ts` — n8n client tests
- `v2/diagnostics/__tests__/trace-analyzer.test.ts` — trace analysis tests
- `v2/cli/__tests__/credential-mode.test.ts` — credential boundary tests

## Execution modes

### MCP stdio mode
Registers tools via stdio protocol; tools include validation, diagnostics, workflow health, node suggestions, execution traces, error classification, regression detection, version checks, and external access controls.

### CLI mode
Config-driven command-line execution for validation, diagnosis, and workflow health checks.

## Design constraints

- stdio MCP transport only
- explicit tool surface
- small dependency footprint
- credential boundary (read-only by default, external mode when needed)
- no agentic auto-repair loop

## Intended use

This project is meant for operators and agents who want a safer control surface than a broad unrestricted n8n admin wrapper. Supports safe introspection, validation, diagnostics, and controlled external access to n8n workflows via credential boundary enforcement.
