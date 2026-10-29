import type { ExecutionReport } from './report-generator.js';

export class MarkdownReportGenerator {
  static render(report: ExecutionReport): string {
    return [
      '# Workflow Report',
      '',
      `- Status: ${report.summary.status}`,
      `- Score: ${report.summary.score}`,
      `- Environment: ${report.summary.environment}`,
      '',
      ...report.sections.map((section) => `## ${section.title}\n\n${JSON.stringify(section.content, null, 2)}`),
    ].join('\n');
  }
}
