export interface CliCommandContext {
  env: string;
  readOnly: boolean;
  dryRun: boolean;
}

export interface CliCommandResult {
  ok: boolean;
  output: string;
  context: CliCommandContext;
}

export class CliRunner {
  static async runCommand(
    command: string,
    context: CliCommandContext,
  ): Promise<CliCommandResult> {
    if (context.readOnly) {
      return {
        ok: true,
        output: `Command '${command}' executed in read-only mode.`,
        context,
      };
    }

    return {
      ok: true,
      output: `Command '${command}' executed with operational mode enabled.`,
      context,
    };
  }
}
