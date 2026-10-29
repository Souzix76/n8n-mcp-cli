export interface AuditEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  operation: string;
  environment: string;
  workflowId?: string;
  message: string;
  context?: Record<string, unknown>;
}

export class AuditLog {
  private entries: AuditEntry[] = [];

  record(entry: Omit<AuditEntry, 'timestamp'>): void {
    this.entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }
}

export const auditLog = new AuditLog();

export function emitAudit(
  level: AuditEntry['level'],
  operation: string,
  environment: string,
  message: string,
  context: Record<string, unknown> = {},
  workflowId?: string,
): void {
  auditLog.record({
    level,
    operation,
    environment,
    message,
    context,
    workflowId,
  });
}
