import { readConfig } from './config.js';
import { evaluateRun } from './evaluator.js';
import { testPayload } from './n8n-client.js';

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1];
  return undefined;
}

async function main() {
  const configPath = getArg('--config');
  if (!configPath) {
    console.error('Usage: node dist/cli.js --config ./workflows/example.json [--payload payload-name]');
    process.exit(1);
  }

  const config = readConfig(configPath);
  const payloadName = getArg('--payload');
  const payloads = payloadName ? [payloadName] : config.testPayloads.map((p) => p.name);

  const results = [];
  for (const name of payloads) {
    const run = await testPayload(config, name);
    const evaluation = evaluateRun(config, run);
    results.push({ run, evaluation });
  }

  console.log(JSON.stringify({
    workflow: config.workflowName ?? config.workflowId ?? 'unknown',
    mode: config.triggerMode,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
