export interface SafeMcpToolDefinition {
  toolName: string;
  description: string;
  safeByDefault: boolean;
  requiresReadOnly: boolean;
}

export const safeToolCatalog: SafeMcpToolDefinition[] = [
  {
    toolName: 'validate_workflow',
    description: 'Validate workflow health and integrity signatures.',
    safeByDefault: true,
    requiresReadOnly: true,
  },
  {
    toolName: 'get_execution_trace',
    description: 'Retrieve the execution trace and node health evidence.',
    safeByDefault: true,
    requiresReadOnly: true,
  },
  {
    toolName: 'summarize_failures',
    description: 'Map failures to risk categories and likely root causes.',
    safeByDefault: true,
    requiresReadOnly: true,
  },
  {
    toolName: 'suggest_nodes',
    description: 'Suggest nodes based on task intent and compatibility context.',
    safeByDefault: true,
    requiresReadOnly: true,
  },
  {
    toolName: 'create_workflow',
    description: 'Create a workflow only if policy allows it and dry-run is in effect.',
    safeByDefault: false,
    requiresReadOnly: true,
  },
];
