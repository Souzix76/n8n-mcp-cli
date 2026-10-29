export interface ProgressToken {
  report(progress: { stage: string; progress: number; meta?: Record<string, unknown> }): void;
}

export class CancellationToken {
  private cancelled = false;
  private listeners: Array<() => void> = [];

  cancel(): void {
    this.cancelled = true;
    this.listeners.forEach(l => l());
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  onCancel(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  throwIfCancelled(): void {
    if (this.cancelled) throw new Error('cancelled');
  }
}

export interface AsyncRunnerOptions {
  defaultTimeout?: number;
  onProgress?: (progress: { stage: string; progress: number; meta?: Record<string, unknown> }) => void;
}

export class AsyncRunner {
  private defaultTimeout: number;
  private globalProgressCallback?: (progress: { stage: string; progress: number; meta?: Record<string, unknown> }) => void;

  constructor(options: AsyncRunnerOptions = {}) {
    this.defaultTimeout = options.defaultTimeout ?? 120000;
    this.globalProgressCallback = options.onProgress;
  }

  async run<T>(
    operation: (progress: ProgressToken, cancellationToken: CancellationToken) => Promise<T>,
    options: {
      onProgress?: (progress: { stage: string; progress: number; meta?: Record<string, unknown> }) => void;
      cancellationToken?: CancellationToken;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const cancellationToken = options.cancellationToken ?? new CancellationToken();
    const timeout = options.timeout ?? this.defaultTimeout;

    // Check if already cancelled before starting
    cancellationToken.throwIfCancelled();

    const progressToken: ProgressToken = {
      report: (progress) => {
        this.globalProgressCallback?.(progress);
        options.onProgress?.(progress);
      },
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => reject(new Error('timeout')), timeout);
      cancellationToken.onCancel(() => clearTimeout(id));
    });

    const operationPromise = (async () => {
      try {
        // Check cancellation before operation
        cancellationToken.throwIfCancelled();
        const result = await operation(progressToken, cancellationToken);
        // Check cancellation after operation
        cancellationToken.throwIfCancelled();
        return result;
      } finally {
        cancellationToken.cancel();
      }
    })();

    try {
      const result = await Promise.race([operationPromise, timeoutPromise]);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelled') {
        throw error;
      }
      throw error;
    }
  }

  static createProgressToken(
    onProgress?: (progress: { stage: string; progress: number; meta?: Record<string, unknown> }) => void
  ): ProgressToken {
    return {
      report: (progress) => onProgress?.(progress),
    };
  }
}