import { z } from 'zod';
import fetch from 'node-fetch';
import { executeApiRequest, RETRYABLE_STATUS_CODES } from './api_helpers.js';
import { APIError, ValidationError, DataProcessingError } from './errors.js';
import { Logger } from './logger.js';

// Exa client configuration schema
const ExaConfigSchema = z.object({
  apiKey: z.string().optional().describe("Exa API key for authentication"),
  baseUrl: z.string().default("https://api.exa.ai").describe("Base URL for Exa API")
});

// Research query input schema
const ExaResearchQuerySchema = z.object({
  query: z.string().describe("Search query for research"),
  numResults: z.number().min(1).max(10).default(5).describe("Number of search results"),
  timeRangeMonths: z.number().min(1).max(36).optional().describe("Time range for results in months"),
  useWebResults: z.boolean().default(true).describe("Include web search results"),
  useNewsResults: z.boolean().default(false).describe("Include news results"),
  includeContents: z.boolean().default(true).describe("Include full content of search results")
});

// Exa search result type
interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  contents?: string;
  score?: number;
}

// Exa research utility class
class ExaResearchTool {
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: z.infer<typeof ExaConfigSchema>) {
    try {
      const parsedConfig = ExaConfigSchema.parse(config || {});
      this.apiKey = parsedConfig.apiKey || process.env.EXA_API_KEY || '';
      this.baseUrl = parsedConfig.baseUrl;

      if (!this.apiKey) {
        Logger.warn("No Exa API key provided. API functionality will be limited.");
      } else {
        Logger.debug("Exa research tool initialized", { baseUrl: this.baseUrl });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Invalid Exa configuration: ${error.message}`, {
          issues: error.issues
        });
      }
      throw error;
    }
  }

  // Perform a web search and research
  async search(query: z.infer<typeof ExaResearchQuerySchema>): Promise<{ results: ExaSearchResult[] }> {
    let parsedQuery: z.infer<typeof ExaResearchQuerySchema>;

    try {
      parsedQuery = ExaResearchQuerySchema.parse(query);
      Logger.debug(`Executing Exa search for: "${parsedQuery.query}"`, {
        numResults: parsedQuery.numResults,
        useWebResults: parsedQuery.useWebResults,
        useNewsResults: parsedQuery.useNewsResults
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        Logger.error('Search query validation failed', error);
        throw new ValidationError(`Invalid search query: ${error.message}`, {
          issues: error.issues,
          query
        });
      }
      throw error;
    }

    if (!this.apiKey) {
      Logger.error('Missing API key for Exa search');
      throw new APIError('Cannot perform search: Missing API key', 401, false, 'exa/search');
    }

    try {
      return await executeApiRequest(async () => {
        const response = await fetch(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            query: parsedQuery.query,
            numResults: parsedQuery.numResults,
            timeRange: parsedQuery.timeRangeMonths 
              ? `${parsedQuery.timeRangeMonths}m` 
              : undefined,
            useWebResults: parsedQuery.useWebResults,
            useNewsResults: parsedQuery.useNewsResults,
            includeContents: parsedQuery.includeContents
          })
        });

        if (!response.ok) {
          throw new APIError(
            `Exa search failed: ${response.statusText}`,
            response.status,
            RETRYABLE_STATUS_CODES.includes(response.status),
            'exa/search'
          );
        }

        const data = await response.json() as { results: ExaSearchResult[] };
        Logger.debug(`Exa search returned ${data.results.length} results`);
        return data;
      }, {
        maxRetries: 3,
        initialDelay: 500,
        maxDelay: 10000,
        context: `Exa search for "${parsedQuery.query}"`,
        endpoint: 'exa/search'
      });
    } catch (error) {
      // Log and rethrow the error with better context
      Logger.error('Exa search operation failed', error, {
        query: parsedQuery.query,
        numResults: parsedQuery.numResults
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
        .flatMap(result => {
          const contentFacts = result.contents 
            ? this.findFactsInText(result.contents, 3) 
            : [];
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

  // Simple fact extraction (can be enhanced with NLP later)
  private findFactsInText(text: string, maxFacts: number = 3): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    try {
      // Basic fact extraction - could be replaced with more sophisticated NLP
      const sentences = text
        .split(/[.!?]/)
        .filter(s => 
          s.trim().length > 30 && 
          !s.toLowerCase().includes("disclaimer") &&
          !s.toLowerCase().includes("copyright")
        )
        .slice(0, maxFacts);

      return sentences.map(s => s.trim());
    } catch (error) {
      Logger.warn('Error finding facts in text', { error, textLength: text.length });
      return [];
    }
  }

  // Validate or supplement data with research
  async validateData(
    originalData: any[], 
    context: string, 
    fieldsToValidate?: string[]
  ): Promise<{ 
    validatedData: any[], 
    researchContext: string[] 
  }> {
    Logger.debug(`Validating data with research context: ${context}`, { 
      dataLength: originalData?.length,
      fieldsToValidate
    });
    
    if (!originalData || !Array.isArray(originalData)) {
      Logger.warn('Invalid data provided for validation', { originalData });
      throw new ValidationError('Invalid data format for validation: expected array', {
        providedType: typeof originalData
      });
    }

    if (!context || typeof context !== 'string' || context.trim().length === 0) {
      Logger.warn('Invalid context provided for validation');
      throw new ValidationError('Empty or invalid context for validation');
    }
    
    const researchQuery = `Validate and provide context for: ${context}`;
    
    try {
      // Perform targeted research for validation
      const searchResults = await this.search({ 
        query: researchQuery, 
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true 
      });

      // Extract relevant facts as research context
      const researchContext = this.extractKeyFacts(searchResults.results);
      Logger.debug(`Validation research returned ${researchContext.length} context items`);

      // In a real implementation, you might do more sophisticated validation
      // against the research context
      return {
        validatedData: originalData,
        researchContext
      };
    } catch (error) {
      Logger.error(`Data validation request failed for context: ${context}`, error);
      
      // For validation errors, return empty context but original data
      if (error instanceof ValidationError) {
        return {
          validatedData: originalData,
          researchContext: []
        };
      }
      
      // For API errors, return original data with empty context
      if (error instanceof APIError) {
        Logger.warn(`API error during validation: ${error.message}`, {
          status: error.status,
          endpoint: error.endpoint
        });
        return {
          validatedData: originalData,
          researchContext: []
        };
      }
      
      // For other errors, wrap in a DataProcessingError
      throw new DataProcessingError(
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
    Logger.info("Exa Research tool registered");
    return true;
  } catch (error) {
    Logger.error("Failed to register Exa Research tool", error);
    return false;
  }
}
