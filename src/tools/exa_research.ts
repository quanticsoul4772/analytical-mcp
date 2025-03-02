import { z } from 'zod';
import fetch from 'node-fetch';
import { Logger } from '../utils/logger.js';
import { APIError, ValidationError, DataProcessingError } from '../utils/errors.js';
import { executeApiRequest, RETRYABLE_STATUS_CODES } from '../utils/api_helpers.js';
import { config, isFeatureEnabled } from '../utils/config.js';

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

// Precise typing for Exa search results
interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  contents?: string;
  score?: number;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
}

// Exa research utility class
export class ExaResearchTool {
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
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        Logger.error('Invalid Exa configuration', error);
        throw new ValidationError(`Invalid Exa configuration: ${error.message}`, {
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  // Perform a web search and research
  async search(query: z.infer<typeof ExaResearchQuerySchema>): Promise<ExaSearchResponse> {
    // Check if research integration is enabled
    if (!isFeatureEnabled('researchIntegration')) {
      Logger.warn(
        'Research integration is disabled. Enable it with ENABLE_RESEARCH_INTEGRATION=true'
      );
      throw new APIError(
        'Research integration is disabled in configuration',
        403,
        false,
        'exa/search'
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
        throw new ValidationError(`Invalid search query: ${error.message}`, {
          issues: error.issues,
          query,
        });
      }
      throw error;
    }

    if (!this.apiKey) {
      Logger.error('Missing API key for Exa search');
      throw new APIError('Cannot perform search: Missing API key', 401, false, 'exa/search');
    }

    try {
      return await executeApiRequest(
        async () => {
          const response = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
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
              `Exa search failed: ${response.statusText}`,
              response.status,
              RETRYABLE_STATUS_CODES.includes(response.status),
              'exa/search'
            );
          }

          const data = (await response.json()) as ExaSearchResponse;
          Logger.debug(`Exa search returned ${data.results.length} results`);
          return data;
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          maxDelay: 10000,
          context: `Exa search for "${parsedQuery.query}"`,
          endpoint: 'exa/search',
        }
      );
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
        `Exa search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        false,
        'exa/search'
      );
    }
  }

  // Extract key facts from search results
  extractKeyFacts(results: ExaSearchResult[], maxFacts: number = 5): string[] {
    try {
      if (!results || !Array.isArray(results)) {
        Logger.warn('Invalid search results provided to extractKeyFacts', { results });
        return [];
      }

      const facts = results
        .flatMap((result) => {
          const contentFacts = result.contents ? this.findFactsInText(result.contents, 3) : [];
          const titleFacts = this.findFactsInText(result.title, 2);
          return [...contentFacts, ...titleFacts];
        })
        .slice(0, maxFacts);

      Logger.debug(`Extracted ${facts.length} facts from search results`);
      return facts;
    } catch (error) {
      Logger.error('Error extracting facts from search results', error);
      throw new DataProcessingError(
        `Failed to extract facts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { resultsCount: results?.length }
      );
    }
  }

  // Simple fact extraction
  private findFactsInText(text: string, maxFacts: number = 3): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    try {
      const sentences = text
        .split(/[.!?]/)
        .filter(
          (s) =>
            s.trim().length > 30 &&
            !s.toLowerCase().includes('disclaimer') &&
            !s.toLowerCase().includes('copyright')
        )
        .slice(0, maxFacts);

      return sentences.map((s) => s.trim());
    } catch (error) {
      Logger.warn('Error finding facts in text', { error, textLength: text.length });
      return [];
    }
  }

  // Placeholder for MCP server registration
  registerTool(server: any): void {
    Logger.info('Exa Research tool registered');
  }
}

// Singleton instance
export const exaResearch = new ExaResearchTool();
