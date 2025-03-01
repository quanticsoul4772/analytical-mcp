import { z } from 'zod';
import fetch from 'node-fetch';

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

  constructor(config?: z.infer<typeof ExaConfigSchema>) {
    const parsedConfig = ExaConfigSchema.parse(config || {});
    this.apiKey = parsedConfig.apiKey || process.env.EXA_API_KEY || '';
    this.baseUrl = parsedConfig.baseUrl;

    if (!this.apiKey) {
      console.warn("No Exa API key provided. Some functionality may be limited.");
    }
  }

  // Perform a web search and research
  async search(query: z.infer<typeof ExaResearchQuerySchema>): Promise<ExaSearchResponse> {
    const parsedQuery = ExaResearchQuerySchema.parse(query);

    try {
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
        throw new Error(`Exa search failed: ${response.statusText}`);
      }

      const data = await response.json() as ExaSearchResponse;
      return data;
    } catch (error) {
      console.error("Exa research error:", error);
      throw new Error(`Exa search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract key facts from search results
  extractKeyFacts(results: ExaSearchResult[], maxFacts: number = 5): string[] {
    return results
      .flatMap(result => {
        const contentFacts = result.contents 
          ? this.findFactsInText(result.contents, 3) 
          : [];
        const titleFacts = this.findFactsInText(result.title, 2);
        return [...contentFacts, ...titleFacts];
      })
      .slice(0, maxFacts);
  }

  // Simple fact extraction
  private findFactsInText(text: string, maxFacts: number = 3): string[] {
    const sentences = text
      .split(/[.!?]/)
      .filter(s => 
        s.trim().length > 30 && 
        !s.toLowerCase().includes("disclaimer") &&
        !s.toLowerCase().includes("copyright")
      )
      .slice(0, maxFacts);

    return sentences.map(s => s.trim());
  }

  // Placeholder for MCP server registration
  registerTool(server: any): void {
    console.log("Exa Research tool registered");
  }
}

// Singleton instance
export const exaResearch = new ExaResearchTool();
