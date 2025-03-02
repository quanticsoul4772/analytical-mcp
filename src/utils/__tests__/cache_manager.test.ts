import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { cacheManager } from '../cache_manager.js';
import fs from 'fs/promises';
import path from 'path';

describe('CacheManager', () => {
  const testCacheDir = './test-cache';
  const testKey = 'test-key';
  const testData = { test: 'data' };

  // Mock fs.mkdir and fs.writeFile to avoid actual file operations
  beforeEach(() => {
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readdir').mockResolvedValue([]);

    // Clear cache before each test
    cacheManager.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should store and retrieve data from cache', () => {
    cacheManager.set(testKey, testData, { namespace: 'test' });
    const result = cacheManager.get(testKey, { namespace: 'test' });

    expect(result).toEqual(testData);
  });

  it('should respect namespaces', () => {
    cacheManager.set(testKey, testData, { namespace: 'namespace1' });
    cacheManager.set(testKey, { different: 'data' }, { namespace: 'namespace2' });

    const result1 = cacheManager.get(testKey, { namespace: 'namespace1' });
    const result2 = cacheManager.get(testKey, { namespace: 'namespace2' });

    expect(result1).toEqual(testData);
    expect(result2).toEqual({ different: 'data' });
  });

  it('should return null for expired cache entries', () => {
    cacheManager.set(testKey, testData, {
      namespace: 'test',
      ttl: 1, // 1ms TTL
    });

    // Wait for expiration
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cacheManager.get(testKey, { namespace: 'test' });
        expect(result).toBeNull();
        resolve();
      }, 10);
    });
  });

  it('should check if key exists in cache', () => {
    cacheManager.set(testKey, testData, { namespace: 'test' });

    expect(cacheManager.has(testKey, 'test')).toBe(true);
    expect(cacheManager.has('non-existent', 'test')).toBe(false);
  });

  it('should remove keys from cache', () => {
    cacheManager.set(testKey, testData, { namespace: 'test' });
    expect(cacheManager.has(testKey, 'test')).toBe(true);

    cacheManager.remove(testKey, 'test');
    expect(cacheManager.has(testKey, 'test')).toBe(false);
  });

  it('should clear namespaces', () => {
    cacheManager.set(testKey, testData, { namespace: 'namespace1' });
    cacheManager.set('another-key', testData, { namespace: 'namespace1' });
    cacheManager.set(testKey, testData, { namespace: 'namespace2' });

    cacheManager.clearNamespace('namespace1');

    expect(cacheManager.has(testKey, 'namespace1')).toBe(false);
    expect(cacheManager.has('another-key', 'namespace1')).toBe(false);
    expect(cacheManager.has(testKey, 'namespace2')).toBe(true);
  });

  it('should clear all caches', () => {
    cacheManager.set(testKey, testData, { namespace: 'namespace1' });
    cacheManager.set(testKey, testData, { namespace: 'namespace2' });

    cacheManager.clear();

    expect(cacheManager.has(testKey, 'namespace1')).toBe(false);
    expect(cacheManager.has(testKey, 'namespace2')).toBe(false);
  });

  it('should track cache statistics', () => {
    // Initial stats should be empty
    const initialStats = cacheManager.getStats('test');
    expect(initialStats.hits).toBe(0);
    expect(initialStats.misses).toBe(0);

    // Set an item and get it twice
    cacheManager.set(testKey, testData, { namespace: 'test' });
    cacheManager.get(testKey, { namespace: 'test' });
    cacheManager.get(testKey, { namespace: 'test' });

    // One miss for a non-existent key
    cacheManager.get('non-existent', { namespace: 'test' });

    const stats = cacheManager.getStats('test');
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.puts).toBe(1);
    expect(stats.size).toBe(1);
  });

  it('should cleanup expired entries', () => {
    // Add entries with short TTL
    cacheManager.set('expire1', testData, {
      namespace: 'test',
      ttl: 1, // 1ms TTL
    });

    cacheManager.set('expire2', testData, {
      namespace: 'test',
      ttl: 1, // 1ms TTL
    });

    // Add one with longer TTL
    cacheManager.set('keep', testData, {
      namespace: 'test',
      ttl: 10000, // 10s TTL
    });

    // Wait for expiration
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Run cleanup
        cacheManager.cleanup();

        // Check results
        expect(cacheManager.has('expire1', 'test')).toBe(false);
        expect(cacheManager.has('expire2', 'test')).toBe(false);
        expect(cacheManager.has('keep', 'test')).toBe(true);

        const stats = cacheManager.getStats('test');
        expect(stats.evictions).toBe(2);
        expect(stats.size).toBe(1);

        resolve();
      }, 10);
    });
  });

  it('should preload cache from disk', async () => {
    // Mock fs.readdir to return some cache files
    const mockFiles = ['cache_test1.json', 'cache_test2.json', 'not-a-cache-file.txt'];
    jest.spyOn(fs, 'readdir').mockResolvedValue(mockFiles as any);

    // Mock fs.readFile to return valid cache entries
    jest.spyOn(fs, 'readFile').mockImplementation((filePath: string) => {
      if (filePath.includes('test1')) {
        return Promise.resolve(
          JSON.stringify({
            data: { test: 'data1' },
            timestamp: Date.now(),
            ttl: 10000,
          })
        );
      } else if (filePath.includes('test2')) {
        return Promise.resolve(
          JSON.stringify({
            data: { test: 'data2' },
            timestamp: Date.now(),
            ttl: 10000,
          })
        );
      }
      return Promise.reject(new Error('File not found'));
    });

    // Mock fs.access to simulate file existence
    jest.spyOn(fs, 'access').mockResolvedValue(undefined);

    // Preload cache
    const loadedCount = await cacheManager.preload();

    // Should have loaded 2 cache entries
    expect(loadedCount).toBe(2);

    // Verify the entries were loaded
    expect(cacheManager.has('test1', 'default')).toBe(true);
    expect(cacheManager.has('test2', 'default')).toBe(true);
  });

  it('should handle invalid preload data gracefully', async () => {
    // Mock fs.readdir to return a cache file
    jest.spyOn(fs, 'readdir').mockResolvedValue(['cache_invalid.json'] as any);

    // Mock fs.readFile to return invalid JSON
    jest.spyOn(fs, 'readFile').mockResolvedValue('not valid json');

    // Mock fs.access to simulate file existence
    jest.spyOn(fs, 'access').mockResolvedValue(undefined);

    // Should not throw and return 0 loaded entries
    const loadedCount = await cacheManager.preload();
    expect(loadedCount).toBe(0);
  });
});
