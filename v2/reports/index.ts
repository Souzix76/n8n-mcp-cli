import type { ReportArtifact, ReportContext } from './types.js';

export function generateJsonReport(ctx: ReportContext): ReportArtifact {
  return {
    format: 'json',
    content: JSON.stringify({
      suiteName: ctx.suiteName,
      environment: ctx.environment,
      passed: ctx.passed,
      summary: ctx.summary,
      results: ctx.results,
    }, null, 2),
  };
}

export function generateMarkdownReport(ctx: ReportContext): ReportArtifact {
  const lines = [
    `# ${ctx.suiteName}`,
    '',
    `- Environment: ${ctx.environment}`,
    `- Status: ${ctx.passed ? 'passed' : 'failed'}`,
    `- Summary: ${ctx.summary}`,
    '',
    '| Check | Result | Message |',
    '|------|--------|---------|',
  ];

  for (const result of ctx.results) {
    lines.push(`| ${result.name} | ${result.passed ? 'PASS' : 'FAIL'} | ${result.message} |`);
  }

  return {
    format: 'markdown',
    content: lines.join('\n'),
  };
}

export function generateJUnitReport(ctx: ReportContext): ReportArtifact {
  const cases = ctx.results
    .map((result) => `  <testcase classname="${ctx.suiteName}" name="${result.name}" time="0">${result.passed ? '' : `<failure message="${result.message}" />`}</testcase>`)
    .join('\n');

  const content = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${ctx.suiteName}" tests="${ctx.results.length}" failures="${ctx.results.filter((r) => !r.passed).length}">\n${cases}\n</testsuite>`;

  return {
    format: 'junit',
    content,
  };
}
