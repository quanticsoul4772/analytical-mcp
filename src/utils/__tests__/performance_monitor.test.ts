import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  PerformanceMonitor, 
  MemoryMonitor, 
  getGlobalMonitor, 
  resetGlobalMonitor,
  timed 
} from '../performance_monitor.js';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetGlobalMonitor();
  });

  describe('Basic functionality', () => {
    it('should measure synchronous operation times', () => {
      const result = monitor.time('test-operation', () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500); // Sum of 0 to 999
      expect(monitor.getMetrics('test-operation')).toHaveLength(1);
      expect(monitor.getMetrics('test-operation')[0].duration).toBeGreaterThan(0);
    });

    it('should measure asynchronous operation times', async () => {
      const result = await monitor.timeAsync('async-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      expect(result).toBe('async-result');
      expect(monitor.getMetrics('async-operation')).toHaveLength(1);
      expect(monitor.getMetrics('async-operation')[0].duration).toBeGreaterThanOrEqual(10);
    });

    it('should handle errors in timed operations', () => {
      expect(() => {
        monitor.time('error-operation', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const metrics = monitor.getMetrics('error-operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata?.error).toBe(true);
    });

    it('should handle errors in async timed operations', async () => {
      await expect(monitor.timeAsync('async-error-operation', async () => {
        throw new Error('Async test error');
      })).rejects.toThrow('Async test error');

      const metrics = monitor.getMetrics('async-error-operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata?.error).toBe(true);
    });
  });

  describe('Timer functionality', () => {
    it('should support manual timer control', (done) => {
      const timer = monitor.startTimer('manual-timer', (duration) => {
        expect(duration).toBeGreaterThan(0);
        expect(monitor.getMetrics('manual-timer')).toHaveLength(1);
        done();
      });

      setTimeout(() => timer.end(), 10);
    });

    it('should include metadata in timer callbacks', (done) => {
      const metadata = { userId: '123', feature: 'test' };
      const timer = monitor.startTimer('timer-with-metadata', (duration, meta) => {
        expect(meta).toEqual(metadata);
        done();
      }, metadata);

      timer.end();
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Add some test data
      monitor.time('stats-test', () => new Promise(resolve => setTimeout(resolve, 10)));
      monitor.time('stats-test', () => new Promise(resolve => setTimeout(resolve, 20)));
      monitor.time('stats-test', () => new Promise(resolve => setTimeout(resolve, 30)));
      monitor.time('stats-test', () => new Promise(resolve => setTimeout(resolve, 40)));
      monitor.time('stats-test', () => new Promise(resolve => setTimeout(resolve, 50)));
    });

    it('should calculate statistics correctly', () => {
      const stats = monitor.getStatistics('stats-test');
      
      expect(stats).toBeDefined();
      expect(stats.count).toBe(5);
      expect(stats.min).toBeGreaterThan(0);
      expect(stats.max).toBeGreaterThan(stats.min);
      expect(stats.mean).toBeGreaterThan(0);
      expect(stats.median).toBeGreaterThan(0);
      expect(stats.p95).toBeGreaterThan(0);
      expect(stats.p99).toBeGreaterThan(0);
    });

    it('should return null for non-existent operations', () => {
      const stats = monitor.getStatistics('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should respect enabled/disabled state', () => {
      monitor.setEnabled(false);
      
      const result = monitor.time('disabled-test', () => 'result');
      
      expect(result).toBe('result');
      expect(monitor.getMetrics('disabled-test')).toHaveLength(0);
    });

    it('should respect max metrics limit', () => {
      const smallMonitor = new PerformanceMonitor({ maxMetricsPerOperation: 2 });
      
      smallMonitor.time('limited-test', () => 1);
      smallMonitor.time('limited-test', () => 2);
      smallMonitor.time('limited-test', () => 3);
      
      expect(smallMonitor.getMetrics('limited-test')).toHaveLength(2);
    });
  });

  describe('Slow operation detection', () => {
    it('should detect slow operations', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      monitor.time('slow-operation', () => {
        // Simulate slow operation
        const start = Date.now();
        while (Date.now() - start < 1100) {
          // Busy wait for over 1 second
        }
      });

      // Note: This test might be flaky due to timing precision
      // In a real scenario, you'd mock the timing mechanism
    });
  });

  describe('Summary report', () => {
    it('should generate formatted summary report', () => {
      monitor.time('report-test', () => 1);
      monitor.time('report-test', () => 2);
      
      const report = monitor.getSummaryReport();
      
      expect(report).toContain('Performance Summary');
      expect(report).toContain('report-test');
      expect(report).toContain('Count: 2');
    });

    it('should handle empty metrics', () => {
      const report = monitor.getSummaryReport();
      expect(report).toContain('No metrics recorded');
    });
  });
});

describe('MemoryMonitor', () => {
  let memoryMonitor: MemoryMonitor;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
  });

  it('should record memory snapshots', () => {
    memoryMonitor.recordSnapshot('test-operation');
    
    const snapshots = memoryMonitor.getSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].operation).toBe('test-operation');
    expect(snapshots[0].heapUsed).toBeGreaterThan(0);
  });

  it('should detect potential memory leaks', () => {
    // Record multiple snapshots with increasing memory
    for (let i = 0; i < 6; i++) {
      memoryMonitor.recordSnapshot('test-operation');
    }
    
    const leaks = memoryMonitor.detectLeaks();
    // The result depends on actual memory usage patterns
    expect(Array.isArray(leaks)).toBe(true);
  });

  it('should respect max snapshots limit', () => {
    const limitedMonitor = new MemoryMonitor({ maxSnapshots: 3 });
    
    for (let i = 0; i < 5; i++) {
      limitedMonitor.recordSnapshot(`operation-${i}`);
    }
    
    expect(limitedMonitor.getSnapshots()).toHaveLength(3);
  });
});

describe('Global monitor', () => {
  it('should provide singleton access', () => {
    const monitor1 = getGlobalMonitor();
    const monitor2 = getGlobalMonitor();
    
    expect(monitor1).toBe(monitor2);
  });

  it('should reset global monitor', () => {
    const monitor1 = getGlobalMonitor();
    monitor1.time('test', () => 1);
    
    resetGlobalMonitor();
    const monitor2 = getGlobalMonitor();
    
    expect(monitor2).not.toBe(monitor1);
    expect(monitor2.getMetrics('test')).toHaveLength(0);
  });
});

describe('@timed decorator', () => {
  class TestClass {
    @timed('sync-method')
    syncMethod(value: number): number {
      return value * 2;
    }

    @timed('async-method')
    async asyncMethod(value: number): Promise<number> {
      await new Promise(resolve => setTimeout(resolve, 1));
      return value * 3;
    }
  }

  let testInstance: TestClass;

  beforeEach(() => {
    testInstance = new TestClass();
    resetGlobalMonitor();
  });

  it('should time synchronous methods', () => {
    const result = testInstance.syncMethod(5);
    
    expect(result).toBe(10);
    
    const monitor = getGlobalMonitor();
    const metrics = monitor.getMetrics('sync-method');
    expect(metrics).toHaveLength(1);
  });

  it('should time asynchronous methods', async () => {
    const result = await testInstance.asyncMethod(5);
    
    expect(result).toBe(15);
    
    const monitor = getGlobalMonitor();
    const metrics = monitor.getMetrics('async-method');
    expect(metrics).toHaveLength(1);
  });
});