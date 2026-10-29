# Tools Reference

## Testing tools

### `test_workflow`
Run a single payload from a workflow config.

Inputs:
- `configPath` string
- `payloadName` string

### `evaluate_workflow_result`
Run a single payload and attach evaluation output.

Inputs:
- `configPath` string
- `payloadName` string

### `run_workflow_suite`
Run all payloads from a config file.

Inputs:
- `configPath` string

### `get_workflow_summary`
Fetch a compact summary for a workflow ID.

Inputs:
- `workflowId` string

## Workflow mutation tools

### `create_workflow`
Create a workflow from JSON.

### `update_workflow`
Replace an existing workflow by ID.

### `delete_workflow`
Delete a workflow by ID.

### `add_node_to_workflow`
Append a node JSON object to a workflow.

### `connect_nodes`
Create a main connection between source and target node.

Inputs:
- `workflowId` string
- `source` string
- `target` string
- `sourceIndex` number optional
- `targetIndex` number optional

## Introspection tools

### `list_node_types`
List available node types from the connected n8n instance.

### `get_node_type`
Get full metadata/schema for one node type.

### `list_executions`
List recent executions.

Optional filters:
- `workflowId`
- `limit`
- `status`

### `get_execution`
Fetch full execution payload by ID.

### `get_execution_trace`
Return a lightweight per-node trace summary.

## Catalog helper tools

### `get_catalog_stats`
Counts of catalogued nodes, triggers, and credentials.

### `search_nodes`
Search node catalog by query.

### `list_triggers`
List trigger nodes from local catalog.

### `validate_node_type`
Validate a node type and suggest close matches.

### `suggest_nodes_for_task`
Suggest relevant nodes for a natural-language task.
