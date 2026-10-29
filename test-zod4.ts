import { z } from "zod/v4";

const TestSchema = z.object({
  name: z.string(),
  version: z.string(),
  config: z.object({
    readOnly: z.boolean().default(true),
    environment: z.enum(['development', 'staging', 'production']),
  }),
});

const result = TestSchema.safeParse({
  name: "test",
  version: "1.0.0",
  config: { environment: "production" }
});

console.log("Zod 4 test:", result.success ? "PASS" : "FAIL", result.error?.issues);