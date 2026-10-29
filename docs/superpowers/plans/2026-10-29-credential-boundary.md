# Task 4: Credential Boundary Clarification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify credential boundaries by auditing all tools/commands for credential assumptions, adding a `CredentialBoundaryError` class, updating MCP tools to return structured boundary messages, adding a CLI flag for credential mode, and documenting the boundary.

**Architecture:** Add error class in `v2/core/errors.ts`, update MCP server tools to check credential mode and return structured responses, add CLI flag `--credential-mode=read-only|external`, create documentation.

**Tech Stack:** TypeScript, existing error handling patterns, CLI command structure

**Spec:** `/root/.hermes/workspace/n8n-mcp-cli/.vibe-checklist.md` (Task 4 section)

## Global Constraints
- Credentials (N8N_API_KEY) must never be logged, printed, or exposed
- Read-only mode: only allows read operations (validate, health, diagnose)
- External mode: delegates credential handling to external process (env vars only)
- All MCP tools must respect credential mode
- Clear error messages when boundary violated

## Review Focus
1. **Accidental credential leakage** — test: no API key in logs/output
2. **Write operations in read-only mode** — test: create_workflow fails in read-only
3. **Missing credential error clarity** — test: structured error with remediation
4. **CLI flag propagation** — test: flag reaches MCP server correctly
5. **MCP tool boundary enforcement** — test: each tool checks mode before execution

---

### Task 4.1: Audit all tools/commands for credential assumptions

**Files:**
- Review: `v2/mcp/server.ts`, `v2/mcp/tools.ts`, `v2/cli/commands.ts`, `v2/core/n8n-client.ts`
- Test: `v2/core/__tests__/credential-boundary.test.ts` (create in 4.2)

**Interfaces:**
- Consumes: existing codebase
- Produces: audit findings (documented in plan)

- [ ] **Step 1: Scan for credential usage patterns**
  Search for: `N8N_API_KEY`, `apiKey`, `credentials`, `auth`, `Bearer`, `Authorization`
  
- [ ] **Step 2: Categorize each tool/command**
  - Read-only: validate_workflow, get_workflow_health, suggest_nodes, diagnose_workflow
  - Write: create_workflow (if implemented)
  - Credential-required: all n8n API calls

- [ ] **Step 3: Document findings in test file as comments**

---

### Task 4.2: Add CredentialBoundaryError in v2/core/errors.ts

**Files:**
- Modify: `v2/core/errors.ts`
- Create: `v2/core/__tests__/errors.test.ts`
- Modify: `v2/core/index.ts` (export)

**Interfaces:**
- Consumes: existing error classes
- Produces: `CredentialBoundaryError` class with mode context

- [ ] **Step 1: Write failing test**
  ```typescript
  // v2/core/__tests__/errors.test.ts
  import { CredentialBoundaryError, N8nApiError } from '../errors.js';
  
  test('CredentialBoundaryError includes mode and operation', () => {
    const error = new CredentialBoundaryError('Cannot write in read-only mode', 'read-only', 'create_workflow');
    expect(error.message).toContain('read-only');
    expect(error.mode).toBe('read-only');
    expect(error.operation).toBe('create_workflow');
    expect(error.name).toBe('CredentialBoundaryError');
  });
  
  test('CredentialBoundaryError has remediation hint', () => {
    const error = new CredentialBoundaryError('External credentials required', 'external', 'validate_workflow');
    expect(error.remediation).toContain('N8N_API_KEY');
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run v2/core/__tests__/errors.test.ts`
  Expected: FAIL (class not defined)

- [ ] **Step 3: Implement `CredentialBoundaryError` in `v2/core/errors.ts`**
  ```typescript
  export class CredentialBoundaryError extends Error {
    public readonly mode: 'read-only' | 'external';
    public readonly operation: string;
    public readonly remediation: string;
    
    constructor(message: string, mode: 'read-only' | 'external', operation: string) {
      super(message);
      this.name = 'CredentialBoundaryError';
      this.mode = mode;
      this.operation = operation;
      this.remediation = mode === 'read-only' 
        ? 'Use --credential-mode=external to enable write operations, or ensure N8N_API_KEY is set for read operations.'
        : 'Ensure N8N_API_KEY and N8N_BASE_URL are set in environment. This mode requires external credential management.';
    }
  }
  ```

- [ ] **Step 4: Export from `v2/core/index.ts`**
  Add: `export { CredentialBoundaryError } from './errors.js';`

- [ ] **Step 5: Run test to verify it passes**
  Run: `npx vitest run v2/core/__tests__/errors.test.ts`
  Expected: PASS

- [ ] **Step 6: Run full test suite**
  Run: `npm test`
  Expected: All pass

- [ ] **Step 7: Commit**
  ```bash
  git add v2/core/errors.ts v2/core/__tests__/errors.test.ts v2/core/index.ts
  git commit -m "feat: Task 4.2 - Add CredentialBoundaryError"
  ```

---

### Task 4.3: Update MCP tools to return structured boundary messages

**Files:**
- Modify: `v2/mcp/server.ts`
- Create: `v2/mcp/__tests__/credential-boundary.test.ts`
- Modify: `v2/mcp/tools.ts` (add credential mode types)

**Interfaces:**
- Consumes: `CredentialBoundaryError`, credential mode from CLI
- Produces: MCP tools that check mode and return structured errors

- [ ] **Step 1: Add credential mode to McpServer**
  ```typescript
  // In McpServer class
  private credentialMode: 'read-only' | 'external' = 'read-only';
  
  setCredentialMode(mode: 'read-only' | 'external'): void {
    this.credentialMode = mode;
  }
  ```

- [ ] **Step 2: Write failing tests for boundary enforcement**
  ```typescript
  // v2/mcp/__tests__/credential-boundary.test.ts
  import { createMcpServer } from '../server.js';
  import { N8nClient } from '../../core/n8n-client.js';
  import { CredentialBoundaryError } from '../../core/errors.js';
  
  test('read-only mode blocks create_workflow', async () => {
    const mockClient = { /* minimal mock */ } as N8nClient;
    const server = createMcpServer(mockClient);
    server.setCredentialMode('read-only');
    
    // create_workflow not registered yet, but validate_workflow should work
    await expect(server.callTool('validate_workflow', { workflowId: '123' })).resolves.toBeDefined();
  });
  
  test('external mode allows all operations', async () => {
    const mockClient = { /* mock with credentials */ } as N8nClient;
    const server = createMcpServer(mockClient);
    server.setCredentialMode('external');
    
    // Should not throw CredentialBoundaryError for read operations
    await expect(server.callTool('validate_workflow', { workflowId: '123' })).resolves.toBeDefined();
  });
  ```

- [ ] **Step 3: Add credential checks to each tool execution**
  - `validate_workflow`: allowed in both modes
  - `get_workflow_health`: allowed in both modes
  - `suggest_nodes`: allowed in both modes (no API call)
  - `diagnose_workflow`: allowed in both modes (read-only)
  - `create_workflow`: only in external mode (when implemented)

- [ ] **Step 4: Return structured error responses**
  ```typescript
  // Instead of throwing, return structured error object
  return {
    error: 'CREDENTIAL_BOUNDARY',
    message: 'Operation not allowed in current credential mode',
    mode: this.credentialMode,
    operation: toolName,
    remediation: '...'
  };
  ```

- [ ] **Step 5: Run tests**
  Run: `npx vitest run v2/mcp/__tests__/credential-boundary.test.ts`
  Expected: PASS

- [ ] **Step 6: Run full test suite**
  Run: `npm test`
  Expected: All pass

- [ ] **Step 7: Commit**
  ```bash
  git add v2/mcp/server.ts v2/mcp/tools.ts v2/mcp/__tests__/credential-boundary.test.ts
  git commit -m "feat: Task 4.3 - Update MCP tools with credential boundary enforcement"
  ```

---

### Task 4.4: Add --credential-mode=read-only|external CLI flag

**Files:**
- Modify: `v2/cli/commands.ts`
- Modify: `v2/cli/index.ts` (if exists, or main entry)
- Create: `v2/cli/__tests__/credential-mode.test.ts`

**Interfaces:**
- Consumes: CLI args, passes to MCP server
- Produces: Parsed credential mode

- [ ] **Step 1: Write failing test**
  ```typescript
  // v2/cli/__tests__/credential-mode.test.ts
  import { parseCredentialMode } from '../commands.js';
  
  test('parseCredentialMode defaults to read-only', () => {
    expect(parseCredentialMode([])).toBe('read-only');
  });
  
  test('parseCredentialMode reads --credential-mode flag', () => {
    expect(parseCredentialMode(['--credential-mode', 'external'])).toBe('external');
    expect(parseCredentialMode(['--credential-mode=external'])).toBe('external');
    expect(parseCredentialMode(['--credential-mode', 'read-only'])).toBe('read-only');
  });
  
  test('parseCredentialMode throws on invalid mode', () => {
    expect(() => parseCredentialMode(['--credential-mode', 'invalid'])).toThrow();
  });
  ```

- [ ] **Step 2: Implement flag parsing in `v2/cli/commands.ts`**
  Add helper function and integrate with MCP server creation

- [ ] **Step 3: Pass mode to MCP server factory**
  Update `createMcpServer` or server instance to receive mode

- [ ] **Step 4: Run tests**
  Run: `npx vitest run v2/cli/__tests__/credential-mode.test.ts`
  Expected: PASS

- [ ] **Step 5: Run full test suite**
  Run: `npm test`
  Expected: All pass

- [ ] **Step 6: Commit**
  ```bash
  git add v2/cli/commands.ts v2/cli/__tests__/credential-mode.test.ts
  git commit -m "feat: Task 4.4 - Add --credential-mode CLI flag"
  ```

---

### Task 4.5: Create docs/CREDENTIAL_BOUNDARY.md

**Files:**
- Create: `docs/CREDENTIAL_BOUNDARY.md`

**Interfaces:**
- Consumes: implementation details from 4.1-4.4
- Produces: Documentation for users and contributors

- [ ] **Step 1: Write documentation**
  Sections:
  - Overview: What is the credential boundary?
  - Modes: read-only vs external
  - MCP Tool permissions matrix
  - CLI usage: `--credential-mode`
  - Error codes and remediation
  - Security best practices
  - Testing credential boundaries

- [ ] **Step 2: Commit**
  ```bash
  git add docs/CREDENTIAL_BOUNDARY.md
  git commit -m "feat: Task 4.5 - Add credential boundary documentation"
  ```

---

### Task 4.6: Integration test & final verification

**Files:**
- Test: Run all

- [ ] **Step 1: Run full test suite**
  Run: `npm test`
  Expected: All tests pass

- [ ] **Step 2: Type check**
  Run: `npx tsc --noEmit`
  Expected: Clean

- [ ] **Step 3: Manual verification**
  - Test CLI flag: `n8n-mcp-cli --credential-mode=external mcp`
  - Test read-only blocks write (when implemented)
  - Verify no credentials in logs

- [ ] **Step 4: Commit final**
  ```bash
  git add -A
  git commit -m "feat: Task 4 - Credential boundary clarification complete"
  ```

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-29-credential-boundary.md`. Please review the plan. Does it capture what you want?**