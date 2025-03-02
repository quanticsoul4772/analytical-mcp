import { z } from 'zod';
import { exaResearch } from './exa_research.js';
import { Logger } from './logger.js';
import { ValidationError, DataProcessingError, APIError } from './errors.js';

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
    try {
      // Validate inputs
      if (!originalData || !Array.isArray(originalData)) {
        throw new ValidationError('Invalid data format: expected array', {
          providedType: typeof originalData
        });
      }

      if (!context || typeof context !== 'string' || context.trim().length === 0) {
        throw new ValidationError('Context is required for research enrichment');
      }

      Logger.debug(`Enriching analytical context: ${context}`, { 
        dataLength: originalData.length,
        options
      });

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
      const researchInsights = exaResearch.extractKeyFacts(searchResults.results);
      Logger.debug(`Extracted ${researchInsights.length} research insights`);

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
          endpoint: error.endpoint
        });
        
        return {
          enrichedData: originalData,
          researchInsights: [],
          confidence: 0.1 // Low confidence due to API error
        };
      }
      
      // For other errors, wrap in DataProcessingError
      throw new DataProcessingError(
        `Failed to enrich analytical context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { context, dataLength: originalData?.length }
      );
    }
  }

  // Method to perform cross-domain research for creative problem-solving
  async findCrossdomainAnalogies(
    problem: string, 
    domains: string[] = ['technology', 'science', 'business']
  ): Promise<{
    analogies: string[],
    potentialSolutions: string[]
  }> {
    try {
      // Validate inputs
      if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
        throw new ValidationError('Problem statement is required for cross-domain research');
      }

      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        Logger.warn('No domains provided, using defaults');
        domains = ['technology', 'science', 'business'];
      }

      Logger.debug(`Finding cross-domain analogies for problem: ${problem}`, { domains });
      
      const analogyResults: string[] = [];
      const potentialSolutions: string[] = [];
      const failedDomains: string[] = [];

      // Search across different domains
      for (const domain of domains) {
        try {
          const searchQuery = `${problem} analogies in ${domain} problem-solving`;
          Logger.debug(`Searching for analogies in domain: ${domain}`);
          
          const domainResults = await exaResearch.search({
            query: searchQuery,
            numResults: 3,
            useWebResults: true,
            useNewsResults: false,
            includeContents: true
          });

          const domainInsights = exaResearch.extractKeyFacts(domainResults.results);
          if (domainInsights.length > 0) {
            analogyResults.push(...domainInsights);
            Logger.debug(`Found ${domainInsights.length} insights from ${domain} domain`);
          } else {
            Logger.debug(`No insights found from ${domain} domain`);
          }
        } catch (error) {
          Logger.warn(`Failed to get analogies for domain: ${domain}`, error);
          failedDomains.push(domain);
          // Continue with other domains despite error
        }
      }

      // Generate potential solutions from analogies
      // Only if we have some analogies to work with
      if (analogyResults.length > 0) {
        for (const analogy of analogyResults) {
          try {
            const solutionQuery = `How can this approach from ${analogy} be applied to solve the original problem?`;
            
            const solutionResults = await exaResearch.search({
              query: solutionQuery,
              numResults: 2,
              useWebResults: true,
              useNewsResults: false,
              includeContents: true
            });

            const solutionInsights = exaResearch.extractKeyFacts(solutionResults.results);
            potentialSolutions.push(...solutionInsights);
          } catch (error) {
            Logger.warn(`Failed to generate solution from analogy: ${analogy.substring(0, 50)}...`, error);
            // Continue with other analogies despite error
          }
        }
      }

      Logger.info(`Cross-domain research complete`, { 
        analogiesFound: analogyResults.length,
        solutionsGenerated: potentialSolutions.length,
        failedDomains: failedDomains.length
      });

      return {
        analogies: analogyResults,
        potentialSolutions
      };
    } catch (error) {
      Logger.error(`Error finding cross-domain analogies for problem: ${problem}`, error);
      
      // For validation errors, propagate
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // For API errors, provide partial results if any
      if (error instanceof APIError) {
        Logger.warn(`API error during cross-domain research: ${error.message}`);
        // Return empty arrays
        return {
          analogies: [],
          potentialSolutions: []
        };
      }
      
      // For other errors, wrap in DataProcessingError
      throw new DataProcessingError(
        `Failed to find cross-domain analogies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { problem, domains }
      );
    }
  }
}

// Singleton instance for easy import across tools
export const researchIntegration = new ResearchIntegrationTool();
