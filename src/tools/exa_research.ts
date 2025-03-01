import { z } from "zod";
import { brave_web_search } from "@modelcontextprotocol/sdk";
import fetch from 'node-fetch';

// Exa API configuration
const EXA_API_BASE = 'https://api.exa.ai';
const EXA_API_KEY = process.env.EXA_API_KEY || '';

// Schema for Exa search tool
export const exaResearchSchema = z.object({
  query: z.string().describe("Search query to find relevant information"),
  searchType: z.enum([
    "current_events", 
    "fact_check", 
    "research_context", 
    "data_validation", 
    "trend_analysis"
  ]).default("research_context"),
  numResults: z.number().min(1).max(10).default(5)
    .describe("Number of search results to return"),
  useAdvancedFilters: z.boolean().default(false)
    .describe("Apply advanced search filters for more precise results")
});

// Exa search utility function
async function performExaSearch(
  query: string, 
  searchType: string, 
  numResults: number = 5, 
  useAdvancedFilters: boolean = false
) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EXA_API_KEY}`
    };

    const payload = {
      query,
      numResults,
      ...(useAdvancedFilters ? {
        startPublishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        onlyPublishers: ['reputable news sources', 'academic publications'],
        useAutomaticQueryRefiner: true
      } : {})
    };

    const response = await fetch(`${EXA_API_BASE}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Exa API error: ${response.statusText}`);
    }

    const searchResults = await response.json();

    // Process results based on search type
    switch (searchType) {
      case "current_events":
        return {
          type: "current_events",
          results: searchResults.results.map(result => ({
            title: result.title,
            publishedDate: result.publishedDate,
            url: result.url,
            snippet: result.snippet
          }))
        };

      case "fact_check":
        return {
          type: "fact_check",
          results: searchResults.results.map(result => ({
            claim: query,
            source: result.url,
            context: result.snippet,
            credibility: result.relevanceScore > 0.7 ? "high" : "moderate"
          }))
        };

      case "research_context":
        return {
          type: "research_context",
          results: searchResults.results.map(result => ({
            topic: query,
            context: result.snippet,
            source: result.url,
            relevance: result.relevanceScore
          }))
        };

      case "data_validation":
        return {
          type: "data_validation",
          results: searchResults.results.map(result => ({
            claim: query,
            validationSources: result.url,
            context: result.snippet,
            evidenceStrength: result.relevanceScore > 0.7 ? "strong" : "weak"
          }))
        };

      case "trend_analysis":
        return {
          type: "trend_analysis",
          results: searchResults.results.map(result => ({
            trend: query,
            timeframe: result.publishedDate,
            context: result.snippet,
            source: result.url
          }))
        };

      default:
        return searchResults.results;
    }
  } catch (error) {
    console.error("Exa Search Error:", error);
    throw new Error(`Exa search failed: ${error.message}`);
  }
}

// Main Exa Research Tool
export async function exaResearch(
  query: string, 
  searchType: string = "research_context", 
  numResults: number = 5, 
  useAdvancedFilters: boolean = false
) {
  try {
    const searchResults = await performExaSearch(
      query, 
      searchType, 
      numResults, 
      useAdvancedFilters
    );

    return {
      content: [
        {
          type: "text",
          text: `Exa Research Results for "${query}":\n\n` + 
            searchResults.results.map(result => 
              `• ${result.title || result.topic || 'Source'}: ${result.snippet || result.context}\nSource: ${result.url}\n`
            ).join('\n')
        }
      ],
      metadata: searchResults
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error performing Exa research: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

// Register the Exa Research tool with the MCP server
export function registerExaResearch(server: McpServer) {
  server.tool(
    "exa_research",
    exaResearchSchema,
    exaResearch
  );
}
