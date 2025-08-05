/**
 * Integration Tests for ResilientApiWrapper
 * 
 * Tests the wrapper's behavior with real HTTP failures using mocked responses.
 * Verifies retry logic, circuit breaker functionality, and error handling.
 */

import nock from 'nock';
import fetch from 'node-fetch';
import { ResilientApiWrapper, CircuitBreakerState, ResilienceError } from '../utils/api_resilience.js';

// Make fetch available globally for tests
(global as any).fetch = fetch;

describe('ResilientApiWrapper Integration Tests', () => {
  let wrapper: ResilientApiWrapper;
  const baseUrl = 'https://api.example.com';
  const endpoint = '/test';
  const fullUrl = `${baseUrl}${endpoint}`;

  beforeEach(() => {
    // Clear any existing interceptors
    nock.cleanAll();
    
    // Create wrapper with faster settings for testing
    wrapper = new ResilientApiWrapper(
      {
        maxRetries: 3,
        baseDelayMs: 10, // Reduced for faster tests
        maxDelayMs: 100,
        exponentialBase: 2,
        jitterMs: 5,
        retryableStatusCodes: [408, 429, 502, 503, 504]
      },
      {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100, // Very fast for tests
        resetTimeoutMs: 20 // Very fast for tests
      },
      'TestAPI'
    );
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('429 Rate Limit with Exponential Backoff', () => {
    it('should retry with exponential backoff and eventually succeed', async () => {
      // Mock 429 responses followed by success
      nock(baseUrl)
        .get(endpoint)
        .reply(429, { error: 'Rate limit exceeded' })
        .get(endpoint)
        .reply(429, { error: 'Rate limit exceeded' })
        .get(endpoint)
        .reply(200, { success: true, data: 'test data' });

      const startTime = Date.now();
      
      // Execute API call that should succeed after retries
      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }
        return response.json();
      };

      const result = await wrapper.execute(mockApiCall, 'rate-limit-test');
      const totalTime = Date.now() - startTime;

      // Verify success
      expect(result).toEqual({ success: true, data: 'test data' });
      
      // Verify exponential backoff occurred (should take some time due to delays)
      expect(totalTime).toBeGreaterThan(15); // At least some delay from retries
      
      // Verify circuit breaker remains closed
      const metrics = wrapper.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.totalCalls).toBeGreaterThanOrEqual(1); // At least one wrapper call
    });

    it('should fail after max retries with rate limiting', async () => {
      // Mock continuous 429 responses
      nock(baseUrl)
        .get(endpoint)
        .times(4) // Initial + 3 retries
        .reply(429, { error: 'Rate limit exceeded' });

      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }
        return response.json();
      };

      await expect(wrapper.execute(mockApiCall, 'rate-limit-fail-test'))
        .rejects.toThrow('HTTP 429');

      // Verify circuit breaker metrics
      const metrics = wrapper.getMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
      expect(metrics.totalCalls).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Network Timeout with Retry and Failure', () => {
    it('should retry on network timeout and eventually fail with wrapped error', async () => {
      // Mock network timeout errors
      nock(baseUrl)
        .get(endpoint)
        .times(4) // Initial + 3 retries
        .replyWithError({ code: 'ETIMEDOUT', message: 'Request timeout' });

      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        return response.json();
      };

      await expect(wrapper.execute(mockApiCall, 'timeout-test'))
        .rejects.toThrow();

      // Verify circuit breaker recorded failures
      const metrics = wrapper.getMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
      expect(metrics.totalCalls).toBeGreaterThanOrEqual(1);
    });

    it('should handle connection reset errors', async () => {
      // Mock connection reset errors
      nock(baseUrl)
        .get(endpoint)
        .times(4)
        .replyWithError({ code: 'ECONNRESET', message: 'Connection reset' });

      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        return response.json();
      };

      await expect(wrapper.execute(mockApiCall, 'connection-reset-test'))
        .rejects.toThrow();

      const metrics = wrapper.getMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
    });
  });

  describe('Continuous 5xx Errors - Circuit Breaker State Transitions', () => {
    it('should transition circuit breaker to OPEN state after consecutive failures', async () => {
      // Mock continuous 500 errors to trigger circuit breaker
      nock(baseUrl)
        .get(endpoint)
        .times(20) // Enough to trigger failures and circuit breaker
        .reply(500, { error: 'Internal server error' });

      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }
        return response.json();
      };

      // First few calls should fail with retries
      await expect(wrapper.execute(mockApiCall, '5xx-test-1')).rejects.toThrow();
      await expect(wrapper.execute(mockApiCall, '5xx-test-2')).rejects.toThrow();
      await expect(wrapper.execute(mockApiCall, '5xx-test-3')).rejects.toThrow();

      // Check if circuit breaker is now OPEN
      const metrics = wrapper.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.OPEN);
      expect(metrics.failureCount).toBeGreaterThanOrEqual(3);
      expect(metrics.totalCalls).toBeGreaterThanOrEqual(3);

      // Subsequent calls should be rejected immediately by circuit breaker
      await expect(wrapper.execute(mockApiCall, '5xx-test-4'))
        .rejects.toThrow('Circuit breaker TestAPI is OPEN');

      // Verify rejection was recorded
      const finalMetrics = wrapper.getMetrics();
      expect(finalMetrics.rejectedCalls).toBeGreaterThan(0);
    });

    it('should transition from OPEN to HALF_OPEN to CLOSED on recovery', async () => {
      // First, trigger circuit breaker to OPEN
      nock(baseUrl)
        .get(endpoint)
        .times(15)
        .reply(500, { error: 'Server error' });

      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }
        return response.json();
      };

      // Trigger failures to open circuit breaker
      await expect(wrapper.execute(mockApiCall, 'open-circuit-1')).rejects.toThrow();
      await expect(wrapper.execute(mockApiCall, 'open-circuit-2')).rejects.toThrow();
      await expect(wrapper.execute(mockApiCall, 'open-circuit-3')).rejects.toThrow();

      // Verify circuit is OPEN
      expect(wrapper.getMetrics().state).toBe(CircuitBreakerState.OPEN);

      // Wait for reset timeout to allow transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 30));

      // Mock successful responses for recovery
      nock.cleanAll();
      nock(baseUrl)
        .get(endpoint)
        .times(3)
        .reply(200, { success: true, recovered: true });

      // Execute successful calls to transition through HALF_OPEN to CLOSED
      const result1 = await wrapper.execute(mockApiCall, 'recovery-1');
      expect(result1).toEqual({ success: true, recovered: true });

      // Circuit should be HALF_OPEN after first success
      let metrics = wrapper.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.HALF_OPEN);

      const result2 = await wrapper.execute(mockApiCall, 'recovery-2');
      expect(result2).toEqual({ success: true, recovered: true });

      // Circuit should be CLOSED after enough successes
      metrics = wrapper.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.failureCount).toBe(0); // Reset on successful transition
    });
  });

  describe('Metrics and State Tracking', () => {
    it('should accurately track retry counts and call statistics', async () => {
      // Mock a few failures followed by success
      nock(baseUrl)
        .get(endpoint)
        .reply(503, { error: 'Service unavailable' })
        .get(endpoint)
        .reply(503, { error: 'Service unavailable' })
        .get(endpoint)
        .reply(200, { success: true });

      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }
        return response.json();
      };

      const result = await wrapper.execute(mockApiCall, 'metrics-test');
      expect(result).toEqual({ success: true });

      const metrics = wrapper.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.totalCalls).toBeGreaterThanOrEqual(1);
      expect(metrics.rejectedCalls).toBe(0);
      expect(metrics.lastSuccessTime).toBeInstanceOf(Date);
    });

    it('should reset circuit breaker manually', async () => {
      // Trigger circuit breaker to OPEN
      nock(baseUrl)
        .get(endpoint)
        .times(10)
        .reply(500, { error: 'Server error' });

      const mockApiCall = async () => {
        const response = await fetch(fullUrl);
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }
        return response.json();
      };

      // Trigger failures
      await expect(wrapper.execute(mockApiCall, 'reset-test-1')).rejects.toThrow();
      await expect(wrapper.execute(mockApiCall, 'reset-test-2')).rejects.toThrow();
      await expect(wrapper.execute(mockApiCall, 'reset-test-3')).rejects.toThrow();

      expect(wrapper.getMetrics().state).toBe(CircuitBreakerState.OPEN);

      // Manually reset circuit breaker
      wrapper.reset();

      const metrics = wrapper.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
    });
  });
});