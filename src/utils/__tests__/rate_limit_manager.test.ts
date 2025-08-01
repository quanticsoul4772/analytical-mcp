import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { rateLimitManager } from '../rate_limit_manager.js';
import { APIError } from '../errors.js';

describe('Rate Limit Manager', () => {
  // Mock setTimeout and clearTimeout
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  beforeEach(() => {
    // Mock setTimeout to execute immediately for testing
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

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

  it('should configure endpoint throttling', async () => {
    // Configure endpoint with limit of 2 requests per 1000ms
    rateLimitManager.configureEndpoint('throttled-endpoint', 2, 1000);
    rateLimitManager.registerApiKeys('test-provider', ['key1']);

    const mockSuccessFn = jest
      .fn<(apiKey: string) => Promise<string>>()
      .mockResolvedValue('success');

    // First request should go through immediately
    await rateLimitManager.executeRateLimitedRequest(mockSuccessFn, {
      provider: 'test-provider',
      endpoint: 'throttled-endpoint',
    });

    // Second request should also go through
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
      initialDelayMs: 100,
    });

    expect(result).toBe('success after retry');
    expect(mockFnWithRateLimit).toHaveBeenCalledTimes(2);
  });

  it('should rotate API keys on rate limit errors', async () => {
    // Register multiple keys
    rateLimitManager.registerApiKeys('test-provider', ['key1', 'key2']);

    // Mock function that tracks which key was used
    const usedKeys: string[] = [];
    const mockFnWithKeyTracking = jest.fn().mockImplementation((apiKey: unknown): Promise<string> => {
      usedKeys.push(apiKey as string);

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
