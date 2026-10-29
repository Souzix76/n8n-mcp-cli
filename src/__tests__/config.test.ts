import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readConfig, getEnv } from '../config.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: vi.fn(),
    },
  };
});

import fs from 'node:fs';

describe('readConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a valid config file', () => {
    const validConfig = {
      triggerMode: 'webhook',
      webhookPath: '/webhook/test',
      testPayloads: [{ name: 'test', data: { key: 'value' } }],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validConfig));
    const config = readConfig('/fake/path.json');
    expect(config.triggerMode).toBe('webhook');
    expect(config.testPayloads).toHaveLength(1);
    expect(config.testPayloads[0].name).toBe('test');
  });

  it('rejects config with missing required fields', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ triggerMode: 'webhook' }));
    expect(() => readConfig('/fake/path.json')).toThrow();
  });

  it('rejects config with invalid triggerMode', () => {
    const invalid = {
      triggerMode: 'invalid',
      testPayloads: [{ name: 'test', data: {} }],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalid));
    expect(() => readConfig('/fake/path.json')).toThrow();
  });

  it('rejects config with empty testPayloads array', () => {
    const invalid = { triggerMode: 'webhook', testPayloads: [] };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalid));
    expect(() => readConfig('/fake/path.json')).toThrow();
  });

  it('accepts config with all optional fields', () => {
    const full = {
      workflowId: 'abc123',
      workflowName: 'My Workflow',
      triggerMode: 'execute',
      webhookPath: '/hook',
      timeoutMs: 5000,
      qualityThreshold: 90,
      testPayloads: [{ name: 'test', data: {}, expectedFields: ['id', 'name'] }],
      tier3Checks: [
        { name: 'check1', field: 'id', check: 'not_empty', severity: 'warning', message: 'ID missing' },
      ],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(full));
    const config = readConfig('/fake/path.json');
    expect(config.workflowId).toBe('abc123');
    expect(config.tier3Checks).toHaveLength(1);
  });

  it('rejects invalid tier3 check types', () => {
    const invalid = {
      triggerMode: 'webhook',
      testPayloads: [{ name: 'test', data: {} }],
      tier3Checks: [{ name: 'bad', field: 'x', check: 'invalid_check' }],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalid));
    expect(() => readConfig('/fake/path.json')).toThrow();
  });
});

describe('getEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns parsed env variables', () => {
    process.env.N8N_BASE_URL = 'http://localhost:5678';
    process.env.N8N_API_KEY = 'test-key';
    const env = getEnv();
    expect(env.baseUrl).toBe('http://localhost:5678');
    expect(env.apiKey).toBe('test-key');
    expect(env.defaultTimeoutMs).toBe(30000);
  });

  it('strips trailing slash from baseUrl', () => {
    process.env.N8N_BASE_URL = 'http://localhost:5678/';
    process.env.N8N_API_KEY = 'key';
    expect(getEnv().baseUrl).toBe('http://localhost:5678');
  });

  it('throws when N8N_BASE_URL is missing', () => {
    delete process.env.N8N_BASE_URL;
    process.env.N8N_API_KEY = 'key';
    expect(() => getEnv()).toThrow('Missing N8N_BASE_URL');
  });

  it('throws when N8N_API_KEY is missing', () => {
    process.env.N8N_BASE_URL = 'http://localhost:5678';
    delete process.env.N8N_API_KEY;
    expect(() => getEnv()).toThrow('Missing N8N_API_KEY');
  });

  it('respects custom DEFAULT_TIMEOUT_MS', () => {
    process.env.N8N_BASE_URL = 'http://localhost:5678';
    process.env.N8N_API_KEY = 'key';
    process.env.DEFAULT_TIMEOUT_MS = '5000';
    expect(getEnv().defaultTimeoutMs).toBe(5000);
  });
});
