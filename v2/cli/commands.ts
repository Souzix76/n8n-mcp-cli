export interface CliCommand {
  name: string;
  description: string;
  run: (...args: string[]) => Promise<string>;
}

import { CredentialMode } from '../core/errors.js';

export function parseCredentialMode(args: string[]): CredentialMode {
  const modeIndex = args.findIndex(arg => arg === '--credential-mode' || arg.startsWith('--credential-mode='));
  
  if (modeIndex === -1) {
    return 'read-only';
  }
  
  const arg = args[modeIndex] ?? '';
  
  if (arg === '--credential-mode') {
    const value = args[modeIndex + 1];
    if (!value || (value !== 'read-only' && value !== 'external')) {
      throw new Error(`Invalid credential mode: ${value}. Must be 'read-only' or 'external'`);
    }
    return value as CredentialMode;
  }
  
  // --credential-mode=value format
  const value = arg.split('=')[1] ?? '';
  if (!value || (value !== 'read-only' && value !== 'external')) {
    throw new Error(`Invalid credential mode: ${value}. Must be 'read-only' or 'external'`);
  }
  return value as CredentialMode;
}

export function parseCiFlag(args: string[]): boolean {
  return args.includes('--ci');
}

export function removeCiFlag(args: string[]): string[] {
  return args.filter(arg => arg !== '--ci');
}

export function parseCredentialModeAndCiFlag(args: string[]): { mode: CredentialMode; ci: boolean } {
  const mode = parseCredentialMode(args);
  const ci = parseCiFlag(args);
  return { mode, ci };
}

export function removeCredentialModeAndCiArgs(args: string[]): string[] {
  let filtered = removeCredentialModeArgs(args);
  filtered = removeCiFlag(filtered);
  return filtered;
}

export function removeCredentialModeArgs(args: string[]): string[] {
  const modeIndex = args.findIndex(arg => arg === '--credential-mode' || arg.startsWith('--credential-mode='));
  
  if (modeIndex === -1) {
    return args;
  }
  
  const arg = args[modeIndex];
  const filtered = args.filter((_, i) => i !== modeIndex);
  
  // If using --credential-mode value format, also remove the next arg
  if (arg === '--credential-mode' && modeIndex < filtered.length) {
    return filtered.filter((_, i) => i !== modeIndex);
  }
  
  return filtered;
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateV2Report, generateV2ReportCi } from './report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const baseCommands: CliCommand[] = [
  {
    name: 'validate',
    description: 'Validate configuration and workflow health contracts.',
    run: async () => 'Validation command placeholder for v2.',
  },
  {
    name: 'run',
    description: 'Run a workflow validation suite.',
    run: async () => 'Run command placeholder for v2.',
  },
  {
    name: 'report',
    description: 'Generate a report from execution output.',
    run: async (...args: string[]) => {
      const { ci } = parseCredentialModeAndCiFlag(args);
      const filteredArgs = removeCredentialModeAndCiArgs(args);
      
      if (ci) {
        return generateV2ReportCi();
      }
      
      return generateV2Report();
    },
  },
  {
    name: 'registry',
    description: 'Manage MCP registry manifest (generate, validate).',
    run: async (subcommand: string) => {
      const manifestPath = join(__dirname, '..', 'registry', 'manifest.json');

      switch (subcommand) {
        case 'generate': {
          const manifest = readFileSync(manifestPath, 'utf-8');
          return `Generated manifest:\n${manifest}`;
        }
        case 'validate': {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          const errors: string[] = [];

          // Basic schema validation
          if (!manifest.name) errors.push('Missing required field: name');
          if (!manifest.description) errors.push('Missing required field: description');
          if (!manifest.version) errors.push('Missing required field: version');
          if (!manifest.packages || !manifest.packages.length) errors.push('Missing required field: packages');
          if (!manifest.repository) errors.push('Missing required field: repository');
          if (!manifest.$schema) errors.push('Missing required field: $schema');

          // Validate package structure
          if (manifest.packages) {
            manifest.packages.forEach((pkg: unknown, i: number) => {
              const p = pkg as Record<string, unknown>;
              if (!p['registryType']) errors.push(`Package ${i}: missing registryType`);
              if (!p['identifier']) errors.push(`Package ${i}: missing identifier`);
              if (!p['transport']) errors.push(`Package ${i}: missing transport`);
              if (!p['version']) errors.push(`Package ${i}: missing version`);
            });
          }

          if (errors.length > 0) {
            return `Validation FAILED:\n${errors.map(e => `  - ${e}`).join('\n')}`;
          }

          return 'Validation PASSED: manifest.json is valid';
        }
        default:
          return `Usage: registry <generate|validate>`;
      }
    },
  },
  {
    name: 'mcp',
    description: 'Start MCP server with optional credential mode.',
    run: async (...args: string[]) => {
      const credentialMode = parseCredentialMode(args);
      const filteredArgs = removeCredentialModeArgs(args);
      
      return `MCP server starting in ${credentialMode} mode...\n` +
             `Run: npx n8n-mcp-cli@latest mcp --credential-mode=${credentialMode}\n` +
             `Environment: N8N_BASE_URL and N8N_API_KEY required`;
    },
  },
];
