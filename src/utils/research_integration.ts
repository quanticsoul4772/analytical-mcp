import { z } from 'zod';
import { exaResearch } from './exa_research';

// Research integration utility for analytical tools
export class ResearchIntegrationTool {
  // Generic method to enrich analytical data with targeted research
  async enrichAnalyticalContext(
    originalData: any[], 
    context: string, 
    options: {
      numResults?: number, 
      timeRangeMonths?: number,
      includeNewsResults?: boolean
    } = {}
  ): Promise<{
    enrichedData: any[],
    researchInsights: string[],
    confidence: number
  }> {
    // Perform targeted research
    const searchResults = await exaResearch.search({
      query: context,
      numResults: options.numResults || 5,
      timeRangeMonths: options.timeRangeMonths || 6,
      useWebResults: true,
      useNewsResults: options.includeNewsResults || false,
      includeContents: true
    });

    // Extract key insights
    const researchInsights = exaResearch.extractKeyFacts(searchResults);

    // Validate and enrich original data
    const validationResult = await exaResearch.validateData(
      originalData, 
      context
    );

    // Calculate confidence based on research corroboration
    const confidence = researchInsights.length > 0 
      ? Math.min(0.9, 0.5 + (researchInsights.length * 0.1)) 
      : 0.5;

    return {
      enrichedData: validationResult.validatedData,
      researchInsights,
      confidence
    };
  }

  // Method to perform cross-domain research for creative problem-solving
  async findCrossdomainAnalogies(
    problem: string, 
    domains: string[] = ['technology', 'science', 'business']
  ): Promise<{
    analogies: string[],
    potentialSolutions: string[]
  }> {
    const analogyResults = [];
    const potentialSolutions = [];

    // Search across different domains
    for (const domain of domains) {
      const searchQuery = `${problem} analogies in ${domain} problem-solving`;
      const domainResults = await exaResearch.search({
        query: searchQuery,
        numResults: 3,
        includeContents: true
      });

      const domainInsights = exaResearch.extractKeyFacts(domainResults);
      analogyResults.push(...domainInsights);
    }

    // Generate potential solutions from analogies
    for (const analogy of analogyResults) {
      const solutionQuery = `How can this approach from ${analogy} be applied to solve the original problem?`;
      const solutionResults = await exaResearch.search({
        query: solutionQuery,
        numResults: 2,
        includeContents: true
      });

      const solutionInsights = exaResearch.extractKeyFacts(solutionResults);
      potentialSolutions.push(...solutionInsights);
    }

    return {
      analogies: analogyResults,
      potentialSolutions
    };
  }
}

// Singleton instance for easy import across tools
export const researchIntegration = new ResearchIntegrationTool();
