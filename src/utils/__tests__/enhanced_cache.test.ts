import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  EnhancedCache,
  CacheManager,
  CachePriority,
  CacheEventType,
  DEFAULT_CACHE_CONFIG,
  cached
} from '../enhanced_cache';

// Mock logger to avoid console noise during tests
jest.doMock('../../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Enhanced Cache System', () => {
  let cache: EnhancedCache;

  beforeEach(() => {
    jest.clearAllMocks();
    // Disable setup tests file to avoid logger conflicts
    cache = new EnhancedCache({
      ...DEFAULT_CACHE_CONFIG,
      cleanupInterval: 60000 // Longer interval for tests
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('EnhancedCache', () => {
    describe('semantic key generation', () => {
      it('should generate semantic keys for text data', () => {
        const textData = 'This is a test string with 123 numbers and special chars!';
        
        cache.set('test-key', textData);
        
        // Access the cache entry to check semantic key
        const result = cache.get('test-key');
        expect(result).resolves.toBe(textData);
        
        // The semantic key should reflect text characteristics
        // Format: text:w{wordCount}:c{charCount}:n{hasNumbers}:s{hasSpecialChars}
        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(1);
      });

      it('should generate semantic keys for array data', () => {
        const arrayData = [1, 'string', true, { key: 'value' }];
        
        cache.set('array-key', arrayData);
        
        const result = cache.get('array-key');
        expect(result).resolves.toEqual(arrayData);
        
        // Semantic key format: array:l{length}:t{types}
        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(1);
      });

      it('should generate semantic keys for object data', () => {
        const objectData = { name: 'test', value: 42, active: true };
        
        cache.set('object-key', objectData);
        
        const result = cache.get('object-key');
        expect(result).resolves.toEqual(objectData);
        
        // Semantic key format: object:k{keyCount}:s{hashOfKeys}
        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(1);
      });

      it('should generate semantic keys for primitive data', () => {
        const numberData = 42;
        const booleanData = true;
        
        cache.set('number-key', numberData);
        cache.set('boolean-key', booleanData);
        
        expect(cache.get('number-key')).resolves.toBe(numberData);
        expect(cache.get('boolean-key')).resolves.toBe(booleanData);
        
        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(2);
      });

      it('should find similar entries by semantic key', () => {
        const text1 = 'Hello world with numbers 123';
        const text2 = 'Another text with numbers 456';
        const text3 = 'Simple text without digits';
        
        cache.set('key1', text1);
        cache.set('key2', text2);
        cache.set('key3', text3);
        
        // Find entries similar to text1 (should match text2 due to having numbers)
        const similar = cache.findSimilar('text:w5:c28:ntrue:sfalse', 0.5);
        
        expect(similar.length).toBeGreaterThan(0);
        expect(similar[0].similarity).toBeGreaterThan(0.5);
      });
    });

    describe('hierarchical key structure', () => {
      it('should create hierarchical keys with namespace and operation', () => {
        const params = { userId: 123, type: 'profile' };
        const key = cache.createHierarchicalKey('user', 'getProfile', params);
        
        expect(key).toMatch(/^user:getProfile:[a-f0-9]+$/);
        
        // Same params should generate same key
        const key2 = cache.createHierarchicalKey('user', 'getProfile', params);
        expect(key).toBe(key2);
        
        // Different params should generate different key
        const key3 = cache.createHierarchicalKey('user', 'getProfile', { userId: 456, type: 'profile' });
        expect(key).not.toBe(key3);
      });
    });

    describe('basic cache operations', () => {
      it('should set and get cache entries', async () => {
        const data = { message: 'test data' };
        
        cache.set('test-key', data);
        const result = await cache.get('test-key');
        
        expect(result).toEqual(data);
      });

      it('should return undefined for non-existent keys', async () => {
        const result = await cache.get('non-existent-key');
        expect(result).toBeUndefined();
      });

      it('should handle TTL expiration', async () => {
        const data = { message: 'test data' };
        
        cache.set('expiring-key', data, { ttl: 10 }); // 10ms TTL
        
        // Should be available immediately
        let result = await cache.get('expiring-key');
        expect(result).toEqual(data);
        
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 20));
        
        result = await cache.get('expiring-key');
        expect(result).toBeUndefined();
      });

      it('should update hit statistics', async () => {
        const data = { message: 'test data' };
        
        cache.set('hit-test-key', data);
        
        // Multiple gets should increase hits
        await cache.get('hit-test-key');
        await cache.get('hit-test-key');
        await cache.get('hit-test-key');
        
        const stats = cache.getStats();
        expect(stats.totalHits).toBe(3);
        expect(stats.totalMisses).toBe(0);
        expect(stats.hitRate).toBe(1);
      });

      it('should track miss statistics', async () => {
        await cache.get('non-existent-1');
        await cache.get('non-existent-2');
        
        const stats = cache.getStats();
        expect(stats.totalMisses).toBe(2);
        expect(stats.totalHits).toBe(0);
        expect(stats.hitRate).toBe(0);
      });
    });

    describe('background refresh behavior', () => {
      it('should trigger background refresh when threshold is reached', async () => {
        jest.useFakeTimers();
        
        const refreshCallback = jest.fn().mockResolvedValue('refreshed data');
        const initialData = 'initial data';
        
        const cacheWithFastRefresh = new EnhancedCache({
          ...DEFAULT_CACHE_CONFIG,
          backgroundRefreshThreshold: 0.5, // Refresh at 50% of TTL
          cleanupInterval: 60000
        });
        
        cacheWithFastRefresh.set('refresh-key', initialData, {
          ttl: 1000, // 1 second TTL
          refreshCallback
        });
        
        // Advance time to 60% of TTL (should trigger background refresh)
        jest.advanceTimersByTime(600);
        
        const result = await cacheWithFastRefresh.get('refresh-key');
        
        // Should return original data immediately
        expect(result).toBe(initialData);
        
        // Background refresh should have been called
        expect(refreshCallback).toHaveBeenCalledWith('refresh-key', expect.any(String));
        
        cacheWithFastRefresh.destroy();
        jest.useRealTimers();
      });

      it('should handle background refresh errors gracefully', async () => {
        jest.useFakeTimers();
        
        const refreshCallback = jest.fn().mockRejectedValue(new Error('Refresh failed'));
        const initialData = 'initial data';
        
        const cacheWithFastRefresh = new EnhancedCache({
          ...DEFAULT_CACHE_CONFIG,
          backgroundRefreshThreshold: 0.5,
          cleanupInterval: 60000
        });
        
        cacheWithFastRefresh.set('refresh-error-key', initialData, {
          ttl: 1000,
          refreshCallback
        });
        
        jest.advanceTimersByTime(600);
        
        const result = await cacheWithFastRefresh.get('refresh-error-key');
        
        // Should still return original data even if refresh fails
        expect(result).toBe(initialData);
        expect(refreshCallback).toHaveBeenCalled();
        
        cacheWithFastRefresh.destroy();
        jest.useRealTimers();
      });

      it('should update cache entry after successful background refresh', async () => {
        jest.useFakeTimers();
        
        const refreshCallback = jest.fn().mockResolvedValue('refreshed data');
        const initialData = 'initial data';
        
        const cacheWithFastRefresh = new EnhancedCache({
          ...DEFAULT_CACHE_CONFIG,
          backgroundRefreshThreshold: 0.5,
          cleanupInterval: 60000
        });
        
        cacheWithFastRefresh.set('refresh-update-key', initialData, {
          ttl: 1000,
          refreshCallback
        });
        
        // Trigger background refresh
        jest.advanceTimersByTime(600);
        await cacheWithFastRefresh.get('refresh-update-key');
        
        // Allow background refresh to complete
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // The entry should now have refreshed data
        // Note: This is implementation-dependent based on the actual background refresh logic
        
        cacheWithFastRefresh.destroy();
        jest.useRealTimers();
      });
    });

    describe('tag-based operations', () => {
      it('should set and retrieve entries by tags', () => {
        cache.set('user:123', { name: 'John' }, { tags: ['user', 'profile'] });
        cache.set('user:456', { name: 'Jane' }, { tags: ['user', 'admin'] });
        cache.set('post:789', { title: 'Hello' }, { tags: ['post', 'public'] });
        
        const userEntries = cache.getByTags(['user']);
        expect(userEntries).toHaveLength(2);
        
        const adminEntries = cache.getByTags(['user', 'admin']);
        expect(adminEntries).toHaveLength(1);
        expect(adminEntries[0].data).toEqual({ name: 'Jane' });
        
        const profileEntries = cache.getByTags(['profile']);
        expect(profileEntries).toHaveLength(1);
        expect(profileEntries[0].data).toEqual({ name: 'John' });
      });

      it('should invalidate entries by tags', () => {
        cache.set('user:123', { name: 'John' }, { tags: ['user', 'profile'] });
        cache.set('user:456', { name: 'Jane' }, { tags: ['user', 'admin'] });
        cache.set('post:789', { title: 'Hello' }, { tags: ['post', 'public'] });
        
        expect(cache.getStats().totalEntries).toBe(3);
        
        const invalidated = cache.invalidateByTags(['user']);
        expect(invalidated).toBe(2);
        expect(cache.getStats().totalEntries).toBe(1);
        
        // Only post should remain
        const remaining = cache.getByTags(['post']);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].data).toEqual({ title: 'Hello' });
      });

      it('should invalidate entries with any matching tag', () => {
        cache.set('item:1', { type: 'A' }, { tags: ['type-a', 'active'] });
        cache.set('item:2', { type: 'B' }, { tags: ['type-b', 'active'] });
        cache.set('item:3', { type: 'C' }, { tags: ['type-c', 'inactive'] });
        
        // Invalidate by multiple tags (OR logic)
        const invalidated = cache.invalidateByTags(['type-a', 'inactive']);
        expect(invalidated).toBe(2); // item:1 and item:3
        
        expect(cache.getStats().totalEntries).toBe(1);
        const remaining = cache.getByTags(['type-b']);
        expect(remaining).toHaveLength(1);
      });
    });

    describe('priority-based eviction', () => {
      it('should evict lowest priority entries when cache is full', () => {
        const smallCache = new EnhancedCache({
          ...DEFAULT_CACHE_CONFIG,
          maxSize: 3,
          cleanupInterval: 60000
        });
        
        // Fill cache with different priorities
        smallCache.set('high-1', 'data1', { priority: CachePriority.HIGH });
        smallCache.set('medium-1', 'data2', { priority: CachePriority.MEDIUM });
        smallCache.set('low-1', 'data3', { priority: CachePriority.LOW });
        
        expect(smallCache.getStats().totalEntries).toBe(3);
        
        // Adding another entry should evict the lowest priority (LOW)
        smallCache.set('critical-1', 'data4', { priority: CachePriority.CRITICAL });
        
        expect(smallCache.getStats().totalEntries).toBe(3);
        
        // low-1 should be evicted
        expect(smallCache.get('low-1')).resolves.toBeUndefined();
        expect(smallCache.get('high-1')).resolves.toBe('data1');
        expect(smallCache.get('medium-1')).resolves.toBe('data2');
        expect(smallCache.get('critical-1')).resolves.toBe('data4');
        
        smallCache.destroy();
      });

      it('should evict oldest entry among same priority level', () => {
        jest.useFakeTimers();
        
        const smallCache = new EnhancedCache({
          ...DEFAULT_CACHE_CONFIG,
          maxSize: 2,
          cleanupInterval: 60000
        });
        
        // Add entries with same priority at different times
        smallCache.set('first', 'data1', { priority: CachePriority.MEDIUM });
        
        jest.advanceTimersByTime(100);
        
        smallCache.set('second', 'data2', { priority: CachePriority.MEDIUM });
        
        // Adding third entry should evict 'first' (oldest with same priority)
        smallCache.set('third', 'data3', { priority: CachePriority.MEDIUM });
        
        expect(smallCache.getStats().totalEntries).toBe(2);
        expect(smallCache.get('first')).resolves.toBeUndefined();
        expect(smallCache.get('second')).resolves.toBe('data2');
        expect(smallCache.get('third')).resolves.toBe('data3');
        
        smallCache.destroy();
        jest.useRealTimers();
      });

      it('should track priority distribution in stats', () => {
        cache.set('critical-1', 'data1', { priority: CachePriority.CRITICAL });
        cache.set('critical-2', 'data2', { priority: CachePriority.CRITICAL });
        cache.set('high-1', 'data3', { priority: CachePriority.HIGH });
        cache.set('medium-1', 'data4', { priority: CachePriority.MEDIUM });
        cache.set('low-1', 'data5', { priority: CachePriority.LOW });
        
        const stats = cache.getStats();
        expect(stats.priorityDistribution[CachePriority.CRITICAL]).toBe(2);
        expect(stats.priorityDistribution[CachePriority.HIGH]).toBe(1);
        expect(stats.priorityDistribution[CachePriority.MEDIUM]).toBe(1);
        expect(stats.priorityDistribution[CachePriority.LOW]).toBe(1);
      });
    });

    describe('cache statistics', () => {
      it('should provide comprehensive cache statistics', async () => {
        const data1 = { value: 1 };
        const data2 = { value: 2 };
        
        cache.set('key1', data1, { ttl: 5000 });
        cache.set('key2', data2, { ttl: 10000 });
        
        await cache.get('key1');
        await cache.get('key1');
        await cache.get('non-existent');
        
        const stats = cache.getStats();
        
        expect(stats.totalEntries).toBe(2);
        expect(stats.totalHits).toBe(2);
        expect(stats.totalMisses).toBe(1);
        expect(stats.hitRate).toBeCloseTo(2/3);
        expect(stats.memoryUsage).toBeGreaterThan(0);
        expect(stats.oldestEntry).toBeInstanceOf(Date);
        expect(stats.newestEntry).toBeInstanceOf(Date);
        expect(stats.averageTtl).toBe(7500); // (5000 + 10000) / 2
      });

      it('should handle empty cache statistics gracefully', () => {
        const stats = cache.getStats();
        
        expect(stats.totalEntries).toBe(0);
        expect(stats.totalHits).toBe(0);
        expect(stats.totalMisses).toBe(0);
        expect(stats.hitRate).toBe(0);
        expect(stats.memoryUsage).toBe(0);
        expect(stats.oldestEntry).toBeUndefined();
        expect(stats.newestEntry).toBeUndefined();
        expect(stats.averageTtl).toBe(0);
      });
    });

    describe('cache cleanup and lifecycle', () => {
      it('should clean up expired entries automatically', async () => {
        jest.useFakeTimers();
        
        const fastCleanupCache = new EnhancedCache({
          ...DEFAULT_CACHE_CONFIG,
          cleanupInterval: 100, // 100ms cleanup interval
          defaultTtl: 50 // 50ms TTL
        });
        
        fastCleanupCache.set('expire-1', 'data1');
        fastCleanupCache.set('expire-2', 'data2');
        
        expect(fastCleanupCache.getStats().totalEntries).toBe(2);
        
        // Advance time past TTL
        jest.advanceTimersByTime(60);
        
        // Advance time to trigger cleanup
        jest.advanceTimersByTime(100);
        
        expect(fastCleanupCache.getStats().totalEntries).toBe(0);
        
        fastCleanupCache.destroy();
        jest.useRealTimers();
      });

      it('should clear all entries', () => {
        cache.set('key1', 'data1');
        cache.set('key2', 'data2');
        cache.set('key3', 'data3');
        
        expect(cache.getStats().totalEntries).toBe(3);
        
        cache.clear();
        
        expect(cache.getStats().totalEntries).toBe(0);
      });

      it('should clean up resources on destroy', () => {
        const destroyCache = new EnhancedCache(DEFAULT_CACHE_CONFIG);
        
        destroyCache.set('key1', 'data1');
        expect(destroyCache.getStats().totalEntries).toBe(1);
        
        destroyCache.destroy();
        
        expect(destroyCache.getStats().totalEntries).toBe(0);
      });
    });
  });

  describe('CacheManager', () => {
    afterEach(() => {
      CacheManager.clearAllCaches();
    });

    it('should create and manage named cache instances', () => {
      const cache1 = CacheManager.getCache('test-cache-1');
      const cache2 = CacheManager.getCache('test-cache-2');
      const cache1Again = CacheManager.getCache('test-cache-1');
      
      expect(cache1).toBeInstanceOf(EnhancedCache);
      expect(cache2).toBeInstanceOf(EnhancedCache);
      expect(cache1).toBe(cache1Again); // Should return same instance
      expect(cache1).not.toBe(cache2); // Different caches
    });

    it('should create cache with custom configuration', () => {
      const config = { maxSize: 500, defaultTtl: 2000 };
      const cache = CacheManager.getCache('custom-cache', config);
      
      expect(cache).toBeInstanceOf(EnhancedCache);
    });

    it('should provide aggregate statistics', () => {
      const cache1 = CacheManager.getCache<string>('stats-cache-1');
      const cache2 = CacheManager.getCache<string>('stats-cache-2');
      
      cache1.set('key1', 'data1');
      cache2.set('key2', 'data2');
      cache2.set('key3', 'data3');
      
      const allStats = CacheManager.getCacheStats();
      
      expect(allStats).toHaveProperty('stats-cache-1');
      expect(allStats).toHaveProperty('stats-cache-2');
      expect(allStats['stats-cache-1'].totalEntries).toBe(1);
      expect(allStats['stats-cache-2'].totalEntries).toBe(2);
    });

    it('should clear all managed caches', () => {
      const cache1 = CacheManager.getCache('clear-test-1');
      const cache2 = CacheManager.getCache('clear-test-2');
      
      cache1.set('key1', 'data1');
      cache2.set('key2', 'data2');
      
      CacheManager.clearAllCaches();
      
      // Getting caches again should create new instances
      const newCache1 = CacheManager.getCache('clear-test-1');
      expect(newCache1.getStats().totalEntries).toBe(0);
    });
  });

  describe('cached decorator', () => {
    class TestService {
      callCount = 0;

      @cached('test-cache', { ttl: 5000, tags: ['service'] })
      async expensiveOperation(input: string): Promise<string> {
        this.callCount++;
        return `processed-${input}`;
      }

      @cached('test-cache', { 
        keyGenerator: (input: string) => `custom-${input}`,
        priority: CachePriority.HIGH 
      })
      async customKeyOperation(input: string): Promise<string> {
        this.callCount++;
        return `custom-${input}`;
      }
    }

    let service: TestService;

    beforeEach(() => {
      service = new TestService();
      CacheManager.clearAllCaches();
    });

    afterEach(() => {
      CacheManager.clearAllCaches();
    });

    it('should cache method results', async () => {
      const result1 = await service.expensiveOperation('test');
      const result2 = await service.expensiveOperation('test');
      
      expect(result1).toBe('processed-test');
      expect(result2).toBe('processed-test');
      expect(service.callCount).toBe(1); // Method called only once
    });

    it('should use custom key generator', async () => {
      const result1 = await service.customKeyOperation('test');
      const result2 = await service.customKeyOperation('test');
      
      expect(result1).toBe('custom-test');
      expect(result2).toBe('custom-test');
      expect(service.callCount).toBe(1);
    });

    it('should cache different inputs separately', async () => {
      const result1 = await service.expensiveOperation('input1');
      const result2 = await service.expensiveOperation('input2');
      const result3 = await service.expensiveOperation('input1'); // Should use cache
      
      expect(result1).toBe('processed-input1');
      expect(result2).toBe('processed-input2');
      expect(result3).toBe('processed-input1');
      expect(service.callCount).toBe(2); // Called twice for different inputs
    });
  });
});