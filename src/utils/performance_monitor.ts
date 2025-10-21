/**
 * Performance Monitoring Utilities
 *
 * Provides utilities for measuring and tracking performance metrics
 * across the application with minimal overhead.
 */

import { Logger } from './logger.js';

/**
 * Performance metric entry
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance statistics
 */
interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

/**
 * Performance monitor for tracking execution times
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private enabled: boolean;
  private maxMetricsPerOperation: number;

  constructor(enabled: boolean = true, maxMetricsPerOperation: number = 1000) {
    this.enabled = enabled;
    this.maxMetricsPerOperation = maxMetricsPerOperation;
  }

  /**
   * Time a synchronous operation
   */
  time<T>(operationName: string, operation: () => T, metadata?: Record<string, any>): T {
    if (!this.enabled) {
      return operation();
    }

    const startTime = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Time an asynchronous operation
   */
  async timeAsync<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Start a timer for manual timing
   */
  startTimer(operationName: string): () => void {
    if (!this.enabled) {
      return () => {};
    }

    const startTime = performance.now();
    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration, metadata);
    };
  }

  /**
   * Record a metric manually
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });

    // Keep only the most recent metrics to prevent memory growth
    if (metrics.length > this.maxMetricsPerOperation) {
      metrics.shift();
    }

    // Log slow operations
    if (duration > 1000) {
      Logger.warn(`Slow operation detected: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
        metadata
      });
    }
  }

  /**
   * Get statistics for an operation
   */
  getStats(operationName: string): PerformanceStats | null {
    const metrics = this.metrics.get(operationName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      count,
      min: durations[0],
      max: durations[count - 1],
      mean: sum / count,
      median: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99)
    };
  }

  /**
   * Get all collected statistics
   */
  getAllStats(): Record<string, PerformanceStats> {
    const allStats: Record<string, PerformanceStats> = {};

    for (const [name] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        allStats[name] = stats;
      }
    }

    return allStats;
  }

  /**
   * Clear metrics for an operation
   */
  clearMetrics(operationName: string): void {
    this.metrics.delete(operationName);
  }

  /**
   * Clear all metrics
   */
  clearAll(): void {
    this.metrics.clear();
  }

  /**
   * Get recent metrics for an operation
   */
  getRecentMetrics(operationName: string, limit: number = 10): PerformanceMetric[] {
    const metrics = this.metrics.get(operationName);
    if (!metrics) {
      return [];
    }

    return metrics.slice(-limit);
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get a summary report of all operations
   */
  getSummaryReport(): string {
    const allStats = this.getAllStats();
    const operations = Object.keys(allStats).sort();

    if (operations.length === 0) {
      return 'No performance metrics collected';
    }

    let report = 'Performance Metrics Summary\n';
    report += '='.repeat(80) + '\n\n';

    for (const operation of operations) {
      const stats = allStats[operation];
      report += `${operation}:\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Min: ${stats.min.toFixed(2)}ms\n`;
      report += `  Max: ${stats.max.toFixed(2)}ms\n`;
      report += `  Mean: ${stats.mean.toFixed(2)}ms\n`;
      report += `  Median: ${stats.median.toFixed(2)}ms\n`;
      report += `  P95: ${stats.p95.toFixed(2)}ms\n`;
      report += `  P99: ${stats.p99.toFixed(2)}ms\n`;
      report += '\n';
    }

    return report;
  }
}

/**
 * Decorator for timing method executions
 */
export function timed(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getGlobalMonitor();
      return monitor.timeAsync(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create the global performance monitor
 */
export function getGlobalMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(true);
  }
  return globalMonitor;
}

/**
 * Reset the global performance monitor
 */
export function resetGlobalMonitor(): void {
  globalMonitor = null;
}

/**
 * Memory usage tracker
 */
export class MemoryMonitor {
  private snapshots: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  private maxSnapshots: number;

  constructor(maxSnapshots: number = 100) {
    this.maxSnapshots = maxSnapshots;
  }

  /**
   * Take a memory snapshot
   */
  snapshot(): NodeJS.MemoryUsage {
    const usage = process.memoryUsage();

    this.snapshots.push({
      timestamp: Date.now(),
      usage
    });

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return usage;
  }

  /**
   * Get memory usage in MB
   */
  getUsageMB(): { rss: number; heapTotal: number; heapUsed: number; external: number } {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * Detect memory leaks by analyzing trends
   */
  detectMemoryLeak(threshold: number = 1.5): boolean {
    if (this.snapshots.length < 10) {
      return false;
    }

    const recent = this.snapshots.slice(-10);
    const first = recent[0].usage.heapUsed;
    const last = recent[recent.length - 1].usage.heapUsed;

    const growthRatio = last / first;
    return growthRatio > threshold;
  }

  /**
   * Get memory growth rate (MB per second)
   */
  getGrowthRate(): number | null {
    if (this.snapshots.length < 2) {
      return null;
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const memoryDiff = (last.usage.heapUsed - first.usage.heapUsed) / 1024 / 1024; // MB

    return memoryDiff / timeDiff;
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }
}

// Export singleton instance
export const globalMemoryMonitor = new MemoryMonitor();
