import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { withRetry, isRetryableError, executeApiRequest, RETRYABLE_STATUS_CODES } from '../api_helpers.js';
import { APIError } from '../errors.js';

// Mock the Logger
jest.mock('../logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

describe('API Helper Utilities - Edge Cases', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Use real timers by default
  });

  describe('withRetry Edge Cases', () => {
    // Use fake timers for this test to avoid waiting
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    it('should handle maximum retries exactly', async () => {
      // Create a function that always fails
      const fn = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Test error'));
      
      // Call withRetry with exactly 3 retries
      const promise = withRetry(fn, 3, 10, 100);
      
      // Fast-forward time to skip all delays
      jest.runAllTimers();
      
      // Should reject after all retries are exhausted
      await expect(promise).rejects.toThrow('Test error');
      
      // Should have been called exactly 4 times (initial + 3 retries)
      expect(fn).toHaveBeenCalledTimes(4);
    });
    
    it('should use exponential backoff with proper delays', async () => {
      // Create a function that always fails
      const fn = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Test error'));
      
      // Start with a smaller delay for testing
      const initialDelay = 10;
      
      // Call withRetry with 2 retries
      const promise = withRetry(fn, 2, initialDelay, 1000);
      
      // First attempt happens immediately
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Fast-forward less than the initial delay - nothing should happen
      jest.advanceTimersByTime(initialDelay - 1);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Fast-forward to the initial delay - first retry should happen
      jest.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(2);
      
      // Second retry should happen after exponential delay, which is approximately
      // initialDelay * 1.5 = 15ms plus some random jitter (up to ~25ms)
      jest.advanceTimersByTime(30); // More than enough time for second retry
      expect(fn).toHaveBeenCalledTimes(3);
      
      // Finish the test
      jest.runAllTimers();
      await expect(promise).rejects.toThrow('Test error');
    });
    
    it('should respect maxDelay parameter', async () => {
      // Save original setTimeout
      const originalSetTimeout = global.setTimeout;
      
      // Create a tracking array for delays instead of using a mock
      const recordedDelays: number[] = [];
      
      // Modify global.setTimeout without fully replacing it
      const originalSetTimeoutFn = global.setTimeout;
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, ms?: number) => {
        if (ms !== undefined) {
          recordedDelays.push(ms);
        }
        return originalSetTimeoutFn(callback, ms);
      });
      
      // Create a function that always fails
      const fn = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Test error'));
      
      // Call withRetry with a low maxDelay
      const maxDelay = 50;
      const promise = withRetry(fn, 5, 20, maxDelay);
      
      // Run all timers
      jest.runAllTimers();
      await expect(promise).rejects.toThrow('Test error');
      
      // Check if all delays were <= maxDelay
      for (const delay of recordedDelays) {
        expect(delay).toBeLessThanOrEqual(maxDelay);
      }
      
      // Restore setTimeout
      jest.restoreAllMocks();
    });
    
    it('should handle error in last retry attempt', async () => {
      // Create a function that succeeds on the last retry only
      const fn = jest.fn<() => Promise<unknown>>()
        .mockRejectedValueOnce(new Error('Retry 1'))
        .mockRejectedValueOnce(new Error('Retry 2'))
        .mockRejectedValueOnce(new Error('Final attempt'));
      
      // Call withRetry with 2 retries
      const promise = withRetry(fn, 2, 10, 100);
      
      // Fast-forward all timers
      jest.runAllTimers();
      
      // Should reject with the final error
      await expect(promise).rejects.toThrow('Final attempt');
      expect(fn).toHaveBeenCalledTimes(3);
    });
    
    it('should succeed immediately if the first attempt works', async () => {
      // Create a function that succeeds immediately
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue('success');
      
      // Call withRetry
      const result = await withRetry(fn, 3, 10, 100);
      
      // Should return correct value
      expect(result).toBe('success');
      
      // Should only be called once
      expect(fn).toHaveBeenCalledTimes(1);
      
      // No timers should have been set
      expect(jest.getTimerCount()).toBe(0);
    });
    
    // Restore real timers after all tests
    it('cleans up timers', () => {
      jest.useRealTimers();
    });
  });

  describe('isRetryableError Edge Cases', () => {
    it('should handle null or undefined errors correctly', () => {
      // @ts-ignore - Testing edge cases with invalid inputs
      expect(isRetryableError(null)).toBe(false);
      
      // @ts-ignore - Testing edge cases with invalid inputs
      expect(isRetryableError(undefined)).toBe(false);
    });
    
    it('should handle primitive values correctly', () => {
      // @ts-ignore - Testing edge cases with invalid inputs
      expect(isRetryableError('string error')).toBe(false);
      
      // @ts-ignore - Testing edge cases with invalid inputs
      expect(isRetryableError(123)).toBe(false);
      
      // @ts-ignore - Testing edge cases with invalid inputs
      expect(isRetryableError(true)).toBe(false);
    });
    
    it('should handle objects without proper error properties', () => {
      // @ts-ignore - Testing edge cases with invalid inputs
      expect(isRetryableError({})).toBe(false);
      
      // @ts-ignore - Testing edge cases with invalid inputs
      expect(isRetryableError({ foo: 'bar' })).toBe(false);
    });
    
    it('should correctly handle borderline status codes', () => {
      // Check border of retryable status codes
      const minRetryable = Math.min(...RETRYABLE_STATUS_CODES);
      const maxRetryable = Math.max(...RETRYABLE_STATUS_CODES);
      
      // Just below minimum retryable should return false
      expect(isRetryableError({ status: minRetryable - 1 })).toBe(false);
      
      // Minimum retryable should return true
      expect(isRetryableError({ status: minRetryable })).toBe(true);
      
      // Maximum retryable should return true
      expect(isRetryableError({ status: maxRetryable })).toBe(true);
      
      // Just above maximum retryable should return false
      expect(isRetryableError({ status: maxRetryable + 1 })).toBe(false);
    });
    
    it('should handle specific message patterns correctly', () => {
      // Test rate limit message pattern
      expect(isRetryableError({ message: 'Rate limit exceeded' })).toBe(true);
      expect(isRetryableError({ message: 'rate LIMIT error' })).toBe(true);
      
      // Test timeout message pattern
      expect(isRetryableError({ message: 'Connection timeout' })).toBe(true);
      expect(isRetryableError({ message: 'TIMEOUT error' })).toBe(true);
      
      // Test connection error pattern
      expect(isRetryableError({ message: 'Connection refused' })).toBe(true);
      expect(isRetryableError({ message: 'network error' })).toBe(true);
      
      // Test non-retryable message
      expect(isRetryableError({ message: 'Invalid parameter' })).toBe(false);
    });
    
    it('should prioritize retryable flag in APIError over other factors', () => {
      // Even with non-retryable status, should be retryable if flag is true
      const apiError = new APIError('Test error', 400, true);
      expect(isRetryableError(apiError)).toBe(true);
      
      // Even with retryable status, should not be retryable if flag is false
      const apiError2 = new APIError('Test error', 429, false);
      expect(isRetryableError(apiError2)).toBe(false);
    });
  });

  describe('executeApiRequest Edge Cases', () => {
    it('should use custom retryable check function when provided', async () => {
      // Create a custom check that considers everything retryable
      const customCheck = jest.fn<(err: unknown) => boolean>().mockReturnValue(true);
      
      // Create a function that fails once then succeeds
      const apiRequestFn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce('success');
      
      // Call executeApiRequest with custom check
      const result = await executeApiRequest(apiRequestFn, {
        maxRetries: 1,
        initialDelay: 1, // Use minimal delay
        retryableCheck: customCheck
      });
      
      // Should succeed after retry
      expect(result).toBe('success');
      
      // Custom check should have been called
      expect(customCheck).toHaveBeenCalled();
      
      // API function should have been called twice (initial + 1 retry)
      expect(apiRequestFn).toHaveBeenCalledTimes(2);
    });
    
    it('should handle already wrapped APIErrors correctly', async () => {
      // Create an APIError
      const apiError = new APIError('Test API error', 429, true, 'test/endpoint');
      
      // Create a function that throws the APIError
      const apiRequestFn = jest.fn<() => Promise<never>>().mockRejectedValue(apiError);
      
      // Call executeApiRequest
      await expect(executeApiRequest(apiRequestFn, {
        maxRetries: 0 // No retries
      })).rejects.toThrow(APIError);
      
      // Should not have created a new APIError wrapper
      const { Logger } = await import('../logger.js');
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('API error'),
        expect.objectContaining({
          name: 'APIError',
          message: 'Test API error',
          status: 429,
          retryable: true,
          endpoint: 'test/endpoint'
        }),
        expect.any(Object)
      );
    });
    
    it('should convert regular errors to APIErrors', async () => {
      // Create a regular Error
      const regularError = new Error('Regular error');
      
      // Create a function that throws the regular error
      const apiRequestFn = jest.fn<() => Promise<never>>().mockRejectedValue(regularError);
      
      // Call executeApiRequest
      await expect(executeApiRequest(apiRequestFn, {
        maxRetries: 0, // No retries
        context: 'Test context',
        endpoint: 'test/endpoint'
      })).rejects.toThrow(APIError);
    });
    
    it('should handle primitive error values', async () => {
      // Create a function that throws a string
      const apiRequestFn = jest.fn<() => Promise<never>>().mockImplementation(() => {
        throw 'String error'; // Not an Error object
      });
      
      // Call executeApiRequest
      await expect(executeApiRequest(apiRequestFn, {
        maxRetries: 0 // No retries
      })).rejects.toThrow(APIError);
      
      // Should have converted to APIError
      const { Logger } = await import('../logger.js');
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('API error'),
        expect.any(Object),
        expect.any(Object)
      );
    });
    
    it('should preserve stack traces when converting errors', async () => {
      // Create an error with a stack trace
      const originalError = new Error('Original error');
      originalError.stack = 'Fake stack trace';
      
      // Create a function that throws the error
      const apiRequestFn = jest.fn<() => Promise<never>>().mockRejectedValue(originalError);
      
      // Call executeApiRequest and catch the error
      let caughtError;
      try {
        await executeApiRequest(apiRequestFn, {
          maxRetries: 0 // No retries
        });
      } catch (error) {
        caughtError = error;
      }
      
      // Should have preserved the stack trace
      expect(caughtError instanceof APIError).toBe(true);
      expect((caughtError as APIError).stack).toBe('Fake stack trace');
    });
  });
});