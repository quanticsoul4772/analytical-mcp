import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  PerformanceMonitor,
  MemoryMonitor,
  getGlobalMonitor,
  resetGlobalMonitor,
  globalMemoryMonitor,
  timed
} from '../performance_monitor.js';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    resetGlobalMonitor();
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should measure synchronous operation times', () => {
      const result = monitor.time('test-operation', () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(49995000); // Sum of 0 to 9999
      const metrics = monitor.getRecentMetrics('test-operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.duration).toBeGreaterThanOrEqual(0);
      expect(metrics[0]!.name).toBe('test-operation');
    });

    it('should measure asynchronous operation times', async () => {
      const result = await monitor.timeAsync('async-operation', async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return 'async-result';
      });

      expect(result).toBe('async-result');
      const metrics = monitor.getRecentMetrics('async-operation');
      expect(metrics).toHaveLength(1);
      // Timers can fire marginally early, so allow a small tolerance
      expect(metrics[0]!.duration).toBeGreaterThanOrEqual(10);
    });

    it('should handle errors in timed operations', () => {
      expect(() => {
        monitor.time('error-operation', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const metrics = monitor.getRecentMetrics('error-operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.metadata?.error).toBe(true);
    });

    it('should handle errors in async timed operations', async () => {
      await expect(
        monitor.timeAsync('async-error-operation', async () => {
          throw new Error('Async test error');
        })
      ).rejects.toThrow('Async test error');

      const metrics = monitor.getRecentMetrics('async-error-operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.metadata?.error).toBe(true);
    });

    it('should record metrics manually with metadata', () => {
      monitor.recordMetric('manual-metric', 42, { source: 'test' });

      const metrics = monitor.getRecentMetrics('manual-metric');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.duration).toBe(42);
      expect(metrics[0]!.metadata).toEqual({ source: 'test' });
    });
  });

  describe('Timer functionality', () => {
    it('should support manual timer control', () => {
      const stop = monitor.startTimer('manual-timer');

      stop();

      const metrics = monitor.getRecentMetrics('manual-timer');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.duration).toBeGreaterThanOrEqual(0);
    });

    it('should record metadata passed when the timer is stopped', () => {
      const metadata = { userId: '123', feature: 'test' };
      const stop = monitor.startTimer('timer-with-metadata');

      stop(metadata);

      const metrics = monitor.getRecentMetrics('timer-with-metadata');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.metadata).toEqual(metadata);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Deterministic durations for exact statistical assertions
      for (const duration of [10, 20, 30, 40, 50]) {
        monitor.recordMetric('stats-test', duration);
      }
    });

    it('should calculate statistics correctly', () => {
      const stats = monitor.getStats('stats-test');

      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(50);
      expect(stats!.mean).toBe(30);
      expect(stats!.median).toBe(30);
      // Interpolated percentiles: p95 -> 40*0.2 + 50*0.8, p99 -> 40*0.04 + 50*0.96
      expect(stats!.p95).toBeCloseTo(48);
      expect(stats!.p99).toBeCloseTo(49.6);
    });

    it('should return null for non-existent operations', () => {
      const stats = monitor.getStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should aggregate statistics for all operations', () => {
      monitor.recordMetric('other-op', 100);

      const allStats = monitor.getAllStats();

      expect(Object.keys(allStats).sort()).toEqual(['other-op', 'stats-test']);
      expect(allStats['stats-test']!.count).toBe(5);
      expect(allStats['other-op']!.count).toBe(1);
    });

    it('should clear metrics for a single operation', () => {
      monitor.clearMetrics('stats-test');

      expect(monitor.getStats('stats-test')).toBeNull();
    });

    it('should clear all metrics', () => {
      monitor.recordMetric('other-op', 100);

      monitor.clearAll();

      expect(monitor.getAllStats()).toEqual({});
    });
  });

  describe('Configuration', () => {
    it('should respect enabled/disabled state', () => {
      monitor.setEnabled(false);
      expect(monitor.isEnabled()).toBe(false);

      const result = monitor.time('disabled-test', () => 'result');

      expect(result).toBe('result');
      expect(monitor.getRecentMetrics('disabled-test')).toHaveLength(0);

      monitor.setEnabled(true);
      expect(monitor.isEnabled()).toBe(true);
    });

    it('should respect max metrics limit', () => {
      const smallMonitor = new PerformanceMonitor(true, 2);

      smallMonitor.recordMetric('limited-test', 1);
      smallMonitor.recordMetric('limited-test', 2);
      smallMonitor.recordMetric('limited-test', 3);

      const metrics = smallMonitor.getRecentMetrics('limited-test');
      expect(metrics).toHaveLength(2);
      // The oldest metric was dropped
      expect(metrics.map((m) => m.duration)).toEqual([2, 3]);
    });
  });

  describe('Slow operation detection', () => {
    it('should log a warning for operations slower than one second', () => {
      // The logger writes everything to stderr via console.error
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      monitor.recordMetric('slow-operation', 1500);

      const warned = errorSpy.mock.calls.some((call) =>
        String(call[0]).includes('Slow operation detected: slow-operation')
      );
      expect(warned).toBe(true);
    });

    it('should not warn for fast operations', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      monitor.recordMetric('fast-operation', 100);

      const warned = errorSpy.mock.calls.some((call) =>
        String(call[0]).includes('Slow operation detected')
      );
      expect(warned).toBe(false);
    });
  });

  describe('Summary report', () => {
    it('should generate formatted summary report', () => {
      monitor.recordMetric('report-test', 10);
      monitor.recordMetric('report-test', 20);

      const report = monitor.getSummaryReport();

      expect(report).toContain('Performance Metrics Summary');
      expect(report).toContain('report-test');
      expect(report).toContain('Count: 2');
      expect(report).toContain('Min: 10.00ms');
      expect(report).toContain('Max: 20.00ms');
      expect(report).toContain('Mean: 15.00ms');
    });

    it('should handle empty metrics', () => {
      const report = monitor.getSummaryReport();
      expect(report).toBe('No performance metrics collected');
    });
  });
});

describe('MemoryMonitor', () => {
  let memoryMonitor: MemoryMonitor;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
  });

  it('should record memory snapshots', () => {
    const usage = memoryMonitor.snapshot();

    expect(usage.heapUsed).toBeGreaterThan(0);
    expect(usage.heapTotal).toBeGreaterThan(0);
    expect((memoryMonitor as any).snapshots).toHaveLength(1);
  });

  it('should report memory usage in megabytes', () => {
    const usage = memoryMonitor.getUsageMB();

    expect(usage.rss).toBeGreaterThan(0);
    expect(usage.heapTotal).toBeGreaterThan(0);
    expect(usage.heapUsed).toBeGreaterThan(0);
    expect(usage.heapUsed).toBeLessThanOrEqual(usage.heapTotal);
  });

  it('should not report a leak with fewer than 10 snapshots', () => {
    for (let i = 0; i < 9; i++) {
      memoryMonitor.snapshot();
    }

    expect(memoryMonitor.detectMemoryLeak()).toBe(false);
  });

  it('should return a boolean once enough snapshots exist', () => {
    for (let i = 0; i < 10; i++) {
      memoryMonitor.snapshot();
    }

    expect(typeof memoryMonitor.detectMemoryLeak()).toBe('boolean');
  });

  it('should respect max snapshots limit', () => {
    const limitedMonitor = new MemoryMonitor(3);

    for (let i = 0; i < 5; i++) {
      limitedMonitor.snapshot();
    }

    expect((limitedMonitor as any).snapshots).toHaveLength(3);
  });

  it('should require at least two snapshots for a growth rate', () => {
    expect(memoryMonitor.getGrowthRate()).toBeNull();

    memoryMonitor.snapshot();
    expect(memoryMonitor.getGrowthRate()).toBeNull();
  });

  it('should clear snapshots', () => {
    memoryMonitor.snapshot();
    memoryMonitor.snapshot();

    memoryMonitor.clear();

    expect((memoryMonitor as any).snapshots).toHaveLength(0);
  });

  it('should expose a global memory monitor singleton', () => {
    expect(globalMemoryMonitor).toBeInstanceOf(MemoryMonitor);
  });
});

describe('Global monitor', () => {
  afterEach(() => {
    resetGlobalMonitor();
  });

  it('should provide singleton access', () => {
    const monitor1 = getGlobalMonitor();
    const monitor2 = getGlobalMonitor();

    expect(monitor1).toBe(monitor2);
  });

  it('should reset global monitor', () => {
    const monitor1 = getGlobalMonitor();
    monitor1.time('test', () => 1);
    expect(monitor1.getRecentMetrics('test')).toHaveLength(1);

    resetGlobalMonitor();
    const monitor2 = getGlobalMonitor();

    expect(monitor2).not.toBe(monitor1);
    expect(monitor2.getRecentMetrics('test')).toHaveLength(0);
  });
});

describe('timed decorator', () => {
  // The tsconfig uses TC39 standard decorators while `timed` implements the
  // legacy (experimental) decorator signature, so the tests apply it manually
  // to a property descriptor instead of using @-syntax.
  const applyTimed = (
    proto: object,
    methodName: string,
    operationName: string
  ): void => {
    const descriptor = Object.getOwnPropertyDescriptor(proto, methodName)!;
    const decorated = timed(operationName)(proto, methodName, descriptor);
    Object.defineProperty(proto, methodName, decorated ?? descriptor);
  };

  class TestClass {
    syncMethod(value: number): number {
      return value * 2;
    }

    async asyncMethod(value: number): Promise<number> {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return value * 3;
    }
  }

  applyTimed(TestClass.prototype, 'syncMethod', 'sync-method');
  applyTimed(TestClass.prototype, 'asyncMethod', 'async-method');

  let testInstance: TestClass;

  beforeEach(() => {
    testInstance = new TestClass();
    resetGlobalMonitor();
  });

  afterEach(() => {
    resetGlobalMonitor();
  });

  it('should time synchronous methods', () => {
    const result = testInstance.syncMethod(5);

    expect(result).toBe(10);

    const monitor = getGlobalMonitor();
    expect(monitor.getRecentMetrics('sync-method')).toHaveLength(1);
  });

  it('should time asynchronous methods', async () => {
    const result = await testInstance.asyncMethod(5);

    expect(result).toBe(15);

    const monitor = getGlobalMonitor();
    expect(monitor.getRecentMetrics('async-method')).toHaveLength(1);
  });
});
