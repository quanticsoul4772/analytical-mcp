/**
 * Research Cache
 *
 * Specialized cache implementation for research-related operations,
 * including API responses, extracted facts, and validation results.
 */

import { cacheManager, CacheOptions } from './cache_manager.js';
import { Logger } from './logger.js';
import { config } from './config.js';

// Research-specific cache entry types
export interface ResearchCacheEntry {
  query: string;
  results: any;
  timestamp: number;
}

export interface FactExtractionCacheEntry {
  text: string;
  facts: any[];
  timestamp: number;
}

export interface ValidationCacheEntry {
  context: string;
  data: any[];
  validationResults: any;
  timestamp: number;
}

/**
 * Cache TTL configuration with defaults from environment
 */
const CACHE_TTL = {
  // Web searches (shorter TTL because they change frequently)
  SEARCH: parseInt(config.CACHE_TTL_SEARCH ?? '3600000', 10), // 1 hour default

  // Fact extraction (longer TTL because facts don't change much)
  FACTS: parseInt(config.CACHE_TTL_FACTS ?? '86400000', 10), // 24 hours default

  // Data validation (medium TTL because validation may change)
  VALIDATION: parseInt(config.CACHE_TTL_VALIDATION ?? '43200000', 10), // 12 hours default

  // Cross-domain research (longer TTL because domain knowledge is stable)
  CROSS_DOMAIN: parseInt(config.CACHE_TTL_CROSS_DOMAIN ?? '604800000', 10), // 7 days default
};

/**
 * Research cache namespaces
 */
export enum ResearchCacheNamespace {
  SEARCH = 'research:search',
  FACTS = 'research:facts',
  VALIDATION = 'research:validation',
  CROSS_DOMAIN = 'research:cross_domain',
  ENRICHMENT = 'research:enrichment',
}

/**
 * Specialized cache for research operations
 */
export class ResearchCache {
  private enabled: boolean;

  constructor() {
    this.enabled = config.ENABLE_RESEARCH_CACHE === 'true';

    Logger.debug(`Research cache initialized`, {
      enabled: this.enabled,
      ttlSettings: CACHE_TTL,
    });
  }

  /**
   * Get search results from cache
   */
  getSearchResults(query: string, options: any): any | null {
    if (!this.enabled) return null;

    // Create cache key based on query and options
    const cacheKey = this.createSearchCacheKey(query, options);

    return cacheManager.get(cacheKey, {
      namespace: ResearchCacheNamespace.SEARCH,
      ttl: CACHE_TTL.SEARCH,
      persistent: true,
    });
  }

  /**
   * Set search results in cache
   */
  setSearchResults(query: string, options: any, results: any): void {
    if (!this.enabled) return;

    // Create cache key based on query and options
    const cacheKey = this.createSearchCacheKey(query, options);

    cacheManager.set(cacheKey, results, {
      namespace: ResearchCacheNamespace.SEARCH,
      ttl: CACHE_TTL.SEARCH,
      persistent: true,
      metadata: {
        query,
        options,
        resultCount: results?.results?.length ?? 0,
        timestamp: new Date().toISOString(),
      },
    });

    Logger.debug(`Cached search results`, {
      query,
      cacheKey,
      resultCount: results?.results?.length ?? 0,
    });
  }

  /**
   * Get extracted facts from cache
   */
  getExtractedFacts(text: string, maxFacts: number = 5): any[] | null {
    if (!this.enabled) return null;

    // Create a consistent cache key for the text content
    const cacheKey = this.createContentHashKey(text, maxFacts);

    return cacheManager.get(cacheKey, {
      namespace: ResearchCacheNamespace.FACTS,
      ttl: CACHE_TTL.FACTS,
      persistent: true,
    });
  }

  /**
   * Set extracted facts in cache
   */
  setExtractedFacts(text: string, maxFacts: number = 5, facts: any[]): void {
    if (!this.enabled) return;

    // Create a consistent cache key for the text content
    const cacheKey = this.createContentHashKey(text, maxFacts);

    cacheManager.set(cacheKey, facts, {
      namespace: ResearchCacheNamespace.FACTS,
      ttl: CACHE_TTL.FACTS,
      persistent: true,
      metadata: {
        textLength: text.length,
        factCount: facts.length,
        timestamp: new Date().toISOString(),
      },
    });

    Logger.debug(`Cached extracted facts`, {
      textLength: text.length,
      cacheKey,
      factCount: facts.length,
    });
  }

  /**
   * Get validation results from cache
   */
  getValidationResults(context: string, data: any[]): any | null {
    if (!this.enabled) return null;

    // Create a cache key based on context and data
    const cacheKey = this.createValidationCacheKey(context, data);

    return cacheManager.get(cacheKey, {
      namespace: ResearchCacheNamespace.VALIDATION,
      ttl: CACHE_TTL.VALIDATION,
      persistent: true,
    });
  }

  /**
   * Set validation results in cache
   */
  setValidationResults(context: string, data: any[], results: any): void {
    if (!this.enabled) return;

    // Create a cache key based on context and data
    const cacheKey = this.createValidationCacheKey(context, data);

    cacheManager.set(cacheKey, results, {
      namespace: ResearchCacheNamespace.VALIDATION,
      ttl: CACHE_TTL.VALIDATION,
      persistent: true,
      metadata: {
        context,
        dataLength: data.length,
        timestamp: new Date().toISOString(),
      },
    });

    Logger.debug(`Cached validation results`, {
      context,
      cacheKey,
      dataLength: data.length,
    });
  }

  /**
   * Get cross-domain research results from cache
   */
  getCrossDomainResults(problem: string, domains: string[]): any | null {
    if (!this.enabled) return null;

    // Create a cache key based on problem and domains
    const cacheKey = this.createCrossDomainCacheKey(problem, domains);

    return cacheManager.get(cacheKey, {
      namespace: ResearchCacheNamespace.CROSS_DOMAIN,
      ttl: CACHE_TTL.CROSS_DOMAIN,
      persistent: true,
    });
  }

  /**
   * Set cross-domain research results in cache
   */
  setCrossDomainResults(problem: string, domains: string[], results: any): void {
    if (!this.enabled) return;

    // Create a cache key based on problem and domains
    const cacheKey = this.createCrossDomainCacheKey(problem, domains);

    cacheManager.set(cacheKey, results, {
      namespace: ResearchCacheNamespace.CROSS_DOMAIN,
      ttl: CACHE_TTL.CROSS_DOMAIN,
      persistent: true,
      metadata: {
        problem,
        domains,
        analogiesCount: results?.analogies?.length ?? 0,
        solutionsCount: results?.potentialSolutions?.length ?? 0,
        timestamp: new Date().toISOString(),
      },
    });

    Logger.debug(`Cached cross-domain research results`, {
      problem,
      cacheKey,
      domains,
      resultsCount: {
        analogies: results?.analogies?.length ?? 0,
        solutions: results?.potentialSolutions?.length ?? 0,
      },
    });
  }

  /**
   * Get enrichment results from cache
   */
  getEnrichmentResults(context: string, data: any[], options: any): any | null {
    if (!this.enabled) return null;

    // Create a cache key based on context, data, and options
    const cacheKey = this.createEnrichmentCacheKey(context, data, options);

    return cacheManager.get(cacheKey, {
      namespace: ResearchCacheNamespace.ENRICHMENT,
      ttl: CACHE_TTL.VALIDATION, // Use validation TTL for enrichment
      persistent: true,
    });
  }

  /**
   * Set enrichment results in cache
   */
  setEnrichmentResults(context: string, data: any[], options: any, results: any): void {
    if (!this.enabled) return;

    // Create a cache key based on context, data, and options
    const cacheKey = this.createEnrichmentCacheKey(context, data, options);

    cacheManager.set(cacheKey, results, {
      namespace: ResearchCacheNamespace.ENRICHMENT,
      ttl: CACHE_TTL.VALIDATION, // Use validation TTL for enrichment
      persistent: true,
      metadata: {
        context,
        dataLength: data.length,
        options,
        insightsCount: results?.researchInsights?.length ?? 0,
        timestamp: new Date().toISOString(),
      },
    });

    Logger.debug(`Cached enrichment results`, {
      context,
      cacheKey,
      dataLength: data.length,
      insightsCount: results?.researchInsights?.length ?? 0,
    });
  }

  /**
   * Clear all research caches
   */
  clearAll(): void {
    // Clear all research cache namespaces
    Object.values(ResearchCacheNamespace).forEach((namespace) => {
      cacheManager.clearNamespace(namespace);
    });

    Logger.info('Cleared all research caches');
  }

  /**
   * Clear specific cache namespace
   */
  clear(namespace: ResearchCacheNamespace): void {
    cacheManager.clearNamespace(namespace);
    Logger.info(`Cleared research cache: ${namespace}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    // Get stats for each research cache namespace
    Object.values(ResearchCacheNamespace).forEach((namespace) => {
      stats[namespace] = cacheManager.getStats(namespace);
    });

    return stats;
  }

  /**
   * Create a cache key for search
   */
  private createSearchCacheKey(query: string, options: any): string {
    // Normalize the query by trimming and converting to lowercase
    const normalizedQuery = query.trim().toLowerCase();

    // Extract and sort relevant options to ensure consistent keys
    const relevantOptions = {
      numResults: options.numResults,
      timeRangeMonths: options.timeRangeMonths,
      useWebResults: options.useWebResults,
      useNewsResults: options.useNewsResults,
    };

    // Create a deterministic string representation of the options
    const optionsStr = JSON.stringify(relevantOptions, Object.keys(relevantOptions).sort());

    // Combine query and options for the key
    return `${this.hashString(normalizedQuery)}_${this.hashString(optionsStr)}`;
  }

  /**
   * Create a content hash key for fact extraction
   */
  private createContentHashKey(text: string, maxFacts: number): string {
    // Use a portion of the text for the key (first 100 chars)
    // plus a hash of the full text to ensure uniqueness
    const textSample = text.substring(0, 100).trim();
    const fullTextHash = this.hashString(text);

    return `${this.hashString(textSample)}_${maxFacts}_${fullTextHash.substring(0, 8)}`;
  }

  /**
   * Create a cache key for validation
   */
  private createValidationCacheKey(context: string, data: any[]): string {
    // Normalize the context
    const normalizedContext = context.trim().toLowerCase();

    // Create a hash of the data
    const dataHash = this.hashString(JSON.stringify(data));

    return `${this.hashString(normalizedContext)}_${dataHash.substring(0, 8)}`;
  }

  /**
   * Create a cache key for cross-domain research
   */
  private createCrossDomainCacheKey(problem: string, domains: string[]): string {
    // Normalize the problem
    const normalizedProblem = problem.trim().toLowerCase();

    // Sort the domains for consistency
    const sortedDomains = [...domains].sort();

    // Create a hash of the domains
    const domainsHash = this.hashString(JSON.stringify(sortedDomains));

    return `${this.hashString(normalizedProblem)}_${domainsHash.substring(0, 8)}`;
  }

  /**
   * Create a cache key for enrichment
   */
  private createEnrichmentCacheKey(context: string, data: any[], options: any): string {
    // Normalize the context
    const normalizedContext = context.trim().toLowerCase();

    // Create a hash of the data
    const dataHash = this.hashString(JSON.stringify(data));

    // Extract and sort relevant options
    const relevantOptions = {
      numResults: options.numResults,
      timeRangeMonths: options.timeRangeMonths,
      includeNewsResults: options.includeNewsResults,
      enhancedExtraction: options.enhancedExtraction,
    };

    // Create a hash of the options
    const optionsHash = this.hashString(
      JSON.stringify(relevantOptions, Object.keys(relevantOptions).sort())
    );

    return `${this.hashString(normalizedContext)}_${dataHash.substring(0, 8)}_${optionsHash.substring(0, 8)}`;
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex string and ensure positive
    return (hash >>> 0).toString(16);
  }
}

// Export singleton instance
export const researchCache = new ResearchCache();
