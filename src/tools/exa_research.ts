import { z } from 'zod';
import fetch from 'node-fetch';
import { Logger } from '../utils/logger.js';
import { nlpToolkit } from '../utils/nlp_toolkit.js';
import { APIError, ValidationError, DataProcessingError } from '../utils/errors.js';
import { executeApiRequest, RETRYABLE_STATUS_CODES } from '../utils/api_helpers.js';
import { config, isFeatureEnabled } from '../utils/config.js';
import * as mathjs from 'mathjs';

// Enhanced fact extraction interfaces
interface FactExtraction {
  text: string;
  facts: ExtractedFact[];
  confidence: number;
}

interface ExtractedFact {
  fact: string;
  type: 'named_entity' | 'relationship' | 'statement' | 'sentiment';
  confidence: number;
  entities?: string[];
  sentiment?: {
    score: number;
    comparative: number;
    positive: string[];
    negative: string[];
  };
}

export class EnhancedFactExtractor {
  // Advanced fact extraction with multiple techniques
  extractFacts(text: string, options: {
    maxFacts?: number;
    minConfidence?: number;
  } = {}): FactExtraction {
    const {
      maxFacts = 10,
      minConfidence = 0.5
    } = options;

    try {
      // Preliminary text cleaning
      const cleanedText = this.preprocessText(text);

      // Multiple extraction techniques
      const extractionTechniques = [
        this.extractNamedEntities(cleanedText),
        this.extractStatementFacts(cleanedText),
        this.extractRelationshipFacts(cleanedText),
        this.extractSentimentFacts(cleanedText)
      ];

      // Flatten and score facts
      const allFacts = extractionTechniques.flat()
        .filter(fact => fact.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxFacts);

      // Compute overall extraction confidence
      const overallConfidence = this.computeExtractionConfidence(allFacts);

      return {
        text: cleanedText,
        facts: allFacts,
        confidence: overallConfidence
      };
    } catch (error) {
      Logger.error('Fact extraction failed', error);
      throw new DataProcessingError('Failed to extract facts', { 
        originalText: text,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Preprocess text to prepare for fact extraction
  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s.,!?]/g, '')  // Remove special characters
      .trim()
      .toLowerCase();
  }

  // Named Entity Extraction using NLP Toolkit
  private extractNamedEntities(text: string): ExtractedFact[] {
    const entities = nlpToolkit.extractNamedEntities(text);
    
    return [
      ...entities.persons.map(person => ({
        fact: person,
        type: 'named_entity',
        confidence: 0.8,
        entities: ['person']
      })),
      ...entities.organizations.map(org => ({
        fact: org,
        type: 'named_entity',
        confidence: 0.7,
        entities: ['organization']
      })),
      ...entities.locations.map(location => ({
        fact: location,
        type: 'named_entity',
        confidence: 0.7,
        entities: ['location']
      }))
    ];
  }

  // Statement Fact Extraction with NLP enhancements
  private extractStatementFacts(text: string): ExtractedFact[] {
    // Use tokenization to break text into meaningful statements
    const tokens = nlpToolkit.tokenize(text);
    const sentences = text.split(/[.!?]/)
      .filter(s => 
        s.trim().length > 30 &&  // Minimum meaningful length
        !s.includes('disclaimer') &&
        !s.includes('copyright')
      );

    return sentences.map(sentence => ({
      fact: sentence.trim(),
      type: 'statement',
      confidence: this.computeSentenceConfidence(sentence),
      entities: []
    }));
  }

  // Relationship Fact Extraction with POS tagging
  private extractRelationshipFacts(text: string): ExtractedFact[] {
    const posTags = nlpToolkit.getPOSTags(text);
    
    // Find potential relationship patterns using POS tags
    const relationshipPatterns = [
      { pattern: ['NN', 'VBZ', 'NN'], type: 'simple_relation' },
      { pattern: ['NN', 'VBD', 'IN', 'NN'], type: 'complex_relation' }
    ];

    const facts: ExtractedFact[] = [];

    for (let i = 0; i < posTags.length - 2; i++) {
      relationshipPatterns.forEach(pattern => {
        if (
          posTags[i].tag === pattern.pattern[0] &&
          posTags[i+1].tag === pattern.pattern[1] &&
          posTags[i+2].tag === pattern.pattern[2]
        ) {
          facts.push({
            fact: `${posTags[i].word} ${posTags[i+1].word} ${posTags[i+2].word}`,
            type: 'relationship',
            confidence: 0.6,
            entities: [posTags[i].word, posTags[i+2].word]
          });
        }
      });
    }

    return facts;
  }

  // Sentiment Fact Extraction
  private extractSentimentFacts(text: string): ExtractedFact[] {
    const sentimentAnalysis = nlpToolkit.analyzeSentiment(text);

    return [{
      fact: text,
      type: 'sentiment',
      confidence: this.mapSentimentToConfidence(sentimentAnalysis.score),
      sentiment: {
        score: sentimentAnalysis.score,
        comparative: sentimentAnalysis.comparative,
        positive: sentimentAnalysis.positive,
        negative: sentimentAnalysis.negative
      }
    }];
  }

  // Compute confidence for a sentence
  private computeSentenceConfidence(sentence: string): number {
    // Multiple confidence factors
    const lemmas = nlpToolkit.tokenize(sentence)
      .map(token => nlpToolkit.lemmatize(token));
    
    const lengthFactor = Math.min(1, sentence.length / 100);
    const uniqueWordFactor = new Set(lemmas).size / lemmas.length;
    const spellCheckFactor = 1 - (nlpToolkit.spellCheck(sentence).length / lemmas.length);

    return mathjs.round(
      (lengthFactor + uniqueWordFactor + spellCheckFactor) / 3, 
      2
    );
  }

  // Map sentiment score to confidence
  private mapSentimentToConfidence(sentimentScore: number): number {
    // Convert sentiment score to confidence
    // Sentiment score typically ranges from -5 to 5
    return mathjs.round(
      Math.min(1, Math.max(0, (Math.abs(sentimentScore) / 5))), 
      2
    );
  }

  // Compute overall extraction confidence
  private computeExtractionConfidence(facts: ExtractedFact[]): number {
    if (facts.length === 0) return 0;

    const confidenceSum = facts.reduce((sum, fact) => sum + fact.confidence, 0);
    const averageConfidence = confidenceSum / facts.length;

    return mathjs.round(
      Math.min(1, averageConfidence * (1 + Math.log(facts.length))), 
      2
    );
  }
}

// Singleton instance
export const enhancedFactExtractor = new EnhancedFactExtractor();
