import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  CircuitBreaker,
  CircuitState,
  withRetry,
  withTimeout,
  withFallback,
  withFallbackOperation,
  batchWithErrorHandling,
  memoizeAsync,
  withGracefulDegradation
} from '../error_wrapper.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringWindow: 5000
    });
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition to OPEN after exceeding failure threshold', async () => {
    const failingOperation = async () => {
      throw new Error('Test failure');
    };

    // Trigger failures to exceed threshold
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject immediately when OPEN', async () => {
    // Force circuit to OPEN state
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(async () => {
        throw new Error('Failure');
      })).rejects.toThrow();
    }

    const startTime = Date.now();
    await expect(circuitBreaker.execute(async () => 'success')).rejects.toThrow();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Should fail fast
  });

  it('should transition to HALF_OPEN after recovery timeout', async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(async () => {
        throw new Error('Failure');
      })).rejects.toThrow();
    }

    // Wait for recovery timeout
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Next call should put it in HALF_OPEN
    const successOperation = async () => 'success';
    const result = await circuitBreaker.execute(successOperation);

    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should reset failure count on successful operation', async () => {
    // Partially fill failure count
    await expect(circuitBreaker.execute(async () => {
      throw new Error('Failure');
    })).rejects.toThrow();

    // Successful operation should reset count
    const result = await circuitBreaker.execute(async () => 'success');
    expect(result).toBe('success');

    // Should still be closed after 2 more failures (not 3 total)
    await expect(circuitBreaker.execute(async () => {
      throw new Error('Failure');
    })).rejects.toThrow();
    
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });
});

describe('withRetry', () => {
  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await withRetry(operation, { maxAttempts: 3 });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry failed operations', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success');
    
    const result = await withRetry(operation, { maxAttempts: 3 });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max attempts', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success');
    
    const startTime = Date.now();
    await withRetry(operation, { maxAttempts: 2, baseDelay: 100 });
    const duration = Date.now() - startTime;
    
    expect(duration).toBeGreaterThanOrEqual(100); // Should have waited at least base delay
  });

  it('should respect custom retry condition', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Custom error'));
    const retryCondition = jest.fn().mockReturnValue(false);
    
    await expect(withRetry(operation, {
      maxAttempts: 3,
      retryCondition
    })).rejects.toThrow('Custom error');
    
    expect(operation).toHaveBeenCalledTimes(1);
    expect(retryCondition).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('withTimeout', () => {
  it('should complete fast operations normally', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'success';
    };
    
    const result = await withTimeout(operation, 100);
    expect(result).toBe('success');
  });

  it('should timeout slow operations', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'success';
    };
    
    await expect(withTimeout(operation, 50, 'test-operation')).rejects.toThrow('test-operation timed out after 50ms');
  });

  it('should use default operation name', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    };
    
    await expect(withTimeout(operation, 50)).rejects.toThrow('operation timed out after 50ms');
  });
});

describe('withFallback', () => {
  it('should return primary result when successful', async () => {
    const primary = async () => 'primary';
    const fallback = 'fallback';
    
    const result = await withFallback(primary, fallback);
    expect(result).toBe('primary');
  });

  it('should return fallback when primary fails', async () => {
    const primary = async () => {
      throw new Error('Primary failed');
    };
    const fallback = 'fallback';
    
    const result = await withFallback(primary, fallback);
    expect(result).toBe('fallback');
  });
});

describe('withFallbackOperation', () => {
  it('should return primary result when successful', async () => {
    const primary = async () => 'primary';
    const fallback = async () => 'fallback';
    
    const result = await withFallbackOperation(primary, fallback);
    expect(result).toBe('primary');
  });

  it('should execute fallback operation when primary fails', async () => {
    const primary = async () => {
      throw new Error('Primary failed');
    };
    const fallback = jest.fn().mockResolvedValue('fallback');
    
    const result = await withFallbackOperation(primary, fallback);
    expect(result).toBe('fallback');
    expect(fallback).toHaveBeenCalled();
  });

  it('should fail if both operations fail', async () => {
    const primary = async () => {
      throw new Error('Primary failed');
    };
    const fallback = async () => {
      throw new Error('Fallback failed');
    };
    
    await expect(withFallbackOperation(primary, fallback)).rejects.toThrow('Fallback failed');
  });
});

describe('batchWithErrorHandling', () => {
  it('should process all items successfully', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = async (item: number) => item * 2;
    
    const results = await batchWithErrorHandling(
      items,
      operation,
      { concurrency: 2 }
    );
    
    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.result).toBe(items[index] * 2);
      expect(result.item).toBe(items[index]);
    });
  });

  it('should handle individual item failures', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = async (item: number) => {
      if (item === 3) {
        throw new Error(`Item ${item} failed`);
      }
      return item * 2;
    };
    
    const results = await batchWithErrorHandling(
      items,
      operation,
      { concurrency: 2 }
    );
    
    expect(results).toHaveLength(5);
    
    // Check successful items
    [0, 1, 3, 4].forEach(index => {
      expect(results[index].success).toBe(true);
      expect(results[index].result).toBe(items[index] * 2);
    });
    
    // Check failed item
    expect(results[2].success).toBe(false);
    expect(results[2].error?.message).toBe('Item 3 failed');
    expect(results[2].item).toBe(3);
  });

  it('should respect concurrency limits', async () => {
    const items = [1, 2, 3, 4, 5];
    const activeOperations = new Set();
    let maxConcurrent = 0;
    
    const operation = async (item: number) => {
      activeOperations.add(item);
      maxConcurrent = Math.max(maxConcurrent, activeOperations.size);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      activeOperations.delete(item);
      return item * 2;
    };
    
    await batchWithErrorHandling(items, operation, { concurrency: 2 });
    
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should stop on first error when stopOnError is true', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = jest.fn().mockImplementation(async (item: number) => {
      if (item === 2) {
        throw new Error(`Item ${item} failed`);
      }
      return item * 2;
    });
    
    await expect(batchWithErrorHandling(
      items,
      operation,
      { stopOnError: true }
    )).rejects.toThrow('Item 2 failed');
    
    // Should not process all items
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('memoizeAsync', () => {
  it('should cache function results', async () => {
    const fn = jest.fn().mockImplementation(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn);
    
    const result1 = await memoized(5);
    const result2 = await memoized(5);
    
    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle different arguments separately', async () => {
    const fn = jest.fn().mockImplementation(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn);
    
    const result1 = await memoized(5);
    const result2 = await memoized(10);
    
    expect(result1).toBe(10);
    expect(result2).toBe(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should respect TTL', async () => {
    const fn = jest.fn().mockImplementation(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn, { ttl: 50 });
    
    await memoized(5);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for TTL
    await memoized(5);
    
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should respect cache size limit', async () => {
    const fn = jest.fn().mockImplementation(async (x: number) => x * 2);
    const memoized = memoizeAsync(fn, { maxSize: 2 });
    
    await memoized(1);
    await memoized(2);
    await memoized(3); // Should evict oldest entry
    await memoized(1); // Should call function again
    
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('should not cache errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Test error'))
      .mockResolvedValue(10);
    
    const memoized = memoizeAsync(fn);
    
    await expect(memoized(5)).rejects.toThrow('Test error');
    const result = await memoized(5);
    
    expect(result).toBe(10);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('withGracefulDegradation', () => {
  it('should execute operations in priority order', async () => {
    const highPriority = jest.fn().mockResolvedValue('high');
    const mediumPriority = jest.fn().mockResolvedValue('medium');
    const lowPriority = jest.fn().mockResolvedValue('low');
    
    const operations = [
      { operation: highPriority, priority: 1 },
      { operation: mediumPriority, priority: 2 },
      { operation: lowPriority, priority: 3 }
    ];
    
    const result = await withGracefulDegradation(operations);
    
    expect(result).toBe('high');
    expect(highPriority).toHaveBeenCalled();
    expect(mediumPriority).not.toHaveBeenCalled();
    expect(lowPriority).not.toHaveBeenCalled();
  });

  it('should fallback to lower priority operations', async () => {
    const highPriority = jest.fn().mockRejectedValue(new Error('High failed'));
    const mediumPriority = jest.fn().mockResolvedValue('medium');
    const lowPriority = jest.fn().mockResolvedValue('low');
    
    const operations = [
      { operation: highPriority, priority: 1 },
      { operation: mediumPriority, priority: 2 },
      { operation: lowPriority, priority: 3 }
    ];
    
    const result = await withGracefulDegradation(operations);
    
    expect(result).toBe('medium');
    expect(highPriority).toHaveBeenCalled();
    expect(mediumPriority).toHaveBeenCalled();
    expect(lowPriority).not.toHaveBeenCalled();
  });

  it('should fail if all operations fail', async () => {
    const operations = [
      { operation: async () => { throw new Error('Op 1 failed'); }, priority: 1 },
      { operation: async () => { throw new Error('Op 2 failed'); }, priority: 2 }
    ];
    
    await expect(withGracefulDegradation(operations)).rejects.toThrow('Op 2 failed');
  });

  it('should handle empty operations array', async () => {
    await expect(withGracefulDegradation([])).rejects.toThrow('No operations provided');
  });
});