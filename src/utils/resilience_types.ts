/**
 * Shared types for API resilience and metrics
 * 
 * This file contains common types and interfaces to prevent circular dependencies
 * between api_resilience.ts and metrics_collector.ts
 */

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject calls
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalCalls: number;
  rejectedCalls: number;
}

/**
 * Interface for metrics collection
 */
export interface MetricsCollectorInterface {
  registerCircuitBreaker(name: string, getMetrics: () => CircuitBreakerMetrics): void;
  unregisterCircuitBreaker(name: string): void;
}