import type { ExecutionReport } from './report-generator.js';

export class HtmlReportGenerator {
  static render(report: ExecutionReport): string {
    return `
      <html>
        <head><title>Workflow Report</title></head>
        <body>
          <h1>Workflow Report</h1>
          <p>Status: ${report.summary.status}</p>
          <p>Score: ${report.summary.score}</p>
          <p>Environment: ${report.summary.environment}</p>
          ${report.sections
            .map(
              (section) =>
                `<h2>${section.title}</h2><pre>${JSON.stringify(section.content, null, 2)}</pre>`,
            )
            .join('')}
        </body>
      </html>
    `;
  }
}
