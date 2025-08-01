/**
 * Performance Metrics Collection System
 * 
 * Provides comprehensive performance monitoring for analytical tools including
 * execution time tracking, memory usage monitoring, and cache hit rate tracking.
 */

import { Logger } from './logger.js';

/**
 * Core metrics interface as requested
 */
export interface ToolMetrics {
  executionTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

/**
 * Extended metrics interface with additional monitoring data
 */
export interface ExtendedToolMetrics extends ToolMetrics {
  toolName: string;
  timestamp: Date;
  inputSize?: number;
  outputSize?: number;
  errorCount: number;
  retryCount: number;
  cpuUsage?: number;
  networkCalls?: number;
  sessionId?: string;
}

/**
 * Aggregated metrics for trend analysis
 */
export interface AggregatedMetrics {
  toolName: string;
  totalExecutions: number;
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  averageMemoryUsage: number;
  totalErrors: number;
  errorRate: number;
  averageCacheHitRate: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Performance metrics collector class
 */
class PerformanceMetricsCollector {
  private metrics: Map<string, ExtendedToolMetrics[]> = new Map();
  private cacheStats: Map<string, { hits: number; misses: number }> = new Map();
  private maxMetricsPerTool = 1000; // Prevent memory leaks

  /**
   * Record execution metrics for a tool
   */
  recordMetrics(toolName: string, metrics: Partial<ExtendedToolMetrics>): void {
    const fullMetrics: ExtendedToolMetrics = {
      toolName,
      timestamp: new Date(),
      executionTime: metrics.executionTime || 0,
      memoryUsage: metrics.memoryUsage || this.getCurrentMemoryUsage(),
      cacheHitRate: metrics.cacheHitRate || this.calculateCacheHitRate(toolName),
      inputSize: metrics.inputSize,
      outputSize: metrics.outputSize,
      errorCount: metrics.errorCount || 0,
      retryCount: metrics.retryCount || 0,
      cpuUsage: metrics.cpuUsage,
      networkCalls: metrics.networkCalls,
      sessionId: metrics.sessionId || this.generateSessionId()
    };

    // Get or create metrics array for tool
    const toolMetrics = this.metrics.get(toolName) || [];
    
    // Add new metrics
    toolMetrics.push(fullMetrics);
    
    // Trim to prevent memory leaks
    if (toolMetrics.length > this.maxMetricsPerTool) {
      toolMetrics.splice(0, toolMetrics.length - this.maxMetricsPerTool);
    }
    
    this.metrics.set(toolName, toolMetrics);

    // Log performance issues
    this.detectPerformanceIssues(fullMetrics);
  }

  /**
   * Record cache hit/miss for cache hit rate calculation
   */
  recordCacheEvent(toolName: string, isHit: boolean): void {
    const stats = this.cacheStats.get(toolName) || { hits: 0, misses: 0 };
    
    if (isHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    
    this.cacheStats.set(toolName, stats);
  }

  /**
   * Calculate cache hit rate for a tool
   */
  private calculateCacheHitRate(toolName: string): number {
    const stats = this.cacheStats.get(toolName);
    if (!stats || (stats.hits + stats.misses) === 0) {
      return 0;
    }
    
    return stats.hits / (stats.hits + stats.misses);
  }

  /**
   * Get current memory usage (approximation for Node.js)
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // Convert to MB
    }
    return 0;
  }

  /**
   * Generate a simple session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Detect performance issues and log warnings
   */
  private detectPerformanceIssues(metrics: ExtendedToolMetrics): void {
    // Execution time warnings
    if (metrics.executionTime > 10000) { // 10 seconds
      Logger.warn(`[metrics] Slow execution detected for ${metrics.toolName}`, {
        executionTime: metrics.executionTime,
        memoryUsage: metrics.memoryUsage
      });
    }

    // Memory usage warnings
    if (metrics.memoryUsage > 500) { // 500 MB
      Logger.warn(`[metrics] High memory usage detected for ${metrics.toolName}`, {
        memoryUsage: metrics.memoryUsage,
        executionTime: metrics.executionTime
      });
    }

    // Low cache hit rate warnings
    if (metrics.cacheHitRate < 0.3 && metrics.cacheHitRate > 0) { // Less than 30%
      Logger.warn(`[metrics] Low cache hit rate for ${metrics.toolName}`, {
        cacheHitRate: metrics.cacheHitRate
      });
    }
  }

  /**
   * Get recent metrics for a tool
   */
  getRecentMetrics(toolName: string, limit = 10): ExtendedToolMetrics[] {
    const toolMetrics = this.metrics.get(toolName) || [];
    return toolMetrics.slice(-limit);
  }

  /**
   * Get aggregated metrics for a tool
   */
  getAggregatedMetrics(toolName: string, hoursBack = 24): AggregatedMetrics | null {
    const toolMetrics = this.metrics.get(toolName);
    if (!toolMetrics || toolMetrics.length === 0) {
      return null;
    }

    // Filter metrics within time range
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentMetrics = toolMetrics.filter(m => m.timestamp >= cutoffTime);
    
    if (recentMetrics.length === 0) {
      return null;
    }

    // Calculate aggregations
    const executionTimes = recentMetrics.map(m => m.executionTime).sort((a, b) => a - b);
    const memoryUsages = recentMetrics.map(m => m.memoryUsage);
    const cacheHitRates = recentMetrics.map(m => m.cacheHitRate).filter(r => r > 0);
    const totalErrors = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0);

    return {
      toolName,
      totalExecutions: recentMetrics.length,
      averageExecutionTime: executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length,
      medianExecutionTime: executionTimes[Math.floor(executionTimes.length / 2)],
      p95ExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.95)],
      averageMemoryUsage: memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length,
      totalErrors,
      errorRate: totalErrors / recentMetrics.length,
      averageCacheHitRate: cacheHitRates.length > 0 
        ? cacheHitRates.reduce((sum, r) => sum + r, 0) / cacheHitRates.length 
        : 0,
      timeRange: {
        start: recentMetrics[0].timestamp,
        end: recentMetrics[recentMetrics.length - 1].timestamp
      }
    };
  }

  /**
   * Get performance summary for all tools
   */
  getPerformanceSummary(): Record<string, AggregatedMetrics | null> {
    const summary: Record<string, AggregatedMetrics | null> = {};
    
    for (const toolName of this.metrics.keys()) {
      summary[toolName] = this.getAggregatedMetrics(toolName);
    }
    
    return summary;
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  clearOldMetrics(hoursBack = 168): void { // Default 7 days
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    for (const [toolName, toolMetrics] of this.metrics.entries()) {
      const filteredMetrics = toolMetrics.filter(m => m.timestamp >= cutoffTime);
      this.metrics.set(toolName, filteredMetrics);
    }
    
    Logger.info(`[metrics] Cleared metrics older than ${hoursBack} hours`);
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const allMetrics: ExtendedToolMetrics[] = [];
    
    for (const toolMetrics of this.metrics.values()) {
      allMetrics.push(...toolMetrics);
    }
    
    if (format === 'json') {
      return JSON.stringify(allMetrics, null, 2);
    } else {
      // CSV format
      if (allMetrics.length === 0) return '';
      
      const headers = Object.keys(allMetrics[0]).join(',');
      const rows = allMetrics.map(m => Object.values(m).join(','));
      
      return [headers, ...rows].join('\n');
    }
  }
}

// Singleton instance
export const performanceMetrics = new PerformanceMetricsCollector();

/**
 * Decorator/wrapper function to automatically collect performance metrics
 */
export function withPerformanceMetrics<T extends (...args: any[]) => any>(
  toolName: string,
  fn: T
): T {
  return (async (...args: any[]): Promise<Awaited<ReturnType<T>>> => {
    const startTime = Date.now();
    const startMemory = performanceMetrics['getCurrentMemoryUsage']();
    let errorCount = 0;
    let retryCount = 0;

    try {
      const result = await fn(...args);
      const endTime = Date.now();
      const endMemory = performanceMetrics['getCurrentMemoryUsage']();

      // Calculate input/output sizes (approximation)
      const inputSize = JSON.stringify(args).length;
      const outputSize = typeof result === 'string' ? result.length : 
                        typeof result === 'object' ? JSON.stringify(result).length : 0;

      // Record metrics
      performanceMetrics.recordMetrics(toolName, {
        executionTime: endTime - startTime,
        memoryUsage: Math.max(endMemory, startMemory), // Peak memory usage
        inputSize,
        outputSize,
        errorCount,
        retryCount
      });

      return result;
    } catch (error) {
      errorCount = 1;
      const endTime = Date.now();
      
      // Record error metrics
      performanceMetrics.recordMetrics(toolName, {
        executionTime: endTime - startTime,
        memoryUsage: performanceMetrics['getCurrentMemoryUsage'](),
        errorCount,
        retryCount
      });

      throw error;
    }
  }) as T;
}

/**
 * Performance monitoring utilities
 */
export const PerformanceUtils = {
  /**
   * Get current tool performance status
   */
  getToolStatus(toolName: string): 'healthy' | 'warning' | 'critical' {
    const metrics = performanceMetrics.getAggregatedMetrics(toolName, 1); // Last hour
    if (!metrics) return 'healthy';

    if (metrics.errorRate > 0.1 || metrics.averageExecutionTime > 10000) {
      return 'critical';
    }
    
    if (metrics.errorRate > 0.05 || metrics.averageExecutionTime > 5000) {
      return 'warning';
    }
    
    return 'healthy';
  },

  /**
   * Get performance recommendations for a tool
   */
  getPerformanceRecommendations(toolName: string): string[] {
    const metrics = performanceMetrics.getAggregatedMetrics(toolName);
    const recommendations: string[] = [];

    if (!metrics) {
      return ['No performance data available'];
    }

    if (metrics.averageExecutionTime > 5000) {
      recommendations.push('Consider optimizing algorithm or adding caching');
    }

    if (metrics.averageMemoryUsage > 200) {
      recommendations.push('High memory usage detected - consider memory optimization');
    }

    if (metrics.averageCacheHitRate < 0.5 && metrics.averageCacheHitRate > 0) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }

    if (metrics.errorRate > 0.05) {
      recommendations.push('High error rate - investigate error patterns');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good');
    }

    return recommendations;
  }
};