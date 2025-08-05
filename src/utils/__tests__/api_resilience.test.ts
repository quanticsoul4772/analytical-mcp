import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  RetryManager,
  CircuitBreaker,
  ResilientApiWrapper,
  ResilienceError,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  CircuitBreakerState,
  createResilientWrapper
} from '../api_resilience';

// Mock logger to avoid console noise during tests 
jest.doMock('../../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('API Resilience Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ResilienceError', () => {
    it('should create error with correct properties', () => {
      const error = new ResilienceError('TEST_ERROR', 'Test message', true, 500);
      
      expect(error.name).toBe('ResilienceError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.isRetryable).toBe(true);
      expect(error.statusCode).toBe(500);
    });

    it('should default isRetryable to false', () => {
      const error = new ResilienceError('TEST_ERROR', 'Test message');
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('RetryManager', () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager();
    });

    describe('happy path - no retries needed', () => {
      it('should execute operation successfully on first attempt', async () => {
        const mockOperation = jest.fn().mockResolvedValue('success');
        
        const result = await retryManager.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(true);
        expect(result.result).toBe('success');
        expect(result.attempts).toBe(1);
        expect(result.totalDelayMs).toBe(0);
        expect(mockOperation).toHaveBeenCalledTimes(1);
      });
    });

    describe('retry until success', () => {
      it('should retry on retryable error and succeed', async () => {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error('ETIMEDOUT'))
          .mockRejectedValueOnce(new Error('ECONNRESET'))
          .mockResolvedValue('success');
        
        const result = await retryManager.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(true);
        expect(result.result).toBe('success');
        expect(result.attempts).toBe(3);
        expect(result.totalDelayMs).toBeGreaterThan(0);
        expect(mockOperation).toHaveBeenCalledTimes(3);
      });

      it('should retry on retryable HTTP status codes', async () => {
        const errorWithStatus = new Error('Service unavailable');
        (errorWithStatus as any).statusCode = 503;
        
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(errorWithStatus)
          .mockResolvedValue('success');
        
        const result = await retryManager.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(true);
        expect(result.result).toBe('success');
        expect(result.attempts).toBe(2);
        expect(mockOperation).toHaveBeenCalledTimes(2);
      });

      it('should retry on ResilienceError with retryable flag', async () => {
        const retryableError = new ResilienceError('TEST_ERROR', 'Retryable error', true);
        
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValue('success');
        
        const result = await retryManager.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(true);
        expect(result.result).toBe('success');
        expect(result.attempts).toBe(2);
      });
    });

    describe('retry exhaustion', () => {
      it('should fail after max retries with retryable error', async () => {
        const mockOperation = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
        
        const result = await retryManager.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toContain('ETIMEDOUT');
        expect(result.attempts).toBe(DEFAULT_RETRY_CONFIG.maxRetries + 1);
        expect(result.totalDelayMs).toBeGreaterThan(0);
        expect(mockOperation).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxRetries + 1);
      });

      it('should not retry on non-retryable error', async () => {
        const nonRetryableError = new Error('Bad request');
        (nonRetryableError as any).statusCode = 400;
        
        const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);
        
        const result = await retryManager.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(nonRetryableError);
        expect(result.attempts).toBe(1);
        expect(result.totalDelayMs).toBe(0);
        expect(mockOperation).toHaveBeenCalledTimes(1);
      });

      it('should not retry ResilienceError with non-retryable flag', async () => {
        const nonRetryableError = new ResilienceError('TEST_ERROR', 'Non-retryable error', false);
        
        const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);
        
        const result = await retryManager.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(nonRetryableError);
        expect(result.attempts).toBe(1);
        expect(result.totalDelayMs).toBe(0);
      });
    });

    describe('jittered delay calculation', () => {
      it('should calculate delay with exponential backoff and jitter', async () => {
        const config = {
          maxRetries: 2,
          baseDelayMs: 100,
          maxDelayMs: 1000,
          exponentialBase: 2,
          jitterMs: 50,
          retryableErrors: ['ETIMEDOUT']
        };
        
        const retryManagerWithConfig = new RetryManager(config);
        const mockOperation = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
        
        const startTime = Date.now();
        const result = await retryManagerWithConfig.executeWithRetry(mockOperation, 'test-operation');
        const endTime = Date.now();
        
        expect(result.success).toBe(false);
        expect(result.totalDelayMs).toBeGreaterThan(0);
        
        // First retry: baseDelayMs * 2^0 + jitter = 100 + [0-50] = [100-150]
        // Second retry: baseDelayMs * 2^1 + jitter = 200 + [0-50] = [200-250]
        // Total expected range: [300-400]
        const actualElapsed = endTime - startTime;
        expect(actualElapsed).toBeGreaterThanOrEqual(250); // Allow some margin for test execution
        expect(result.totalDelayMs).toBeLessThanOrEqual(400);
        
        // Verify jitter is within expected range
        expect(result.totalDelayMs).toBeGreaterThanOrEqual(300);
        expect(result.totalDelayMs).toBeLessThanOrEqual(400);
      });

      it('should respect max delay limit', async () => {
        const config = {
          maxRetries: 1,
          baseDelayMs: 1000,
          maxDelayMs: 500, // Lower than calculated delay
          exponentialBase: 3,
          jitterMs: 100,
          retryableErrors: ['ETIMEDOUT']
        };
        
        const retryManagerWithConfig = new RetryManager(config);
        const mockOperation = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
        
        const result = await retryManagerWithConfig.executeWithRetry(mockOperation, 'test-operation');
        
        expect(result.success).toBe(false);
        // Should be capped at maxDelayMs (500) + jitter (100) = max 600
        expect(result.totalDelayMs).toBeLessThanOrEqual(600);
      });
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(DEFAULT_CIRCUIT_BREAKER_CONFIG, 'test-breaker');
    });

    describe('closed state operations', () => {
      it('should execute operation successfully in CLOSED state', async () => {
        const mockOperation = jest.fn().mockResolvedValue('success');
        
        const result = await circuitBreaker.execute(mockOperation);
        
        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(1);
        
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
        expect(metrics.totalCalls).toBe(1);
        expect(metrics.failureCount).toBe(0);
      });

      it('should track failures but stay CLOSED below threshold', async () => {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error('Test error'))
          .mockResolvedValue('success');
        
        // First call should fail
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Test error');
        
        // Second call should succeed
        const result = await circuitBreaker.execute(mockOperation);
        expect(result).toBe('success');
        
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
        expect(metrics.totalCalls).toBe(2);
        expect(metrics.failureCount).toBe(0); // Reset on success
      });
    });

    describe('circuit breaker opens after threshold', () => {
      it('should open circuit after failure threshold', async () => {
        const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
        
        // Trigger failures up to threshold
        for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
          await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Test error');
        }
        
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitBreakerState.OPEN);
        expect(metrics.failureCount).toBe(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold);
        
        // Next call should be rejected immediately
        await expect(circuitBreaker.execute(mockOperation))
          .rejects.toThrow(/Circuit breaker.*is OPEN/);
        
        const finalMetrics = circuitBreaker.getMetrics();
        expect(finalMetrics.rejectedCalls).toBe(1);
      });

      it('should reject calls immediately when OPEN', async () => {
        const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
        
        // Force circuit to OPEN state
        for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
          await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Test error');
        }
        
        // Multiple immediate rejections
        for (let i = 0; i < 3; i++) {
          await expect(circuitBreaker.execute(mockOperation))
            .rejects.toThrow(/Circuit breaker.*is OPEN/);
        }
        
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.rejectedCalls).toBe(3);
        expect(mockOperation).toHaveBeenCalledTimes(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold);
      });
    });

    describe('half-open state and recovery', () => {
      it('should transition to HALF_OPEN after reset timeout', async () => {
        jest.useFakeTimers();
        
        const shortConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, resetTimeoutMs: 1000 };
        const cb = new CircuitBreaker(shortConfig, 'test-breaker');
        const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
        
        // Force OPEN state
        for (let i = 0; i < shortConfig.failureThreshold; i++) {
          await expect(cb.execute(mockOperation)).rejects.toThrow('Test error');
        }
        
        expect(cb.getMetrics().state).toBe(CircuitBreakerState.OPEN);
        
        // Advance time past reset timeout
        jest.advanceTimersByTime(shortConfig.resetTimeoutMs + 100);
        
        // Next call should transition to HALF_OPEN
        const successOperation = jest.fn().mockResolvedValue('success');
        const result = await cb.execute(successOperation);
        
        expect(result).toBe('success');
        // Should transition back to CLOSED after one success (threshold = 3, but this tests the transition)
        
        jest.useRealTimers();
      });

      it('should close circuit after success threshold in HALF_OPEN', async () => {
        jest.useFakeTimers();
        
        const config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, resetTimeoutMs: 1000, successThreshold: 2 };
        const cb = new CircuitBreaker(config, 'test-breaker');
        const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
        
        // Force OPEN state
        for (let i = 0; i < config.failureThreshold; i++) {
          await expect(cb.execute(mockOperation)).rejects.toThrow('Test error');
        }
        
        // Advance time and transition to HALF_OPEN
        jest.advanceTimersByTime(config.resetTimeoutMs + 100);
        
        const successOperation = jest.fn().mockResolvedValue('success');
        
        // First success (should still be in HALF_OPEN or CLOSED depending on implementation)
        await cb.execute(successOperation);
        // Second success (should close circuit)
        await cb.execute(successOperation);
        
        const metrics = cb.getMetrics();
        expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
        
        jest.useRealTimers();
      });
    });

    describe('timeout handling', () => {
      it('should timeout long-running operations', async () => {
        const config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, timeout: 100 };
        const cb = new CircuitBreaker(config, 'test-breaker');
        
        const slowOperation = jest.fn(() => new Promise(resolve => 
          setTimeout(() => resolve('success'), 200)
        ));
        
        await expect(cb.execute(slowOperation))
          .rejects.toThrow(/Operation timed out after 100ms/);
        
        const metrics = cb.getMetrics();
        expect(metrics.failureCount).toBe(1);
      });
    });

    describe('metrics and reset', () => {
      it('should provide accurate metrics', async () => {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error('Test error'))
          .mockResolvedValue('success');
        
        // One failure, one success
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Test error');
        await circuitBreaker.execute(mockOperation);
        
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.totalCalls).toBe(2);
        expect(metrics.failureCount).toBe(0); // Reset on success
        expect(metrics.lastFailureTime).toBeInstanceOf(Date);
        expect(metrics.lastSuccessTime).toBeInstanceOf(Date);
      });

      it('should reset circuit breaker state', () => {
        const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
        
        // Manually set some failure state
        circuitBreaker.execute(mockOperation).catch(() => {});
        
        circuitBreaker.reset();
        
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
        expect(metrics.failureCount).toBe(0);
        expect(metrics.successCount).toBe(0);
        expect(metrics.lastFailureTime).toBeUndefined();
      });
    });
  });

  describe('ResilientApiWrapper', () => {
    let wrapper: ResilientApiWrapper;

    beforeEach(() => {
      wrapper = new ResilientApiWrapper({}, {}, 'test-wrapper');
    });

    it('should combine retry and circuit breaker functionality', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');
      
      const result = await wrapper.execute(mockOperation, 'test-operation');
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should expose circuit breaker metrics', () => {
      const metrics = wrapper.getMetrics();
      
      expect(metrics).toHaveProperty('state');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('totalCalls');
    });

    it('should allow circuit breaker reset', () => {
      wrapper.reset();
      
      const metrics = wrapper.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.failureCount).toBe(0);
    });

    it('should throw error when retries are exhausted', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(wrapper.execute(mockOperation, 'test-operation'))
        .rejects.toThrow('Persistent error');
    });
  });

  describe('createResilientWrapper utility', () => {
    it('should create wrapper with custom configuration', () => {
      const retryConfig = { maxRetries: 5 };
      const circuitConfig = { failureThreshold: 10 };
      
      const wrapper = createResilientWrapper('test-wrapper', retryConfig, circuitConfig);
      
      expect(wrapper).toBeInstanceOf(ResilientApiWrapper);
      expect(wrapper.getMetrics().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should create wrapper with default configuration', () => {
      const wrapper = createResilientWrapper('test-wrapper');
      
      expect(wrapper).toBeInstanceOf(ResilientApiWrapper);
    });
  });
});