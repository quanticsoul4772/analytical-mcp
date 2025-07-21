/**
 * Data Enrichment Provider
 * 
 * Handles analytical data enrichment with targeted research.
 * Provides focused data enrichment logic with validation patterns.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { ValidationError, DataProcessingError, APIError } from './errors.js';
import { exaResearch } from './exa_research.js';
import { rateLimitManager } from './rate_limit_manager.js';

/**
 * Data enrichment options
 */
export interface DataEnrichmentOptions {
  numResults?: number;
  timeRangeMonths?: number;
  includeNewsResults?: boolean;
  prioritizeRecent?: boolean;
  confidenceThreshold?: number;
  enhancedExtraction?: boolean;
}

/**
 * Data enrichment result
 */
export interface DataEnrichmentResult {
  enrichedData: any[];
  researchInsights: string[];
  confidence: number;
  sources?: string[];
}

/**
 * Data Enrichment Provider
 * Manages analytical data enrichment with research integration
 */
export class DataEnrichmentProvider {

  /**
   * Enrich analytical data with targeted research
   */
  async enrichAnalyticalContext(
    originalData: any[],
    context: string,
    options: DataEnrichmentOptions = {}
  ): Promise<DataEnrichmentResult> {
    try {
      // Apply early return validation patterns
      ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(originalData));
      ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));

      const {
        numResults = 5,
        timeRangeMonths = 6,
        includeNewsResults = false,
        prioritizeRecent = true,
        confidenceThreshold = 0.5,
        enhancedExtraction = true,
      } = options;

      Logger.debug(`Enriching analytical context: ${context}`, {
        dataLength: originalData.length,
        options,
      });

      // Use rate limit manager for consistent handling of API limits
      return await rateLimitManager.executeRateLimitedRequest(
        async () => {
          // Perform targeted research
          const searchResults = await exaResearch.search({
            query: context,
            numResults,
            timeRangeMonths,
            useWebResults: true,
            useNewsResults: includeNewsResults,
            includeContents: true,
          });

          // Validate research results before processing
          if (!searchResults || !searchResults.results) {
            Logger.warn('No research results returned for context', { context });
            return {
              enrichedData: originalData,
              researchInsights: [],
              confidence: 0.3,
              sources: []
            };
          }

          // Validate and enrich original data using the research
          const validationResult = await exaResearch.validateData({ 
            originalData, 
            context 
          });

          // Extract insights using research insights provider pattern
          const insights = this.extractBasicInsights(searchResults.results);
          const sources = searchResults.results
            .map((r: any) => r.url)
            .filter(Boolean);

          // Calculate confidence based on results quality
          const confidence = this.calculateBasicConfidence(insights, sources);

          Logger.debug('Data enrichment completed', {
            insightsCount: insights.length,
            sourcesCount: sources.length,
            confidence
          });

          return {
            enrichedData: validationResult.validatedData || originalData,
            researchInsights: insights,
            confidence,
            sources,
          };
        },
        {
          provider: 'exa',
          endpoint: 'exa/research-enrichment',
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          useJitter: true,
        }
      );
    } catch (error) {
      Logger.error(`Error enriching analytical context: ${context}`, error);

      // Handle different error types appropriately
      if (error instanceof ValidationError) {
        throw error; // Validation errors should propagate
      }

      if (error instanceof APIError) {
        // For API errors, return original data with minimal insights
        Logger.warn(`API error during enrichment: ${error.message}`, {
          status: error.status,
          endpoint: error.endpoint,
        });

        return {
          enrichedData: originalData,
          researchInsights: [],
          confidence: 0.1, // Low confidence due to API error
          sources: [],
        };
      }

      // For other errors, wrap in DataProcessingError
      throw new DataProcessingError(
        `Failed to enrich analytical context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { context, dataLength: originalData?.length }
      );
    }
  }

  /**
   * Extract basic insights from search results
   */
  private extractBasicInsights(results: any[]): string[] {
    if (!Array.isArray(results)) {
      return [];
    }

    try {
      return exaResearch.extractKeyFacts(results);
    } catch (error) {
      Logger.warn('Failed to extract basic insights', { error });
      return [];
    }
  }

  /**
   * Calculate basic confidence score
   */
  private calculateBasicConfidence(insights: string[], sources: string[]): number {
    const baseConfidence = insights.length > 0 
      ? Math.min(0.9, 0.5 + insights.length * 0.1) 
      : 0.5;

    const uniqueSourceBoost = Math.min(0.2, sources.length * 0.05);
    return Math.min(0.95, baseConfidence + uniqueSourceBoost);
  }

  /**
   * Validate enrichment context
   */
  validateContext(context: string): boolean {
    if (!context || typeof context !== 'string') {
      return false;
    }

    const trimmed = context.trim();
    return trimmed.length > 0 && trimmed.length <= 1000;
  }

  /**
   * Validate enrichment options
   */
  validateOptions(options: DataEnrichmentOptions): DataEnrichmentOptions {
    const validatedOptions: DataEnrichmentOptions = {};

    if (typeof options.numResults === 'number' && options.numResults > 0) {
      validatedOptions.numResults = Math.min(20, Math.max(1, Math.floor(options.numResults)));
    }

    if (typeof options.timeRangeMonths === 'number' && options.timeRangeMonths > 0) {
      validatedOptions.timeRangeMonths = Math.min(24, Math.max(1, Math.floor(options.timeRangeMonths)));
    }

    if (typeof options.includeNewsResults === 'boolean') {
      validatedOptions.includeNewsResults = options.includeNewsResults;
    }

    if (typeof options.prioritizeRecent === 'boolean') {
      validatedOptions.prioritizeRecent = options.prioritizeRecent;
    }

    if (typeof options.confidenceThreshold === 'number') {
      validatedOptions.confidenceThreshold = Math.min(0.95, Math.max(0.1, options.confidenceThreshold));
    }

    if (typeof options.enhancedExtraction === 'boolean') {
      validatedOptions.enhancedExtraction = options.enhancedExtraction;
    }

    return validatedOptions;
  }

  /**
   * Merge enriched data with original data
   */
  mergeEnrichedData(originalData: any[], enrichedData: any[]): any[] {
    if (!Array.isArray(originalData)) {
      Logger.warn('Invalid original data provided for merging');
      return Array.isArray(enrichedData) ? enrichedData : [];
    }

    if (!Array.isArray(enrichedData)) {
      Logger.warn('Invalid enriched data provided for merging');
      return originalData;
    }

    try {
      // Simple merge strategy - can be enhanced based on data structure
      return [...originalData, ...enrichedData];
    } catch (error) {
      Logger.warn('Failed to merge enriched data', { error });
      return originalData;
    }
  }

  /**
   * Filter enrichment results by confidence threshold
   */
  filterByConfidence(
    insights: string[], 
    confidenceScores: Record<string, number>, 
    threshold: number = 0.5
  ): string[] {
    if (!Array.isArray(insights)) {
      return [];
    }

    return insights.filter(insight => {
      const score = confidenceScores[insight];
      return score === undefined || score >= threshold;
    });
  }
}
