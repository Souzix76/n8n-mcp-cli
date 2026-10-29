export interface SuiteReport {
  passed: boolean;
  totalChecks: number;
  passingChecks: number;
  failingChecks: number;
  results: Array<{ name: string; passed: boolean; message: string }>;
}

export function buildSuiteReport(
  label: string,
  checks: Array<{ name: string; passed: boolean; message: string }>,
): SuiteReport {
  const totalChecks = checks.length;
  const passingChecks = checks.filter((check) => check.passed).length;
  const failingChecks = totalChecks - passingChecks;

  return {
    passed: failingChecks === 0,
    totalChecks,
    passingChecks,
    failingChecks,
    results: checks.map((check) => ({
      name: `${label}:${check.name}`,
      passed: check.passed,
      message: check.message,
    })),
  };
}
