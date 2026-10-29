export interface DryRunPreview {
  operation: string;
  wouldMutate: boolean;
  preview: string;
  safe: boolean;
  environment: string;
}

export function buildDryRunPreview(operation: string, environment: string): DryRunPreview {
  return {
    operation,
    wouldMutate: false,
    preview: `Dry-run preview for '${operation}' in environment '${environment}'. No changes will be applied.`,
    safe: true,
    environment,
  };
}

export function requiresDryRun(operation: string): boolean {
  const mutatingOperations = ['create_workflow', 'update_workflow', 'delete_workflow', 'connect_nodes'];
  return mutatingOperations.includes(operation);
}
