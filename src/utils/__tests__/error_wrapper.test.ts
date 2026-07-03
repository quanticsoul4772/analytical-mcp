import { describe, it, expect, jest } from '@jest/globals';
import {
  CircuitBreaker,
  CircuitState,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  withTimeout,
  withFallback,
  withFallbackOperation,
  batchWithErrorHandling,
  memoizeAsync,
  withGracefulDegradation
} from '../error_wrapper.js';
import { AnalyticalError, ErrorCodes, ValidationError } from '../errors.js';

describe('CircuitBreaker', () => {
  // threshold: 3 failures, recovery timeout: 100ms
  const createBreaker = (): CircuitBreaker => new CircuitBreaker(3, 100, 'test-breaker');

  const failingOperation = async (): Promise<string> => {
    throw new Error('Test failure');
  };

  const openBreaker = async (circuitBreaker: CircuitBreaker): Promise<void> => {
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Test failure');
    }
  };

  it('should start in CLOSED state', () => {
    expect(createBreaker().getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition to OPEN after exceeding failure threshold', async () => {
    const circuitBreaker = createBreaker();

    await openBreaker(circuitBreaker);

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject immediately when OPEN', async () => {
    const circuitBreaker = createBreaker();
    await openBreaker(circuitBreaker);

    const operation = jest.fn(async () => 'success');
    await expect(circuitBreaker.execute(operation)).rejects.toThrow(
      'Circuit breaker is OPEN for test-breaker'
    );

    // The protected operation must not have been invoked while OPEN
    expect(operation).not.toHaveBeenCalled();
  });

  it('should transition through HALF_OPEN to CLOSED after recovery timeout', async () => {
    const circuitBreaker = createBreaker();
    await openBreaker(circuitBreaker);

    // Wait for the recovery timeout to elapse
    await new Promise((resolve) => setTimeout(resolve, 150));

    // First successful call runs in HALF_OPEN; two successes are required to close
    const result1 = await circuitBreaker.execute(async () => 'success');
    expect(result1).toBe('success');
    expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

    const result2 = await circuitBreaker.execute(async () => 'success');
    expect(result2).toBe('success');
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should reopen when an operation fails during HALF_OPEN', async () => {
    const circuitBreaker = createBreaker();
    await openBreaker(circuitBreaker);

    await new Promise((resolve) => setTimeout(resolve, 150));

    // A failure while probing in HALF_OPEN sends the breaker straight back to OPEN
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Test failure');
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reset failure count on successful operation', async () => {
    const circuitBreaker = createBreaker();

    // Partially fill failure count
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

    // Successful operation should reset the count
    const result = await circuitBreaker.execute(async () => 'success');
    expect(result).toBe('success');

    // Two more failures (fewer than the threshold of 3) keep it closed
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should support manual reset', async () => {
    const circuitBreaker = createBreaker();
    await openBreaker(circuitBreaker);
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

    circuitBreaker.reset();

    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    const result = await circuitBreaker.execute(async () => 'success');
    expect(result).toBe('success');
  });
});

describe('withRetry', () => {
  it('should expose sensible defaults', () => {
    expect(DEFAULT_RETRY_CONFIG).toEqual({
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
    });
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn(async () => 'success');

    const result = await withRetry(operation, { maxAttempts: 3, initialDelayMs: 1 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry failed operations', async () => {
    const operation = jest.fn(async () => 'success')
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'));

    const result = await withRetry(operation, { maxAttempts: 3, initialDelayMs: 1 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max attempts with a descriptive error', async () => {
    const operation = jest.fn(async (): Promise<string> => {
      throw new Error('Always fails');
    });

    const outcome = withRetry(operation, { maxAttempts: 2, initialDelayMs: 1 }, 'flaky-op');

    await expect(outcome).rejects.toThrow('flaky-op failed after 2 attempts');
    await expect(
      withRetry(operation, { maxAttempts: 2, initialDelayMs: 1 }, 'flaky-op').catch((e) => e)
    ).resolves.toMatchObject({
      code: ErrorCodes.TOOL_EXECUTION_FAILED,
      context: { lastError: 'Always fails' },
    });
    expect(operation).toHaveBeenCalledTimes(4); // 2 attempts per invocation
  });

  it('should use exponential backoff', async () => {
    const operation = jest.fn(async () => 'success')
      .mockRejectedValueOnce(new Error('Fail'));

    const startTime = Date.now();
    await withRetry(operation, { maxAttempts: 2, initialDelayMs: 100 });
    const duration = Date.now() - startTime;

    expect(duration).toBeGreaterThanOrEqual(90); // Should have waited about the base delay
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry errors outside the retryable list', async () => {
    const operation = jest.fn(async (): Promise<string> => {
      throw new ValidationError(ErrorCodes.INVALID_INPUT, 'Bad input');
    });

    await expect(
      withRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 1,
        retryableErrors: [ErrorCodes.API_TIMEOUT],
      })
    ).rejects.toThrow('Bad input');

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry errors that are in the retryable list', async () => {
    const operation = jest.fn(async () => 'success')
      .mockRejectedValueOnce(new AnalyticalError(ErrorCodes.API_TIMEOUT, 'Timed out'));

    const result = await withRetry(operation, {
      maxAttempts: 3,
      initialDelayMs: 1,
      retryableErrors: [ErrorCodes.API_TIMEOUT],
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('withTimeout', () => {
  it('should complete fast operations normally', async () => {
    const operation = async (): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'success';
    };

    const result = await withTimeout(operation, 1000);
    expect(result).toBe('success');
  });

  it('should timeout slow operations', async () => {
    const operation = async (): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return 'success';
    };

    await expect(withTimeout(operation, 50, 'test-operation')).rejects.toThrow(
      'test-operation timed out after 50ms'
    );
  });

  it('should use default operation name', async () => {
    const operation = async (): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    };

    await expect(withTimeout(operation, 50)).rejects.toThrow('operation timed out after 50ms');
  });
});

describe('withFallback', () => {
  it('should return primary result when successful', async () => {
    const primary = async (): Promise<string> => 'primary';
    const fallback = 'fallback';

    const result = await withFallback(primary, fallback);
    expect(result).toBe('primary');
  });

  it('should return fallback when primary fails', async () => {
    const primary = async (): Promise<string> => {
      throw new Error('Primary failed');
    };
    const fallback = 'fallback';

    const result = await withFallback(primary, fallback);
    expect(result).toBe('fallback');
  });
});

describe('withFallbackOperation', () => {
  it('should return primary result when successful', async () => {
    const primary = async (): Promise<string> => 'primary';
    const fallback = async (): Promise<string> => 'fallback';

    const result = await withFallbackOperation(primary, fallback);
    expect(result).toBe('primary');
  });

  it('should execute fallback operation when primary fails', async () => {
    const primary = async (): Promise<string> => {
      throw new Error('Primary failed');
    };
    const fallback = jest.fn(async () => 'fallback');

    const result = await withFallbackOperation(primary, fallback);
    expect(result).toBe('fallback');
    expect(fallback).toHaveBeenCalled();
  });

  it('should rethrow the primary error if both operations fail', async () => {
    const primary = async (): Promise<string> => {
      throw new Error('Primary failed');
    };
    const fallback = async (): Promise<string> => {
      throw new Error('Fallback failed');
    };

    await expect(withFallbackOperation(primary, fallback)).rejects.toThrow('Primary failed');
  });
});

describe('batchWithErrorHandling', () => {
  it('should process all items successfully', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = async (item: number): Promise<number> => item * 2;

    const results = await batchWithErrorHandling(items, operation, { concurrency: 2 });

    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.result).toBe(items[index]! * 2);
      expect(result.item).toBe(items[index]);
    });
  });

  it('should handle individual item failures', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = async (item: number): Promise<number> => {
      if (item === 3) {
        throw new Error(`Item ${item} failed`);
      }
      return item * 2;
    };

    const results = await batchWithErrorHandling(items, operation, { concurrency: 2 });

    expect(results).toHaveLength(5);

    // Check successful items
    for (const index of [0, 1, 3, 4]) {
      expect(results[index]!.success).toBe(true);
      expect(results[index]!.result).toBe(items[index]! * 2);
    }

    // Check failed item
    expect(results[2]!.success).toBe(false);
    expect(results[2]!.error?.message).toBe('Item 3 failed');
    expect(results[2]!.item).toBe(3);
  });

  it('should respect concurrency limits', async () => {
    const items = [1, 2, 3, 4, 5];
    const activeOperations = new Set<number>();
    let maxConcurrent = 0;

    const operation = async (item: number): Promise<number> => {
      activeOperations.add(item);
      maxConcurrent = Math.max(maxConcurrent, activeOperations.size);

      await new Promise((resolve) => setTimeout(resolve, 10));

      activeOperations.delete(item);
      return item * 2;
    };

    await batchWithErrorHandling(items, operation, { concurrency: 2 });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should stop on first error when stopOnError is true', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = jest.fn(async (item: number): Promise<number> => {
      if (item === 2) {
        throw new Error(`Item ${item} failed`);
      }
      return item * 2;
    });

    await expect(
      batchWithErrorHandling(items, operation, { stopOnError: true, concurrency: 1 })
    ).rejects.toThrow('Item 2 failed');

    // Should not process the remaining items after the failure
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('memoizeAsync', () => {
  it('should cache function results', async () => {
    const fn = jest.fn(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn);

    const result1 = await memoized(5);
    const result2 = await memoized(5);

    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle different arguments separately', async () => {
    const fn = jest.fn(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn);

    const result1 = await memoized(5);
    const result2 = await memoized(10);

    expect(result1).toBe(10);
    expect(result2).toBe(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should respect TTL', async () => {
    const fn = jest.fn(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn, { ttlMs: 50 });

    await memoized(5);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for TTL
    await memoized(5);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should respect a custom key generator', async () => {
    const fn = jest.fn(async (x: number, _label: string) => x * 2);
    const memoized = memoizeAsync(fn, { keyGenerator: (x) => String(x) });

    // Same first argument produces the same key regardless of the label
    await memoized(5, 'a');
    await memoized(5, 'b');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect cache size limit', async () => {
    const fn = jest.fn(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn, { maxSize: 2 });

    await memoized(1);
    await memoized(2);
    await memoized(3); // Should evict oldest entry (1)
    await memoized(1); // Should call function again

    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('should not cache errors', async () => {
    const fn = jest.fn(async (_x: number) => 10)
      .mockRejectedValueOnce(new Error('Test error'));

    const memoized = memoizeAsync(fn);

    await expect(memoized(5)).rejects.toThrow('Test error');
    const result = await memoized(5);

    expect(result).toBe(10);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('withGracefulDegradation', () => {
  it('should execute operations in priority order (highest priority number first)', async () => {
    const highPriority = jest.fn(async () => 'high');
    const mediumPriority = jest.fn(async () => 'medium');
    const lowPriority = jest.fn(async () => 'low');

    const operations = [
      { operation: lowPriority, name: 'low', priority: 1 },
      { operation: mediumPriority, name: 'medium', priority: 2 },
      { operation: highPriority, name: 'high', priority: 3 }
    ];

    const result = await withGracefulDegradation(operations);

    expect(result).toBe('high');
    expect(highPriority).toHaveBeenCalled();
    expect(mediumPriority).not.toHaveBeenCalled();
    expect(lowPriority).not.toHaveBeenCalled();
  });

  it('should fallback to lower priority operations', async () => {
    const highPriority = jest.fn(async (): Promise<string> => {
      throw new Error('High failed');
    });
    const mediumPriority = jest.fn(async () => 'medium');
    const lowPriority = jest.fn(async () => 'low');

    const operations = [
      { operation: highPriority, name: 'high', priority: 3 },
      { operation: mediumPriority, name: 'medium', priority: 2 },
      { operation: lowPriority, name: 'low', priority: 1 }
    ];

    const result = await withGracefulDegradation(operations);

    expect(result).toBe('medium');
    expect(highPriority).toHaveBeenCalled();
    expect(mediumPriority).toHaveBeenCalled();
    expect(lowPriority).not.toHaveBeenCalled();
  });

  it('should fail if all operations fail', async () => {
    const operations = [
      {
        operation: async (): Promise<string> => {
          throw new Error('Op 1 failed');
        },
        name: 'op-1',
        priority: 2,
      },
      {
        operation: async (): Promise<string> => {
          throw new Error('Op 2 failed');
        },
        name: 'op-2',
        priority: 1,
      }
    ];

    const outcome = withGracefulDegradation(operations, 'degradable-op').catch((e) => e);
    const error = await outcome;

    expect(error).toBeInstanceOf(AnalyticalError);
    expect(error.message).toBe('degradable-op failed for all degradation levels');
    // The lowest-priority operation runs last, so its error is reported
    expect(error.context).toEqual({ lastError: 'Op 2 failed' });
  });

  it('should handle empty operations array', async () => {
    await expect(withGracefulDegradation([])).rejects.toThrow(
      'operation failed for all degradation levels'
    );
  });
});
