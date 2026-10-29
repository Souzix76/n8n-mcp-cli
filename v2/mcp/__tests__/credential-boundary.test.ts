import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMcpServer } from '../server.js';
import { N8nClient } from '../../core/n8n-client.js';
import { CredentialBoundaryError } from '../../core/errors.js';

describe('MCP Server Credential Boundary', () => {
  let mockClient: N8nClient;
  let server: ReturnType<typeof createMcpServer>;

  beforeEach(() => {
    // Create a minimal mock client
    mockClient = {
      getWorkflow: vi.fn(),
      getExecution: vi.fn(),
      getExecutions: vi.fn().mockResolvedValue({ data: [{ id: 'exec-1' }] }),
      healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }),
    } as unknown as N8nClient;

    server = createMcpServer(mockClient, 'read-only');
  });

  it('allows validate_workflow in read-only mode', async () => {
    const result = await server.callTool('validate_workflow', { workflowId: 'wf-1' });
    expect(result).toEqual({
      workflowId: 'wf-1',
      status: 'safe-check',
      summary: 'Validation scaffold ready for v2.',
    });
  });

  it('allows get_workflow_health in read-only mode', async () => {
    const result = await server.callTool('get_workflow_health', { workflowId: 'wf-1' });
    expect(result).toEqual({
      workflowId: 'wf-1',
      health: 'stable',
      score: 92,
    });
  });

  it('allows suggest_nodes in read-only mode', async () => {
    const result = await server.callTool('suggest_nodes', { task: 'test task' });
    expect(result).toEqual({
      task: 'test task',
      suggestions: ['HTTP Request', 'Set', 'IF'],
    });
  });

  it('allows diagnose_workflow in read-only mode', async () => {
    mockClient.getWorkflow = vi.fn().mockResolvedValue({ id: 'wf-1', name: 'Test' });
    mockClient.getExecution = vi.fn().mockResolvedValue({ 
      id: 'exec-1', 
      status: 'success', 
      data: { resultData: { runData: {} } } 
    });
    mockClient.getExecutions = vi.fn().mockResolvedValue({ data: [{ id: 'exec-1' }] });

    const result = await server.callTool('diagnose_workflow', { workflowId: 'wf-1' });
    expect(result).toBeDefined();
    expect(result.workflowId).toBe('wf-1');
  });

  it('blocks create_workflow in read-only mode', async () => {
    await expect(server.callTool('create_workflow', { name: 'Test' }))
      .rejects.toThrow(CredentialBoundaryError);
  });

  it('throws CredentialBoundaryError with correct details for create_workflow', async () => {
    try {
      await server.callTool('create_workflow', { name: 'Test' });
    } catch (e) {
      expect(e).toBeInstanceOf(CredentialBoundaryError);
      expect((e as CredentialBoundaryError).mode).toBe('read-only');
      expect((e as CredentialBoundaryError).operation).toBe('create_workflow');
      expect((e as CredentialBoundaryError).remediation).toContain('--credential-mode=external');
    }
  });

  it('allows all tools in external mode', async () => {
    const externalServer = createMcpServer(mockClient, 'external');
    
    // All read tools should work
    await expect(externalServer.callTool('validate_workflow', { workflowId: 'wf-1' })).resolves.toBeDefined();
    await expect(externalServer.callTool('get_workflow_health', { workflowId: 'wf-1' })).resolves.toBeDefined();
    await expect(externalServer.callTool('suggest_nodes', { task: 'test' })).resolves.toBeDefined();
    
    // Write tool should work in external mode
    const result = await externalServer.callTool('create_workflow', { name: 'Test' });
    expect(result).toEqual({
      name: 'Test',
      status: 'created',
      message: 'Workflow creation not yet implemented - placeholder for external mode',
    });
  });

  it('allows credential mode to be changed at runtime', async () => {
    expect(server.getCredentialMode()).toBe('read-only');
    
    server.setCredentialMode('external');
    expect(server.getCredentialMode()).toBe('external');
    
    // Now create_workflow should work
    const result = await server.callTool('create_workflow', { name: 'Test' });
    expect(result.status).toBe('created');
  });

  it('throws for unknown tool', async () => {
    await expect(server.callTool('unknown_tool', {}))
      .rejects.toThrow('Unknown MCP tool: unknown_tool');
  });
});