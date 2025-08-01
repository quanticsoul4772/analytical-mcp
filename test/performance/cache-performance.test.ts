import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock dependencies to isolate performance tests
jest.mock('../../src/utils/logger.js', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Cache Performance Benchmarks', () => {
  let cacheManager: any;
  let researchCache: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const cacheModule = await import('../../src/utils/cache_manager.js');
    const researchModule = await import('../../src/utils/research_cache.js');
    
    cacheManager = cacheModule.cacheManager;
    researchCache = researchModule;
  });

  it('should cache operations complete within performance thresholds', async () => {
    const testKey = 'performance-test-key';
    const testValue = { data: 'test-data', timestamp: Date.now() };
    
    // Benchmark cache set operation
    const setStart = performance.now();
    await cacheManager.set(testKey, testValue, 'default');
    const setDuration = performance.now() - setStart;
    
    expect(setDuration).toBeLessThan(10); // Should complete in < 10ms
    
    // Benchmark cache get operation
    const getStart = performance.now();
    const retrieved = await cacheManager.get(testKey, 'default');
    const getDuration = performance.now() - getStart;
    
    expect(getDuration).toBeLessThan(5); // Should complete in < 5ms
    expect(retrieved).toEqual(testValue);
    
    // Cache hit should be significantly faster than miss
    const missStart = performance.now();
    const missed = await cacheManager.get('non-existent-key', 'default');
    const missDuration = performance.now() - missStart;
    
    expect(missed).toBeNull();
    expect(missDuration).toBeLessThan(2); // Cache miss even faster
  });

  it('should handle high-frequency cache operations efficiently', async () => {
    const operations = 1000;
    const keys = Array.from({ length: operations }, (_, i) => `bulk-key-${i}`);
    const values = keys.map(key => ({ key, timestamp: Date.now() }));
    
    // Benchmark bulk set operations
    const bulkSetStart = performance.now();
    await Promise.all(
      keys.map((key, i) => cacheManager.set(key, values[i], 'default'))
    );
    const bulkSetDuration = performance.now() - bulkSetStart;
    
    expect(bulkSetDuration).toBeLessThan(1000); // 1000 ops in < 1 second
    
    // Benchmark bulk get operations
    const bulkGetStart = performance.now();
    const results = await Promise.all(
      keys.map(key => cacheManager.get(key, 'default'))
    );
    const bulkGetDuration = performance.now() - bulkGetStart;
    
    expect(bulkGetDuration).toBeLessThan(500); // Reads should be faster
    expect(results).toHaveLength(operations);
    expect(results.every(result => result !== null)).toBe(true);
    
    // Cleanup
    await Promise.all(keys.map(key => cacheManager.delete(key, 'default')));
  });

  it('should maintain performance with cache size growth', async () => {
    const sizes = [100, 500, 1000, 2000];
    const performanceResults: Array<{ size: number; avgGetTime: number; avgSetTime: number }> = [];
    
    for (const size of sizes) {
      // Fill cache with test data
      const keys = Array.from({ length: size }, (_, i) => `size-test-${i}`);
      const values = keys.map(key => ({ key, data: 'test-data'.repeat(10) }));
      
      // Set operations
      const setTimes: number[] = [];
      for (let i = 0; i < keys.length; i++) {
        const start = performance.now();
        await cacheManager.set(keys[i], values[i], 'default');
        setTimes.push(performance.now() - start);
      }
      
      // Get operations (sample)
      const getTimes: number[] = [];
      const sampleSize = Math.min(50, keys.length);
      for (let i = 0; i < sampleSize; i++) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const start = performance.now();
        await cacheManager.get(randomKey, 'default');
        getTimes.push(performance.now() - start);
      }
      
      performanceResults.push({
        size,
        avgGetTime: getTimes.reduce((a, b) => a + b, 0) / getTimes.length,
        avgSetTime: setTimes.reduce((a, b) => a + b, 0) / setTimes.length,
      });
      
      // Cleanup
      await Promise.all(keys.map(key => cacheManager.delete(key, 'default')));
    }
    
    // Performance shouldn't degrade significantly with size
    const firstResult = performanceResults[0];
    const lastResult = performanceResults[performanceResults.length - 1];
    
    // Allow for some degradation but not more than 3x
    expect(lastResult.avgGetTime).toBeLessThan(firstResult.avgGetTime * 3);
    expect(lastResult.avgSetTime).toBeLessThan(firstResult.avgSetTime * 3);
  });

  it('should demonstrate cache hit speedup vs computation', async () => {
    // Simulate expensive computation
    const expensiveComputation = async (input: number): Promise<number> => {
      // Simulate CPU-intensive work
      let result = input;
      for (let i = 0; i < 100000; i++) {
        result = Math.sqrt(result * result + 1);
      }
      return result;
    };
    
    const testInput = 42;
    const cacheKey = `computation-${testInput}`;
    
    // First run - no cache (expensive)
    const computeStart = performance.now();
    const computedResult = await expensiveComputation(testInput);
    const computeDuration = performance.now() - computeStart;
    
    // Cache the result
    await cacheManager.set(cacheKey, computedResult, 'default');
    
    // Second run - from cache (fast)
    const cacheStart = performance.now();
    const cachedResult = await cacheManager.get(cacheKey, 'default');
    const cacheDuration = performance.now() - cacheStart;
    
    expect(cachedResult).toEqual(computedResult);
    
    // Cache should be at least 10x faster
    const speedupRatio = computeDuration / cacheDuration;
    expect(speedupRatio).toBeGreaterThan(10);
    
    console.log(`Cache speedup: ${speedupRatio.toFixed(2)}x faster`);
    console.log(`Compute time: ${computeDuration.toFixed(2)}ms`);
    console.log(`Cache time: ${cacheDuration.toFixed(2)}ms`);
  });

  it('should handle memory pressure gracefully', async () => {
    // Fill cache until it reaches capacity
    const largeValue = { data: 'x'.repeat(10000) }; // ~10KB per entry
    const keys: string[] = [];
    
    let memoryStart = process.memoryUsage().heapUsed;
    
    // Add entries until we see memory pressure or reach limit
    for (let i = 0; i < 1000; i++) {
      const key = `memory-test-${i}`;
      keys.push(key);
      
      const start = performance.now();
      await cacheManager.set(key, largeValue, 'default');
      const duration = performance.now() - start;
      
      // If operations start taking too long, we're hitting memory pressure
      if (duration > 50 && i > 100) {
        console.log(`Memory pressure detected at ${i} entries`);
        break;
      }
    }
    
    let memoryPeak = process.memoryUsage().heapUsed;
    let memoryGrowth = memoryPeak - memoryStart;
    
    // Verify cache still works under pressure
    const testKey = keys[Math.floor(keys.length / 2)];
    const retrievedValue = await cacheManager.get(testKey, 'default');
    expect(retrievedValue).toEqual(largeValue);
    
    // Cleanup should reduce memory usage
    await Promise.all(keys.map(key => cacheManager.delete(key, 'default')));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Memory should be mostly reclaimed (within 20% of start)
    const memoryAfterCleanup = process.memoryUsage().heapUsed;
    const memoryReclaimed = memoryPeak - memoryAfterCleanup;
    const reclamationRate = memoryReclaimed / memoryGrowth;
    
    expect(reclamationRate).toBeGreaterThan(0.7); // At least 70% reclaimed
    
    console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Memory reclaimed: ${(reclamationRate * 100).toFixed(1)}%`);
  });

  it('should benchmark deduplication efficiency', async () => {
    const duplicateKey = 'duplicate-test';
    const testValue = { computation: 'expensive-result' };
    
    // Simulate multiple concurrent requests for same data
    const concurrentRequests = 50;
    
    let computationCount = 0;
    const mockComputation = jest.fn(async () => {
      computationCount++;
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
      return testValue;
    });
    
    // Mock the cache to use our computation function
    const originalGet = cacheManager.get;
    cacheManager.get = jest.fn(async (key: string) => {
      const cached = await originalGet.call(cacheManager, key, 'default');
      if (cached) return cached;
      
      // If not cached, compute and cache
      const result = await mockComputation();
      await cacheManager.set(key, result, 'default');
      return result;
    });
    
    const start = performance.now();
    
    // Launch concurrent requests
    const results = await Promise.all(
      Array.from({ length: concurrentRequests }, () => 
        cacheManager.get(duplicateKey)
      )
    );
    
    const duration = performance.now() - start;
    
    // All results should be the same
    expect(results.every(result => result === testValue)).toBe(true);
    
    // Should only compute once despite multiple requests
    expect(computationCount).toBe(1);
    
    // Should complete quickly due to deduplication
    expect(duration).toBeLessThan(100);
    
    console.log(`Deduplication test: ${concurrentRequests} requests, ${computationCount} computations`);
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    
    // Restore original method
    cacheManager.get = originalGet;
  });
}, 60000);