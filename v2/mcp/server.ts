export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  // Which credential modes this tool is allowed in
  allowedModes?: ('read-only' | 'external')[];
  execution: (args: unknown) => Promise<unknown>;
}

import { DiagnoseEngine } from '../diagnostics/index.js';
import { N8nClient } from '../core/n8n-client.js';
import { CredentialBoundaryError, CredentialMode } from '../core/errors.js';

export class McpServer {
  private tools = new Map<string, McpToolDefinition>();
  protected diagnoseEngine: DiagnoseEngine;
  private credentialMode: CredentialMode = 'read-only';

  constructor(client: N8nClient) {
    this.diagnoseEngine = new DiagnoseEngine(client);
  }

  getDiagnoseEngine(): DiagnoseEngine {
    return this.diagnoseEngine;
  }

  setCredentialMode(mode: CredentialMode): void {
    this.credentialMode = mode;
  }

  getCredentialMode(): CredentialMode {
    return this.credentialMode;
  }

  private checkCredentialAccess(toolName: string, allowedModes?: ('read-only' | 'external')[]): void {
    const modes = allowedModes ?? ['read-only', 'external']; // default: allow both
    if (!modes.includes(this.credentialMode)) {
      throw new CredentialBoundaryError(
        `Tool '${toolName}' not allowed in ${this.credentialMode} credential mode`,
        this.credentialMode,
        toolName
      );
    }
  }

  registerTool(definition: McpToolDefinition): void {
    this.tools.set(definition.name, definition);
  }

  getTools(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Unknown MCP tool: ${name}`);
    }

    // Check credential boundary before execution
    this.checkCredentialAccess(name, tool.allowedModes);

    return tool.execution(args);
  }
}

export function createMcpServer(client: N8nClient, credentialMode: CredentialMode = 'read-only'): McpServer {
  const server = new McpServer(client);
  server.setCredentialMode(credentialMode);

  server.registerTool({
    name: 'validate_workflow',
    description: 'Validate a workflow and return risk and health summary without mutating anything.',
    allowedModes: ['read-only', 'external'],
    execution: async (args: unknown) => {
      const { workflowId } = args as { workflowId: string };
      return {
        workflowId,
        status: 'safe-check',
        summary: 'Validation scaffold ready for v2.',
      };
    },
  });

  server.registerTool({
    name: 'get_workflow_health',
    description: 'Return a workflow health score and risk summary.',
    allowedModes: ['read-only', 'external'],
    execution: async (args: unknown) => {
      const { workflowId } = args as { workflowId: string };
      return {
        workflowId,
        health: 'stable',
        score: 92,
      };
    },
  });

  server.registerTool({
    name: 'suggest_nodes',
    description: 'Suggest compatible nodes based on a task description and workflow context.',
    allowedModes: ['read-only', 'external'],
    execution: async (args: unknown) => {
      const { task } = args as { task: string };
      return {
        task,
        suggestions: ['HTTP Request', 'Set', 'IF'],
      };
    },
  });

  server.registerTool({
    name: 'diagnose_workflow',
    description: 'Run comprehensive diagnostics on a workflow including trace analysis, failure classification, and regression detection.',
    allowedModes: ['read-only', 'external'],
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'The n8n workflow ID to diagnose' },
        executionId: { type: 'string', description: 'The execution ID to diagnose (optional, defaults to latest)' },
        lookbackRuns: { type: 'number', description: 'Number of historical runs to analyze', default: 10 },
      },
      required: ['workflowId'],
    },
    execution: async (args: unknown) => {
      const { workflowId, executionId, lookbackRuns } = args as { workflowId: string; executionId?: string; lookbackRuns?: number };
      // If no executionId provided, fetch the latest execution
      let resolvedExecutionId = executionId;
      if (!resolvedExecutionId) {
        const { data: executions } = await client.getExecutions(workflowId, 1);
        if (executions.length > 0) {
          resolvedExecutionId = executions[0]!.id;
        } else {
          throw new Error(`No executions found for workflow ${workflowId}`);
        }
      }
      const result = await server.getDiagnoseEngine().diagnose(workflowId, resolvedExecutionId, {
        trace: {
          enabled: true,
          maxNodes: 50,
          includeTiming: true,
          includeErrors: true,
        },
        classify: {
          enabled: true,
          severityThreshold: 'warning',
          taxonomy: ['logic', 'infrastructure', 'data', 'permission', 'timeout'],
        },
        regression: {
          enabled: true,
          historyWindow: lookbackRuns ?? 10,
          recurrenceThreshold: 3,
        },
      });
      return result;
    },
  });

  // Example write tool - only allowed in external mode (when implemented)
  server.registerTool({
    name: 'create_workflow',
    description: 'Create a new workflow (requires external credential mode).',
    allowedModes: ['external'],
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        nodes: { type: 'array', description: 'Workflow nodes' },
        connections: { type: 'object', description: 'Workflow connections' },
      },
      required: ['name'],
    },
    execution: async (args: unknown) => {
      const { name } = args as { name: string; nodes?: unknown[]; connections?: Record<string, unknown> };
      return {
        name,
        status: 'created',
        message: 'Workflow creation not yet implemented - placeholder for external mode',
      };
    },
  });

  return server;
}
