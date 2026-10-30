# n8n-mcp-cli

<p align="center">
  <img src="assets/banner.svg" alt="n8n-mcp-cli" width="100%"/>
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

## Why?

Most n8n MCP integrations give you **full admin access** — credentials, destructive operations, auto-fix loops. That works for development. It's risky for CI, shared environments, or autonomous agents.

`n8n-mcp-cli` takes a different approach:

| Feature | This MCP | Full admin MCPs |
|---------|----------|-----------------|
| Workflow validation & health scoring | ✅ Yes | ❌ No |
| Execution trace analysis (timing, errors, regression) | ✅ Yes | ❌ No |
| Failure classification (logic/infra/data/permission/timeout) | ✅ Yes | ❌ No |
| Node suggestions for tasks | ✅ Yes | ❌ No |
| n8n version + health check | ✅ Yes | ❌ No |
| **Credential management** | ❌ Excluded | ✅ Yes |
| **Secret lifecycle** | ❌ Excluded | ✅ Yes |
| **Destructive auto-repair loops** | ❌ Excluded | ✅ Some |

**Result:** A focused operational layer that does validation, diagnostics, and health assessment well, without the risk surface of a full admin wrapper.

---

## Prerequisites

- **Node.js** ≥ 18
- **n8n** running and accessible (tested on 2.12.x, 2.13.x, 2.14.x)
- **n8n API key** with appropriate permissions

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/Souzix76/n8n-mcp-cli.git
cd n8n-mcp-cli
npm install && npm run build
```

### 2. Configure

```bash
cp .env.example .env  # Create from template
# Edit .env with your n8n URL and API key
```

```env
N8N_BASE_URL=http://127.0.0.1:5678
N8N_API_KEY=your_n8n_api_key_here
DEFAULT_TIMEOUT_MS=30000
```

### 3. Run

**As MCP server** (for Hermes Agent, Claude/Codex, or any MCP client):

```bash
# Read-only mode (default)
node dist/mcp/server.js

# Or programmatically with credential mode:
# const server = createMcpServer(client, 'read-only'); // or 'external'
```

**As CLI** — *CLI layer is module-only (no executable entry point yet). Import functions directly:*

```js
import { validateV2Project } from './dist/cli/validate.js';
import { generateV2Report, generateV2ReportCi } from './dist/cli/report.js';
// etc.
```

*CLI executable coming in Phase 3.*

---

## MCP Client Configuration

### Hermes Agent / Claude Code (`~/.claude.json`)

```json
{
  "mcpServers": {
    "n8n-mcp-cli": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/n8n-mcp-cli/dist/mcp/server.js"],
      "env": {
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Codex / Any MCP client

The server uses **stdio transport** — compatible with any MCP client that supports stdio.

---

## How It Works

### Credential Boundary (Read-Only by Default)

The MCP server enforces a strict credential boundary via the `createMcpServer` factory:

| Mode | Allowed Tools | Use Case |
|------|---------------|----------|
| **read-only** (default) | `validate_workflow`, `get_workflow_health`, `get_n8n_version`, `suggest_nodes`, `diagnose_workflow` | Safe inspection, validation, diagnostics |
| **external** | All read-only + `create_workflow` | Write operations requiring credentials |

```js
// Programmatic usage:
import { createMcpServer } from './dist/mcp/server.js';
import { N8nClient } from './dist/core/n8n-client.js';

const client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: process.env.N8N_API_KEY });

// Read-only (default)
const server = createMcpServer(client, 'read-only');

// External mode (write operations)
const server = createMcpServer(client, 'external');
```

**Error handling:** `CredentialBoundaryError` provides actionable remediation messages when a tool is called in an incompatible mode.

---

### Diagnostic Pipeline

The `diagnose_workflow` tool runs a three-stage diagnostic pipeline:

```
Execution Data → Trace Analysis → Failure Classification → Regression Detection
```

**Trace Analysis** — Per-node timing, errors, item counts, and data flow
**Failure Classification** — Taxonomy: logic | infrastructure | data | permission | timeout
**Regression Detection** — Recurrence patterns across historical runs

### Example Output

```json
{
  "workflowId": "1hO3EGpPD5es3pi7",
  "trace": {
    "nodes": 20,
    "totalDurationMs": 3450,
    "nodeTimings": [
      {"name": "HTTP Request", "durationMs": 1200, "status": "success"},
      {"name": "IF", "durationMs": 45, "status": "success"}
    ],
    "errors": []
  },
  "classification": {
    "failures": [
      {"node": "HTTP Request", "type": "infrastructure", "severity": "warning", "message": "Timeout risk detected"}
    ]
  },
  "regression": {
    "recurringFailures": 2,
    "patterns": ["timeout:webhook", "permission:credential"]
  },
  "health": {
    "score": 92,
    "status": "stable"
  }
}
```

---

## Tools Reference

### Diagnostics & Validation (5 tools)

| Tool | Description | Modes |
|------|-------------|-------|
| `validate_workflow` | Validate a workflow and return risk/health summary without mutating anything | read-only, external |
| `get_workflow_health` | Return a workflow health score and risk summary | read-only, external |
| `get_n8n_version` | Get n8n server version + health check (notes API limitation) | read-only, external |
| `suggest_nodes` | Suggest compatible nodes based on a task description | read-only, external |
| `diagnose_workflow` | Comprehensive diagnostics: trace analysis, failure classification, regression detection | read-only, external |

### Write Operations (1 tool)

| Tool | Description | Modes |
|------|-------------|-------|
| `create_workflow` | Create a new workflow (placeholder, requires external mode) | external |

---

## CLI (Module-Only)

*CLI executable not yet available — CLI layer is module-only. Use MCP server or import functions directly.*

```js
// Available modules in dist/cli/
import { validateV2Project } from './dist/cli/validate.js';
import { runV2Suite } from './dist/cli/run.js';
import { generateV2Report, generateV2ReportCi } from './dist/cli/report.js';
import { registryGenerate, registryValidate } from './dist/cli/registry.js';
import { startMcpServer } from './dist/cli/mcp.js';
```

*Executable `n8n-mcp-cli` command coming in Phase 3.*

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | n8n not running or wrong `N8N_BASE_URL` | Verify n8n is up on port 5678; check `.env` |
| `401 Unauthorized` | Invalid or missing `N8N_API_KEY` | Generate key in n8n UI → Settings → API; update `.env` |
| `403 Forbidden` | API key lacks required permissions | Ensure key has workflow read/write access |
| `Timeout` | `DEFAULT_TIMEOUT_MS` too low for large workflows | Increase timeout in `.env` (default 30000ms) |

---

## Architecture

```
├── cli/              # CLI layer — CI/CD, scriptable checks, reports
├── core/             # Shared core — safety, validation, health, retry, errors
├── diagnostics/      # Trace analysis, failure classification, regression
├── mcp/              # MCP layer — AI-safe tool surface, credential boundary
├── recommendations/  # Health scoring, compatibility checks
├── reports/          # JSON, Markdown, HTML, JUnit reports
├── registry/         # MCP registry manifest
├── testing/          # Assertion and suite execution foundations
└── examples/         # CI validation, health check examples
```

### Design Principles

- **Read-only by default** — Safe inspection without mutation
- **Dry-run for mutation paths** — Validate before write
- **Explicit credential boundary** — `read-only` vs `external` modes
- **Structured diagnostics over raw logs** — Evidence-based traces
- **Environment-aware validation** — Context matters
- **Production safety over feature volume** — Trusted operational layer
- **No credential lifecycle management** — Won't read, create, or delete credentials
- **No destructive auto-repair loops** — Reports issues, doesn't auto-fix

---

## Example Configs

The `examples/` directory includes ready-to-use workflows:

| File | Description |
|------|-------------|
| `ci-validation.json` | CI validation workflow example |
| `health-check.json` | Health check workflow example (read-only mode) |

---

## Safety Posture

### Included

- Workflow validation and health scoring
- Execution trace analysis (timing, errors, data flow)
- Failure classification with taxonomy
- Regression detection across historical runs
- Node suggestions for tasks
- n8n version + health check
- MCP registry manifest generation/validation
- Multi-format reporting (JSON, Markdown, HTML, JUnit)

### Deliberately Excluded

- Credentials management
- Secrets lifecycle
- Destructive restore flows
- Autonomous LLM auto-fix loops
- Production deployment operations

---

## Roadmap

- [x] Phase 1 — Governance and safety foundation (Credential Boundary, CLI flags, MCP tools)
- [x] Phase 2 — n8n API integration (real `/api/v1/` endpoints, SQLite API key extraction)
- [ ] Phase 3 — Validation and suite execution
- [ ] Phase 4 — Diagnostics and regression analysis
- [ ] Phase 5 — Recommendation and compatibility engine
- [ ] Phase 6 — Reporting and operational maturity

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit changes (`git commit -m 'feat: add my feature'`)
4. Push to branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## License

[MIT](LICENSE)

---

Built for [n8n](https://n8n.io/) operators who want validation and diagnostics without the risk surface.

Compatible with [Hermes Agent](https://hermes-agent.nousresearch.com/), [Claude/Codex](https://claude.ai/), and any MCP client.