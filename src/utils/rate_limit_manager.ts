/**
 * Rate Limit Manager
 *
 * Sophisticated rate limit handling with exponential backoff, jitter,
 * API key rotation, and usage tracking to ensure API providers' rate limits
 * are respected.
 */

import { Logger } from './logger.js';
import { APIError } from './errors.js';

// Interface for ApiKey in rotation pool
interface ApiKey {
  key: string;
  provider: string;
  remainingQuota?: number;
  resetTime?: number;
  lastUsed?: number;
  requestCount?: number;
  isBlocked?: boolean;
}

// Options for rate-limited requests
export interface RateLimitOptions {
  provider: string;
  endpoint: string;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  useJitter?: boolean;
  rotateKeysOnRateLimit?: boolean;
  failFast?: boolean;
}

/**
 * Rate Limit Manager for handling API rate limits
 */
export class RateLimitManager {
  private apiKeys: Map<string, ApiKey[]> = new Map();
  private endpointThrottles: Map<
    string,
    {
      lastRequest: number;
      minInterval: number;
      requestsPerInterval: number;
      intervalStartTime: number;
      requestCount: number;
    }
  > = new Map();

  /**
   * Register API keys for a specific provider
   */
  registerApiKeys(provider: string, keys: string[]): void {
    if (!keys || keys.length === 0) {
      Logger.warn(`No API keys provided for ${provider}`);
      return;
    }

    const formattedKeys = keys.map((key) => ({
      key,
      provider,
      requestCount: 0,
      lastUsed: 0,
      isBlocked: false,
    }));

    this.apiKeys.set(provider, formattedKeys);
    Logger.info(`Registered ${keys.length} API keys for ${provider}`);
  }

  /**
   * Configure rate limits for a specific endpoint
   */
  configureEndpoint(endpoint: string, requestsPerInterval: number, intervalMs: number): void {
    this.endpointThrottles.set(endpoint, {
      lastRequest: 0,
      minInterval: intervalMs / requestsPerInterval,
      requestsPerInterval,
      intervalStartTime: Date.now(),
      requestCount: 0,
    });

    Logger.debug(
      `Configured rate limits for ${endpoint}: ${requestsPerInterval} requests per ${intervalMs}ms`
    );
  }

  /**
   * Execute a rate-limited request with retries, backoff, and key rotation
   */
  async executeRateLimitedRequest<T>(
    requestFn: (apiKey: string) => Promise<T>,
    options: RateLimitOptions
  ): Promise<T> {
    const {
      provider,
      endpoint,
      maxRetries = 5,
      initialDelayMs = 1000,
      maxDelayMs = 60000,
      timeoutMs = 30000,
      useJitter = true,
      rotateKeysOnRateLimit = true,
      failFast = false,
    } = options;

    // Check if we have keys for this provider
    const apiKeys = this.apiKeys.get(provider);
    if (!apiKeys || apiKeys.length === 0) {
      throw new APIError(`No API keys registered for ${provider}`, 401, false, endpoint);
    }

    // Apply endpoint throttling if configured
    const throttleInfo = this.endpointThrottles.get(endpoint);
    if (throttleInfo) {
      await this.applyThrottling(throttleInfo);
    }

    // Track attempts and current delay
    let attempts = 0;
    let currentDelay = initialDelayMs;
    const startTime = Date.now();

    // Get an available API key
    let currentKeyIndex = this.getNextApiKeyIndex(provider);
    let currentKey = apiKeys[currentKeyIndex].key;

    while (attempts < maxRetries) {
      // Check if we've exceeded the overall timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new APIError(
          `Request timed out after ${timeoutMs}ms for ${endpoint}`,
          408,
          false,
          endpoint
        );
      }

      try {
        // Track the request for this key
        this.trackRequest(provider, currentKeyIndex);

        // Execute the request with the current API key
        const result = await requestFn(currentKey);

        // Update throttle info
        if (throttleInfo) {
          throttleInfo.lastRequest = Date.now();
          throttleInfo.requestCount++;

          // Reset counter if interval has passed
          if (
            Date.now() - throttleInfo.intervalStartTime >
            throttleInfo.minInterval * throttleInfo.requestsPerInterval
          ) {
            throttleInfo.intervalStartTime = Date.now();
            throttleInfo.requestCount = 0;
          }
        }

        return result;
      } catch (error) {
        attempts++;

        // Handle rate limit errors
        if (error instanceof APIError && (error.status === 429 || error.status === 403)) {
          Logger.warn(
            `Rate limit hit for ${provider} on ${endpoint}, attempt ${attempts}/${maxRetries}`
          );

          // Mark the current key as blocked temporarily
          if (rotateKeysOnRateLimit) {
            this.markKeyBlocked(provider, currentKeyIndex);
            currentKeyIndex = this.getNextApiKeyIndex(provider);

            // If we've run out of valid keys, we need to wait
            if (currentKeyIndex === -1) {
              Logger.warn(`All API keys for ${provider} are blocked, waiting for backoff`);
              // Reset all keys after a full backoff period
              setTimeout(() => this.resetBlockedKeys(provider), currentDelay);
            } else {
              currentKey = apiKeys[currentKeyIndex].key;
              Logger.debug(`Switched to API key ${currentKeyIndex} for ${provider}`);
              continue; // Try immediately with new key
            }
          }

          // Calculate backoff with jitter if enabled
          if (useJitter) {
            const jitterFactor = 0.5 + Math.random() * 0.5; // 50-100% of delay
            await this.delay(currentDelay * jitterFactor);
          } else {
            await this.delay(currentDelay);
          }

          // Increase delay with exponential backoff
          currentDelay = Math.min(currentDelay * 2, maxDelayMs);
        } else {
          // For non-rate-limit errors, either retry or fail based on configuration
          if (failFast) {
            throw error;
          }

          Logger.error(`Error during request to ${endpoint}`, error);

          // Apply a shorter delay for non-rate-limit errors
          await this.delay(initialDelayMs);
        }
      }
    }

    // If we've exhausted all retries
    throw new APIError(
      `Rate limit exceeded for ${endpoint} after ${maxRetries} attempts`,
      429,
      false,
      endpoint
    );
  }

  /**
   * Track request for API key usage monitoring
   */
  private trackRequest(provider: string, keyIndex: number): void {
    const keys = this.apiKeys.get(provider);
    if (!keys || !keys[keyIndex]) return;

    keys[keyIndex].requestCount = (keys[keyIndex].requestCount || 0) + 1;
    keys[keyIndex].lastUsed = Date.now();
  }

  /**
   * Mark an API key as temporarily blocked
   */
  private markKeyBlocked(provider: string, keyIndex: number): void {
    const keys = this.apiKeys.get(provider);
    if (!keys || !keys[keyIndex]) return;

    keys[keyIndex].isBlocked = true;

    // Schedule unblocking after a cooldown period (5 minutes)
    setTimeout(
      () => {
        const keys = this.apiKeys.get(provider);
        if (keys && keys[keyIndex]) {
          keys[keyIndex].isBlocked = false;
          Logger.debug(`Unblocked API key ${keyIndex} for ${provider}`);
        }
      },
      5 * 60 * 1000
    );
  }

  /**
   * Reset all blocked keys for a provider
   */
  private resetBlockedKeys(provider: string): void {
    const keys = this.apiKeys.get(provider);
    if (!keys) return;

    keys.forEach((key) => {
      key.isBlocked = false;
    });

    Logger.debug(`Reset all blocked API keys for ${provider}`);
  }

  /**
   * Get the next available API key index for a provider
   */
  private getNextApiKeyIndex(provider: string): number {
    const keys = this.apiKeys.get(provider);
    if (!keys || keys.length === 0) return -1;

    // Find keys that aren't blocked
    const availableIndices = keys
      .map((key, index) => ({ key, index }))
      .filter((item) => !item.key.isBlocked)
      .map((item) => item.index);

    if (availableIndices.length === 0) return -1;

    // Select the least recently used key
    return availableIndices.reduce((leastUsedIdx, currentIdx) => {
      const leastUsedTime = keys[leastUsedIdx].lastUsed || 0;
      const currentTime = keys[currentIdx].lastUsed || 0;
      return currentTime < leastUsedTime ? currentIdx : leastUsedIdx;
    }, availableIndices[0]);
  }

  /**
   * Apply throttling based on configured limits
   */
  private async applyThrottling(throttleInfo: any): Promise<void> {
    const now = Date.now();

    // If we've exceeded requests in this interval
    if (throttleInfo.requestCount >= throttleInfo.requestsPerInterval) {
      // Calculate time until the interval resets
      const timeUntilReset =
        throttleInfo.intervalStartTime +
        throttleInfo.minInterval * throttleInfo.requestsPerInterval -
        now;

      if (timeUntilReset > 0) {
        Logger.debug(`Throttling request: waiting ${timeUntilReset}ms to respect rate limits`);
        await this.delay(timeUntilReset);

        // Reset the interval tracking after waiting
        throttleInfo.intervalStartTime = Date.now();
        throttleInfo.requestCount = 0;
      }
    }
    // Otherwise, ensure minimum time between requests
    else if (throttleInfo.lastRequest > 0) {
      const timeSinceLastRequest = now - throttleInfo.lastRequest;
      const timeToWait = Math.max(0, throttleInfo.minInterval - timeSinceLastRequest);

      if (timeToWait > 0) {
        await this.delay(timeToWait);
      }
    }
  }

  /**
   * Simple delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager();
