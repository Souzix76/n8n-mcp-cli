export interface ReportArtifact {
  format: 'json' | 'markdown' | 'html' | 'junit';
  content: string;
}

export interface ReportContext {
  suiteName: string;
  environment: string;
  passed: boolean;
  summary: string;
  results: Array<{ name: string; passed: boolean; message: string }>;
}

export function generateJsonReport(ctx: ReportContext): ReportArtifact {
  return {
    format: 'json',
    content: JSON.stringify(
      {
        suiteName: ctx.suiteName,
        environment: ctx.environment,
        passed: ctx.passed,
        summary: ctx.summary,
        results: ctx.results,
      },
      null,
      2,
    ),
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
    .map(
      (result) =>
        `  <testcase classname="${ctx.suiteName}" name="${result.name}" time="0">${result.passed ? '' : `<failure message="${result.message}" />`}</testcase>`,
    )
    .join('\n');

  const content = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${ctx.suiteName}" tests="${ctx.results.length}" failures="${ctx.results.filter((r) => !r.passed).length}">\n${cases}\n</testsuite>`;

  return {
    format: 'junit',
    content,
  };
}

export function generateHtmlReport(ctx: ReportContext): ReportArtifact {
  const rows = ctx.results
    .map(
      (result) =>
        `<tr><td>${result.name}</td><td>${result.passed ? 'PASS' : 'FAIL'}</td><td>${result.message}</td></tr>`,
    )
    .join('\n');

  return {
    format: 'html',
    content: `<!doctype html><html><head><meta charset="utf-8"><title>${ctx.suiteName}</title></head><body><h1>${ctx.suiteName}</h1><p><strong>Environment:</strong> ${ctx.environment}</p><p><strong>Status:</strong> ${ctx.passed ? 'passed' : 'failed'}</p><table><thead><tr><th>Check</th><th>Result</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
  };
}
