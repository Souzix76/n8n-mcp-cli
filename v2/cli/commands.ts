export interface CliCommand {
  name: string;
  description: string;
  run: (...args: string[]) => Promise<string>;
}

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
    run: async () => 'Report command placeholder for v2.',
  },
];
