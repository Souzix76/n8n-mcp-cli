export interface SuiteDefinition {
  name: string;
  environment: string;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

export function runSuite(definition: SuiteDefinition): SuiteReport {
  return buildSuiteReport(definition.name, definition.checks);
}
