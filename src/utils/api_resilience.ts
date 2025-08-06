/**
 * API Resilience Utilities
 * 
 * Provides retry mechanisms, circuit breakers, and back-off strategies
 * for external API calls to improve system resilience and reliability.
 */

import { Logger } from './logger.js';
import { CircuitBreakerState, CircuitBreakerMetrics, MetricsCollectorInterface } from './resilience_types.js';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterMs: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBase: 2,
  jitterMs: 100,
  retryableStatusCodes: [408, 429, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN']
};


/**
 * Configuration for circuit breaker
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeoutMs: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,   // Open after 5 failures
  successThreshold: 3,   // Close after 3 successes in half-open
  timeout: 60000,        // Request timeout (60s)
  resetTimeoutMs: 30000  // Wait 30s before trying half-open
};

/**
 * Retry result wrapper
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}


/**
 * Enhanced error class for API resilience
 */
export class ResilienceError extends Error {
  constructor(
    public code: string,
    message: string,
    public isRetryable: boolean = false,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ResilienceError';
  }
}

/**
 * Retry mechanism with exponential backoff and jitter
 */
export class RetryManager {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'API call'
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let totalDelayMs = 0;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        Logger.debug(`Executing ${operationName}, attempt ${attempt}/${this.config.maxRetries + 1}`);
        
        const result = await operation();
        
        if (attempt > 1) {
          Logger.info(`${operationName} succeeded after ${attempt} attempts`, {
            totalDelayMs,
            attempts: attempt
          });
        }

        return {
          success: true,
          result,
          attempts: attempt,
          totalDelayMs
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        Logger.warn(`${operationName} failed on attempt ${attempt}`, {
          error: lastError.message,
          attempt,
          maxRetries: this.config.maxRetries
        });

        // Don't retry on the last attempt
        if (attempt > this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          Logger.info(`${operationName} failed with non-retryable error`, {
            error: lastError.message
          });
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt - 1);
        totalDelayMs += delay;

        Logger.debug(`Waiting ${delay}ms before retry ${attempt + 1}`, {
          baseDelay: this.config.baseDelayMs,
          exponentialMultiplier: Math.pow(this.config.exponentialBase, attempt - 1),
          jitter: this.config.jitterMs
        });

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error during retry'),
      attempts: this.config.maxRetries + 1,
      totalDelayMs
    };
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Check for network errors
    if (this.config.retryableErrors?.some(code => error.message.includes(code))) {
      return true;
    }

    // Check for HTTP status codes (if error has statusCode property)
    const statusCode = (error as any).statusCode || (error as any).status;
    if (statusCode && this.config.retryableStatusCodes?.includes(statusCode)) {
      return true;
    }

    // Check for ResilienceError with retryable flag
    if (error instanceof ResilienceError) {
      return error.isRetryable;
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attemptNumber: number): number {
    const exponentialDelay = this.config.baseDelayMs * Math.pow(this.config.exponentialBase, attemptNumber);
    const jitter = Math.random() * this.config.jitterMs;
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private totalCalls = 0;
  private rejectedCalls = 0;

  constructor(
    private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
    private name: string = 'CircuitBreaker'
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        Logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        this.rejectedCalls++;
        const timeUntilReset = this.nextAttemptTime ? this.nextAttemptTime.getTime() - Date.now() : 0;
        throw new ResilienceError(
          'ERR_CIRCUIT_BREAKER_OPEN',
          `Circuit breaker ${this.name} is OPEN. Next attempt in ${Math.ceil(timeUntilReset / 1000)}s`,
          false
        );
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        this.timeoutPromise<T>()
      ]);

      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    Logger.info(`Circuit breaker ${this.name} manually reset to CLOSED`);
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      Logger.debug(`Circuit breaker ${this.name} success in HALF_OPEN: ${this.successCount}/${this.config.successThreshold}`);

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        Logger.info(`Circuit breaker ${this.name} transitioning to CLOSED after ${this.config.successThreshold} successes`);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error): void {
    this.lastFailureTime = new Date();
    this.failureCount++;

    Logger.warn(`Circuit breaker ${this.name} failure ${this.failureCount}/${this.config.failureThreshold}`, {
      error: error.message,
      state: this.state
    });

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.successCount = 0;
      this.scheduleReset();
      Logger.warn(`Circuit breaker ${this.name} transitioning to OPEN after failure in HALF_OPEN`);
    } else if (this.state === CircuitBreakerState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.scheduleReset();
      Logger.warn(`Circuit breaker ${this.name} transitioning to OPEN after ${this.config.failureThreshold} failures`);
    }
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== undefined && Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Schedule the next reset attempt
   */
  private scheduleReset(): void {
    this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeoutMs);
    Logger.debug(`Circuit breaker ${this.name} scheduled reset attempt`, {
      resetTime: this.nextAttemptTime.toISOString()
    });
  }

  /**
   * Create a timeout promise
   */
  private timeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ResilienceError(
          'ERR_CIRCUIT_BREAKER_TIMEOUT',
          `Operation timed out after ${this.config.timeout}ms`,
          true
        ));
      }, this.config.timeout);
    });
  }
}

/**
 * Combined retry and circuit breaker wrapper
 */
export class ResilientApiWrapper {
  private retryManager: RetryManager;
  private circuitBreaker: CircuitBreaker;
  private name: string;
  private metricsCollector?: MetricsCollectorInterface;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {},
    name: string = 'ResilientAPI',
    metricsCollector?: MetricsCollectorInterface
  ) {
    this.name = name;
    this.retryManager = new RetryManager({ ...DEFAULT_RETRY_CONFIG, ...retryConfig });
    this.circuitBreaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...circuitBreakerConfig }, name);
    this.metricsCollector = metricsCollector;
    
    // Register with metrics collector if provided
    if (this.metricsCollector) {
      try {
        this.metricsCollector.registerCircuitBreaker(name, () => this.circuitBreaker.getMetrics());
        Logger.debug(`Registered circuit breaker with metrics collector: ${name}`);
      } catch (error) {
        const allowFailure = process.env.ALLOW_METRICS_FAILURE === 'true';
        Logger.error(`Failed to register circuit breaker with metrics collector: ${name}`, error);
        
        if (!allowFailure) {
          throw new ResilienceError(
            'ERR_METRICS_REGISTRATION_FAILED',
            `Metrics registration failed for circuit breaker '${name}'. Set ALLOW_METRICS_FAILURE=true to continue with degraded observability.`,
            false,
            undefined,
            error instanceof Error ? error : new Error(String(error))
          );
        } else {
          Logger.warn(`Continuing with degraded observability due to ALLOW_METRICS_FAILURE=true`);
        }
      }
    }
  }

  /**
   * Execute an API call with full resilience (circuit breaker + retry)
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'API call'
  ): Promise<T> {
    const result = await this.retryManager.executeWithRetry(
      () => this.circuitBreaker.execute(operation),
      operationName
    );

    if (!result.success) {
      throw result.error || new Error('Operation failed after retries');
    }

    return result.result!;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Cleanup and unregister from metrics collector
   */
  cleanup(): void {
    if (this.metricsCollector) {
      try {
        this.metricsCollector.unregisterCircuitBreaker(this.name);
        Logger.debug(`Unregistered circuit breaker from metrics collector: ${this.name}`);
      } catch (error) {
        const allowFailure = process.env.ALLOW_METRICS_FAILURE === 'true';
        Logger.error(`Failed to unregister circuit breaker from metrics collector: ${this.name}`, error);
        
        if (!allowFailure) {
          throw new ResilienceError(
            'ERR_METRICS_UNREGISTRATION_FAILED',
            `Metrics unregistration failed for circuit breaker '${this.name}'. Set ALLOW_METRICS_FAILURE=true to continue with degraded observability.`,
            false,
            undefined,
            error instanceof Error ? error : new Error(String(error))
          );
        } else {
          Logger.warn(`Continuing with degraded observability due to ALLOW_METRICS_FAILURE=true`);
        }
      }
    }
  }
}

/**
 * Utility function to create a resilient API wrapper with default settings
 */
export function createResilientWrapper(
  name: string,
  retryConfig?: Partial<RetryConfig>,
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
  metricsCollector?: MetricsCollectorInterface
): ResilientApiWrapper {
  return new ResilientApiWrapper(retryConfig, circuitBreakerConfig, name, metricsCollector);
}