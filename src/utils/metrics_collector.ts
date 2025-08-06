/**
 * Metrics Collector
 * 
 * Aggregates and exposes circuit breaker and cache metrics for observability.
 * Provides both Prometheus-style and JSON format metrics.
 */

import { Logger } from './logger.js';
import { cacheManager, CacheStats } from './cache_manager.js';
import { researchCache } from './research_cache.js';
import { CircuitBreakerMetrics, CircuitBreakerState, MetricsCollectorInterface } from './resilience_types.js';

/**
 * Combined metrics interface
 */
export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  circuitBreakers: Record<string, CircuitBreakerMetrics>;
  cache: {
    general: Record<string, CacheStats>;
    research: Record<string, CacheStats>;
  };
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * Registry for circuit breakers to track their metrics
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, () => CircuitBreakerMetrics>();

  register(name: string, getMetrics: () => CircuitBreakerMetrics): void {
    this.breakers.set(name, getMetrics);
    Logger.debug(`Registered circuit breaker for metrics: ${name}`);
  }

  unregister(name: string): void {
    this.breakers.delete(name);
    Logger.debug(`Unregistered circuit breaker from metrics: ${name}`);
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, getMetrics] of this.breakers.entries()) {
      try {
        metrics[name] = getMetrics();
      } catch (error) {
        Logger.warn(`Failed to get metrics for circuit breaker: ${name}`, error);
      }
    }

    return metrics;
  }

  getNames(): string[] {
    return Array.from(this.breakers.keys());
  }
}

/**
 * Main metrics collector service
 */
export class MetricsCollector implements MetricsCollectorInterface {
  private startTime: number;
  private cpuUsageStart: NodeJS.CpuUsage;
  private circuitBreakerRegistry: CircuitBreakerRegistry;

  constructor() {
    this.startTime = Date.now();
    this.cpuUsageStart = process.cpuUsage();
    this.circuitBreakerRegistry = new CircuitBreakerRegistry();

    Logger.debug('MetricsCollector initialized');
  }

  /**
   * Register a circuit breaker for metrics collection
   */
  registerCircuitBreaker(name: string, getMetrics: () => CircuitBreakerMetrics): void {
    this.circuitBreakerRegistry.register(name, getMetrics);
  }

  /**
   * Unregister a circuit breaker from metrics collection
   */
  unregisterCircuitBreaker(name: string): void {
    this.circuitBreakerRegistry.unregister(name);
  }

  /**
   * Collect all system metrics
   */
  collectMetrics(): SystemMetrics {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Collect circuit breaker metrics
    const circuitBreakers = this.circuitBreakerRegistry.getAllMetrics();

    // Collect cache metrics
    const generalCacheStats = cacheManager.getAllStats();
    const researchCacheStats = researchCache.getStats();

    // Collect performance metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.cpuUsageStart);

    return {
      timestamp: new Date(now).toISOString(),
      uptime,
      circuitBreakers,
      cache: {
        general: generalCacheStats,
        research: researchCacheStats,
      },
      performance: {
        memoryUsage,
        cpuUsage,
      },
    };
  }

  /**
   * Format metrics in Prometheus format
   */
  formatPrometheusMetrics(): string {
    const metrics = this.collectMetrics();
    const lines: string[] = [];

    // Add help and type information
    lines.push('# HELP analytical_mcp_uptime_seconds Server uptime in seconds');
    lines.push('# TYPE analytical_mcp_uptime_seconds counter');
    lines.push(`analytical_mcp_uptime_seconds ${Math.floor(metrics.uptime / 1000)}`);

    // Circuit breaker metrics
    lines.push('');
    lines.push('# HELP analytical_mcp_circuit_breaker_state Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)');
    lines.push('# TYPE analytical_mcp_circuit_breaker_state gauge');
    
    lines.push('# HELP analytical_mcp_circuit_breaker_total_calls_total Total calls through circuit breaker');
    lines.push('# TYPE analytical_mcp_circuit_breaker_total_calls_total counter');
    
    lines.push('# HELP analytical_mcp_circuit_breaker_rejected_calls_total Rejected calls by circuit breaker');
    lines.push('# TYPE analytical_mcp_circuit_breaker_rejected_calls_total counter');
    
    lines.push('# HELP analytical_mcp_circuit_breaker_failure_count Current failure count');
    lines.push('# TYPE analytical_mcp_circuit_breaker_failure_count gauge');
    
    lines.push('# HELP analytical_mcp_circuit_breaker_success_count Current success count');
    lines.push('# TYPE analytical_mcp_circuit_breaker_success_count gauge');

    for (const [name, cbMetrics] of Object.entries(metrics.circuitBreakers)) {
      const stateValue = this.circuitBreakerStateToNumber(cbMetrics.state);
      lines.push(`analytical_mcp_circuit_breaker_state{name="${name}"} ${stateValue}`);
      lines.push(`analytical_mcp_circuit_breaker_total_calls_total{name="${name}"} ${cbMetrics.totalCalls}`);
      lines.push(`analytical_mcp_circuit_breaker_rejected_calls_total{name="${name}"} ${cbMetrics.rejectedCalls}`);
      lines.push(`analytical_mcp_circuit_breaker_failure_count{name="${name}"} ${cbMetrics.failureCount}`);
      lines.push(`analytical_mcp_circuit_breaker_success_count{name="${name}"} ${cbMetrics.successCount}`);
    }

    // Cache metrics
    lines.push('');
    lines.push('# HELP analytical_mcp_cache_hits_total Cache hits');
    lines.push('# TYPE analytical_mcp_cache_hits_total counter');
    
    lines.push('# HELP analytical_mcp_cache_misses_total Cache misses');
    lines.push('# TYPE analytical_mcp_cache_misses_total counter');
    
    lines.push('# HELP analytical_mcp_cache_puts_total Cache puts');
    lines.push('# TYPE analytical_mcp_cache_puts_total counter');
    
    lines.push('# HELP analytical_mcp_cache_evictions_total Cache evictions');
    lines.push('# TYPE analytical_mcp_cache_evictions_total counter');
    
    lines.push('# HELP analytical_mcp_cache_size Current cache size');
    lines.push('# TYPE analytical_mcp_cache_size gauge');

    // General cache stats
    for (const [namespace, stats] of Object.entries(metrics.cache.general)) {
      const labels = `{namespace="${namespace}",type="general"}`;
      lines.push(`analytical_mcp_cache_hits_total${labels} ${stats.hits}`);
      lines.push(`analytical_mcp_cache_misses_total${labels} ${stats.misses}`);
      lines.push(`analytical_mcp_cache_puts_total${labels} ${stats.puts}`);
      lines.push(`analytical_mcp_cache_evictions_total${labels} ${stats.evictions}`);
      lines.push(`analytical_mcp_cache_size${labels} ${stats.size}`);
    }

    // Research cache stats
    for (const [namespace, stats] of Object.entries(metrics.cache.research)) {
      const labels = `{namespace="${namespace}",type="research"}`;
      lines.push(`analytical_mcp_cache_hits_total${labels} ${stats.hits}`);
      lines.push(`analytical_mcp_cache_misses_total${labels} ${stats.misses}`);
      lines.push(`analytical_mcp_cache_puts_total${labels} ${stats.puts}`);
      lines.push(`analytical_mcp_cache_evictions_total${labels} ${stats.evictions}`);
      lines.push(`analytical_mcp_cache_size${labels} ${stats.size}`);
    }

    // Performance metrics
    lines.push('');
    lines.push('# HELP analytical_mcp_memory_usage_bytes Memory usage in bytes');
    lines.push('# TYPE analytical_mcp_memory_usage_bytes gauge');
    lines.push(`analytical_mcp_memory_usage_bytes{type="rss"} ${metrics.performance.memoryUsage.rss}`);
    lines.push(`analytical_mcp_memory_usage_bytes{type="heapTotal"} ${metrics.performance.memoryUsage.heapTotal}`);
    lines.push(`analytical_mcp_memory_usage_bytes{type="heapUsed"} ${metrics.performance.memoryUsage.heapUsed}`);
    lines.push(`analytical_mcp_memory_usage_bytes{type="external"} ${metrics.performance.memoryUsage.external}`);

    lines.push('');
    lines.push('# HELP analytical_mcp_cpu_usage_microseconds CPU time usage in microseconds');
    lines.push('# TYPE analytical_mcp_cpu_usage_microseconds counter');
    lines.push(`analytical_mcp_cpu_usage_microseconds{type="user"} ${metrics.performance.cpuUsage.user}`);
    lines.push(`analytical_mcp_cpu_usage_microseconds{type="system"} ${metrics.performance.cpuUsage.system}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Format metrics in JSON format
   */
  formatJsonMetrics(): string {
    const metrics = this.collectMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Get summary metrics for logging
   */
  getSummary(): string {
    const metrics = this.collectMetrics();
    const uptimeSeconds = Math.floor(metrics.uptime / 1000);
    const memoryMB = Math.round(metrics.performance.memoryUsage.heapUsed / 1024 / 1024);
    
    const circuitBreakerCount = Object.keys(metrics.circuitBreakers).length;
    const totalCacheHits = Object.values(metrics.cache.general)
      .concat(Object.values(metrics.cache.research))
      .reduce((sum, stats) => sum + stats.hits, 0);
    const totalCacheMisses = Object.values(metrics.cache.general)
      .concat(Object.values(metrics.cache.research))
      .reduce((sum, stats) => sum + stats.misses, 0);

    return `Uptime: ${uptimeSeconds}s, Memory: ${memoryMB}MB, Circuit Breakers: ${circuitBreakerCount}, Cache Hits: ${totalCacheHits}, Cache Misses: ${totalCacheMisses}`;
  }

  /**
   * Convert circuit breaker state to numeric value for Prometheus
   */
  private circuitBreakerStateToNumber(state: CircuitBreakerState): number {
    switch (state) {
      case CircuitBreakerState.CLOSED:
        return 0;
      case CircuitBreakerState.HALF_OPEN:
        return 1;
      case CircuitBreakerState.OPEN:
        return 2;
      default:
        return -1;
    }
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();