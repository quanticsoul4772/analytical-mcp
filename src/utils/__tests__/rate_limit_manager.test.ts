import { describe, it, expect, jest } from '@jest/globals';
import { rateLimitManager } from '../rate_limit_manager.js';
// Rate limit detection in the manager keys off the legacy error shape
// (message, status, retryable, endpoint).
import { LegacyAPIError as APIError } from '../errors.js';

// These tests run against the real singleton with real timers; every test
// configures short delays so the suite stays fast and fully offline.
describe('Rate Limit Manager', () => {
  it('should register API keys correctly', () => {
    rateLimitManager.registerApiKeys('test-provider', ['key1', 'key2']);

    // Use executeRateLimitedRequest to verify keys were registered
    // by checking it doesn't throw an "No API keys registered" error
    const mockFn = jest.fn<(apiKey: string) => Promise<string>>().mockResolvedValue('success');

    return expect(
      rateLimitManager.executeRateLimitedRequest(mockFn, {
        provider: 'test-provider',
        endpoint: 'test-endpoint',
      })
    ).resolves.toBe('success');
  });

  it('should throw when no API keys are registered for a provider', async () => {
    const mockFn = jest.fn<(apiKey: string) => Promise<string>>().mockResolvedValue('success');

    await expect(
      rateLimitManager.executeRateLimitedRequest(mockFn, {
        provider: 'unknown-provider',
        endpoint: 'test-endpoint',
      })
    ).rejects.toThrow('No API keys registered for unknown-provider');

    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should configure endpoint throttling', async () => {
    // Configure endpoint with limit of 10 requests per 100ms
    rateLimitManager.configureEndpoint('throttled-endpoint', 10, 100);
    rateLimitManager.registerApiKeys('test-provider', ['key1']);

    const mockSuccessFn = jest
      .fn<(apiKey: string) => Promise<string>>()
      .mockResolvedValue('success');

    // First request should go through immediately
    await rateLimitManager.executeRateLimitedRequest(mockSuccessFn, {
      provider: 'test-provider',
      endpoint: 'throttled-endpoint',
    });

    // Second request should also go through (after at most a short throttle wait)
    await rateLimitManager.executeRateLimitedRequest(mockSuccessFn, {
      provider: 'test-provider',
      endpoint: 'throttled-endpoint',
    });

    // Should have made exactly 2 requests
    expect(mockSuccessFn).toHaveBeenCalledTimes(2);
  });

  it('should retry on rate limit errors', async () => {
    rateLimitManager.registerApiKeys('test-provider', ['key1']);

    // Mock function that fails with rate limit error on first call
    // then succeeds on second call
    const mockFnWithRateLimit = jest
      .fn<(apiKey: string) => Promise<string>>()
      .mockRejectedValueOnce(new APIError('Rate limited', 429, true, 'test'))
      .mockResolvedValueOnce('success after retry');

    const result = await rateLimitManager.executeRateLimitedRequest(mockFnWithRateLimit, {
      provider: 'test-provider',
      endpoint: 'test-endpoint',
      maxRetries: 3,
      initialDelayMs: 20,
    });

    expect(result).toBe('success after retry');
    expect(mockFnWithRateLimit).toHaveBeenCalledTimes(2);
  });

  it('should rotate API keys on rate limit errors', async () => {
    // Register multiple keys
    rateLimitManager.registerApiKeys('test-provider', ['key1', 'key2']);

    // Mock function that tracks which key was used
    const usedKeys: string[] = [];
    const mockFnWithKeyTracking = jest
      .fn<(apiKey: string) => Promise<string>>()
      .mockImplementation((apiKey: string) => {
        usedKeys.push(apiKey);

        // Rate limit on first key, succeed on second
        if (apiKey === 'key1') {
          throw new APIError('Rate limited', 429, true, 'test');
        }

        return Promise.resolve('success with key2');
      });

    const result = await rateLimitManager.executeRateLimitedRequest(mockFnWithKeyTracking, {
      provider: 'test-provider',
      endpoint: 'test-endpoint',
      rotateKeysOnRateLimit: true,
      initialDelayMs: 20,
    });

    expect(result).toBe('success with key2');
    expect(usedKeys).toEqual(['key1', 'key2']);
  });

  it('should throw error after exhausting retries', async () => {
    rateLimitManager.registerApiKeys('test-provider', ['key1']);

    // Mock function that always fails with rate limit error
    const mockAlwaysFail = jest
      .fn<(apiKey: string) => Promise<string>>()
      .mockRejectedValue(new APIError('Rate limited', 429, true, 'test'));

    await expect(
      rateLimitManager.executeRateLimitedRequest(mockAlwaysFail, {
        provider: 'test-provider',
        endpoint: 'test-endpoint',
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 20,
      })
    ).rejects.toThrow('Rate limit exceeded');

    // Should have attempted the request maxRetries (2) times
    expect(mockAlwaysFail).toHaveBeenCalledTimes(2);
  });

  it('should fail fast for non-rate-limit errors when configured', async () => {
    rateLimitManager.registerApiKeys('test-provider', ['key1']);

    // Mock function that fails with a non-rate-limit error
    const mockNonRateLimitError = jest
      .fn<(apiKey: string) => Promise<string>>()
      .mockRejectedValue(new Error('Generic error'));

    await expect(
      rateLimitManager.executeRateLimitedRequest(mockNonRateLimitError, {
        provider: 'test-provider',
        endpoint: 'test-endpoint',
        failFast: true,
      })
    ).rejects.toThrow('Generic error');

    // Should have only tried once with failFast: true
    expect(mockNonRateLimitError).toHaveBeenCalledTimes(1);
  });
});
