# Architecture

## Components

- `src/index.ts` — MCP server entrypoint and tool registration
- `src/cli.ts` — CLI runner for config-driven test execution
- `src/n8n-client.ts` — thin REST client around n8n endpoints
- `src/evaluator.ts` — workflow result evaluation and scoring
- `src/catalog.ts` — local node catalog helpers
- `workflows/example.json` — example test suite definition

## Execution modes

### Webhook mode
Calls a webhook path or absolute URL with JSON payload.

### Execute mode
Calls the n8n REST execution endpoint for a workflow ID.

## Design constraints

- stdio MCP transport only
- explicit tool surface
- small dependency footprint
- no credential lifecycle management
- no agentic auto-repair loop

## Intended use

This project is meant for operators and agents who want a safer control surface than a broad unrestricted n8n admin wrapper.
