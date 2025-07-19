/**
 * Advanced Fact Extraction Utility
 *
 * Provides sophisticated text analysis for extracting high-quality facts from research content.
 */

import { Logger } from './logger.js';

// Types for fact extraction
export interface ExtractedFact {
  text: string;
  score: number;
  entities?: string[];
  source?: string;
  publishedDate?: string;
}

export interface FactExtractionOptions {
  maxFacts?: number;
  minLength?: number;
  maxLength?: number;
  requireVerbs?: boolean;
  requireEntities?: boolean;
  filterBoilerplate?: boolean;
  contextQuery?: string;
}

/**
 * Advanced fact extraction utility class
 */
export class FactExtractor {
  // Common verbs that indicate factual statements
  private static FACT_VERBS = [
    'is',
    'are',
    'was',
    'were',
    'has',
    'have',
    'had',
    'increased',
    'decreased',
    'grew',
    'expanded',
    'reduced',
    'showed',
    'demonstrated',
    'revealed',
    'concluded',
    'found',
    'indicates',
    'suggests',
    'proves',
    'confirms',
    'established',
  ];

  // Words that often indicate important factual statements
  private static IMPORTANCE_MARKERS = [
    'significant',
    'important',
    'critical',
    'essential',
    'key',
    'primarily',
    'major',
    'fundamental',
    'notably',
    'substantially',
    'dramatically',
    'consistently',
    'effectively',
    'particularly',
    'specifically',
    'notably',
    'remarkably',
  ];

  // Patterns to detect boilerplate text
  private static BOILERPLATE_PATTERNS = [
    /copyright|all rights reserved|terms of (use|service)/i,
    /privacy policy|cookie policy|gdpr|ccpa/i,
    /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/,
    /click here|read more|learn more|sign up|subscribe/i,
    /follow us on|connect with us|contact us|email us/i,
  ];

  // Entity patterns (simplified - in production would use a proper NLP library)
  private static ENTITY_PATTERNS = {
    ORGANIZATION: /\b[A-Z][a-z]*([ ][A-Z][a-z]*)+\b/,
    PERCENTAGE: /\b\d+(\.\d+)?[ ]?(%|percent)\b/,
    MONEY: /\$\d+(\.\d+)?([ ]?(million|billion|trillion))?\b/,
    DATE: /\b(January|February|March|April|May|June|July|August|September|October|November|December)[ ]\d{1,2}(,[ ]\d{4})?\b/,
    NUMERIC: /\b\d+(\.\d+)?[ ]?(million|billion|trillion|thousand|hundred|dozen)?\b/,
  };

  /**
   * Extract high-quality facts from text with sophisticated filtering and scoring
   */
  extractFacts(text: string, options: FactExtractionOptions = {}): ExtractedFact[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const {
      maxFacts = 5,
      minLength = 40,
      maxLength = 200,
      requireVerbs = true,
      requireEntities = false,
      filterBoilerplate = true,
      contextQuery = '',
    } = options;

    try {
      Logger.debug(`Extracting facts from text with advanced methods`, {
        textLength: text.length,
        maxFacts,
        requireVerbs,
        requireEntities,
      });

      // Split text into sentences
      const sentences = this.tokenizeSentences(text);

      // Initial filtering based on basic criteria
      const filteredSentences = sentences.filter((sentence) => {
        const trimmed = sentence.trim();

        // Length check
        if (trimmed.length < minLength || trimmed.length > maxLength) {
          return false;
        }

        // Boilerplate check
        if (filterBoilerplate && this.isBoilerplate(trimmed)) {
          return false;
        }

        // Verb check
        if (requireVerbs && !this.containsFactVerb(trimmed)) {
          return false;
        }

        // Entity check
        if (requireEntities && !this.containsEntity(trimmed)) {
          return false;
        }

        return true;
      });

      // Score and rank the sentences
      const scoredSentences = filteredSentences.map((sentence) => {
        const entities = this.extractEntities(sentence);
        const score = this.scoreFactualSentence(sentence, contextQuery, entities);

        return {
          text: sentence.trim(),
          score,
          entities: entities.length > 0 ? entities : undefined,
        };
      });

      // Sort by score and take the top N
      const topFacts = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, maxFacts) as ExtractedFact[];

      Logger.debug(`Extracted ${topFacts.length} high-quality facts from text`);
      return topFacts;
    } catch (error) {
      Logger.warn('Error in advanced fact extraction', { error, textLength: text.length });
      return [];
    }
  }

  /**
   * Split text into sentences with smart handling of abbreviations and edge cases
   */
  private tokenizeSentences(text: string): string[] {
    // Handle common abbreviations to avoid incorrect sentence splitting
    const prepared = text.replace(
      /(\s|^)(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|St\.|e\.g\.|i\.e\.|etc\.)(\s|$)/g,
      (match) => match.replace('.', '<<DOT>>')
    );

    // Split on sentence boundaries
    const rough = prepared.split(/(?<=[.!?])\s+/);

    // Restore abbreviation dots and clean up
    return rough.map((s) => s.replace(/<<DOT>>/g, '.').trim()).filter((s) => s.length > 0);
  }

  /**
   * Score a sentence based on its factual content and relevance
   */
  private scoreFactualSentence(
    sentence: string,
    contextQuery: string = '',
    entities: string[] = []
  ): number {
    let score = 1.0;

    // Base scoring factors

    // 1. Length factor - prefer medium-length sentences
    const length = sentence.length;
    score *= length > 60 && length < 150 ? 1.2 : 1.0;

    // 2. Entity factor - sentences with entities are more likely to be factual
    score *= 1.0 + entities.length * 0.1;

    // 3. Importance markers - boost sentences with importance markers
    const importanceCount = FactExtractor.IMPORTANCE_MARKERS.filter((marker) =>
      sentence.toLowerCase().includes(marker)
    ).length;
    score *= 1.0 + importanceCount * 0.15;

    // 4. Numeric content - sentences with numbers often contain facts
    const hasNumbers = /\d+/.test(sentence);
    score *= hasNumbers ? 1.25 : 1.0;

    // 5. Relevance to context query if provided
    if (contextQuery && contextQuery.length > 0) {
      const queryTerms = contextQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 3);

      const sentenceLower = sentence.toLowerCase();

      // Count how many query terms appear in the sentence
      const matchingTerms = queryTerms.filter((term) => sentenceLower.includes(term)).length;

      const relevanceBoost = (matchingTerms / Math.max(1, queryTerms.length)) * 1.5;
      score *= 1.0 + relevanceBoost;
    }

    // 6. Penalize vague language
    const vaguenessMarkers = ['maybe', 'perhaps', 'possibly', 'might', 'could be', 'sometimes'];
    const vaguenessCount = vaguenessMarkers.filter((marker) =>
      sentence.toLowerCase().includes(marker)
    ).length;
    score *= 1.0 - vaguenessCount * 0.1;

    return score;
  }

  /**
   * Check if a sentence contains any of the factual verbs
   */
  private containsFactVerb(sentence: string): boolean {
    const sentenceLower = sentence.toLowerCase();
    return FactExtractor.FACT_VERBS.some((verb) =>
      new RegExp(`\\b${verb}\\b`, 'i').test(sentenceLower)
    );
  }

  /**
   * Check if text is likely boilerplate content
   */
  private isBoilerplate(text: string): boolean {
    return FactExtractor.BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Check if a sentence contains at least one entity
   */
  private containsEntity(sentence: string): boolean {
    return Object.values(FactExtractor.ENTITY_PATTERNS).some((pattern) => pattern.test(sentence));
  }

  /**
   * Extract entity mentions from text (simplified implementation)
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Check for each entity pattern
    Object.entries(FactExtractor.ENTITY_PATTERNS).forEach(([type, pattern]) => {
      const matches = text.match(new RegExp(pattern, 'g'));
      if (matches) {
        entities.push(...matches);
      }
    });

    return [...new Set(entities)]; // Remove duplicates
  }
}

// Create singleton instance for easy import
export const factExtractor = new FactExtractor();
