/**
 * Error Handling Wrapper Utilities
 *
 * Provides consistent error handling patterns across the application
 * with retry logic, circuit breakers, and graceful degradation.
 */

import { Logger } from './logger.js';
import { AnalyticalError, ErrorCodes } from './errors.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: ErrorCodes[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker for protecting against cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000,
    private readonly name: string = 'default'
  ) {}

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new AnalyticalError(
          ErrorCodes.TOOL_EXECUTION_FAILED,
          `Circuit breaker is OPEN for ${this.name}`,
          { state: this.state, nextAttemptTime: this.nextAttemptTime }
        );
      }
      // Try to recover
      this.state = CircuitState.HALF_OPEN;
      Logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        Logger.info(`Circuit breaker ${this.name} recovered, now CLOSED`);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;
      Logger.warn(`Circuit breaker ${this.name} failed during HALF_OPEN, back to OPEN`);
    } else if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;
      Logger.error(`Circuit breaker ${this.name} opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        Logger.info(`${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (error instanceof AnalyticalError && finalConfig.retryableErrors) {
        if (!finalConfig.retryableErrors.includes(error.code as ErrorCodes)) {
          throw error;
        }
      }

      if (attempt < finalConfig.maxAttempts) {
        Logger.warn(`${operationName} failed, attempt ${attempt}/${finalConfig.maxAttempts}`, {
          error: lastError.message,
          nextRetryInMs: delay,
        });

        await sleep(delay);
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
      }
    }
  }

  throw new AnalyticalError(
    ErrorCodes.TOOL_EXECUTION_FAILED,
    `${operationName} failed after ${finalConfig.maxAttempts} attempts`,
    { lastError: lastError?.message }
  );
}

/**
 * Execute an operation with a timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new AnalyticalError(
            ErrorCodes.TOOL_EXECUTION_FAILED,
            `${operationName} timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);
    }),
  ]);
}

/**
 * Execute an operation with fallback value on error
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    Logger.warn(`${operationName} failed, using fallback value`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackValue;
  }
}

/**
 * Execute an operation with fallback operation on error
 */
export async function withFallbackOperation<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  operationName: string = 'operation'
): Promise<T> {
  try {
    return await primaryOperation();
  } catch (primaryError) {
    Logger.warn(`${operationName} primary operation failed, trying fallback`, {
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });

    try {
      return await fallbackOperation();
    } catch (fallbackError) {
      Logger.error(`${operationName} fallback operation also failed`, {
        primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
        fallbackError:
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      throw primaryError;
    }
  }
}

/**
 * Batch operations with error handling
 */
export async function batchWithErrorHandling<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    stopOnError?: boolean;
    operationName?: string;
  } = {}
): Promise<Array<{ success: boolean; result?: R; error?: Error; item: T }>> {
  const { concurrency = 5, stopOnError = false, operationName = 'batch operation' } = options;

  const results: Array<{ success: boolean; result?: R; error?: Error; item: T }> = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    // Wait for a slot to become available if we're at the concurrency limit
    if (executing.length >= concurrency) {
      await Promise.race(executing).catch(() => {});
    }

    const promise = (async () => {
      try {
        const result = await operation(item);
        results.push({ success: true, result, item });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({ success: false, error: err, item });

        Logger.warn(`${operationName} failed for item`, {
          error: err.message,
        });

        if (stopOnError) {
          throw error;
        }
      } finally {
        // Remove this promise from the executing array when done
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      }
    })();

    executing.push(promise);
  }

  await Promise.all(executing);
  return results;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Graceful degradation wrapper
 * Attempts operation with progressively simpler fallbacks
 */
export async function withGracefulDegradation<T>(
  operations: Array<{
    operation: () => Promise<T>;
    name: string;
    priority: number;
  }>,
  operationName: string = 'operation'
): Promise<T> {
  // Sort by priority (highest first)
  const sorted = [...operations].sort((a, b) => b.priority - a.priority);

  let lastError: Error | null = null;

  for (const { operation, name } of sorted) {
    try {
      const result = await operation();
      if (name !== sorted[0].name) {
        Logger.info(`${operationName} succeeded with degraded operation: ${name}`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      Logger.warn(`${operationName} failed for ${name}, trying next fallback`, {
        error: lastError.message,
      });
    }
  }

  throw new AnalyticalError(
    ErrorCodes.TOOL_EXECUTION_FAILED,
    `${operationName} failed for all degradation levels`,
    { lastError: lastError?.message }
  );
}

/**
 * Memoize async function with error handling
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttlMs?: number;
    maxSize?: number;
  } = {}
): T {
  const cache = new Map<string, { value: any; timestamp: number }>();
  const { keyGenerator = (...args) => JSON.stringify(args), ttlMs = 60000, maxSize = 100 } = options;

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const now = Date.now();

    // Check cache
    const cached = cache.get(key);
    if (cached && now - cached.timestamp < ttlMs) {
      return cached.value;
    }

    // Execute function
    try {
      const value = await fn(...args);

      // Store in cache
      cache.set(key, { value, timestamp: now });

      // Cleanup old entries if cache is too large
      if (cache.size > maxSize) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toDelete = entries.slice(0, Math.floor(maxSize * 0.2));
        toDelete.forEach(([k]) => cache.delete(k));
      }

      return value;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }) as T;
}
