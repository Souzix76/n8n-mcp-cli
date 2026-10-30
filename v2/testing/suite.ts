export interface SuiteDefinition {
  name: string;
  environment: string;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

export interface SuiteReport {
  name: string;
  environment: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

export function buildSuiteReport(name: string, checks: Array<{ name: string; passed: boolean; message: string }>): SuiteReport {
  const passed = checks.every((c) => c.passed);
  return { name, environment: '', passed, checks };
}

export function runSuite(definition: SuiteDefinition): SuiteReport {
  return buildSuiteReport(definition.name, definition.checks);
}
