import { createMcpServer } from './server.js';
import { N8nClient } from '../core/n8n-client.js';
import { CredentialMode } from '../core/errors.js';

const env = process.env as Record<string, string | undefined>;
const baseUrl = env['N8N_BASE_URL'] ?? 'http://localhost:5678';
const apiKey = env['N8N_API_KEY'] ?? 'test-key';
const credentialMode = (env['CREDENTIAL_MODE'] ?? 'read-only') as CredentialMode;

const client = new N8nClient({ baseUrl, apiKey });
const server = createMcpServer(client, credentialMode);

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function sendResponse(response: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(response) + '\n');
}

function handleRequest(request: JsonRpcRequest): void {
  const { id, method, params } = request;

  // Use setImmediate to ensure we don't block the event loop
  setImmediate(async () => {
    try {
      let result: unknown;

      switch (method) {
        case 'initialize': {
          const { protocolVersion } = params as { protocolVersion: string };
          result = {
            protocolVersion,
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'n8n-mcp-cli',
              version: '1.0.0',
            },
          };
          break;
        }

        case 'tools/list': {
          const tools = server.getTools().map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema ?? {
              type: 'object',
              properties: {},
            },
          }));
          result = { tools };
          break;
        }

        case 'tools/call': {
          const { name, arguments: args } = params as { name: string; arguments: unknown };
          result = await server.callTool(name, args);
          break;
        }

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      sendResponse({ jsonrpc: '2.0', id, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      let code = -32603;
      if (error instanceof Error && error.name === 'CredentialBoundaryError') {
        code = -32000;
      }
      sendResponse({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
    }
  });
}

let buffer = '';

process.stdin.on('data', (chunk: Buffer) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (line.trim()) {
      try {
        const request = JSON.parse(line) as JsonRpcRequest;
        handleRequest(request);
      } catch (error) {
        sendResponse({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        });
      }
    }
  }
});

process.stdin.on('end', () => {
  // Keep process alive for pending requests
  setTimeout(() => process.exit(0), 5000);
});

console.error(`n8n-mcp-cli MCP server started in ${credentialMode} mode`);
console.error(`Connected to n8n at ${baseUrl}`);