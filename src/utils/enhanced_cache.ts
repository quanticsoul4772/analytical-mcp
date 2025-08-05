/**
 * Enhanced Caching System
 * 
 * Provides hierarchical caching with semantic keys, background refresh,
 * and intelligent cache management for improved performance.
 */

import { Logger } from './logger.js';
import { createHash } from 'crypto';

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  tags: string[];
  semanticKey: string;
  priority: CachePriority;
}

/**
 * Cache priority levels
 */
export enum CachePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Cache configuration
 */
export interface EnhancedCacheConfig {
  maxSize: number;
  defaultTtl: number;
  cleanupInterval: number;
  backgroundRefreshThreshold: number;
  compressionEnabled: boolean;
  persistToDisk: boolean;
  diskCachePath?: string;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: EnhancedCacheConfig = {
  maxSize: 1000,
  defaultTtl: 3600000, // 1 hour
  cleanupInterval: 300000, // 5 minutes
  backgroundRefreshThreshold: 0.8, // Refresh when 80% of TTL has passed
  compressionEnabled: true,
  persistToDisk: false
};

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  averageTtl: number;
  priorityDistribution: Record<CachePriority, number>;
}

/**
 * Background refresh callback
 */
export type RefreshCallback<T> = (key: string, semanticKey: string) => Promise<T>;

/**
 * Cache event types
 */
export enum CacheEventType {
  HIT = 'HIT',
  MISS = 'MISS',
  SET = 'SET',
  DELETE = 'DELETE',
  EXPIRE = 'EXPIRE',
  EVICT = 'EVICT',
  REFRESH = 'REFRESH'
}

/**
 * Cache event
 */
export interface CacheEvent {
  type: CacheEventType;
  key: string;
  semanticKey?: string;
  timestamp: number;
  metadata?: any;
}

/**
 * Enhanced cache implementation with hierarchical structure and semantic keys
 */
export class EnhancedCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private refreshCallbacks = new Map<string, RefreshCallback<T>>();
  private cleanupTimer?: NodeJS.Timeout;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(private config: EnhancedCacheConfig = DEFAULT_CACHE_CONFIG) {
    this.startCleanupTimer();
    Logger.info('Enhanced cache initialized', {
      maxSize: config.maxSize,
      defaultTtl: config.defaultTtl,
      backgroundRefresh: config.backgroundRefreshThreshold
    });
  }

  /**
   * Generate semantic key from data characteristics
   */
  private generateSemanticKey(data: any): string {
    if (typeof data === 'string') {
      // For text data, use content characteristics
      const wordCount = data.split(/\s+/).length;
      const charCount = data.length;
      const hasNumbers = /\d/.test(data);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(data);
      
      return `text:w${wordCount}:c${charCount}:n${hasNumbers}:s${hasSpecialChars}`;
    } else if (Array.isArray(data)) {
      // For arrays, use structure characteristics
      const length = data.length;
      const types = [...new Set(data.map(item => typeof item))].sort().join(',');
      return `array:l${length}:t${types}`;
    } else if (typeof data === 'object' && data !== null) {
      // For objects, use key structure
      const keys = Object.keys(data).sort().join(',');
      const keyCount = Object.keys(data).length;
      return `object:k${keyCount}:s${this.hashString(keys)}`;
    }
    
    return `primitive:${typeof data}`;
  }

  /**
   * Create a cache key with hierarchical structure
   */
  createHierarchicalKey(namespace: string, operation: string, params: Record<string, any>): string {
    const paramHash = this.hashString(JSON.stringify(params));
    return `${namespace}:${operation}:${paramHash}`;
  }

  /**
   * Set cache entry with enhanced metadata
   */
  set(
    key: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
      priority?: CachePriority;
      refreshCallback?: RefreshCallback<T>;
    } = {}
  ): void {
    const now = Date.now();
    const ttl = options.ttl || this.config.defaultTtl;
    const semanticKey = this.generateSemanticKey(data);

    // Handle cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastPriority();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      hits: 0,
      lastAccessed: now,
      tags: options.tags || [],
      semanticKey,
      priority: options.priority || CachePriority.MEDIUM
    };

    this.cache.set(key, entry);

    if (options.refreshCallback) {
      this.refreshCallbacks.set(key, options.refreshCallback);
    }

    this.emitEvent({
      type: CacheEventType.SET,
      key,
      semanticKey,
      timestamp: now,
      metadata: { ttl, priority: entry.priority }
    });

    Logger.debug('Cache entry set', {
      key,
      semanticKey,
      ttl,
      priority: entry.priority,
      cacheSize: this.cache.size
    });
  }

  /**
   * Get cache entry with background refresh logic
   */
  async get(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      this.emitEvent({
        type: CacheEventType.MISS,
        key,
        timestamp: now
      });
      return undefined;
    }

    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.refreshCallbacks.delete(key);
      this.emitEvent({
        type: CacheEventType.EXPIRE,
        key,
        semanticKey: entry.semanticKey,
        timestamp: now
      });
      this.stats.misses++;
      return undefined;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = now;
    this.stats.hits++;

    // Check if background refresh is needed
    const ageRatio = (now - entry.timestamp) / entry.ttl;
    if (ageRatio >= this.config.backgroundRefreshThreshold) {
      this.backgroundRefresh(key, entry);
    }

    this.emitEvent({
      type: CacheEventType.HIT,
      key,
      semanticKey: entry.semanticKey,
      timestamp: now,
      metadata: { hits: entry.hits, ageRatio }
    });

    return entry.data;
  }

  /**
   * Find entries by semantic similarity
   */
  findSimilar(semanticKey: string, threshold: number = 0.8): Array<{ key: string; data: T; similarity: number }> {
    const results: Array<{ key: string; data: T; similarity: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      const similarity = this.calculateSemanticSimilarity(semanticKey, entry.semanticKey);
      if (similarity >= threshold) {
        results.push({
          key,
          data: entry.data,
          similarity
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Get entries by tags
   */
  getByTags(tags: string[]): Array<{ key: string; data: T }> {
    const results: Array<{ key: string; data: T }> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (tags.every(tag => entry.tags.includes(tag))) {
        results.push({ key, data: entry.data });
      }
    }

    return results;
  }

  /**
   * Invalidate entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        this.refreshCallbacks.delete(key);
        invalidated++;
        
        this.emitEvent({
          type: CacheEventType.DELETE,
          key,
          semanticKey: entry.semanticKey,
          timestamp: Date.now(),
          metadata: { reason: 'tag_invalidation', tags }
        });
      }
    }

    Logger.info(`Invalidated ${invalidated} cache entries by tags`, { tags });
    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.refreshCallbacks.clear();
    Logger.info(`Cleared all ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const priorityDistribution = entries.reduce((acc, entry) => {
      acc[entry.priority] = (acc[entry.priority] || 0) + 1;
      return acc;
    }, {} as Record<CachePriority, number>);

    const timestamps = entries.map(e => e.timestamp);
    const ttls = entries.map(e => e.ttl);

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
      averageTtl: ttls.reduce((sum, ttl) => sum + ttl, 0) / ttls.length || 0,
      priorityDistribution
    };
  }

  /**
   * Background refresh logic
   */
  private async backgroundRefresh(key: string, entry: CacheEntry<T>): Promise<void> {
    const refreshCallback = this.refreshCallbacks.get(key);
    if (!refreshCallback) return;

    try {
      Logger.debug(`Background refresh triggered for key: ${key}`);
      
      const newData = await refreshCallback(key, entry.semanticKey);
      
      // Update the entry with new data
      entry.data = newData;
      entry.timestamp = Date.now();
      entry.semanticKey = this.generateSemanticKey(newData);

      this.emitEvent({
        type: CacheEventType.REFRESH,
        key,
        semanticKey: entry.semanticKey,
        timestamp: Date.now(),
        metadata: { backgroundRefresh: true }
      });

      Logger.debug(`Background refresh completed for key: ${key}`);
    } catch (error) {
      Logger.warn(`Background refresh failed for key: ${key}`, error);
    }
  }

  /**
   * Evict least priority entries when cache is full
   */
  private evictLeastPriority(): void {
    let minPriority = CachePriority.CRITICAL;
    let oldestTime = Date.now();
    let evictKey = '';

    // Find the entry with lowest priority and oldest timestamp
    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority < minPriority || 
          (entry.priority === minPriority && entry.lastAccessed < oldestTime)) {
        minPriority = entry.priority;
        oldestTime = entry.lastAccessed;
        evictKey = key;
      }
    }

    if (evictKey) {
      const entry = this.cache.get(evictKey);
      this.cache.delete(evictKey);
      this.refreshCallbacks.delete(evictKey);
      
      this.emitEvent({
        type: CacheEventType.EVICT,
        key: evictKey,
        semanticKey: entry?.semanticKey,
        timestamp: Date.now(),
        metadata: { reason: 'size_limit', priority: minPriority }
      });

      Logger.debug(`Evicted cache entry: ${evictKey}`, { priority: minPriority });
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.refreshCallbacks.delete(key);
        cleanedCount++;
        
        this.emitEvent({
          type: CacheEventType.EXPIRE,
          key,
          semanticKey: entry.semanticKey,
          timestamp: now,
          metadata: { cleanup: true }
        });
      }
    }

    if (cleanedCount > 0) {
      Logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
    this.refreshCallbacks.clear();
  }

  /**
   * Calculate semantic similarity between keys
   */
  private calculateSemanticSimilarity(key1: string, key2: string): number {
    // Simple similarity based on common substrings
    const parts1 = key1.split(':');
    const parts2 = key2.split(':');
    
    let matches = 0;
    const maxParts = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      if (parts1[i] === parts2[i]) {
        matches++;
      }
    }
    
    return matches / maxParts;
  }

  /**
   * Hash string for consistent key generation
   */
  private hashString(str: string): string {
    return createHash('md5').update(str).digest('hex').substring(0, 8);
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimation of memory usage
      totalSize += JSON.stringify(entry.data).length * 2; // Assuming UTF-16
      totalSize += entry.semanticKey.length * 2;
      totalSize += entry.tags.join('').length * 2;
      totalSize += 100; // Metadata overhead
    }
    
    return totalSize;
  }

  /**
   * Emit cache events (can be extended for monitoring)
   */
  private emitEvent(event: CacheEvent): void {
    // In a production system, this could emit to an event bus
    // For now, we just log debug information
    Logger.debug(`Cache event: ${event.type}`, {
      key: event.key,
      semanticKey: event.semanticKey,
      metadata: event.metadata
    });
  }
}

/**
 * Global cache instance factory
 */
export class CacheManager {
  private static caches = new Map<string, EnhancedCache>();

  static getCache<T>(name: string, config?: Partial<EnhancedCacheConfig>): EnhancedCache<T> {
    if (!this.caches.has(name)) {
      const fullConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
      this.caches.set(name, new EnhancedCache<T>(fullConfig));
    }
    return this.caches.get(name) as EnhancedCache<T>;
  }

  static clearAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }

  static getCacheStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}

/**
 * Decorator for caching method results
 */
export function cached(
  cacheName: string,
  options: {
    ttl?: number;
    tags?: string[];
    priority?: CachePriority;
    keyGenerator?: (...args: any[]) => string;
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = CacheManager.getCache(cacheName);

    descriptor.value = async function (...args: any[]) {
      const key = options.keyGenerator ? 
        options.keyGenerator(...args) : 
        `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;

      const cached = await cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const result = await method.apply(this, args);
      cache.set(key, result, options);
      
      return result;
    };

    return descriptor;
  };
}