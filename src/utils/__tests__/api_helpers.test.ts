import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  withRetry,
  isRetryableError,
  executeApiRequest,
  RETRYABLE_STATUS_CODES,
  checkApiKeys,
} from '../api_helpers';
import { APIError, ConfigurationError } from '../errors';

// Define logger mock interface
interface LoggerMock {
  Logger: {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    log: jest.Mock;
  };
}

// Define config mock interface
interface ConfigMock {
  config: {
    EXA_API_KEY?: string;
  };
}

// Note: Tests now run against real implementations without mocking

describe('API Helper Utilities', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
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

      await expect(executeApiRequest(fn, { context: 'Test API' })).rejects.toThrow(APIError);
    });

    it('should preserve APIError properties', async () => {
      const originalError = new APIError('Original error', 429, true, 'test/api');
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(originalError);

      await expect(executeApiRequest(fn)).rejects.toMatchObject({
        status: 429,
        retryable: true,
        endpoint: 'test/api',
      });
    });

    it('should use custom retry check function', async () => {
      const customCheck = jest.fn<(error: any) => boolean>().mockReturnValue(false);
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('API failure'));

      await expect(executeApiRequest(fn, { retryableCheck: customCheck })).rejects.toThrow(
        APIError
      );

      // In actual implementation, it can be called multiple times due to error handling
      expect(customCheck).toHaveBeenCalled();
    });
  });

  describe('checkApiKeys', () => {
    beforeEach(() => {
      // Reset mocks before each test in this describe block
      jest.resetModules();
      jest.doMock('../config', () => ({
        config: {
          EXA_API_KEY: undefined,
        },
      }));
      jest.doMock('../logger', () => ({
        Logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          log: jest.fn(),
        },
      }));
    });

    it('should not throw error when all required API keys are present', () => {
      // Set up the mocks for this test
      jest.doMock('../config', () => ({
        config: {
          EXA_API_KEY: 'valid-api-key',
        },
      }));

      // Re-import the modules to use the new mocks
      const { checkApiKeys } = require('../api_helpers');
      const { Logger } = require('../logger');

      // Should not throw
      expect(() => checkApiKeys()).not.toThrow();

      // Should log success
      expect(Logger.debug).toHaveBeenCalledWith('All required API keys validated successfully');
    });

    it('should throw ConfigurationError when API key is missing', () => {
      // Set up the mocks for this test
      jest.doMock('../config', () => ({
        config: {
          EXA_API_KEY: undefined,
        },
      }));

      // Re-import the modules to use the new mocks
      const { checkApiKeys } = require('../api_helpers');
      const { ConfigurationError } = require('../errors');
      const { Logger } = require('../logger');

      // Should throw with specific message
      expect(() => checkApiKeys()).toThrow(ConfigurationError);
      expect(() => checkApiKeys()).toThrow(/Missing required API key\(s\): EXA_API_KEY/);

      // Should log error
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Missing required API key\(s\): EXA_API_KEY/)
      );
    });
  });
});
