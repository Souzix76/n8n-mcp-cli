import { evaluateSuite, type AssertionRule, type AssertionSuiteResult } from './assertions.js';
import { createEnvironmentRules } from './rules.js';
import { validateEnvironmentConfig } from '../core/validation.js';
import { generateJsonReport, generateMarkdownReport, generateJUnitReport, type ReportContext } from '../reports/report-generator.js';

export interface SuiteExecutionInput {
  name: string;
  environment: string;
  input: Record<string, unknown>;
  rules: AssertionRule[];
}

export interface SuiteExecutionResult extends AssertionSuiteResult {
  name: string;
  environment: string;
  status: 'passed' | 'failed';
  summary: string;
  reports: Array<{ format: 'json' | 'markdown' | 'junit'; content: string }>;
}

export function runValidationSuite({ name, environment, input, rules }: SuiteExecutionInput): SuiteExecutionResult {
  const configValidation = validateEnvironmentConfig(input);
  const environmentRules = createEnvironmentRules(environment);
  const combinedRules = [...rules, ...environmentRules];
  const suiteResult = evaluateSuite(input, combinedRules);

  const checkResults = suiteResult.results.map((entry) => ({
    name: entry.path,
    passed: entry.passed,
    message: entry.message,
  }));

  const reportContext: ReportContext = {
    suiteName: name,
    environment,
    passed: suiteResult.passed && configValidation.valid,
    summary: suiteResult.passed && configValidation.valid ? 'All validation checks passed.' : 'One or more validation checks failed.',
    results: checkResults,
  };

  const reports = [
    generateJsonReport(reportContext),
    generateMarkdownReport(reportContext),
    generateJUnitReport(reportContext),
  ];

  return {
    ...suiteResult,
    name,
    environment,
    status: suiteResult.passed && configValidation.valid ? 'passed' : 'failed',
    summary: reportContext.summary,
    reports,
  };
}
