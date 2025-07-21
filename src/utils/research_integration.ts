/**
 * Research Integration Coordinator
 * 
 * Streamlined coordinator for research integration functionality using provider pattern.
 * Delegates to focused provider classes for data enrichment, cross-domain analogies,
 * research insights, caching, and confidence calculation.
 */

import { z } from 'zod';
import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { DataEnrichmentProvider, DataEnrichmentOptions, DataEnrichmentResult } from './data_enrichment_provider.js';
import { CrossDomainAnalogiesProvider, CrossDomainAnalogyResult } from './cross_domain_analogies_provider.js';
import { ResearchInsightsProvider, InsightsExtractionResult } from './research_insights_provider.js';
import { ResearchCacheProvider, CacheResult } from './research_cache_provider.js';
import { ConfidenceCalculationProvider } from './confidence_calculation_provider.js';

/**
 * Research Integration Coordinator
 * Uses provider pattern for focused research integration
 */
export class ResearchIntegrationTool {
  private dataEnrichmentProvider: DataEnrichmentProvider;
  private crossDomainProvider: CrossDomainAnalogiesProvider;
  private insightsProvider: ResearchInsightsProvider;
  private cacheProvider: ResearchCacheProvider;
  private confidenceProvider: ConfidenceCalculationProvider;

  constructor() {
    this.dataEnrichmentProvider = new DataEnrichmentProvider();
    this.crossDomainProvider = new CrossDomainAnalogiesProvider();
    this.insightsProvider = new ResearchInsightsProvider();
    this.cacheProvider = new ResearchCacheProvider();
    this.confidenceProvider = new ConfidenceCalculationProvider();
  }

  /**
   * Enrich analytical data with targeted research using provider coordination
   */
  async enrichAnalyticalContext(
    originalData: any[],
    context: string,
    options: DataEnrichmentOptions & { skipCache?: boolean } = {}
  ): Promise<DataEnrichmentResult & { cacheHit?: boolean }> {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(originalData));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));

    const { skipCache = false, ...enrichmentOptions } = options;

    try {
      Logger.debug('Starting data enrichment', { context, dataLength: originalData.length });

      // Check cache first using cache provider
      const cacheResult = this.cacheProvider.checkEnrichmentCache(
        context, 
        originalData, 
        options, 
        skipCache
      );
      
      if (cacheResult) {
        return cacheResult;
      }

      // Perform enrichment using data enrichment provider
      const result = await this.dataEnrichmentProvider.enrichAnalyticalContext(
        originalData,
        context,
        enrichmentOptions
      );

      // Store results in cache using cache provider
      if (!skipCache) {
        this.cacheProvider.storeEnrichmentResults(context, originalData, options, result);
      }

      return result;
    } catch (error) {
      Logger.error('Data enrichment failed', error);
      throw error;
    }
  }

  /**
   * Find cross-domain analogies using provider coordination
   */
  async findCrossdomainAnalogies(
    problem: string,
    domains: string[] = ['technology', 'science', 'business'],
    options: {
      enhancedExtraction?: boolean;
      maxAnalogiesPerDomain?: number;
      maxSolutionsPerAnalogy?: number;
      minConfidence?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<CrossDomainAnalogyResult> {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(problem));

    const { skipCache = false, ...analogyOptions } = options;

    try {
      Logger.debug('Starting cross-domain analogy research', { problem, domains });

      // Check cache first using cache provider
      const cacheResult = this.cacheProvider.checkCrossDomainCache(problem, domains, skipCache);
      if (cacheResult) {
        return {
          ...cacheResult,
          potentialSolutions: [] // Add missing property for cache results
        };
      }

      // Find analogies using cross-domain provider
      const result = await this.crossDomainProvider.findCrossdomainAnalogies(
        problem,
        domains,
        analogyOptions
      );

      // Calculate overall confidence using confidence provider
      const confidence = this.confidenceProvider.calculateAnalogyConfidence(
        result.analogies,
        domains,
        [] // Failed domains tracked in provider
      );

      const finalResult = {
        ...result,
        confidence
      };

      // Store results in cache using cache provider
      if (!skipCache) {
        this.cacheProvider.storeCrossDomainResults(problem, domains, {
          analogies: result.analogies,
          confidence
        });
      }

      return finalResult;
    } catch (error) {
      Logger.error('Cross-domain analogy research failed', error);
      throw error;
    }
  }

  /**
   * Extract research insights using provider coordination
   */
  async extractResearchInsights(
    searchResults: any,
    context: string,
    enhancedExtraction: boolean = true,
    prioritizeRecent: boolean = true,
    numResults: number = 5
  ): Promise<InsightsExtractionResult> {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));

    try {
      Logger.debug('Extracting research insights', { context, enhancedExtraction });

      // Use insights provider for extraction
      const result = await this.insightsProvider.extractResearchInsights(
        searchResults,
        context,
        enhancedExtraction,
        prioritizeRecent,
        numResults
      );

      // Filter insights by quality using insights provider
      const filteredInsights = this.insightsProvider.filterInsightsByQuality(result.insights);

      // Deduplicate insights using insights provider
      const uniqueInsights = this.insightsProvider.deduplicateInsights(filteredInsights);

      return {
        insights: uniqueInsights,
        sources: result.sources
      };
    } catch (error) {
      Logger.error('Research insights extraction failed', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score using provider coordination
   */
  calculateConfidence(
    insights: string[],
    sources: string[],
    type: 'enrichment' | 'analogy' = 'enrichment'
  ): number {
    try {
      if (type === 'enrichment') {
        return this.confidenceProvider.calculateEnrichmentConfidence(insights, sources);
      } else {
        return this.confidenceProvider.calculateAnalogyConfidence(insights, [], []);
      }
    } catch (error) {
      Logger.warn('Confidence calculation failed', error);
      return 0.5;
    }
  }

  /**
   * Clear cache for specific context using provider coordination
   */
  clearCache(context: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));
    
    try {
      this.cacheProvider.clearContextCache(context);
      Logger.debug('Cache cleared', { context });
    } catch (error) {
      Logger.warn('Failed to clear cache', error);
    }
  }

  /**
   * Get key themes from insights using provider coordination
   */
  getKeyThemes(insights: string[]): string[] {
    try {
      return this.insightsProvider.extractKeyThemes(insights);
    } catch (error) {
      Logger.warn('Key theme extraction failed', error);
      return [];
    }
  }

  /**
   * Validate research context
   */
  validateContext(context: string): boolean {
    return this.dataEnrichmentProvider.validateContext(context);
  }

  /**
   * Validate analogy domains
   */
  validateDomains(domains: string[]): string[] {
    return this.crossDomainProvider.validateDomains(domains);
  }
}

// Singleton instance for easy import across tools
export const researchIntegration = new ResearchIntegrationTool();
