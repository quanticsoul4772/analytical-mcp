import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mocks must be registered with unstable_mockModule BEFORE the module under
// test is dynamically imported (jest.mock is not hoisted under ESM).
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

const mockConfig: { EXA_API_KEY?: string } = {
  EXA_API_KEY: undefined,
};

// Use import.meta.jest: it is bound to this file, so relative specifiers
// resolve from this directory (the @jest/globals jest object is bound to
// setupTests.ts under ESM and resolves relative paths from src/).
const jestEsm = (import.meta as any).jest as typeof jest;
// setupTests.ts already imported api_helpers.js (and its logger/config deps),
// so the module registry must be reset for the mocks below to take effect.
jestEsm.resetModules();
jestEsm.unstable_mockModule('../logger.js', () => ({ Logger: mockLogger }));
jestEsm.unstable_mockModule('../config.js', () => ({ config: mockConfig }));

const { withRetry, isRetryableError, executeApiRequest, checkApiKeys } = await import(
  '../api_helpers.js'
);
// The retry helpers operate on the legacy error shape (message, status, retryable, endpoint)
const { LegacyAPIError: APIError, ConfigurationError } = await import('../errors.js');

describe('API Helper Utilities', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.EXA_API_KEY = undefined;
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkError = new Error('Network error');
      networkError.name = 'FetchError';

      expect(isRetryableError(networkError)).toBe(true);
    });

    it('should identify HTTP status codes as retryable', () => {
      const errorWithStatus = new Error('Server error');
      (errorWithStatus as any).status = 503;

      expect(isRetryableError(errorWithStatus)).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      const rateLimitError = new Error('Rate limit exceeded');

      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should identify custom APIError as retryable when marked', () => {
      const apiError = new APIError('API error', 429, true);

      expect(isRetryableError(apiError)).toBe(true);
    });

    it('should not identify other errors as retryable', () => {
      const otherError = new Error('Some other error');

      expect(isRetryableError(otherError)).toBe(false);
    });

    it('should not identify APIError as retryable when not marked', () => {
      const apiError = new APIError('API error', 400, false);

      expect(isRetryableError(apiError)).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should not retry on success', async () => {
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      const result = await withRetry(fn, 3);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure up to maxRetries', async () => {
      const fn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, 3, 10, 20);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw the last error after maxRetries', async () => {
      const fn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValue(new Error('Persistent failure'));

      await expect(withRetry(fn, 2, 10, 20)).rejects.toThrow('Persistent failure');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should stop after one attempt when shouldRetry returns false', async () => {
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Fatal failure'));
      const shouldRetry = jest.fn<(error: unknown) => boolean>().mockReturnValue(false);

      await expect(withRetry(fn, 3, 10, 20, shouldRetry)).rejects.toThrow('Fatal failure');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeApiRequest', () => {
    it('should execute the API request function', async () => {
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue('API response');

      const result = await executeApiRequest(fn);

      expect(result).toBe('API response');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should convert regular errors to APIError', async () => {
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('API failure'));

      await expect(
        executeApiRequest(fn, { context: 'Test API', maxRetries: 0 })
      ).rejects.toThrow(APIError);
    });

    it('should preserve APIError properties', async () => {
      const originalError = new APIError('Original error', 429, true, 'test/api');
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(originalError);

      await expect(
        executeApiRequest(fn, { maxRetries: 1, initialDelay: 10, maxDelay: 20 })
      ).rejects.toMatchObject({
        status: 429,
        retryable: true,
        endpoint: 'test/api',
      });
    });

    it('should fail after exactly one attempt for non-retryable errors', async () => {
      const fn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValue(new APIError('Bad request', 400, false, 'test/api'));

      // maxRetries allows 3 retries, but a non-retryable error must never use them
      await expect(
        executeApiRequest(fn, { maxRetries: 3, initialDelay: 10, maxDelay: 20 })
      ).rejects.toMatchObject({
        status: 400,
        retryable: false,
        endpoint: 'test/api',
      });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should still retry retryable errors until success', async () => {
      const fn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new APIError('Service unavailable', 503, true, 'test/api'))
        .mockResolvedValue('recovered');

      const result = await executeApiRequest(fn, {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 20,
      });

      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use custom retry check function', async () => {
      const customCheck = jest.fn<(error: any) => boolean>().mockReturnValue(false);
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('API failure'));

      await expect(
        executeApiRequest(fn, { retryableCheck: customCheck, maxRetries: 0 })
      ).rejects.toThrow(APIError);

      // In actual implementation, it can be called multiple times due to error handling
      expect(customCheck).toHaveBeenCalled();
    });
  });

  describe('checkApiKeys', () => {
    it('should not throw error when all required API keys are present', () => {
      mockConfig.EXA_API_KEY = 'valid-api-key';

      // Should not throw
      expect(() => checkApiKeys()).not.toThrow();

      // Should log success
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'All required API keys validated successfully'
      );
    });

    it('should throw ConfigurationError when API key is missing', () => {
      mockConfig.EXA_API_KEY = undefined;

      // Should throw with specific message
      expect(() => checkApiKeys()).toThrow(ConfigurationError);
      expect(() => checkApiKeys()).toThrow(/Missing required API key\(s\): EXA_API_KEY/);

      // Should log error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Missing required API key\(s\): EXA_API_KEY/)
      );
    });
  });
});
