import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readConfig } from './config.js';
import { evaluateRun } from './evaluator.js';
import { addNodeToWorkflow, connectNodes, createWorkflow, deleteWorkflow, getExecution, getExecutionTrace, getNodeType, getWorkflowSummary, listExecutions, listNodeTypes, testPayload, updateWorkflow } from './n8n-client.js';
import { listTriggers, loadCatalog, searchNodes, suggestNodesForTask, validateNodeType } from './catalog.js';

const server = new Server({ name: 'n8n-workflow-tester-safe', version: '0.1.0' }, { capabilities: { tools: {} } });

const tools = [
  {
    name: 'test_workflow',
    description: 'Run a single payload test from a workflow config JSON file.',
    inputSchema: {
      type: 'object',
      properties: { configPath: { type: 'string' }, payloadName: { type: 'string' } },
      required: ['configPath', 'payloadName'],
    },
  },
  {
    name: 'evaluate_workflow_result',
    description: 'Run a single payload test and return evaluation score + issues.',
    inputSchema: {
      type: 'object',
      properties: { configPath: { type: 'string' }, payloadName: { type: 'string' } },
      required: ['configPath', 'payloadName'],
    },
  },
  {
    name: 'run_workflow_suite',
    description: 'Run all payloads in a workflow config and return per-payload results and scores.',
    inputSchema: {
      type: 'object',
      properties: { configPath: { type: 'string' } },
      required: ['configPath'],
    },
  },
  {
    name: 'get_workflow_summary',
    description: 'Fetch a workflow summary from n8n by workflow ID.',
    inputSchema: {
      type: 'object',
      properties: { workflowId: { type: 'string' } },
      required: ['workflowId'],
    },
  },
  {
    name: 'create_workflow',
    description: 'Create a new n8n workflow from JSON.',
    inputSchema: {
      type: 'object',
      properties: { workflow: { type: 'object' } },
      required: ['workflow'],
    },
  },
  {
    name: 'update_workflow',
    description: 'Replace an existing n8n workflow by ID with JSON.',
    inputSchema: {
      type: 'object',
      properties: { workflowId: { type: 'string' }, workflow: { type: 'object' } },
      required: ['workflowId', 'workflow'],
    },
  },
  {
    name: 'delete_workflow',
    description: 'Delete an n8n workflow by ID.',
    inputSchema: {
      type: 'object',
      properties: { workflowId: { type: 'string' } },
      required: ['workflowId'],
    },
  },
  {
    name: 'add_node_to_workflow',
    description: 'Append a node JSON object to an existing workflow.',
    inputSchema: {
      type: 'object',
      properties: { workflowId: { type: 'string' }, node: { type: 'object' } },
      required: ['workflowId', 'node'],
    },
  },
  {
    name: 'connect_nodes',
    description: 'Create a main connection between two nodes in an existing workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        source: { type: 'string' },
        target: { type: 'string' },
        sourceIndex: { type: 'number' },
        targetIndex: { type: 'number' }
      },
      required: ['workflowId', 'source', 'target'],
    },
  },
  {
    name: 'list_node_types',
    description: 'List available node types from the connected n8n instance.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_node_type',
    description: 'Get full schema/details for a specific node type.',
    inputSchema: {
      type: 'object',
      properties: { nodeType: { type: 'string' } },
      required: ['nodeType'],
    },
  },
  {
    name: 'list_executions',
    description: 'List recent executions, optionally filtered by workflowId and status.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        limit: { type: 'number' },
        status: { type: 'string' }
      },
    },
  },
  {
    name: 'get_execution',
    description: 'Fetch full execution details by execution ID.',
    inputSchema: {
      type: 'object',
      properties: { executionId: { type: 'string' } },
      required: ['executionId'],
    },
  },
  {
    name: 'get_execution_trace',
    description: 'Return a lightweight per-node trace summary for an execution.',
    inputSchema: {
      type: 'object',
      properties: { executionId: { type: 'string' } },
      required: ['executionId'],
    },
  },
  {
    name: 'get_catalog_stats',
    description: 'Return counts of catalogued nodes, triggers, and credentials from the imported n8n catalog.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_nodes',
    description: 'Search nodes from the imported n8n catalog by name.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, onlyTriggers: { type: 'boolean' } },
      required: ['query'],
    },
  },
  {
    name: 'list_triggers',
    description: 'List trigger nodes from the imported n8n catalog.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'validate_node_type',
    description: 'Validate a node type against the imported n8n catalog and suggest close matches.',
    inputSchema: {
      type: 'object',
      properties: { nodeType: { type: 'string' } },
      required: ['nodeType'],
    },
  },
  {
    name: 'suggest_nodes_for_task',
    description: 'Suggest relevant n8n nodes from the imported catalog for a natural-language task.',
    inputSchema: {
      type: 'object',
      properties: { task: { type: 'string' } },
      required: ['task'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};

  if (name === 'test_workflow') {
    const { configPath, payloadName } = z.object({ configPath: z.string(), payloadName: z.string() }).parse(args);
    const config = readConfig(configPath);
    const result = await testPayload(config, payloadName);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  if (name === 'evaluate_workflow_result') {
    const { configPath, payloadName } = z.object({ configPath: z.string(), payloadName: z.string() }).parse(args);
    const config = readConfig(configPath);
    const result = await testPayload(config, payloadName);
    const evaluation = evaluateRun(config, result);
    return { content: [{ type: 'text', text: JSON.stringify({ result, evaluation }, null, 2) }] };
  }

  if (name === 'run_workflow_suite') {
    const { configPath } = z.object({ configPath: z.string() }).parse(args);
    const config = readConfig(configPath);
    const results = [];
    for (const payload of config.testPayloads) {
      const result = await testPayload(config, payload.name);
      const evaluation = evaluateRun(config, result);
      results.push({ payloadName: payload.name, result, evaluation });
    }
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  if (name === 'get_workflow_summary') {
    const { workflowId } = z.object({ workflowId: z.string() }).parse(args);
    const summary = await getWorkflowSummary(workflowId);
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  }

  if (name === 'create_workflow') {
    const { workflow } = z.object({ workflow: z.record(z.unknown()) }).parse(args);
    const created = await createWorkflow(workflow);
    return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] };
  }

  if (name === 'update_workflow') {
    const { workflowId, workflow } = z.object({ workflowId: z.string(), workflow: z.record(z.unknown()) }).parse(args);
    const updated = await updateWorkflow(workflowId, workflow);
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  }

  if (name === 'delete_workflow') {
    const { workflowId } = z.object({ workflowId: z.string() }).parse(args);
    const deleted = await deleteWorkflow(workflowId);
    return { content: [{ type: 'text', text: JSON.stringify(deleted, null, 2) }] };
  }

  if (name === 'add_node_to_workflow') {
    const { workflowId, node } = z.object({ workflowId: z.string(), node: z.record(z.unknown()) }).parse(args);
    const updated = await addNodeToWorkflow(workflowId, node);
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  }

  if (name === 'connect_nodes') {
    const { workflowId, source, target, sourceIndex, targetIndex } = z.object({
      workflowId: z.string(),
      source: z.string(),
      target: z.string(),
      sourceIndex: z.number().optional(),
      targetIndex: z.number().optional(),
    }).parse(args);
    const updated = await connectNodes(workflowId, source, target, sourceIndex ?? 0, targetIndex ?? 0);
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  }

  if (name === 'list_node_types') {
    const items = await listNodeTypes();
    return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
  }

  if (name === 'get_node_type') {
    const { nodeType } = z.object({ nodeType: z.string() }).parse(args);
    const item = await getNodeType(nodeType);
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
  }

  if (name === 'list_executions') {
    const { workflowId, limit, status } = z.object({
      workflowId: z.string().optional(),
      limit: z.number().optional(),
      status: z.string().optional(),
    }).parse(args);
    const items = await listExecutions(workflowId, limit ?? 20, status);
    return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
  }

  if (name === 'get_execution') {
    const { executionId } = z.object({ executionId: z.string() }).parse(args);
    const item = await getExecution(executionId);
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
  }

  if (name === 'get_execution_trace') {
    const { executionId } = z.object({ executionId: z.string() }).parse(args);
    const item = await getExecutionTrace(executionId);
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
  }

  if (name === 'get_catalog_stats') {
    const catalog = loadCatalog();
    return { content: [{ type: 'text', text: JSON.stringify({
      totalNodes: catalog.nodes.length,
      totalTriggers: catalog.nodes.filter((n) => n.isTrigger).length,
      totalCredentials: catalog.credentials.length,
    }, null, 2) }] };
  }

  if (name === 'search_nodes') {
    const { query, onlyTriggers } = z.object({ query: z.string(), onlyTriggers: z.boolean().optional() }).parse(args);
    const item = searchNodes(query, onlyTriggers ?? false);
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
  }

  if (name === 'list_triggers') {
    const item = listTriggers();
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
  }

  if (name === 'validate_node_type') {
    const { nodeType } = z.object({ nodeType: z.string() }).parse(args);
    const item = validateNodeType(nodeType);
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
  }

  if (name === 'suggest_nodes_for_task') {
    const { task } = z.object({ task: z.string() }).parse(args);
    const item = suggestNodesForTask(task);
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
