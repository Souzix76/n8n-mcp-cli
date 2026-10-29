import type { ExecutionReport } from './report-generator.js';

export class JunitReportGenerator {
  static render(report: ExecutionReport): string {
    const tests = report.sections
      .map(
        (section) =>
          `  <testcase classname="workflow" name="${section.title}" time="0">${JSON.stringify(section.content)}</testcase>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="workflow-report" tests="${report.sections.length}" failures="0">\n${tests}\n</testsuite>`;
  }
}
