import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { searchNodes, listTriggers, validateNodeType, suggestNodesForTask } from '../catalog.js';

const MOCK_CATALOG = `# n8n Nodes Catalog

## Nodes
- **Webhook** (Trigger)
- **HttpRequest**
- **TelegramTrigger** (Trigger)
- **Telegram**
- **Slack**
- **SlackTrigger** (Trigger)
- **Gmail**
- **GmailTrigger** (Trigger)
- **Postgres**
- **Set**
- **If**
- **Code**
- **RespondToWebhook**
- **ScheduleTrigger** (Trigger)

## Credentials
- **TelegramApi**
- **SlackApi**
- **GmailOAuth2**
`;

// Reset the cached catalog before each test
beforeEach(() => {
  vi.restoreAllMocks();
  // Force re-import to clear cache by mocking fs
  vi.spyOn(fs, 'readFileSync').mockReturnValue(MOCK_CATALOG);

  // Clear the module-level cache by re-requiring
  // Since the module caches internally, we need to clear it
  // We'll work around this by just testing the functions with the mocked fs
});

// We need to clear the catalog cache between tests. Since loadCatalog uses a module-level
// `cached` variable, we'll use dynamic imports to get a fresh module for the first test,
// then subsequent calls will use the mock.
describe('searchNodes', () => {
  it('finds exact matches with highest score', () => {
    const results = searchNodes('Webhook');
    const webhook = results.find(r => r.name === 'Webhook');
    expect(webhook).toBeDefined();
    expect(webhook!.score).toBe(100);
  });

  it('finds partial matches', () => {
    const results = searchNodes('Telegram');
    expect(results.length).toBeGreaterThanOrEqual(2);
    const names = results.map(r => r.name);
    expect(names).toContain('Telegram');
    expect(names).toContain('TelegramTrigger');
  });

  it('returns empty for no matches', () => {
    const results = searchNodes('NonExistentNode');
    expect(results).toHaveLength(0);
  });

  it('is case insensitive', () => {
    const results = searchNodes('webhook');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('listTriggers', () => {
  it('returns only trigger nodes', () => {
    const triggers = listTriggers();
    expect(triggers.every(t => t.isTrigger)).toBe(true);
    expect(triggers.length).toBeGreaterThan(0);
  });
});

describe('validateNodeType', () => {
  it('validates an existing node type', () => {
    const result = validateNodeType('Webhook');
    expect(result.valid).toBe(true);
    expect(result.exact).toBeDefined();
  });

  it('returns suggestions for invalid node type', () => {
    const result = validateNodeType('Tele');
    expect(result.valid).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe('searchNodes with onlyTriggers', () => {
  it('filters to only trigger nodes', () => {
    const results = searchNodes('', true);
    expect(results.every(r => r.isTrigger)).toBe(true);
  });
});

describe('suggestNodesForTask', () => {
  it('suggests telegram nodes for telegram tasks', () => {
    const results = suggestNodesForTask('send a telegram message');
    const names = results.map(r => r!.name);
    expect(names).toContain('Telegram');
    expect(names).toContain('TelegramTrigger');
  });

  it('returns default nodes when no keywords match', () => {
    const results = suggestNodesForTask('do something random');
    expect(results.length).toBeGreaterThan(0);
    const names = results.map(r => r!.name);
    expect(names).toContain('Webhook');
    expect(names).toContain('HttpRequest');
  });
});
