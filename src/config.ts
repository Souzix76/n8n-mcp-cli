import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { WorkflowTestConfig } from './types.js';

const PayloadSchema = z.object({
  name: z.string().min(1),
  data: z.record(z.unknown()),
  expectedFields: z.array(z.string()).optional(),
});

const CheckSchema = z.object({
  name: z.string().min(1),
  field: z.string().min(1),
  check: z.enum(['contains', 'not_contains', 'min_length', 'max_length', 'equals', 'not_empty']),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  severity: z.enum(['error', 'warning']).optional(),
  message: z.string().optional(),
});

const ConfigSchema = z.object({
  workflowId: z.string().optional(),
  workflowName: z.string().optional(),
  triggerMode: z.enum(['webhook', 'execute']),
  webhookPath: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  qualityThreshold: z.number().min(0).max(100).optional(),
  testPayloads: z.array(PayloadSchema).min(1),
  tier3Checks: z.array(CheckSchema).optional(),
});

export function readConfig(configPath: string): WorkflowTestConfig {
  const full = path.resolve(configPath);
  const raw = fs.readFileSync(full, 'utf8');
  return ConfigSchema.parse(JSON.parse(raw));
}

export function getEnv() {
  const baseUrl = (process.env.N8N_BASE_URL || '').trim().replace(/\/$/, '');
  const apiKey = (process.env.N8N_API_KEY || '').trim();
  const defaultTimeoutMs = Number(process.env.DEFAULT_TIMEOUT_MS || '30000');
  if (!baseUrl) throw new Error('Missing N8N_BASE_URL');
  if (!apiKey) throw new Error('Missing N8N_API_KEY');
  return { baseUrl, apiKey, defaultTimeoutMs };
}
