export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execution: (...args: unknown[]) => Promise<unknown>;
}

export class McpServer {
  private tools = new Map<string, McpToolDefinition>();

  registerTool(definition: McpToolDefinition): void {
    this.tools.set(definition.name, definition);
  }

  getTools(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async callTool(name: string, ...args: unknown[]): Promise<unknown> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Unknown MCP tool: ${name}`);
    }

    return tool.execution(...args);
  }
}

export const safeMcpServer = new McpServer();

safeMcpServer.registerTool({
  name: 'validate_workflow',
  description: 'Validate a workflow and return risk and health summary without mutating anything.',
  execution: async (workflowId: string) => ({
    workflowId,
    status: 'safe-check',
    summary: 'Validation scaffold ready for v2.',
  }),
});

safeMcpServer.registerTool({
  name: 'get_workflow_health',
  description: 'Return a workflow health score and risk summary.',
  execution: async (workflowId: string) => ({
    workflowId,
    health: 'stable',
    score: 92,
  }),
});

safeMcpServer.registerTool({
  name: 'suggest_nodes',
  description: 'Suggest compatible nodes based on a task description and workflow context.',
  execution: async (task: string) => ({
    task,
    suggestions: ['HTTP Request', 'Set', 'IF'],
  }),
});
