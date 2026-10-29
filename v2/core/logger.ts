export interface LogContext {
  requestId?: string;
  environment?: string;
  workflowId?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context: LogContext;
}

export class StructuredLogger {
  private entries: LogEntry[] = [];

  debug(message: string, context: LogContext = {}): void {
    this.write('debug', message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.write('info', message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.write('warn', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.write('error', message, context);
  }

  private write(level: LogEntry['level'], message: string, context: LogContext): void {
    this.entries.push({
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    }));
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }
}

export const logger = new StructuredLogger();
