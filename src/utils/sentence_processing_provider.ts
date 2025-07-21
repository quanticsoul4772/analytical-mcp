/**
 * Sentence Processing Provider
 * 
 * Handles sentence extraction and coordination of relationship extraction across sentence parts.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { RecognizedEntity } from './advanced_ner.js';
import { RelationshipCreationOptions, Relationship } from './relationship_extractor.js';
import { VerbPatternExtractor } from './verb_pattern_extractor.js';
import { SemanticAnalysisProvider } from './semantic_analysis_provider.js';

/**
 * Context for sentence-level relationship extraction
 */
export interface SentenceExtractionContext {
  sentence: string;
  entities: RecognizedEntity[];
  sentenceOffset: number;
  includeEvidence: boolean;
}

/**
 * Sentence Processing Provider Class
 * Coordinates sentence-level relationship extraction
 */
export class SentenceProcessingProvider {
  private verbPatternExtractor: VerbPatternExtractor;
  private semanticAnalysisProvider: SemanticAnalysisProvider;

  constructor() {
    this.verbPatternExtractor = new VerbPatternExtractor();
    this.semanticAnalysisProvider = new SemanticAnalysisProvider();
  }

  /**
   * Extract sentences from text with position tracking
   */
  extractSentences(text: string): Array<{text: string, startIndex: number, endIndex: number}> {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    const sentences: Array<{text: string, startIndex: number, endIndex: number}> = [];
    
    // Simple sentence splitting on .!?
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    let match;
    
    while ((match = sentenceRegex.exec(text)) !== null) {
      sentences.push({
        text: match[0].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    // Handle text without punctuation at the end
    const lastSentence = sentences.length > 0 
      ? sentences[sentences.length - 1]
      : null;
    
    const lastEndIndex = lastSentence ? lastSentence.endIndex : 0;
    
    if (lastEndIndex < text.length) {
      const remainingText = text.substring(lastEndIndex).trim();
      
      if (remainingText.length > 0) {
        sentences.push({
          text: remainingText,
          startIndex: lastEndIndex,
          endIndex: text.length
        });
      }
    }
    
    return sentences;
  }
  
  /**
   * Extract relationships from a single sentence using all available extractors
   */
  extractRelationshipsFromSentence(context: SentenceExtractionContext, createRelationshipFn: (options: RelationshipCreationOptions) => Relationship): Relationship[] {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context.sentence));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(context.entities));
    
    const relationships: Relationship[] = [];
    
    // 1. Extract relationships based on verb patterns
    const verbPatternRelationships = this.verbPatternExtractor.extractVerbPatternRelationships(context, createRelationshipFn);
    relationships.push(...verbPatternRelationships);
    
    // 2. Extract apposition relationships (X, the Y of Z)
    const appositionRelationships = this.semanticAnalysisProvider.extractAppositionRelationships(context, createRelationshipFn);
    relationships.push(...appositionRelationships);
    
    // 3. Extract possessive relationships (X's Y)
    const possessiveRelationships = this.semanticAnalysisProvider.extractPossessiveRelationships(context, createRelationshipFn);
    relationships.push(...possessiveRelationships);
    
    // Assign unique IDs to relationships
    for (let i = 0; i < relationships.length; i++) {
      relationships[i].id = `rel_${context.sentenceOffset}_${i}`;
    }
    
    return relationships;
  }

  /**
   * Calculate overall confidence score for all relationships
   */
  calculateOverallConfidence(relationships: Relationship[]): number {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(relationships));
    
    if (relationships.length === 0) {
      return 0;
    }
    
    // Average relationship confidence
    const totalConfidence = relationships.reduce(
      (sum, rel) => sum + rel.confidence, 
      0
    );
    
    return totalConfidence / relationships.length;
  }
}
