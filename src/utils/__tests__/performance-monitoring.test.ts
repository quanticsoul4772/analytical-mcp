import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  withErrorHandling,
  ErrorCodes,
  createAPIError,
  sleep
} from '../errors.js';

// Mock performance monitoring interface from the issue
interface ToolMetrics {
  executionTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorCount?: number;
  retryCount?: number;
}

// Mock performance metrics collector
class MockPerformanceMetrics {
  private metrics: Map<string, ToolMetrics[]> = new Map();

  recordMetrics(toolName: string, metrics: ToolMetrics): void {
    if (!this.metrics.has(toolName)) {
      this.metrics.set(toolName, []);
    }
    this.metrics.get(toolName)!.push({
      ...metrics,
      timestamp: Date.now()
    } as any);
  }

  getMetrics(toolName: string): ToolMetrics[] {
    return this.metrics.get(toolName) || [];
  }

  getAverageExecutionTime(toolName: string): number {
    const toolMetrics = this.getMetrics(toolName);
    if (toolMetrics.length === 0) return 0;
    return toolMetrics.reduce((sum, m) => sum + m.executionTime, 0) / toolMetrics.length;
  }

  getErrorRate(toolName: string): number {
    const toolMetrics = this.getMetrics(toolName);
    if (toolMetrics.length === 0) return 0;
    const errorsCount = toolMetrics.reduce((sum, m) => sum + (m.errorCount || 0), 0);
    return errorsCount / toolMetrics.length;
  }

  getCacheHitRate(toolName: string): number {
    const toolMetrics = this.getMetrics(toolName);
    if (toolMetrics.length === 0) return 0;
    return toolMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / toolMetrics.length;
  }

  getHealthStatus(toolName: string): 'healthy' | 'warning' | 'critical' {
    const avgExecutionTime = this.getAverageExecutionTime(toolName);
    const errorRate = this.getErrorRate(toolName);
    
    if (avgExecutionTime > 5000 || errorRate > 0.1) return 'critical';
    if (avgExecutionTime > 2000 || errorRate > 0.05) return 'warning';
    return 'healthy';
  }

  clear(): void {
    this.metrics.clear();
  }
}

// Enhanced error handling wrapper with performance monitoring
function withErrorHandlingAndMetrics<T extends any[], R>(
  toolName: string,
  fn: (...args: T) => Promise<R>,
  metricsCollector: MockPerformanceMetrics
) {
  return withErrorHandling(toolName, async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    let errorCount = 0;
    let retryCount = 0;
    
    try {
      const result = await fn(...args);
      
      // Record successful execution metrics
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      metricsCollector.recordMetrics(toolName, {
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        cacheHitRate: Math.random(), // Mock cache hit rate
        errorCount: 0,
        retryCount: 0
      });
      
      return result;
    } catch (error) {
      errorCount = 1;
      
      // Record error execution metrics
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      metricsCollector.recordMetrics(toolName, {
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        cacheHitRate: Math.random(), // Mock cache hit rate
        errorCount: 1,
        retryCount: retryCount
      });
      
      throw error;
    }
  });
}

jest.useFakeTimers();

describe('Performance Monitoring Integration', () => {
  let metricsCollector: MockPerformanceMetrics;

  beforeEach(() => {
    metricsCollector = new MockPerformanceMetrics();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Metrics Collection', () => {
    it('should collect execution metrics for successful operations', async () => {
      const mockTool = jest.fn().mockImplementation(async (delay: number) => {
        await sleep(delay);
        return `Completed after ${delay}ms`;
      });

      const monitoredTool = withErrorHandlingAndMetrics('performance_test_tool', mockTool, metricsCollector);
      
      // Execute tool
      const promise = monitoredTool(100);
      jest.advanceTimersByTime(100);
      await promise;

      const metrics = metricsCollector.getMetrics('performance_test_tool');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].executionTime).toBeGreaterThanOrEqual(100);
      expect(metrics[0].errorCount).toBe(0);
      expect(metrics[0].retryCount).toBe(0);
    });

    it('should collect metrics for failed operations', async () => {
      const mockTool = jest.fn().mockImplementation(async () => {
        await sleep(50);
        throw createAPIError('Mock API failure', ErrorCodes.API_TIMEOUT);
      });

      const monitoredTool = withErrorHandlingAndMetrics('failing_tool', mockTool, metricsCollector);
      
      try {
        const promise = monitoredTool();
        jest.advanceTimersByTime(50);
        await promise;
      } catch (error) {
        // Expected to fail
      }

      const metrics = metricsCollector.getMetrics('failing_tool');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].executionTime).toBeGreaterThanOrEqual(50);
      expect(metrics[0].errorCount).toBe(1);
    });

    it('should track multiple executions and calculate averages', async () => {
      const mockTool = jest.fn()
        .mockResolvedValueOnce('Result 1')
        .mockResolvedValueOnce('Result 2')
        .mockRejectedValueOnce(createAPIError('Failed', ErrorCodes.API_TIMEOUT));

      const monitoredTool = withErrorHandlingAndMetrics('multi_exec_tool', mockTool, metricsCollector);
      
      // Execute multiple times
      await monitoredTool();
      await monitoredTool();
      try {
        await monitoredTool();
      } catch (error) {
        // Expected failure
      }

      const metrics = metricsCollector.getMetrics('multi_exec_tool');
      expect(metrics).toHaveLength(3);
      
      const avgExecutionTime = metricsCollector.getAverageExecutionTime('multi_exec_tool');
      expect(avgExecutionTime).toBeGreaterThan(0);
      
      const errorRate = metricsCollector.getErrorRate('multi_exec_tool');
      expect(errorRate).toBeCloseTo(1/3, 2); // 1 error out of 3 executions
    });
  });

  describe('Health Status Monitoring', () => {
    it('should report healthy status for fast, error-free tools', async () => {
      const fastTool = jest.fn().mockResolvedValue('Quick result');
      const monitoredTool = withErrorHandlingAndMetrics('fast_tool', fastTool, metricsCollector);
      
      // Execute multiple times quickly
      for (let i = 0; i < 5; i++) {
        await monitoredTool();
      }

      const healthStatus = metricsCollector.getHealthStatus('fast_tool');
      expect(healthStatus).toBe('healthy');
    });

    it('should report warning status for moderately slow tools', async () => {
      const slowTool = jest.fn().mockImplementation(async () => {
        await sleep(2500); // Moderately slow
        return 'Slow result';
      });
      
      const monitoredTool = withErrorHandlingAndMetrics('slow_tool', slowTool, metricsCollector);
      
      const promise = monitoredTool();
      jest.advanceTimersByTime(2500);
      await promise;

      const healthStatus = metricsCollector.getHealthStatus('slow_tool');
      expect(healthStatus).toBe('warning');
    });

    it('should report critical status for very slow tools', async () => {
      const verySlowTool = jest.fn().mockImplementation(async () => {
        await sleep(6000); // Very slow
        return 'Very slow result';
      });
      
      const monitoredTool = withErrorHandlingAndMetrics('very_slow_tool', verySlowTool, metricsCollector);
      
      const promise = monitoredTool();
      jest.advanceTimersByTime(6000);
      await promise;

      const healthStatus = metricsCollector.getHealthStatus('very_slow_tool');
      expect(healthStatus).toBe('critical');
    });

    it('should report critical status for high error rate tools', async () => {
      const errorProneTool = jest.fn()
        .mockRejectedValueOnce(createAPIError('Error 1', ErrorCodes.API_TIMEOUT))
        .mockRejectedValueOnce(createAPIError('Error 2', ErrorCodes.API_TIMEOUT))
        .mockResolvedValueOnce('Success');

      const monitoredTool = withErrorHandlingAndMetrics('error_prone_tool', errorProneTool, metricsCollector);
      
      // Execute with errors
      for (let i = 0; i < 3; i++) {
        try {
          await monitoredTool();
        } catch (error) {
          // Expected failures
        }
      }

      const errorRate = metricsCollector.getErrorRate('error_prone_tool');
      expect(errorRate).toBeGreaterThan(0.1); // High error rate
      
      const healthStatus = metricsCollector.getHealthStatus('error_prone_tool');
      expect(healthStatus).toBe('critical');
    });
  });

  describe('Cache Hit Rate Tracking', () => {
    it('should track cache hit rates across executions', async () => {
      // Mock tool with varying cache behavior
      const cacheTool = jest.fn()
        .mockResolvedValueOnce('Cache miss')
        .mockResolvedValueOnce('Cache hit')
        .mockResolvedValueOnce('Cache hit');

      const monitoredTool = withErrorHandlingAndMetrics('cache_tool', cacheTool, metricsCollector);
      
      // Execute multiple times
      await monitoredTool();
      await monitoredTool();
      await monitoredTool();

      const metrics = metricsCollector.getMetrics('cache_tool');
      expect(metrics).toHaveLength(3);
      
      const avgCacheHitRate = metricsCollector.getCacheHitRate('cache_tool');
      expect(avgCacheHitRate).toBeGreaterThanOrEqual(0);
      expect(avgCacheHitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage for memory-intensive operations', async () => {
      const memoryIntensiveTool = jest.fn().mockImplementation(async () => {
        // Simulate memory-intensive operation
        const largeArray = new Array(100000).fill('data');
        await sleep(100);
        return `Processed ${largeArray.length} items`;
      });

      const monitoredTool = withErrorHandlingAndMetrics('memory_tool', memoryIntensiveTool, metricsCollector);
      
      const promise = monitoredTool();
      jest.advanceTimersByTime(100);
      await promise;

      const metrics = metricsCollector.getMetrics('memory_tool');
      expect(metrics).toHaveLength(1);
      expect(typeof metrics[0].memoryUsage).toBe('number');
    });
  });

  describe('Performance Recommendations', () => {
    it('should identify performance issues and provide recommendations', () => {
      // Simulate various performance scenarios
      const scenarios = [
        { toolName: 'optimal_tool', avgTime: 50, errorRate: 0.01 },
        { toolName: 'slow_tool', avgTime: 3000, errorRate: 0.02 },
        { toolName: 'error_prone_tool', avgTime: 100, errorRate: 0.15 },
        { toolName: 'critical_tool', avgTime: 8000, errorRate: 0.25 }
      ];

      scenarios.forEach(scenario => {
        // Mock metrics for each scenario
        for (let i = 0; i < 10; i++) {
          metricsCollector.recordMetrics(scenario.toolName, {
            executionTime: scenario.avgTime + (Math.random() - 0.5) * 100,
            memoryUsage: 1000000,
            cacheHitRate: 0.8,
            errorCount: Math.random() < scenario.errorRate ? 1 : 0,
            retryCount: 0
          });
        }
      });

      // Test health status for each scenario
      expect(metricsCollector.getHealthStatus('optimal_tool')).toBe('healthy');
      expect(metricsCollector.getHealthStatus('slow_tool')).toBe('warning');
      expect(metricsCollector.getHealthStatus('error_prone_tool')).toBe('critical');
      expect(metricsCollector.getHealthStatus('critical_tool')).toBe('critical');
    });
  });

  describe('Trend Analysis', () => {
    it('should support trend analysis over time', async () => {
      const trendTool = jest.fn().mockImplementation(async (delay: number) => {
        await sleep(delay);
        return `Completed in ${delay}ms`;
      });

      const monitoredTool = withErrorHandlingAndMetrics('trend_tool', trendTool, metricsCollector);
      
      // Simulate performance degradation over time
      const delays = [100, 150, 200, 300, 500];
      for (const delay of delays) {
        const promise = monitoredTool(delay);
        jest.advanceTimersByTime(delay);
        await promise;
      }

      const metrics = metricsCollector.getMetrics('trend_tool');
      expect(metrics).toHaveLength(5);
      
      // Verify execution times are increasing (performance degrading)
      for (let i = 1; i < metrics.length; i++) {
        expect(metrics[i].executionTime).toBeGreaterThanOrEqual(metrics[i-1].executionTime);
      }
    });
  });
});