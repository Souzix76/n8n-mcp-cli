export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 4,
  baseDelayMs: 250,
  maxDelayMs: 5000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export function computeBackoffDelay(attempt: number, policy: RetryPolicy = defaultRetryPolicy): number {
  if (attempt <= 1) {
    return policy.baseDelayMs;
  }

  const exponential = policy.baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(exponential, policy.maxDelayMs);
}

export function shouldRetry(statusCode?: number, policy: RetryPolicy = defaultRetryPolicy): boolean {
  if (typeof statusCode !== 'number') {
    return false;
  }

  return policy.retryableStatusCodes.includes(statusCode);
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy = defaultRetryPolicy,
  onRetry?: (attempt: number, delayMs: number) => void,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const canRetry = attempt < policy.maxAttempts;
      if (!canRetry) {
        throw error;
      }

      const delayMs = computeBackoffDelay(attempt, policy);
      onRetry?.(attempt, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Retry failed without a concrete error.');
}
