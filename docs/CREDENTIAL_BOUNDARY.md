# Credential Boundary Specification

## Overview

The **Credential Boundary** is a security mechanism that controls how n8n-mcp-cli handles authentication credentials (N8N_API_KEY, N8N_BASE_URL) and what operations are permitted based on the configured mode.

This prevents accidental credential leakage and enforces least-privilege access patterns.

---

## Credential Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `read-only` | Only read operations allowed. Write operations blocked. | Default mode. Safe for CI/CD, shared environments, read-only dashboards. |
| `external` | All operations allowed. Credentials managed externally (env vars). | Development, admin tools, workflow creation scripts. |

### Default Mode
- **Default**: `read-only`
- Can be overridden via `--credential-mode=external` CLI flag
- Can be changed at runtime via `server.setCredentialMode('external')`

---

## Tool Permission Matrix

| MCP Tool | read-only | external | Description |
|----------|-----------|----------|-------------|
| `validate_workflow` | ✅ | ✅ | Validate workflow health/risk |
| `get_workflow_health` | ✅ | ✅ | Get health score and risk summary |
| `suggest_nodes` | ✅ | ✅ | Suggest compatible nodes (no API call) |
| `diagnose_workflow` | ✅ | ✅ | Full diagnostics (read-only analysis) |
| `create_workflow` | ❌ | ✅ | Create new workflow (placeholder) |

> **Note**: `suggest_nodes` requires no API credentials as it uses static knowledge.

---

## CLI Usage

### Start MCP Server in Read-Only Mode (Default)
```bash
n8n-mcp-cli mcp
# or explicitly:
n8n-mcp-cli mcp --credential-mode=read-only
```

### Start MCP Server in External Mode
```bash
n8n-mcp-cli mcp --credential-mode=external
# or:
n8n-mcp-cli mcp --credential-mode external
```

### Environment Variables Required
```bash
export N8N_BASE_URL=https://your-n8n.example.com
export N8N_API_KEY=your-api-key-here
n8n-mcp-cli mcp --credential-mode=external
```

---

## MCP Client Configuration

### Read-Only Mode (Recommended for most clients)
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

### External Mode (For write operations)
```json
{
  "mcpServers": {
    "n8n-mcp-cli": {
      "command": "npx",
      "args": ["n8n-mcp-cli@latest", "mcp", "--credential-mode=external"],
      "env": {
        "N8N_BASE_URL": "https://your-n8n.example.com",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Error Handling

### CredentialBoundaryError

When a tool is called in a mode that doesn't permit it, a `CredentialBoundaryError` is thrown with structured details:

```typescript
{
  name: 'CredentialBoundaryError',
  message: "Tool 'create_workflow' not allowed in read-only credential mode",
  mode: 'read-only',           // Current mode
  operation: 'create_workflow', // Attempted operation
  remediation: 'Use --credential-mode=external to enable write operations, or ensure N8N_API_KEY is set for read operations.'
}
```

### Handling in MCP Clients

MCP clients should catch this error and present the remediation to the user:

```typescript
try {
  await client.callTool('create_workflow', { name: 'My Workflow' });
} catch (error) {
  if (error.name === 'CredentialBoundaryError') {
    console.error(`Permission denied: ${error.message}`);
    console.error(`Remediation: ${error.remediation}`);
    // Show user the remediation hint
  }
}
```

---

## Security Best Practices

### 1. Never Log Credentials
```typescript
// ❌ BAD - logs API key
console.log(`Using API key: ${process.env.N8N_API_KEY}`);

// ✅ GOOD - no credential logging
console.log('Starting MCP server in external mode');
```

### 2. Use Read-Only by Default
```bash
# CI/CD pipelines should always use read-only
n8n-mcp-cli mcp --credential-mode=read-only
```

### 3. External Mode Only When Needed
```bash
# Development/admin scripts
n8n-mcp-cli mcp --credential-mode=external
```

### 4. Validate Environment Early
```typescript
// The dep-guard and validation layer check this at startup
import { validateDependenciesSync } from './core/dep-guard.js';
validateDependenciesSync(); // Throws if N8N_API_KEY missing in external mode
```

### 5. Rotate Credentials Regularly
- Use n8n API key rotation
- Store in secret manager (not .env files in repo)
- Audit access logs

---

## Error Codes Reference

| Code | HTTP Status | Description | Remediation |
|------|-------------|-------------|-------------|
| `CREDENTIAL_BOUNDARY` | 403 | Operation not allowed in current mode | Switch to external mode or use read-only tools |
| `MISSING_CREDENTIALS` | 401 | N8N_API_KEY or N8N_BASE_URL not set | Set environment variables |
| `INVALID_CREDENTIALS` | 401 | API key rejected by n8n | Verify key is valid and not expired |
| `INVALID_MODE` | 400 | Invalid --credential-mode value | Use 'read-only' or 'external' |

---

## Testing Credential Boundaries

### Unit Tests
```bash
# Run credential boundary tests
npm test -- v2/mcp/__tests__/credential-boundary.test.ts
npm test -- v2/cli/__tests__/credential-mode.test.ts
npm test -- v2/core/__tests__/errors.test.ts
```

### Manual Verification
```bash
# Test read-only blocks write
n8n-mcp-cli mcp --credential-mode=read-only
# In another terminal, try calling create_workflow via MCP client
# Should receive CredentialBoundaryError

# Test external allows write
n8n-mcp-cli mcp --credential-mode=external
# create_workflow should succeed (when implemented)
```

### CI/CD Integration
```yaml
# .github/workflows/validate.yml
- name: Test read-only mode
  run: |
    n8n-mcp-cli mcp --credential-mode=read-only &
    sleep 2
    # Test that read tools work
    # Test that write tools are blocked
```

---

## Architecture

### Components

1. **`v2/core/errors.ts`** - `CredentialBoundaryError` class + factory
2. **`v2/mcp/server.ts`** - `McpServer` class with mode enforcement
3. **`v2/cli/commands.ts`** - CLI flag parsing (`--credential-mode`)
4. **`v2/core/validation.ts`** - Environment variable validation

### Flow

```
CLI args (--credential-mode) 
    → parseCredentialMode() 
    → createMcpServer(client, mode) 
    → McpServer.setCredentialMode(mode)
    → Tool call → checkCredentialAccess() 
    → Allow or throw CredentialBoundaryError
```

---

## Implementation Checklist

- [x] `CredentialBoundaryError` class with mode, operation, remediation
- [x] `CredentialMode` type (`read-only` | `external`)
- [x] `McpServer` enforces boundary per tool via `allowedModes`
- [x] CLI `--credential-mode` flag parsing
- [x] Default mode: `read-only`
- [x] Tool permission matrix implemented
- [x] Structured error responses with remediation
- [x] Tests for all boundary conditions
- [x] Documentation

---

## Future Enhancements

1. **Audit Logging** - Log all credential boundary decisions
2. **Scoped Credentials** - Per-workflow API keys
3. **Time-Limited External Mode** - Auto-revert to read-only after TTL
4. **Credential Rotation API** - Hot-reload credentials without restart
5. **OAuth Integration** - Support n8n OAuth flows

---

## Related Files

| File | Purpose |
|------|---------|
| `v2/core/errors.ts` | Error classes and factory |
| `v2/mcp/server.ts` | MCP server with boundary enforcement |
| `v2/cli/commands.ts` | CLI flag parsing |
| `v2/core/validation.ts` | Env var validation |
| `v2/mcp/__tests__/credential-boundary.test.ts` | MCP boundary tests |
| `v2/cli/__tests__/credential-mode.test.ts` | CLI flag tests |
| `v2/core/__tests__/errors.test.ts` | Error class tests |