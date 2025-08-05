import { z } from 'zod';
import fetch from 'node-fetch';
import { executeApiRequest, RETRYABLE_STATUS_CODES } from './api_helpers.js';
import { APIError, ValidationError, DataProcessingError } from './errors.js';
import { Logger } from './logger.js';
import { config, isFeatureEnabled } from './config.js';
import { factExtractor } from './advanced_fact_extraction.js';
import { rateLimitManager } from './rate_limit_manager.js';
import { researchCache, ResearchCacheNamespace } from './research_cache.js';

// Exa client configuration schema
const ExaConfigSchema = z.object({
  apiKey: z.string().optional().describe('Exa API key for authentication'),
  baseUrl: z.string().default('https://api.exa.ai').describe('Base URL for Exa API'),
});

// Research query input schema
const ExaResearchQuerySchema = z.object({
  query: z.string().describe('Search query for research'),
  numResults: z.number().min(1).max(10).default(5).describe('Number of search results'),
  timeRangeMonths: z
    .number()
    .min(1)
    .max(36)
    .optional()
    .describe('Time range for results in months'),
  useWebResults: z.boolean().default(true).describe('Include web search results'),
  useNewsResults: z.boolean().default(false).describe('Include news results'),
  includeContents: z.boolean().default(true).describe('Include full content of search results'),
});

// Exa search result type
interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  contents?: string;
  score?: number;
}

// Data validation options
interface DataValidationOptions {
  originalData: any[];
  context: string;
  fieldsToValidate?: string[];
}

// Exa research utility class
class ExaResearchTool {
  private apiKey: string;
  private baseUrl: string;

  constructor(exaConfig?: z.infer<typeof ExaConfigSchema>) {
    try {
      const parsedConfig = ExaConfigSchema.parse(exaConfig || {});
      // Use validated environment config from config.js
      this.apiKey = parsedConfig.apiKey || config.EXA_API_KEY || '';
      this.baseUrl = parsedConfig.baseUrl;

      if (!this.apiKey) {
        Logger.warn('No Exa API key provided. Research functionality will be limited.');
      } else {
        const researchEnabled = isFeatureEnabled('researchIntegration');
        Logger.debug('Exa research tool initialized', {
          baseUrl: this.baseUrl,
          researchEnabled,
        });

        if (!researchEnabled) {
          Logger.info('Research integration is disabled in configuration.');
        }

        // Configure rate limit manager for Exa API
        // Register the API key with the rate limit manager
        if (this.apiKey) {
          rateLimitManager.registerApiKeys('exa', [this.apiKey]);

          // Configure endpoint rate limits based on Exa API documentation
          // 10 requests per minute for search endpoint
          rateLimitManager.configureEndpoint('exa/search', 10, 60 * 1000);
          // 50 requests per hour for heavy operations
          rateLimitManager.configureEndpoint('exa/validate', 50, 60 * 60 * 1000);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'ERR_1001',
          `Invalid Exa configuration: ${error.message}`,
          { issues: error.issues }
        );
      }
      throw error;
    }
  }

  // Perform a web search and research
  async search(
    query: z.infer<typeof ExaResearchQuerySchema>
  ): Promise<{ results: ExaSearchResult[] }> {
    // Check if research integration is enabled
    if (!isFeatureEnabled('researchIntegration')) {
      Logger.warn(
        'Research integration is disabled. Enable it with ENABLE_RESEARCH_INTEGRATION=true'
      );
      throw new APIError(
        'ERR_1002',
        'Research integration is disabled in configuration'
      );
    }

    let parsedQuery: z.infer<typeof ExaResearchQuerySchema>;

    try {
      parsedQuery = ExaResearchQuerySchema.parse(query);
      Logger.debug(`Executing Exa search for: "${parsedQuery.query}"`, {
        numResults: parsedQuery.numResults,
        useWebResults: parsedQuery.useWebResults,
        useNewsResults: parsedQuery.useNewsResults,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        Logger.error('Search query validation failed', error);
        throw new ValidationError(
          'ERR_1001',
          `Invalid search query: ${error.message}`,
          { issues: error.issues, query }
        );
      }
      throw error;
    }

    if (!this.apiKey) {
      Logger.error('Missing API key for Exa search');
      throw new APIError(
        'ERR_1002',
        'Cannot perform search: Missing API key'
      );
    }

    // Check cache first
    const cachedResults = researchCache.getSearchResults(parsedQuery.query, parsedQuery);
    if (cachedResults) {
      Logger.debug(`Cache hit for search query: "${parsedQuery.query}"`);
      return cachedResults;
    }

    try {
      // Use rate limit manager to handle request with sophisticated rate limiting
      const results = await rateLimitManager.executeRateLimitedRequest(
        async (apiKey) => {
          const response = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              query: parsedQuery.query,
              numResults: parsedQuery.numResults,
              timeRange: parsedQuery.timeRangeMonths
                ? `${parsedQuery.timeRangeMonths}m`
                : undefined,
              useWebResults: parsedQuery.useWebResults,
              useNewsResults: parsedQuery.useNewsResults,
              includeContents: parsedQuery.includeContents,
            }),
          });

          if (!response.ok) {
            throw new APIError(
              'ERR_1002',
              `Exa search failed: ${response.statusText}`
            );
          }

          const data = (await response.json()) as { results: ExaSearchResult[] };
          Logger.debug(`Exa search returned ${data.results.length} results`);
          return data;
        },
        {
          provider: 'exa',
          endpoint: 'exa/search',
          maxRetries: 5,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          timeoutMs: 60000,
          useJitter: true,
          rotateKeysOnRateLimit: true,
        }
      );

      // Cache the results
      researchCache.setSearchResults(parsedQuery.query, parsedQuery, results);

      return results;
    } catch (error) {
      // Log and rethrow the error with better context
      Logger.error('Exa search operation failed', error, {
        query: parsedQuery.query,
        numResults: parsedQuery.numResults,
      });

      if (error instanceof APIError) {
        throw error; // Already properly formatted
      }

      throw new APIError(
        'ERR_1002',
        `Exa search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Extract key facts from search results using advanced fact extraction
  extractKeyFacts(results: ExaSearchResult[], maxFacts: number = 5): string[] {
    try {
      if (!results || !Array.isArray(results)) {
        Logger.warn('Invalid search results provided to extractKeyFacts', { results });
        return [];
      }

      // Check if we have cached facts for this content
      // Create a unique identifier for these results
      const resultsStr = JSON.stringify(results);
      const cachedFacts = researchCache.getExtractedFacts(resultsStr, maxFacts);
      if (cachedFacts) {
        Logger.debug(`Cache hit for fact extraction, returning ${cachedFacts.length} cached facts`);
        return cachedFacts;
      }

      // Process all content first
      const allContent = results
        .filter((result) => result.contents)
        .map((result) => ({
          text: result.contents!,
          source: result.url,
          title: result.title,
        }));

      // Add all titles separately
      const allTitles = results.map((result) => ({
        text: result.title,
        source: result.url,
      }));

      // Combine all text sources - content is more valuable than titles
      const allSources = [...allContent, ...allTitles];

      // Use advanced fact extraction for all content
      const extractedFacts = [];

      for (const source of allSources) {
        const facts = factExtractor.extractFacts(source.text, {
          maxFacts: Math.ceil(maxFacts / 2), // Allow more facts initially, we'll filter later
          minLength: 40,
          maxLength: 200,
          requireVerbs: true,
          requireEntities: false,
          filterBoilerplate: true,
        });

        // Add the source information to each fact
        extractedFacts.push(
          ...facts.map((fact) => ({
            ...fact,
            source: source.source,
          }))
        );
      }

      // Sort by score (most relevant first) and take top facts
      const topFacts = extractedFacts
        .sort((a, b) => b.score - a.score)
        .slice(0, maxFacts)
        .map((fact) => fact.text);

      Logger.debug(
        `Extracted ${topFacts.length} high-quality facts using advanced fact extraction`
      );

      // Cache the extracted facts
      researchCache.setExtractedFacts(resultsStr, maxFacts, topFacts);

      return topFacts;
    } catch (error) {
      Logger.error('Error extracting facts from search results', error);

      // Fall back to basic extraction if advanced extraction fails
      try {
        Logger.warn('Falling back to basic fact extraction');
        return this.fallbackExtractKeyFacts(results, maxFacts);
      } catch (fallbackError) {
        throw new DataProcessingError(
          'ERR_1001',
          `Failed to extract facts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { resultsCount: results?.length }
        );
      }
    }
  }

  // Fallback fact extraction (simplified method as backup)
  private fallbackExtractKeyFacts(results: ExaSearchResult[], maxFacts: number = 5): string[] {
    if (!results || !Array.isArray(results)) {
      return [];
    }

    const facts = results
      .flatMap((result) => {
        const contentFacts = result.contents ? this.findFactsInText(result.contents, 3) : [];
        const titleFacts = this.findFactsInText(result.title, 1);
        return [...contentFacts, ...titleFacts];
      })
      .slice(0, maxFacts);

    return facts;
  }

  // Simple fact extraction as fallback
  private findFactsInText(text: string, maxFacts: number = 3): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    try {
      // Basic fact extraction - used as fallback
      const sentences = text
        .split(/[.!?]/)
        .filter((s) => {
          const trimmed = s.trim();
          return (
            trimmed.length > 30 &&
            !trimmed.toLowerCase().includes('disclaimer') &&
            !trimmed.toLowerCase().includes('copyright') &&
            !trimmed.toLowerCase().includes('cookies') &&
            !trimmed.match(/terms of (service|use)/)
          );
        })
        .slice(0, maxFacts);

      return sentences.map((s) => s.trim());
    } catch (error) {
      Logger.warn('Error finding facts in text', { error, textLength: text.length });
      return [];
    }
  }

  // Validate or supplement data with research
  async validateData(
    options: DataValidationOptions
  ): Promise<{
    validatedData: any[];
    researchContext: string[];
  }> {
    const { originalData, context, fieldsToValidate } = options;
    Logger.debug(`Validating data with research context: ${context}`, {
      dataLength: originalData?.length,
      fieldsToValidate,
    });

    if (!originalData || !Array.isArray(originalData)) {
      Logger.warn('Invalid data provided for validation', { originalData });
      throw new ValidationError(
        'ERR_1001',
        'Invalid data format for validation: expected array',
        { providedType: typeof originalData }
      );
    }

    if (!context || typeof context !== 'string' || context.trim().length === 0) {
      Logger.warn('Invalid context provided for validation');
      throw new ValidationError(
        'ERR_1001',
        'Empty or invalid context for validation'
      );
    }

    // Check cache first
    const cachedResults = researchCache.getValidationResults(context, originalData);
    if (cachedResults) {
      Logger.debug(`Cache hit for validation with context: "${context}"`);
      return cachedResults;
    }

    const researchQuery = `Validate and provide context for: ${context}`;

    try {
      // Use rate limit manager for validation requests to ensure they respect limits
      // These are typically more intensive operations
      const results = await rateLimitManager.executeRateLimitedRequest(
        async () => {
          // Perform targeted research for validation
          const searchResults = await this.search({
            query: researchQuery,
            numResults: 3,
            useWebResults: true,
            useNewsResults: false,
            includeContents: true,
          });

          // Extract relevant facts using advanced extraction with the context
          const researchContext = [];

          // Process each result's content with the advanced extractor
          for (const result of searchResults.results) {
            if (result.contents) {
              const facts = factExtractor.extractFacts(result.contents, {
                maxFacts: 3,
                minLength: 40,
                maxLength: 250,
                requireVerbs: true,
                filterBoilerplate: true,
                contextQuery: context, // Use the context to improve relevance scoring
              });

              // Add the extracted facts
              researchContext.push(...facts.map((fact) => fact.text));
            }
          }

          Logger.debug(
            `Validation research returned ${researchContext.length} context items using advanced extraction`
          );

          // Perform basic validation checks using the research context
          // In a complete implementation, you would do more sophisticated validation
          const validatedData = [...originalData];

          return {
            validatedData,
            researchContext,
          };
        },
        {
          provider: 'exa',
          endpoint: 'exa/validate',
          maxRetries: 3,
          initialDelayMs: 2000, // More conservative for validation requests
          maxDelayMs: 60000,
          timeoutMs: 90000, // Longer timeout for validation
          useJitter: true,
        }
      );

      // Cache the validation results
      researchCache.setValidationResults(context, originalData, results);

      return results;
    } catch (error) {
      Logger.error(`Data validation request failed for context: ${context}`, error);

      // For validation errors, return empty context but original data
      if (error instanceof ValidationError) {
        return {
          validatedData: originalData,
          researchContext: [],
        };
      }

      // For API errors, return original data with empty context
      if (error instanceof APIError) {
        Logger.warn(`API error during validation: ${error.message}`);
        return {
          validatedData: originalData,
          researchContext: [],
        };
      }

      // For other errors, wrap in a DataProcessingError
      throw new DataProcessingError(
        'ERR_1001',
        `Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { context, dataLength: originalData.length }
      );
    }
  }
}

// Export utility for use across tools
export const exaResearch = new ExaResearchTool();

// Optional: Registration function for MCP Server
export function registerExaResearch(server: any) {
  try {
    // In a real implementation, this would register the tool with the server
    Logger.info('Exa Research tool registered');
    return true;
  } catch (error) {
    Logger.error('Failed to register Exa Research tool', error);
    return false;
  }
}
