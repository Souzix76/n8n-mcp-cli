# Setup

## 1. Install dependencies

```bash
npm install
npm run build
```

## 2. Configure environment

Copy example env:

```bash
cp .env.example .env
```

Set:

```env
N8N_BASE_URL=http://127.0.0.1:5678
N8N_API_KEY=replace_me
N8N_DEFAULT_TIMEOUT_MS=30000
```

## 3. Run CLI

```bash
node dist/cli.js --config ./workflows/example.json
```

## 4. Run MCP server

```bash
node dist/index.js
```

This starts the MCP server over stdio.

## Notes
- `webhook` mode does not require `workflowId`
- `execute` mode requires `workflowId`
- workflow mutation tools require a valid n8n API key
- keep this pointed at a trusted n8n instance only
