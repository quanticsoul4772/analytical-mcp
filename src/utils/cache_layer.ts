/**
 * Caching Layer with Redis-Compatible Interface
 * 
 * Provides a flexible caching layer that can work with Redis or in-memory storage
 * with automatic cache invalidation, circuit breaker patterns, and request deduplication.
 */

import { Logger } from './logger.js';
import { performanceMetrics } from './performance_metrics.js';
import { 
  createDataProcessingError, 
  createConfigurationError 
} from './errors.js';

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  defaultTTL?: number; // Time to live in seconds
  maxMemorySize?: number; // Max memory usage in MB for in-memory cache
  keyPrefix?: string;
  compressionEnabled?: boolean;
  redisUrl?: string;
  fallbackToMemory?: boolean;
}

/**
 * Cache entry interface
 */
interface CacheEntry {
  value: any;
  ttl: number;
  createdAt: number;
  accessCount: number;
  size: number;
}

/**
 * Circuit breaker interface for resilient cache operations
 */
interface CircuitBreaker {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  halfOpenTime?: number;
}

/**
 * Request deduplication tracking
 */
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

/**
 * Abstract cache interface for Redis compatibility
 */
export interface CacheInterface {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  clear(): Promise<void>;
  flushall(): Promise<void>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
}

/**
 * In-memory cache implementation with Redis-compatible interface
 */
class MemoryCache implements CacheInterface {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private currentMemoryUsage = 0;

  constructor(config: CacheConfig) {
    this.config = config;
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.ttl) {
      this.cache.delete(key);
      this.currentMemoryUsage -= entry.size;
      return null;
    }

    // Update access count
    entry.accessCount++;
    
    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const ttl = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : 
                 Date.now() + (this.config.defaultTTL || 3600) * 1000;
    
    const serialized = JSON.stringify(value);
    const size = serialized.length;

    // Check memory limits
    if (this.config.maxMemorySize && 
        (this.currentMemoryUsage + size) > this.config.maxMemorySize * 1024 * 1024) {
      await this.evictLRU();
    }

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentMemoryUsage -= oldEntry.size;
    }

    const entry: CacheEntry = {
      value,
      ttl,
      createdAt: Date.now(),
      accessCount: 0,
      size
    };

    this.cache.set(key, entry);
    this.currentMemoryUsage += size;

    return true;
  }

  async del(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryUsage -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.ttl = Date.now() + (ttlSeconds * 1000);
      return true;
    }
    return false;
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching - convert Redis pattern to RegExp
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.currentMemoryUsage = 0;
  }

  async flushall(): Promise<void> {
    await this.clear();
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist
    
    const remaining = entry.ttl - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : -1; // Expired
  }

  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current - 1;
    await this.set(key, newValue);
    return newValue;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.ttl) {
        this.cache.delete(key);
        this.currentMemoryUsage -= entry.size;
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      Logger.debug(`[cache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  private async evictLRU(): Promise<void> {
    // Find least recently used entry
    let lruKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestAccess) {
        oldestAccess = entry.createdAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      await this.del(lruKey);
      Logger.debug(`[cache] Evicted LRU entry: ${lruKey}`);
    }
  }
}

/**
 * Redis cache implementation (placeholder for Redis client)
 */
class RedisCache implements CacheInterface {
  private redisClient: any;
  private connected = false;

  constructor(config: CacheConfig) {
    // Placeholder for Redis client initialization
    // In real implementation, would use ioredis or node-redis
    Logger.info('[cache] Redis cache initialized (placeholder)');
  }

  async get<T = any>(key: string): Promise<T | null> {
    // Placeholder implementation
    throw new Error('Redis cache not implemented');
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    // Placeholder implementation
    throw new Error('Redis cache not implemented');
  }

  async del(key: string): Promise<boolean> {
    throw new Error('Redis cache not implemented');
  }

  async exists(key: string): Promise<boolean> {
    throw new Error('Redis cache not implemented');
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    throw new Error('Redis cache not implemented');
  }

  async keys(pattern: string): Promise<string[]> {
    throw new Error('Redis cache not implemented');
  }

  async clear(): Promise<void> {
    throw new Error('Redis cache not implemented');
  }

  async flushall(): Promise<void> {
    throw new Error('Redis cache not implemented');
  }

  async ttl(key: string): Promise<number> {
    throw new Error('Redis cache not implemented');
  }

  async incr(key: string): Promise<number> {
    throw new Error('Redis cache not implemented');
  }

  async decr(key: string): Promise<number> {
    throw new Error('Redis cache not implemented');
  }
}

/**
 * Enhanced cache layer with circuit breaker and request deduplication
 */
export class CacheLayer {
  private cache: CacheInterface;
  private config: CacheConfig;
  private circuitBreaker: CircuitBreaker;
  private pendingRequests = new Map<string, PendingRequest>();
  private stats = {
    hits: 0,
    misses: 0,
    errors: 0,
    operations: 0
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: 3600,
      maxMemorySize: 100,
      keyPrefix: 'analytical:',
      compressionEnabled: false,
      fallbackToMemory: true,
      ...config
    };

    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0
    };

    // Initialize cache implementation
    if (config.redisUrl) {
      try {
        this.cache = new RedisCache(this.config);
      } catch (error) {
        Logger.warn('[cache] Redis initialization failed, falling back to memory cache', error);
        this.cache = new MemoryCache(this.config);
      }
    } else {
      this.cache = new MemoryCache(this.config);
    }
  }

  /**
   * Get value from cache with circuit breaker protection
   */
  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    
    if (this.circuitBreaker.isOpen) {
      if (this.shouldAttemptReset()) {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.halfOpenTime = Date.now();
      } else {
        this.stats.misses++;
        return null;
      }
    }

    try {
      this.stats.operations++;
      const value = await this.cache.get<T>(fullKey);
      
      if (value !== null) {
        this.stats.hits++;
        this.recordSuccess();
        
        // Record cache hit
        performanceMetrics.recordCacheEvent(key, true);
        
        return value;
      } else {
        this.stats.misses++;
        
        // Record cache miss
        performanceMetrics.recordCacheEvent(key, false);
        
        return null;
      }
    } catch (error) {
      this.recordFailure();
      Logger.error('[cache] Get operation failed', { key: fullKey, error });
      return null;
    }
  }

  /**
   * Set value in cache with circuit breaker protection
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    
    if (this.circuitBreaker.isOpen && !this.shouldAttemptReset()) {
      return false;
    }

    try {
      this.stats.operations++;
      const success = await this.cache.set(fullKey, value, ttlSeconds);
      
      if (success) {
        this.recordSuccess();
      }
      
      return success;
    } catch (error) {
      this.recordFailure();
      Logger.error('[cache] Set operation failed', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Get or set with function execution and request deduplication
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlSeconds?: number
  ): Promise<T> {
    // Check for existing value
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check for pending request (deduplication)
    const pendingKey = `pending:${key}`;
    const pending = this.pendingRequests.get(pendingKey);
    
    if (pending) {
      // Wait for existing request
      try {
        return await pending.promise;
      } catch (error) {
        // Remove failed pending request
        this.pendingRequests.delete(pendingKey);
        throw error;
      }
    }

    // Create new request
    const promise = this.executeFetchWithCache(key, fetchFn, ttlSeconds);
    
    this.pendingRequests.set(pendingKey, {
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      this.pendingRequests.delete(pendingKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(pendingKey);
      throw error;
    }
  }

  /**
   * Execute fetch function and cache result
   */
  private async executeFetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    try {
      const result = await fetchFn();
      
      // Cache the result
      await this.set(key, result, ttlSeconds);
      
      return result;
    } catch (error) {
      Logger.error(`[cache] Fetch function failed for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    
    try {
      return await this.cache.del(fullKey);
    } catch (error) {
      Logger.error('[cache] Delete operation failed', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.getFullKey(pattern);
    
    try {
      const keys = await this.cache.keys(fullPattern);
      let deletedCount = 0;
      
      for (const key of keys) {
        const deleted = await this.cache.del(key);
        if (deleted) deletedCount++;
      }
      
      Logger.info(`[cache] Invalidated ${deletedCount} keys matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      Logger.error('[cache] Pattern invalidation failed', { pattern: fullPattern, error });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.operations > 0 ? this.stats.hits / this.stats.operations : 0;
    
    return {
      ...this.stats,
      hitRate,
      circuitBreakerOpen: this.circuitBreaker.isOpen,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      Logger.info('[cache] Cache cleared');
    } catch (error) {
      Logger.error('[cache] Clear operation failed', error);
    }
  }

  /**
   * Private helper methods
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private recordSuccess(): void {
    this.circuitBreaker.successCount++;
    
    if (this.circuitBreaker.halfOpenTime && this.circuitBreaker.successCount >= 3) {
      // Reset circuit breaker after successful half-open period
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.halfOpenTime = undefined;
      Logger.info('[cache] Circuit breaker reset - cache is healthy');
    }
  }

  private recordFailure(): void {
    this.stats.errors++;
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    // Open circuit breaker after 5 consecutive failures
    if (this.circuitBreaker.failureCount >= 5) {
      this.circuitBreaker.isOpen = true;
      Logger.warn('[cache] Circuit breaker opened due to consecutive failures');
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.circuitBreaker.isOpen) return false;
    
    const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
    const resetTimeout = 60000; // 1 minute
    
    return timeSinceLastFailure > resetTimeout;
  }
}

// Singleton instance
export const cacheLayer = new CacheLayer();

/**
 * Cache decorator for functions
 */
export function cached<TArgs extends any[], TReturn>(
  cacheKey: (args: TArgs) => string,
  ttlSeconds?: number
) {
  return function(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: TArgs) => Promise<TReturn>>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = async function (...args: TArgs): Promise<TReturn> {
      const key = cacheKey(args);
      
      return cacheLayer.getOrSet(
        key,
        () => method.apply(this, args),
        ttlSeconds
      );
    };
  };
}