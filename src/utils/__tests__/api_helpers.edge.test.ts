import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mocks must be registered with unstable_mockModule BEFORE the module under
// test is dynamically imported (jest.mock is not hoisted under ESM).
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Use import.meta.jest: it is bound to this file, so relative specifiers
// resolve from this directory (the @jest/globals jest object is bound to
// setupTests.ts under ESM and resolves relative paths from src/).
const jestEsm = (import.meta as any).jest as typeof jest;
// setupTests.ts already imported api_helpers.js (and its logger/config deps),
// so the module registry must be reset for the mocks below to take effect.
jestEsm.resetModules();
jestEsm.unstable_mockModule('../logger.js', () => ({ Logger: mockLogger }));
jestEsm.unstable_mockModule('../config.js', () => ({
  config: { EXA_API_KEY: undefined },
}));

const { withRetry, isRetryableError, executeApiRequest, RETRYABLE_STATUS_CODES } = await import(
  '../api_helpers.js'
);
// The retry helpers operate on the legacy error shape (message, status, retryable, endpoint)
const { LegacyAPIError: APIError } = await import('../errors.js');

describe('API Helper Utilities - Edge Cases', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('withRetry Edge Cases', () => {
    it('should handle maximum retries exactly', async () => {
      // Create a function that always fails
      const fn = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Test error'));

      // Call withRetry with exactly 3 retries and short real delays
      await expect(withRetry(fn, 3, 5, 20)).rejects.toThrow('Test error');

      // Should have been called exactly 4 times (initial + 3 retries)
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should use exponential backoff with increasing delays', async () => {
      // Record every delay passed to setTimeout while preserving real behavior
      const timeoutSpy = jest.spyOn(global, 'setTimeout');

      // Create a function that always fails
      const fn = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Test error'));

      const initialDelay = 10;
      await expect(withRetry(fn, 2, initialDelay, 10000)).rejects.toThrow('Test error');
      expect(fn).toHaveBeenCalledTimes(3);

      const recordedDelays = timeoutSpy.mock.calls
        .map((call) => call[1])
        .filter((ms): ms is number => typeof ms === 'number');

      // One delay per retry
      expect(recordedDelays).toHaveLength(2);

      // First delay: initialDelay * 1.5 plus up to 100ms of jitter
      expect(recordedDelays[0]).toBeGreaterThanOrEqual(initialDelay * 1.5);
      expect(recordedDelays[0]).toBeLessThanOrEqual(initialDelay * 1.5 + 100);

      // Second delay grows exponentially from the first (1.5x plus jitter)
      expect(recordedDelays[1]).toBeGreaterThanOrEqual(recordedDelays[0]! * 1.5);
    });

    it('should respect maxDelay parameter', async () => {
      // Record every delay passed to setTimeout while preserving real behavior
      const timeoutSpy = jest.spyOn(global, 'setTimeout');

      // Create a function that always fails
      const fn = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Test error'));

      // Call withRetry with a low maxDelay
      const maxDelay = 50;
      await expect(withRetry(fn, 5, 20, maxDelay)).rejects.toThrow('Test error');

      const recordedDelays = timeoutSpy.mock.calls
        .map((call) => call[1])
        .filter((ms): ms is number => typeof ms === 'number');

      // One delay per retry, all capped at maxDelay
      expect(recordedDelays).toHaveLength(5);
      for (const delay of recordedDelays) {
        expect(delay).toBeLessThanOrEqual(maxDelay);
      }
    });

    it('should handle error in last retry attempt', async () => {
      // Create a function that fails on every attempt, ending with a distinct error
      const fn = jest
        .fn<() => Promise<unknown>>()
        .mockRejectedValueOnce(new Error('Retry 1'))
        .mockRejectedValueOnce(new Error('Retry 2'))
        .mockRejectedValueOnce(new Error('Final attempt'));

      // Should reject with the final error
      await expect(withRetry(fn, 2, 5, 20)).rejects.toThrow('Final attempt');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should succeed immediately if the first attempt works', async () => {
      const timeoutSpy = jest.spyOn(global, 'setTimeout');

      // Create a function that succeeds immediately
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      // Call withRetry
      const result = await withRetry(fn, 3, 10, 100);

      // Should return correct value
      expect(result).toBe('success');

      // Should only be called once
      expect(fn).toHaveBeenCalledTimes(1);

      // No retry delays should have been scheduled
      expect(timeoutSpy).not.toHaveBeenCalled();
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
      const apiRequestFn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce('success');

      // Call executeApiRequest with custom check
      const result = await executeApiRequest(apiRequestFn, {
        maxRetries: 1,
        initialDelay: 1, // Use minimal delay
        retryableCheck: customCheck,
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
      await expect(
        executeApiRequest(apiRequestFn, {
          maxRetries: 0, // No retries
        })
      ).rejects.toThrow(APIError);

      // Should not have created a new APIError wrapper
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API error'),
        expect.objectContaining({
          name: 'APIError',
          message: 'Test API error',
          status: 429,
          retryable: true,
          endpoint: 'test/endpoint',
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
      await expect(
        executeApiRequest(apiRequestFn, {
          maxRetries: 0, // No retries
          context: 'Test context',
          endpoint: 'test/endpoint',
        })
      ).rejects.toThrow(APIError);
    });

    it('should handle primitive error values', async () => {
      // Create a function that throws a string
      const apiRequestFn = jest.fn<() => Promise<never>>().mockImplementation(() => {
        throw 'String error'; // Not an Error object
      });

      // Call executeApiRequest
      await expect(
        executeApiRequest(apiRequestFn, {
          maxRetries: 0, // No retries
        })
      ).rejects.toThrow(APIError);

      // Should have converted to APIError
      expect(mockLogger.error).toHaveBeenCalledWith(
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
          maxRetries: 0, // No retries
        });
      } catch (error) {
        caughtError = error;
      }

      // Should have preserved the stack trace
      expect(caughtError instanceof APIError).toBe(true);
      expect((caughtError as InstanceType<typeof APIError>).stack).toBe('Fake stack trace');
    });
  });
});
