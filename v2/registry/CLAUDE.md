# n8n-mcp-cli — MCP Registry Package

This package provides an MCP server for n8n workflow validation, health checking, and diagnostics.

## Installation

```bash
# Via npx (recommended)
npx n8n-mcp-cli@latest mcp

# Or install globally
npm install -g n8n-mcp-cli
n8n-mcp-cli mcp
```

## Configuration

The MCP server requires the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_BASE_URL` | Yes | Base URL of your n8n instance (e.g., `https://your-n8n.example.com`) |
| `N8N_API_KEY` | Yes | API key for n8n authentication |

Example `.env` file:
```env
N8N_BASE_URL=https://your-n8n.example.com
N8N_API_KEY=your-api-key-here
```

## Available MCP Tools

### `validate_workflow`
Validate a workflow and return risk and health summary without mutating anything.

**Arguments:**
- `workflowId` (string, required): The n8n workflow ID to validate

**Returns:**
```json
{
  "workflowId": "string",
  "status": "safe-check",
  "summary": "Validation complete",
  "riskScore": 15,
  "issues": []
}
```

### `get_workflow_health`
Return a workflow health score and risk summary.

**Arguments:**
- `workflowId` (string, required): The n8n workflow ID to check

**Returns:**
```json
{
  "workflowId": "string",
  "health": "stable",
  "score": 92,
  "lastRun": "2026-10-29T10:00:00Z",
  "bottlenecks": []
}
```

### `suggest_nodes`
Suggest compatible nodes based on a task description and workflow context.

**Arguments:**
- `task` (string, required): Description of the task to accomplish

**Returns:**
```json
{
  "task": "string",
  "suggestions": ["HTTP Request", "Set", "IF", "Function"]
}
```

### `diagnose_workflow` (Diagnostics Layer)
Run comprehensive diagnostics on a workflow including trace analysis, failure classification, and regression detection.

**Arguments:**
- `workflowId` (string, required): The n8n workflow ID to diagnose
- `lookbackRuns` (number, optional, default: 10): Number of historical runs to analyze

**Returns:**
```json
{
  "workflowId": "string",
  "currentRun": { ... },
  "history": [...],
  "regressions": [...],
  "policyDrift": [...],
  "recommendation": "investigate",
  "flakyNodes": ["node1", "node2"],
  "driftingNodes": ["node3"],
  "newFailures": ["node4"],
  "overallHealth": "degraded",
  "recommendations": [
    "Check node3 for timeout configuration",
    "Investigate regression in node4 error rate"
  ]
}
```

## Usage with MCP Clients

### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "n8n-mcp-cli": {
      "command": "npx",
      "args": ["n8n-mcp-cli@latest", "mcp"],
      "env": {
        "N8N_BASE_URL": "https://your-n8n.example.com",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor / VS Code (with MCP extension)
```json
{
  "mcp": {
    "servers": {
      "n8n-mcp-cli": {
        "command": "npx",
        "args": ["n8n-mcp-cli@latest", "mcp"],
        "env": {
          "N8N_BASE_URL": "https://your-n8n.example.com",
          "N8N_API_KEY": "your-api-key"
        }
      }
    }
  }
}
```

## CLI Commands

```bash
# Run MCP server
n8n-mcp-cli mcp

# Validate workflow
n8n-mcp-cli validate --workflow-id <id>

# Run diagnostics
n8n-mcp-cli diagnose --workflow-id <id> --lookback 10

# Generate health report
n8n-mcp-cli report --workflow-id <id>
```

## Development

```bash
# Clone repo
git clone https://github.com/Souzix76/n8n-mcp-cli.git
cd n8n-mcp-cli

# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build

# Run MCP server locally
npm run mcp
```

## Architecture

- **Core**: `N8nClient` for API communication, `ConfigSchema` for validation, `AsyncRunner` for bounded execution
- **Diagnostics**: `TraceAnalyzer`, `FailureClassifier`, `RegressionDetector`, `DiagnoseEngine`
- **MCP**: `McpServer` exposing tools via stdio transport
- **CLI**: Command registry with validate, run, report, diagnose commands

## Requirements

- Node.js 18+
- n8n instance with API access
- Valid n8n API key

## License

MIT