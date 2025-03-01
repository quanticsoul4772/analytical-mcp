import { z } from "zod";

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
    const parsedConfig = ExaConfigSchema.parse(config || {});
    this.apiKey = parsedConfig.apiKey || process.env.EXA_API_KEY || '';
    this.baseUrl = parsedConfig.baseUrl;

    if (!this.apiKey) {
      console.warn("No Exa API key provided. Some functionality may be limited.");
    }
  }

  // Perform a web search and research
  async search(query: z.infer<typeof ExaResearchQuerySchema>): Promise<ExaSearchResult[]> {
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

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Exa research error:", error);
      return [];
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

  // Simple fact extraction (can be enhanced with NLP later)
  private findFactsInText(text: string, maxFacts: number = 3): string[] {
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
    const researchQuery = `Validate and provide context for: ${context}`;
    const searchResults = await this.search({ 
      query: researchQuery, 
      numResults: 3,
      includeContents: true 
    });

    const researchContext = this.extractKeyFacts(searchResults);

    // In a real implementation, you might do more sophisticated validation
    return {
      validatedData: originalData,
      researchContext
    };
  }
}

// Export utility for use across tools
export const exaResearch = new ExaResearchTool();
