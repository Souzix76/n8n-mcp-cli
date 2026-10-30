import { describe, it, expect } from 'vitest';
import { baseCommands } from '../../cli/commands.js';

describe('Registry CLI command', () => {
  const cmd = baseCommands.find(c => c.name === 'registry');

  it('should generate manifest', async () => {
    const result = await cmd.run('generate');
    expect(result).toContain('Generated manifest:');
    expect(result).toContain('io.github.souzix76/n8n-mcp-cli');
    expect(result).toContain('2.1.9');
  });

  it('should validate manifest', async () => {
    const result = await cmd.run('validate');
    expect(result).toBe('Validation PASSED: manifest.json is valid');
  });

  it('should reject unknown subcommand', async () => {
    const result = await cmd.run('unknown');
    expect(result).toContain('Usage: registry <generate|validate>');
  });
});
