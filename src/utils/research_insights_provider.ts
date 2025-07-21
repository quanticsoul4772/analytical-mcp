/**
 * Research Insights Provider
 * 
 * Handles extraction and processing of research insights from search results.
 * Provides focused insight extraction logic with validation patterns.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { exaResearch } from './exa_research.js';
import { factExtractor } from './advanced_fact_extraction.js';
import type { ExtractedFact } from './advanced_fact_extraction.js';

/**
 * Research insights extraction result
 */
export interface InsightsExtractionResult {
  insights: string[];
  sources: string[];
}

/**
 * Research Insights Provider
 * Manages extraction and processing of research insights
 */
export class ResearchInsightsProvider {

  /**
   * Extract research insights from search results
   */
  async extractResearchInsights(
    searchResults: any,
    context: string,
    enhancedExtraction: boolean,
    prioritizeRecent: boolean,
    numResults: number
  ): Promise<InsightsExtractionResult> {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context));
    
    if (!searchResults || !searchResults.results) {
      Logger.warn('Invalid search results provided for insight extraction');
      return { insights: [], sources: [] };
    }

    let researchInsights: string[] = [];
    let sources: string[] = [];

    if (!enhancedExtraction) {
      // Early return for standard extraction
      return {
        insights: exaResearch.extractKeyFacts(searchResults.results),
        sources: searchResults.results.map((r: any) => r.url).filter(Boolean)
      };
    }

    // Enhanced extraction with fact processing
    const allExtractedFacts: ExtractedFact[] = [];

    for (const result of searchResults.results) {
      if (!result.contents) continue;

      try {
        const extractedFacts = factExtractor.extractFacts(result.contents, {
          maxFacts: 5,
          minLength: 40,
          maxLength: 200,
          requireVerbs: true,
          filterBoilerplate: true,
          contextQuery: context,
          requireEntities: false,
        });

        // Add source information to facts
        allExtractedFacts.push(
          ...extractedFacts.map((fact) => ({
            ...fact,
            source: result.url,
            publishedDate: result.publishedDate,
          }))
        );
      } catch (error) {
        Logger.warn('Failed to extract facts from result', { url: result.url, error });
      }
    }

    // Sort and filter facts based on quality and recency
    const sortedFacts = this.sortFactsByQualityAndRecency(allExtractedFacts, prioritizeRecent);
    const topFacts = sortedFacts.slice(0, numResults * 2);

    Logger.debug('Extracted and processed research insights', {
      totalFacts: allExtractedFacts.length,
      topFactsCount: topFacts.length,
      enhancedExtraction,
      prioritizeRecent
    });

    return {
      insights: topFacts.map((fact) => fact.text),
      sources: [...new Set(topFacts.map((fact) => fact.source).filter(Boolean))]
    };
  }

  /**
   * Sort facts by quality and optionally prioritize recent content
   */
  sortFactsByQualityAndRecency(facts: ExtractedFact[], prioritizeRecent: boolean): ExtractedFact[] {
    if (!Array.isArray(facts)) {
      Logger.warn('Invalid facts array provided for sorting');
      return [];
    }

    return [...facts].sort((a, b) => {
      // Early return prioritization for recent content
      if (prioritizeRecent && a.publishedDate && b.publishedDate) {
        const dateA = new Date(a.publishedDate).getTime();
        const dateB = new Date(b.publishedDate).getTime();

        if (!isNaN(dateA) && !isNaN(dateB)) {
          const dateDiff = dateB - dateA;
          if (dateDiff !== 0) {
            return dateDiff > 0 ? 1 : -1;
          }
        }
      }

      // Default sort by quality score
      return (b.score || 0) - (a.score || 0);
    });
  }

  /**
   * Filter insights by quality and relevance
   */
  filterInsightsByQuality(
    insights: string[],
    minLength: number = 40,
    maxLength: number = 300
  ): string[] {
    if (!Array.isArray(insights)) {
      Logger.warn('Invalid insights array provided for filtering');
      return [];
    }

    return insights.filter(insight => {
      if (typeof insight !== 'string') return false;
      
      const length = insight.trim().length;
      return length >= minLength && length <= maxLength;
    });
  }

  /**
   * Deduplicate similar insights
   */
  deduplicateInsights(insights: string[], similarityThreshold: number = 0.8): string[] {
    if (!Array.isArray(insights)) {
      Logger.warn('Invalid insights array provided for deduplication');
      return [];
    }

    const uniqueInsights: string[] = [];
    
    for (const insight of insights) {
      if (typeof insight !== 'string') continue;
      
      const isDuplicate = uniqueInsights.some(existing => {
        const similarity = this.calculateTextSimilarity(insight, existing);
        return similarity >= similarityThreshold;
      });
      
      if (!isDuplicate) {
        uniqueInsights.push(insight);
      }
    }

    Logger.debug('Deduplicated insights', {
      originalCount: insights.length,
      uniqueCount: uniqueInsights.length,
      similarityThreshold
    });

    return uniqueInsights;
  }

  /**
   * Calculate simple text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Extract key themes from insights
   */
  extractKeyThemes(insights: string[]): string[] {
    if (!Array.isArray(insights)) {
      Logger.warn('Invalid insights array provided for theme extraction');
      return [];
    }

    // Simple theme extraction based on common words
    const wordCounts = new Map<string, number>();
    
    for (const insight of insights) {
      if (typeof insight !== 'string') continue;
      
      const words = insight.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|way|who|boy|did|has|let|put|say|she|too|use)$/.test(word));
      
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Return top themes
    const themes = Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    Logger.debug('Extracted key themes', { themesCount: themes.length });
    
    return themes;
  }
}
