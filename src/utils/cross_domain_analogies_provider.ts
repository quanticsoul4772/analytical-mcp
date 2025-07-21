/**
 * Cross Domain Analogies Provider
 * 
 * Handles cross-domain analogy research and solution generation.
 * Provides focused analogy research logic with validation patterns.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { ValidationError } from './errors.js';
import { exaResearch } from './exa_research.js';
import { factExtractor } from './advanced_fact_extraction.js';
import type { ExtractedFact } from './advanced_fact_extraction.js';

/**
 * Cross-domain analogy research result
 */
export interface CrossDomainAnalogyResult {
  analogies: string[];
  potentialSolutions: string[];
  confidenceScores?: Record<string, number>;
  sources?: string[];
  cacheHit?: boolean;
}

/**
 * Domain processing result
 */
export interface DomainProcessingResult {
  insights: string[];
  sources: string[];
  confidenceScores: Record<string, number>;
}

/**
 * Cross Domain Analogies Provider
 * Manages cross-domain analogy research and solution generation
 */
export class CrossDomainAnalogiesProvider {

  /**
   * Find cross-domain analogies for a problem
   */
  async findCrossdomainAnalogies(
    problem: string,
    domains: string[] = ['technology', 'science', 'business'],
    options: {
      enhancedExtraction?: boolean;
      maxAnalogiesPerDomain?: number;
      maxSolutionsPerAnalogy?: number;
      minConfidence?: number;
    } = {}
  ): Promise<Omit<CrossDomainAnalogyResult, 'cacheHit'>> {
    // Apply early return validation patterns
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(problem));

    // Early return for invalid domains with default assignment
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      Logger.warn('No domains provided, using defaults');
      domains = ['technology', 'science', 'business'];
    }

    const {
      enhancedExtraction = true,
      maxAnalogiesPerDomain = 3,
      maxSolutionsPerAnalogy = 2,
      minConfidence = 0.6,
    } = options;

    Logger.debug(`Finding cross-domain analogies for problem: ${problem}`, {
      domains,
      enhancedExtraction,
      maxAnalogiesPerDomain,
      maxSolutionsPerAnalogy,
    });

    const analogyResults: string[] = [];
    const failedDomains: string[] = [];
    const allSources: string[] = [];
    const combinedConfidenceScores: Record<string, number> = {};

    // Process each domain for analogies
    for (const domain of domains) {
      try {
        const domainResult = await this.processDomainForAnalogies(
          domain,
          problem,
          maxAnalogiesPerDomain,
          enhancedExtraction
        );

        analogyResults.push(...domainResult.insights);
        allSources.push(...domainResult.sources);
        Object.assign(combinedConfidenceScores, domainResult.confidenceScores);

        Logger.debug(`Processed domain ${domain}`, {
          insightsCount: domainResult.insights.length,
          sourcesCount: domainResult.sources.length
        });
      } catch (error) {
        Logger.error(`Failed to process domain: ${domain}`, error);
        failedDomains.push(domain);
      }
    }

    if (analogyResults.length === 0) {
      Logger.warn('No analogies found across all domains');
      return {
        analogies: [],
        potentialSolutions: [],
        confidenceScores: {},
        sources: []
      };
    }

    // Generate solutions from analogies
    const solutionResults = await this.generateSolutionsFromAnalogies(
      analogyResults,
      problem,
      maxSolutionsPerAnalogy,
      minConfidence,
      combinedConfidenceScores,
      enhancedExtraction
    );

    return {
      analogies: analogyResults,
      potentialSolutions: solutionResults.solutions,
      confidenceScores: combinedConfidenceScores,
      sources: [...new Set([...allSources, ...solutionResults.sources])]
    };
  }

  /**
   * Process a specific domain for analogies
   */
  async processDomainForAnalogies(
    domain: string,
    problem: string,
    maxAnalogiesPerDomain: number,
    enhancedExtraction: boolean
  ): Promise<DomainProcessingResult> {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(domain));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(problem));

    const searchQuery = `${problem} analogies in ${domain} problem-solving`;
    Logger.debug(`Searching for analogies in domain: ${domain}`);

    const domainResults = await exaResearch.search({
      query: searchQuery,
      numResults: maxAnalogiesPerDomain + 1,
      useWebResults: true,
      useNewsResults: false,
      includeContents: true,
    });

    const sources: string[] = [];
    const confidenceScores: Record<string, number> = {};

    if (!enhancedExtraction) {
      // Early return for standard extraction
      return {
        insights: exaResearch.extractKeyFacts(domainResults.results, maxAnalogiesPerDomain),
        sources: domainResults.results.map((r: any) => r.url).filter(Boolean),
        confidenceScores
      };
    }

    // Enhanced extraction with fact processing
    const allExtractedFacts: ExtractedFact[] = [];

    for (const result of domainResults.results) {
      if (!result.contents) continue;

      try {
        const facts = factExtractor.extractFacts(result.contents, {
          maxFacts: maxAnalogiesPerDomain,
          minLength: 50,
          maxLength: 250,
          requireVerbs: true,
          filterBoilerplate: true,
          contextQuery: `${problem} ${domain}`,
        });

        allExtractedFacts.push(
          ...facts.map((fact) => ({
            ...fact,
            source: result.url,
            domain: domain,
          }))
        );

        sources.push(result.url);
      } catch (error) {
        Logger.warn('Failed to extract facts from domain result', { domain, error });
      }
    }

    // Sort by quality score and take best insights
    const topFacts = allExtractedFacts
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, maxAnalogiesPerDomain);

    // Record confidence scores for each analogy
    topFacts.forEach((fact) => {
      confidenceScores[fact.text] = fact.score || 0.5;
    });

    Logger.debug(`Processed domain ${domain}`, {
      totalFacts: allExtractedFacts.length,
      topFacts: topFacts.length,
      sourcesCount: sources.length
    });

    return {
      insights: topFacts.map((fact) => fact.text),
      sources,
      confidenceScores
    };
  }

  /**
   * Generate solutions from analogies
   */
  async generateSolutionsFromAnalogies(
    analogies: string[],
    problem: string,
    maxSolutionsPerAnalogy: number,
    minConfidence: number,
    confidenceScores: Record<string, number>,
    enhancedExtraction: boolean
  ): Promise<{ solutions: string[]; sources: string[]; }> {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(problem));
    
    if (!Array.isArray(analogies)) {
      Logger.warn('Invalid analogies array provided for solution generation');
      return { solutions: [], sources: [] };
    }

    const potentialSolutions: string[] = [];
    const sources: string[] = [];

    // Filter analogies based on confidence threshold
    const highConfidenceAnalogies = analogies.filter(
      (analogy) => !confidenceScores[analogy] || confidenceScores[analogy] >= minConfidence
    );

    Logger.debug('Generating solutions from analogies', {
      totalAnalogies: analogies.length,
      highConfidenceCount: highConfidenceAnalogies.length,
      minConfidence
    });

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

        if (!enhancedExtraction) {
          // Standard extraction fallback
          const solutionInsights = exaResearch.extractKeyFacts(
            solutionResults.results,
            maxSolutionsPerAnalogy
          );
          potentialSolutions.push(...solutionInsights);
          sources.push(...solutionResults.results.map((r: any) => r.url).filter(Boolean));
          continue;
        }

        // Enhanced extraction for solutions
        for (const result of solutionResults.results) {
          if (!result.contents) continue;

          try {
            const facts = factExtractor.extractFacts(result.contents, {
              maxFacts: maxSolutionsPerAnalogy,
              minLength: 50,
              maxLength: 300,
              requireVerbs: true,
              filterBoilerplate: true,
              contextQuery: problem,
            });

            potentialSolutions.push(...facts.map((fact) => fact.text));
            sources.push(result.url);
          } catch (error) {
            Logger.warn('Failed to extract facts from solution result', { error });
          }
        }
      } catch (error) {
        Logger.warn(
          `Failed to generate solution from analogy: ${analogy.substring(0, 50)}...`,
          error
        );
        // Continue with other analogies despite error
      }
    }

    Logger.debug('Generated solutions from analogies', {
      solutionsCount: potentialSolutions.length,
      sourcesCount: sources.length
    });

    return {
      solutions: potentialSolutions,
      sources
    };
  }

  /**
   * Validate analogy domains
   */
  validateDomains(domains: string[]): string[] {
    if (!Array.isArray(domains)) {
      Logger.warn('Invalid domains provided, using defaults');
      return ['technology', 'science', 'business'];
    }

    const validDomains = domains.filter(domain => 
      typeof domain === 'string' && domain.trim().length > 0
    );

    if (validDomains.length === 0) {
      Logger.warn('No valid domains provided, using defaults');
      return ['technology', 'science', 'business'];
    }

    return validDomains;
  }

  /**
   * Filter analogies by quality score
   */
  filterAnalogisByQuality(
    analogies: string[],
    confidenceScores: Record<string, number>,
    minScore: number = 0.5
  ): string[] {
    if (!Array.isArray(analogies)) {
      return [];
    }

    return analogies.filter(analogy => {
      const score = confidenceScores[analogy];
      return score === undefined || score >= minScore;
    });
  }
}
