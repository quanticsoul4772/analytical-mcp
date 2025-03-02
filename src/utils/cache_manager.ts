/**
 * Cache Manager Utility
 *
 * Provides sophisticated caching capabilities for API responses, research results,
 * and extracted facts to improve performance and reduce API calls.
 */

import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger.js';
import { config, isFeatureEnabled } from './config.js';

// Types for cache entries and options
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  metadata?: Record<string, any>;
  source?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  namespace?: string; // Cache namespace for logical grouping
  persistent?: boolean; // Whether to persist to disk
  refreshThreshold?: number; // Percentage of TTL after which to refresh (0-100)
  metadata?: Record<string, any>; // Additional metadata to store
  cacheFileOptions?: {
    directory?: string;
    prefix?: string;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  puts: number;
  evictions: number;
  size: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * Cache manager for improved performance
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private persistentCacheEnabled: boolean;
  private persistentCacheDir: string;
  private stats: Record<string, CacheStats> = {};
  private defaultTTL: number;

  // Default cache options
  private static DEFAULT_OPTIONS: CacheOptions = {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    namespace: 'default',
    persistent: false,
    refreshThreshold: 80, // Refresh after 80% of TTL has elapsed
    cacheFileOptions: {
      directory: './cache',
      prefix: 'cache_',
    },
  };

  constructor(
    options: {
      persistentCacheEnabled?: boolean;
      persistentCacheDir?: string;
      defaultTTL?: number;
    } = {}
  ) {
    // Use both direct config and feature flag system for consistency
    const cachingEnabled = isFeatureEnabled('caching');
    
    this.persistentCacheEnabled = cachingEnabled && 
      (options.persistentCacheEnabled ?? config.CACHE_PERSISTENT === 'true');

    this.persistentCacheDir =
      options.persistentCacheDir ?? config.CACHE_DIR ?? path.join(process.cwd(), 'cache');

    this.defaultTTL = options.defaultTTL ?? parseInt(config.CACHE_DEFAULT_TTL ?? '86400000', 10);

    // Initialize stats for default namespace
    this.stats['default'] = this.createEmptyStats();
    
    Logger.debug(`Cache manager initialized`, {
      cachingEnabled,
      persistentCacheEnabled: this.persistentCacheEnabled,
      persistentCacheDir: this.persistentCacheDir,
      defaultTTL: this.defaultTTL
    });
    
    // Ensure persistent cache directory exists if enabled
    if (this.persistentCacheEnabled) {
      this.ensureCacheDirectoryExists().catch(err => {
        Logger.warn(`Failed to create cache directory: ${err.message}`);
      });
    }

    // Set up cleanup interval
    const cleanupInterval = parseInt(config.CACHE_CLEANUP_INTERVAL ?? '3600000', 10);
    setInterval(() => this.cleanup(), cleanupInterval);
  }

  /**
   * Get an item from the cache
   */
  get<T>(key: string, options: CacheOptions = {}): T | null {
    // Early return if caching is disabled via feature flag
    if (!isFeatureEnabled('caching')) {
      return null;
    }
    
    const resolvedOptions = this.resolveOptions(options);
    const cacheKey = this.getCacheKey(key, resolvedOptions.namespace!);

    // Check in-memory cache first
    const entry = this.cache.get(cacheKey);
    const statsKey = resolvedOptions.namespace || 'default';

    // Initialize stats for namespace if needed
    if (!this.stats[statsKey]) {
      this.stats[statsKey] = this.createEmptyStats();
    }

    if (entry) {
      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if the entry is still valid
      if (age < entry.ttl) {
        this.stats[statsKey].hits++;

        // Check if we should trigger a refresh (but still return cached data)
        const refreshThreshold = resolvedOptions.refreshThreshold || 80;
        const refreshThresholdMs = (entry.ttl * refreshThreshold) / 100;

        if (age > refreshThresholdMs) {
          Logger.debug(`Cache entry is nearing expiration, triggering background refresh`, {
            key: cacheKey,
            age,
            ttl: entry.ttl,
            refreshThreshold,
          });

          // We'll return a signal that a refresh is recommended
          return {
            ...entry.data,
            __cacheRefreshRecommended: true,
          } as T;
        }

        return entry.data;
      } else {
        // Entry is expired, remove it
        this.cache.delete(cacheKey);
        this.stats[statsKey].evictions++;
        this.stats[statsKey].size = this.cache.size;
      }
    }

    // If not in memory and persistent cache is enabled, try to load from disk
    if (this.persistentCacheEnabled && resolvedOptions.persistent) {
      try {
        const persistentEntry = this.loadFromDisk<T>(cacheKey);
        if (persistentEntry) {
          const now = Date.now();
          const age = now - persistentEntry.timestamp;

          // Check if the loaded entry is still valid
          if (age < persistentEntry.ttl) {
            // Store in memory cache and return
            this.cache.set(cacheKey, persistentEntry);
            this.stats[statsKey].hits++;
            this.stats[statsKey].size = this.cache.size;

            return persistentEntry.data;
          }
        }
      } catch (error) {
        Logger.warn(`Failed to load cache entry from disk: ${cacheKey}`, error);
      }
    }

    // Not found or expired
    this.stats[statsKey].misses++;
    return null;
  }

  /**
   * Set an item in the cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    // Early return if caching is disabled via feature flag
    if (!isFeatureEnabled('caching')) {
      return;
    }
    const resolvedOptions = this.resolveOptions(options);
    const cacheKey = this.getCacheKey(key, resolvedOptions.namespace!);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: resolvedOptions.ttl!,
      metadata: resolvedOptions.metadata,
    };

    // Store in memory cache
    this.cache.set(cacheKey, entry);

    // Update stats
    const statsKey = resolvedOptions.namespace || 'default';
    if (!this.stats[statsKey]) {
      this.stats[statsKey] = this.createEmptyStats();
    }
    this.stats[statsKey].puts++;
    this.stats[statsKey].size = this.cache.size;

    if (!this.stats[statsKey].oldestEntry || entry.timestamp < this.stats[statsKey].oldestEntry) {
      this.stats[statsKey].oldestEntry = entry.timestamp;
    }

    if (!this.stats[statsKey].newestEntry || entry.timestamp > this.stats[statsKey].newestEntry) {
      this.stats[statsKey].newestEntry = entry.timestamp;
    }

    // Persist to disk if enabled
    if (this.persistentCacheEnabled && resolvedOptions.persistent) {
      this.saveToDisk(cacheKey, entry).catch((error) =>
        Logger.warn(`Failed to persist cache entry to disk: ${cacheKey}`, error)
      );
    }

    Logger.debug(`Cache entry set`, {
      key: cacheKey,
      ttl: entry.ttl,
      persistent: resolvedOptions.persistent,
    });
  }

  /**
   * Check if an item exists in the cache
   */
  has(key: string, namespace: string = 'default'): boolean {
    const cacheKey = this.getCacheKey(key, namespace);
    const entry = this.cache.get(cacheKey);

    if (entry) {
      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if the entry is still valid
      if (age < entry.ttl) {
        return true;
      } else {
        // Entry is expired, remove it
        this.cache.delete(cacheKey);
        return false;
      }
    }

    return false;
  }

  /**
   * Remove an item from the cache
   */
  remove(key: string, namespace: string = 'default'): boolean {
    const cacheKey = this.getCacheKey(key, namespace);
    const result = this.cache.delete(cacheKey);

    // Also remove from disk if persistent cache is enabled
    if (this.persistentCacheEnabled) {
      try {
        const cacheFilePath = this.getCacheFilePath(cacheKey);
        fs.unlink(cacheFilePath).catch(() => {});
      } catch (error) {
        // Ignore errors when removing from disk
      }
    }

    // Update stats
    const statsKey = namespace || 'default';
    if (this.stats[statsKey]) {
      this.stats[statsKey].size = this.cache.size;
    }

    return result;
  }

  /**
   * Remove all items from a namespace
   */
  clearNamespace(namespace: string): void {
    const keysToRemove: string[] = [];

    // Find all keys in the namespace
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${namespace}:`)) {
        keysToRemove.push(key);
      }
    }

    // Remove from memory cache
    keysToRemove.forEach((key) => this.cache.delete(key));

    // Remove from disk if persistent cache is enabled
    if (this.persistentCacheEnabled) {
      keysToRemove.forEach((key) => {
        try {
          const cacheFilePath = this.getCacheFilePath(key);
          fs.unlink(cacheFilePath).catch(() => {});
        } catch (error) {
          // Ignore errors when removing from disk
        }
      });
    }

    // Reset stats for namespace
    this.stats[namespace] = this.createEmptyStats();

    Logger.debug(`Cleared cache namespace: ${namespace}`);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    // Clear memory cache
    this.cache.clear();

    // Reset stats
    Object.keys(this.stats).forEach((key) => {
      this.stats[key] = this.createEmptyStats();
    });

    Logger.debug('Cleared all caches');
  }

  /**
   * Get cache statistics
   */
  getStats(namespace: string = 'default'): CacheStats {
    return this.stats[namespace] || this.createEmptyStats();
  }

  /**
   * Get all cache statistics
   */
  getAllStats(): Record<string, CacheStats> {
    return this.stats;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age >= entry.ttl) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    expiredKeys.forEach((key) => {
      this.cache.delete(key);

      // Also remove from disk if persistent cache is enabled
      if (this.persistentCacheEnabled) {
        try {
          const cacheFilePath = this.getCacheFilePath(key);
          fs.unlink(cacheFilePath).catch(() => {});
        } catch (error) {
          // Ignore errors when removing from disk
        }
      }
    });

    // Update stats
    Object.keys(this.stats).forEach((key) => {
      if (this.stats[key]) {
        this.stats[key].evictions += expiredKeys.filter((cacheKey) =>
          cacheKey.startsWith(`${key}:`)
        ).length;
        this.stats[key].size = Array.from(this.cache.keys()).filter((cacheKey) =>
          cacheKey.startsWith(`${key}:`)
        ).length;
      }
    });

    if (expiredKeys.length > 0) {
      Logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Preload cache from disk
   */
  async preload(): Promise<number> {
    if (!this.persistentCacheEnabled) {
      return 0;
    }

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.persistentCacheDir, { recursive: true });

      // Read directory
      const files = await fs.readdir(this.persistentCacheDir);
      const cacheFiles = files.filter((file) => file.startsWith('cache_'));

      let loadedCount = 0;

      // Load each file
      for (const file of cacheFiles) {
        try {
          const filePath = path.join(this.persistentCacheDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry<any> = JSON.parse(content);

          // Check if entry is still valid
          const now = Date.now();
          const age = now - entry.timestamp;

          if (age < entry.ttl) {
            // Extract key from filename
            const key = file.substring(6); // Remove 'cache_' prefix

            // Store in memory cache
            this.cache.set(key, entry);
            loadedCount++;
          } else {
            // Entry is expired, remove it
            await fs.unlink(filePath);
          }
        } catch (error) {
          Logger.warn(`Failed to load cache file: ${file}`, error);
        }
      }

      Logger.info(`Preloaded ${loadedCount} cache entries from disk`);
      return loadedCount;
    } catch (error) {
      Logger.error('Failed to preload cache from disk', error);
      return 0;
    }
  }

  /**
   * Get default TTL
   */
  getDefaultTTL(): number {
    return this.defaultTTL;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Helper to get cache key
   */
  private getCacheKey(key: string, namespace: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Helper to resolve cache options
   */
  private resolveOptions(options: CacheOptions): Required<CacheOptions> {
    return {
      ...CacheManager.DEFAULT_OPTIONS,
      ...options,
      ttl: options.ttl ?? this.defaultTTL,
      namespace: options.namespace ?? 'default',
      cacheFileOptions: {
        ...CacheManager.DEFAULT_OPTIONS.cacheFileOptions,
        ...options.cacheFileOptions,
      },
    } as Required<CacheOptions>;
  }

  /**
   * Save cache entry to disk
   */
  private async saveToDisk<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.persistentCacheEnabled) {
      return;
    }

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.persistentCacheDir, { recursive: true });

      // Save entry to file
      const cacheFilePath = this.getCacheFilePath(key);
      await fs.writeFile(cacheFilePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      Logger.warn(`Failed to save cache entry to disk: ${key}`, error);
    }
  }

  /**
   * Load cache entry from disk
   */
  private loadFromDisk<T>(key: string): CacheEntry<T> | null {
    if (!this.persistentCacheEnabled) {
      return null;
    }

    try {
      const cacheFilePath = this.getCacheFilePath(key);

      // Check if file exists
      // Note: fs.accessSync is synchronous, but this is a private method and won't be called frequently
      if (!fs.access(cacheFilePath).catch(() => false)) {
        return null;
      }

      // Read and parse file (sync version for simplicity in this internal method)
      const content = require('fs').readFileSync(cacheFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(key: string): string {
    // Sanitize the key for file system use
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.persistentCacheDir, `cache_${sanitizedKey}.json`);
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      puts: 0,
      evictions: 0,
      size: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
