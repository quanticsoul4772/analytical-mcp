import { describe, it, expect } from '@jest/globals';
import { MetricsCollector } from '../metrics_collector.js';

describe('MetricsCollector', () => {
  const collector = new MetricsCollector();

  it('exposes cache and performance metrics in JSON, without circuit breakers', () => {
    const parsed = JSON.parse(collector.formatJsonMetrics());
    expect(parsed).toHaveProperty('cache');
    expect(parsed).toHaveProperty('performance');
    expect(parsed).toHaveProperty('uptime');
    expect(parsed).not.toHaveProperty('circuitBreakers');
  });

  it('emits cache/uptime/system Prometheus series but no circuit-breaker series', () => {
    const prom = collector.formatPrometheusMetrics();
    expect(prom).toContain('analytical_mcp_uptime_seconds');
    expect(prom).toContain('analytical_mcp_cache_hits_total');
    expect(prom).toContain('analytical_mcp_memory_usage_bytes');
    expect(prom).not.toContain('analytical_mcp_circuit_breaker');
  });

  it('summarizes uptime, memory, and cache without a circuit-breaker count', () => {
    const summary = collector.getSummary();
    expect(summary).toContain('Uptime:');
    expect(summary).toContain('Cache Hits:');
    expect(summary).not.toContain('Circuit Breakers');
  });
});
