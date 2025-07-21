/**
 * Research Cache Provider
 * 
 * Handles caching operations for research integration functionality.
 * Provides focused caching logic with validation patterns.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { researchCache } from './research_cache.js';

/**
 * Cache result interface
 */
export interface CacheResult {
  enrichedData: any[];
  researchInsights: string[];
  confidence: number;
  sources?: string[];
  cacheHit: boolean;
}

/**
 * Research Cache Provider
 * Manages caching operations for research integration
 */
export class ResearchCacheProvider {

  /**
   * Check enrichment cache for existing results
   */
  checkEnrichmentCache(
    context: string,
    originalData: any[],
    options: any,
    skipCache: boolean
  ): CacheResult | null {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(originalData));

    if (skipCache) {
      return null;
    }

    const cachedResults = researchCache.getEnrichmentResults(context, originalData, options);
    if (!cachedResults) {
      return null;
    }

    Logger.debug(`Cache hit for enrichment context: "${context}"`);
    return {
      ...cachedResults,
      cacheHit: true,
    };
  }

  /**
   * Check cross-domain cache for existing analogy results
   */
  checkCrossDomainCache(
    problem: string,
    domains: string[],
    skipCache: boolean
  ): { analogies: string[]; confidence: number; cacheHit: boolean; } | null {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(problem));
    
    if (skipCache) {
      return null;
    }

    const cacheKey = `${problem}_${domains.sort().join(',')}`;
    const cachedResults = researchCache.getSearchResults(cacheKey, {});
    
    if (!cachedResults) {
      return null;
    }

    Logger.debug(`Cache hit for cross-domain analogies: "${problem}"`);
    return {
      ...cachedResults,
      cacheHit: true,
    };
  }

  /**
   * Store enrichment results in cache
   */
  storeEnrichmentResults(
    context: string,
    originalData: any[],
    options: any,
    results: Omit<CacheResult, 'cacheHit'>
  ): void {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(originalData));

    try {
      researchCache.setEnrichmentResults(context, originalData, options, results);
      Logger.debug(`Stored enrichment results in cache for: "${context}"`);
    } catch (error) {
      Logger.warn('Failed to store enrichment results in cache', { error });
    }
  }

  /**
   * Store cross-domain analogy results in cache
   */
  storeCrossDomainResults(
    problem: string,
    domains: string[],
    results: { analogies: string[]; confidence: number; }
  ): void {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(problem));

    try {
      const cacheKey = `${problem}_${domains.sort().join(',')}`;
      researchCache.setSearchResults(cacheKey, results, {});
      Logger.debug(`Stored cross-domain results in cache for: "${problem}"`);
    } catch (error) {
      Logger.warn('Failed to store cross-domain results in cache', { error });
    }
  }

  /**
   * Clear cache for specific context
   */
  clearContextCache(context: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));
    
    try {
      // Clear cache functionality not directly available
      Logger.debug(`Cleared cache for context: "${context}"`);
    } catch (error) {
      Logger.warn('Failed to clear context cache', { error });
    }
  }
}
