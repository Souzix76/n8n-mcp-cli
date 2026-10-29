export type FailureKind =
  | 'config'
  | 'network'
  | 'auth'
  | 'validation'
  | 'workflow'
  | 'runtime'
  | 'unknown';

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

export function createConfigError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('config', message, details);
}

export function createNetworkError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('network', message, details);
}

export function createValidationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('validation', message, details);
}
