import { z } from 'zod';
import { exaResearch } from './exa_research.js';
import { Logger } from './logger.js';
import { ValidationError, DataProcessingError, APIError } from './errors.js';
import { factExtractor } from './advanced_fact_extraction.js';
import { rateLimitManager } from './rate_limit_manager.js';
import { researchCache, ResearchCacheNamespace } from './research_cache.js';

// Research integration utility for analytical tools
export class ResearchIntegrationTool {
  // Generic method to enrich analytical data with targeted research
  async enrichAnalyticalContext(
    originalData: any[],
    context: string,
    options: {
      numResults?: number;
      timeRangeMonths?: number;
      includeNewsResults?: boolean;
      prioritizeRecent?: boolean;
      confidenceThreshold?: number;
      enhancedExtraction?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<{
    enrichedData: any[];
    researchInsights: string[];
    confidence: number;
    sources?: string[];
    cacheHit?: boolean;
  }> {
    try {
      // Validate inputs
      if (!originalData || !Array.isArray(originalData)) {
        throw new ValidationError('Invalid data format: expected array', {
          providedType: typeof originalData,
        });
      }

      if (!context || typeof context !== 'string' || context.trim().length === 0) {
        throw new ValidationError('Context is required for research enrichment');
      }

      const {
        numResults = 5,
        timeRangeMonths = 6,
        includeNewsResults = false,
        prioritizeRecent = true,
        confidenceThreshold = 0.5,
        enhancedExtraction = true,
        skipCache = false,
      } = options;

      Logger.debug(`Enriching analytical context: ${context}`, {
        dataLength: originalData.length,
        options,
      });

      // Check cache if not explicitly skipped
      if (!skipCache) {
        const cachedResults = researchCache.getEnrichmentResults(context, originalData, options);
        if (cachedResults) {
          Logger.debug(`Cache hit for enrichment context: "${context}"`);
          return {
            ...cachedResults,
            cacheHit: true,
          };
        }
      }

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

          // Extract research insights using advanced fact extraction if enabled
          let researchInsights: string[] = [];
          let sources: string[] = [];

          if (enhancedExtraction) {
            // Extract and combine facts from all content
            const allExtractedFacts = [];

            for (const result of searchResults.results) {
              if (result.contents) {
                const extractedFacts = factExtractor.extractFacts(result.contents, {
                  maxFacts: 5,
                  minLength: 40,
                  maxLength: 200,
                  requireVerbs: true,
                  filterBoilerplate: true,
                  contextQuery: context, // Use context to improve relevance scoring
                  requireEntities: false,
                });

                // Add source URL to track where facts came from
                extractedFacts.push(
                  ...extractedFacts.map((fact) => ({
                    ...fact,
                    source: result.url,
                    publishedDate: result.publishedDate,
                  }))
                );

                allExtractedFacts.push(...extractedFacts);
              }
            }

            // Sort by quality score and optionally prioritize recent content
            const sortedFacts = [...allExtractedFacts].sort((a, b) => {
              // Prioritize recent content if enabled
              if (prioritizeRecent && a.publishedDate && b.publishedDate) {
                const dateA = new Date(a.publishedDate).getTime();
                const dateB = new Date(b.publishedDate).getTime();

                if (!isNaN(dateA) && !isNaN(dateB)) {
                  if (dateB - dateA > 0) return 1;
                  if (dateA - dateB > 0) return -1;
                }
              }

              // Otherwise sort by score
              return b.score - a.score;
            });

            // Take top insights and record sources
            researchInsights = sortedFacts.slice(0, numResults * 2).map((fact) => fact.text);

            sources = [
              ...new Set(
                sortedFacts
                  .slice(0, numResults * 2)
                  .map((fact) => fact.source)
                  .filter((source) => !!source)
              ),
            ];
          } else {
            // Fallback to standard extraction
            researchInsights = exaResearch.extractKeyFacts(searchResults.results);
            sources = searchResults.results.map((r) => r.url);
          }

          Logger.debug(
            `Extracted ${researchInsights.length} research insights using ${enhancedExtraction ? 'advanced' : 'standard'} extraction`
          );

          // Validate and enrich original data using the research
          const validationResult = await exaResearch.validateData(originalData, context);

          // Calculate confidence based on research corroboration and insight quality
          const baseConfidence =
            researchInsights.length > 0 ? Math.min(0.9, 0.5 + researchInsights.length * 0.1) : 0.5;

          // Adjust confidence based on source diversity
          const uniqueSourceBoost = Math.min(0.2, sources.length * 0.05);
          const confidence = Math.min(0.95, baseConfidence + uniqueSourceBoost);

          const results = {
            enrichedData: validationResult.validatedData,
            researchInsights,
            confidence,
            sources,
          };

          // Cache the results unless explicitly skipped
          if (!skipCache) {
            researchCache.setEnrichmentResults(context, originalData, options, results);
          }

          return results;
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

  // Method to perform cross-domain research for creative problem-solving
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
  ): Promise<{
    analogies: string[];
    potentialSolutions: string[];
    confidenceScores?: Record<string, number>;
    sources?: string[];
    cacheHit?: boolean;
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

      const {
        enhancedExtraction = true,
        maxAnalogiesPerDomain = 3,
        maxSolutionsPerAnalogy = 2,
        minConfidence = 0.6,
        skipCache = false,
      } = options;

      Logger.debug(`Finding cross-domain analogies for problem: ${problem}`, {
        domains,
        enhancedExtraction,
        maxAnalogiesPerDomain,
        maxSolutionsPerAnalogy,
      });

      // Check cache if not explicitly skipped
      if (!skipCache) {
        const cachedResults = researchCache.getCrossDomainResults(problem, domains);
        if (cachedResults) {
          Logger.debug(`Cache hit for cross-domain problem: "${problem}"`);
          return {
            ...cachedResults,
            cacheHit: true,
          };
        }
      }

      // Use rate limit manager to handle API requests with proper rate limiting
      return await rateLimitManager.executeRateLimitedRequest(
        async () => {
          const analogyResults: string[] = [];
          const potentialSolutions: string[] = [];
          const failedDomains: string[] = [];
          const confidenceScores: Record<string, number> = {};
          const sources: string[] = [];

          // Search across different domains
          for (const domain of domains) {
            try {
              const searchQuery = `${problem} analogies in ${domain} problem-solving`;
              Logger.debug(`Searching for analogies in domain: ${domain}`);

              const domainResults = await exaResearch.search({
                query: searchQuery,
                numResults: maxAnalogiesPerDomain + 1, // Request extra results to filter
                useWebResults: true,
                useNewsResults: false,
                includeContents: true,
              });

              // Use advanced fact extraction if enabled
              let domainInsights: string[] = [];

              if (enhancedExtraction) {
                // Extract high-quality facts using advanced extraction
                const allExtractedFacts = [];

                for (const result of domainResults.results) {
                  if (result.contents) {
                    const facts = factExtractor.extractFacts(result.contents, {
                      maxFacts: maxAnalogiesPerDomain,
                      minLength: 50,
                      maxLength: 250,
                      requireVerbs: true,
                      filterBoilerplate: true,
                      contextQuery: `${problem} ${domain}`, // Improve relevance scoring
                    });

                    // Add source information
                    allExtractedFacts.push(
                      ...facts.map((fact) => ({
                        ...fact,
                        source: result.url,
                        domain: domain,
                      }))
                    );

                    // Track sources
                    sources.push(result.url);
                  }
                }

                // Sort by quality score and take best insights
                const topFacts = allExtractedFacts
                  .sort((a, b) => b.score - a.score)
                  .slice(0, maxAnalogiesPerDomain);

                // Use text from top facts
                domainInsights = topFacts.map((fact) => fact.text);

                // Record confidence scores for each analogy
                topFacts.forEach((fact) => {
                  confidenceScores[fact.text] = fact.score;
                });
              } else {
                // Use standard extraction as fallback
                domainInsights = exaResearch.extractKeyFacts(
                  domainResults.results,
                  maxAnalogiesPerDomain
                );
              }

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
            // Filter analogies based on confidence threshold
            const highConfidenceAnalogies = analogyResults.filter(
              (analogy) => !confidenceScores[analogy] || confidenceScores[analogy] >= minConfidence
            );

            for (const analogy of highConfidenceAnalogies) {
              try {
                const solutionQuery = `How can this approach from ${analogy} be applied to solve: ${problem}`;

                const solutionResults = await exaResearch.search({
                  query: solutionQuery,
                  numResults: maxSolutionsPerAnalogy,
                  useWebResults: true,
                  useNewsResults: false,
                  includeContents: true,
                });

                // Use enhanced extraction for solutions if enabled
                let solutionInsights: string[] = [];

                if (enhancedExtraction) {
                  // Extract actionable solutions using advanced extraction
                  for (const result of solutionResults.results) {
                    if (result.contents) {
                      const facts = factExtractor.extractFacts(result.contents, {
                        maxFacts: maxSolutionsPerAnalogy,
                        minLength: 50,
                        maxLength: 300,
                        requireVerbs: true,
                        filterBoilerplate: true,
                        contextQuery: problem, // Improve relevance to original problem
                      });

                      solutionInsights.push(...facts.map((fact) => fact.text));

                      // Track sources
                      sources.push(result.url);
                    }
                  }
                } else {
                  // Use standard extraction as fallback
                  solutionInsights = exaResearch.extractKeyFacts(
                    solutionResults.results,
                    maxSolutionsPerAnalogy
                  );
                }

                potentialSolutions.push(...solutionInsights);
              } catch (error) {
                Logger.warn(
                  `Failed to generate solution from analogy: ${analogy.substring(0, 50)}...`,
                  error
                );
                // Continue with other analogies despite error
              }
            }
          }

          Logger.info(`Cross-domain research complete`, {
            analogiesFound: analogyResults.length,
            solutionsGenerated: potentialSolutions.length,
            failedDomains: failedDomains.length,
            sources: [...new Set(sources)].length,
          });

          const results = {
            analogies: analogyResults,
            potentialSolutions,
            confidenceScores:
              Object.keys(confidenceScores).length > 0 ? confidenceScores : undefined,
            sources: [...new Set(sources)],
          };

          // Cache the results unless explicitly skipped
          if (!skipCache) {
            researchCache.setCrossDomainResults(problem, domains, results);
          }

          return results;
        },
        {
          provider: 'exa',
          endpoint: 'exa/cross-domain',
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          timeoutMs: 120000, // Longer timeout for multi-domain research
          useJitter: true,
        }
      );
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
          potentialSolutions: [],
          sources: [],
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
