export type FailureKind =
  | 'config'
  | 'network'
  | 'auth'
  | 'validation'
  | 'workflow'
  | 'runtime'
  | 'unknown';

export type CredentialMode = 'read-only' | 'external';

export class AppError extends Error {
  constructor(
    public readonly kind: FailureKind,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class CredentialBoundaryError extends Error {
  public readonly mode: CredentialMode;
  public readonly operation: string;
  public readonly remediation: string;

  constructor(message: string, mode: CredentialMode, operation: string) {
    super(message);
    this.name = 'CredentialBoundaryError';
    this.mode = mode;
    this.operation = operation;
    this.remediation = mode === 'read-only'
      ? 'Use --credential-mode=external to enable write operations, or ensure N8N_API_KEY is set for read operations.'
      : 'Ensure N8N_API_KEY and N8N_BASE_URL are set in environment. This mode requires external credential management.';
  }
}

export function createConfigError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('config', message, details);
}

export function createNetworkError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('network', message, details);
}

export function createValidationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('validation', message, details);
}

export function createCredentialBoundaryError(
  mode: CredentialMode,
  operation: string,
  customMessage?: string
): CredentialBoundaryError {
  const message = customMessage ?? `Operation '${operation}' not allowed in ${mode} credential mode`;
  return new CredentialBoundaryError(message, mode, operation);
}
