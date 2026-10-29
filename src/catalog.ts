import fs from 'node:fs';
import path from 'node:path';

export interface CatalogNode {
  name: string;
  isTrigger: boolean;
}

export interface CatalogData {
  nodes: CatalogNode[];
  credentials: string[];
}

let cached: CatalogData | null = null;

export function loadCatalog(): CatalogData {
  if (cached) return cached;
  const file = path.resolve(process.cwd(), 'catalog', 'n8n-nodes-catalog.md');
  const text = fs.readFileSync(file, 'utf8');
  const nodes: CatalogNode[] = [];
  const credentials: string[] = [];
  let section: 'nodes' | 'credentials' | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '## Nodes') {
      section = 'nodes';
      continue;
    }
    if (line === '## Credentials') {
      section = 'credentials';
      continue;
    }
    if (!line.startsWith('- **')) continue;

    const match = line.match(/^- \*\*(.+?)\*\*(?: \(Trigger\))?$/);
    if (!match) continue;
    const name = match[1];

    if (section === 'nodes') {
      nodes.push({ name, isTrigger: line.includes('(Trigger)') });
    } else if (section === 'credentials') {
      credentials.push(name);
    }
  }

  cached = { nodes, credentials };
  return cached;
}

export function searchNodes(query: string, onlyTriggers = false) {
  const q = query.trim().toLowerCase();
  const { nodes } = loadCatalog();
  return nodes
    .filter((node) => (!onlyTriggers || node.isTrigger))
    .map((node) => {
      const lower = node.name.toLowerCase();
      const exact = lower === q;
      const starts = lower.startsWith(q);
      const includes = lower.includes(q);
      const score = exact ? 100 : starts ? 80 : includes ? 60 : 0;
      return { ...node, score };
    })
    .filter((node) => node.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function listTriggers() {
  return loadCatalog().nodes.filter((node) => node.isTrigger);
}

export function validateNodeType(nodeType: string) {
  const needle = nodeType.trim().toLowerCase();
  const { nodes } = loadCatalog();
  const exact = nodes.find((node) => node.name.toLowerCase() === needle);
  if (exact) return { valid: true, exact, suggestions: [] };
  const suggestions = searchNodes(nodeType).slice(0, 10);
  return { valid: false, exact: null, suggestions };
}

export function suggestNodesForTask(task: string) {
  const text = task.toLowerCase();
  const buckets: Record<string, string[]> = {
    telegram: ['TelegramTrigger', 'Telegram'],
    whatsapp: ['WhatsAppTrigger', 'WhatsApp'],
    email: ['EmailSend', 'EmailReadImap', 'Gmail', 'GmailTrigger'],
    webhook: ['Webhook', 'RespondToWebhook', 'FormTrigger'],
    http: ['HttpRequest', 'GraphQL'],
    database: ['Postgres', 'MySql', 'MongoDb', 'Redis'],
    files: ['ReadWriteFile', 'ReadBinaryFile', 'WriteBinaryFile', 'ExtractFromFile', 'ConvertToFile'],
    ai: ['OpenAi', 'MistralAi', 'Perplexity', 'JinaAi', 'AiTransform'],
    schedule: ['ScheduleTrigger', 'Cron', 'Wait'],
    google: ['GoogleSheets', 'GoogleDrive', 'GoogleCalendar', 'Gmail'],
    slack: ['SlackTrigger', 'Slack'],
    discord: ['Discord'],
    github: ['GithubTrigger', 'Github', 'Git'],
  };

  const chosen = new Set<string>();
  for (const [keyword, names] of Object.entries(buckets)) {
    if (text.includes(keyword)) names.forEach((name) => chosen.add(name));
  }

  if (chosen.size === 0) {
    ['Webhook', 'HttpRequest', 'Set', 'If', 'Code', 'RespondToWebhook'].forEach((name) => chosen.add(name));
  }

  const { nodes } = loadCatalog();
  return [...chosen]
    .map((name) => nodes.find((node) => node.name === name))
    .filter(Boolean);
}
