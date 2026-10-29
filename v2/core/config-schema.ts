import { z } from 'zod';

export const EnvironmentPolicySchema = z.object({
  readOnly: z.boolean().default(true),
  dryRun: z.boolean().default(true),
  allowedMutations: z.array(z.string()).default([]),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  queueMode: z.boolean().optional(),
  haEnabled: z.boolean().optional(),
});

export const HealthCheckSchema = z.object({
  endpoint: z.string().default('/healthz'),
  interval: z.number().int().positive().default(30000),
  timeout: z.number().int().positive().default(5000),
  retries: z.number().int().nonnegative().default(3),
});

export const TraceConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxNodes: z.number().int().positive().default(100),
  includeTiming: z.boolean().default(true),
  includeErrors: z.boolean().default(true),
});

export const ClassifyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  severityThreshold: z.enum(['info', 'warning', 'error']).default('warning'),
  taxonomy: z.array(z.enum(['logic', 'infrastructure', 'data', 'permission', 'timeout'])).default(['logic', 'infrastructure', 'data', 'permission', 'timeout']),
});

export const RegressionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  historyWindow: z.number().int().positive().default(10),
  recurrenceThreshold: z.number().int().positive().default(3),
});

export const DiagnoseConfigSchema = z.object({
  trace: TraceConfigSchema.default({}),
  classify: ClassifyConfigSchema.default({}),
  regression: RegressionConfigSchema.default({}),
});

export type EnvironmentPolicy = z.infer<typeof EnvironmentPolicySchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type TraceConfig = z.infer<typeof TraceConfigSchema>;
export type ClassifyConfig = z.infer<typeof ClassifyConfigSchema>;
export type RegressionConfig = z.infer<typeof RegressionConfigSchema>;
export type DiagnoseConfig = z.infer<typeof DiagnoseConfigSchema>;