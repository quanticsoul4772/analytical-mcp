/**
 * Enhanced Fact Extraction
 * 
 * This module provides advanced fact extraction capabilities by combining
 * named entity recognition, coreference resolution, and relationship extraction.
 */

import { Logger } from './logger.js';
import { DataProcessingError } from './errors.js';
import { advancedNER, RecognizedEntity, EntityType } from './advanced_ner.js';
import { coreferenceResolver, CoreferenceChain } from './coreference_resolver.js';
import { relationshipExtractor, Relationship, RelationshipType } from './relationship_extractor.js';
import * as mathjs from 'mathjs';

/**
 * Types of facts that can be extracted
 */
export enum FactType {
  ENTITY = 'ENTITY',               // Named entity
  RELATIONSHIP = 'RELATIONSHIP',   // Relationship between entities
  COREFERENCE = 'COREFERENCE',     // Coreference between mentions
  ATTRIBUTE = 'ATTRIBUTE',         // Entity attribute
  STATEMENT = 'STATEMENT',         // General statement
  SENTIMENT = 'SENTIMENT',         // Sentiment expression
  EVENT = 'EVENT'                  // Event description
}

/**
 * Extracted fact with confidence score
 */
export interface ExtractedFact {
  factId: string;                  // Unique identifier
  text: string;                    // Text representation of the fact
  type: FactType;                  // Type of fact
  confidence: number;              // Confidence score (0-1)
  startIndex: number;              // Start position in original text
  endIndex: number;                // End position in original text
  
  // Type-specific properties
  entityType?: EntityType;         // For ENTITY facts
  relationship?: Relationship;     // For RELATIONSHIP facts
  coreference?: CoreferenceChain;  // For COREFERENCE facts
  entities?: RecognizedEntity[];   // Related entities
  attributes?: Record<string, any>; // Additional attributes
}

/**
 * Result of fact extraction
 */
export interface FactExtractionResult {
  text: string;                    // Original text
  facts: ExtractedFact[];          // Extracted facts
  confidence: number;              // Overall confidence
  entityCount: number;             // Number of entities found
  relationshipCount: number;       // Number of relationships found
  coreferenceCount: number;        // Number of coreference chains found
}

/**
 * Parameters for fact extraction
 */
export interface FactExtractionParams {
  enableCoreference?: boolean;     // Enable coreference resolution
  enableRelationships?: boolean;   // Enable relationship extraction
  maxFacts?: number;               // Maximum number of facts to return
  minConfidence?: number;          // Minimum confidence threshold
  includeEvidence?: boolean;       // Include evidence text for relationships
  prioritizeFactTypes?: FactType[]; // Fact types to prioritize
}

/**
 * Enhanced Fact Extractor Class
 * Implements comprehensive fact extraction by combining multiple techniques
 */
export class EnhancedFactExtractor {
  /**
   * Extract facts from text using multiple advanced techniques
   */
  async extractFacts(
    text: string,
    params: FactExtractionParams = {}
  ): Promise<FactExtractionResult> {
    const {
      enableCoreference = true,
      enableRelationships = true,
      maxFacts = 50,
      minConfidence = 0.5,
      includeEvidence = true,
      prioritizeFactTypes = [FactType.ENTITY, FactType.RELATIONSHIP, FactType.COREFERENCE]
    } = params;
    
    try {
      Logger.debug('Starting enhanced fact extraction', { textLength: text.length });
      
      // Initialize result containers
      const facts: ExtractedFact[] = [];
      let entityCount = 0;
      let relationshipCount = 0;
      let coreferenceCount = 0;
      
      // 1. Extract entities and convert to facts
      const entities = await advancedNER.recognizeEntities(text);
      entityCount = entities.length;
      
      Logger.debug('Entity extraction complete', { count: entityCount });
      
      // Convert entities to facts
      for (const entity of entities) {
        if (entity.confidence >= minConfidence) {
          facts.push({
            factId: `entity_${facts.length}`,
            text: entity.text,
            type: FactType.ENTITY,
            confidence: entity.confidence,
            startIndex: entity.startIndex,
            endIndex: entity.endIndex,
            entityType: entity.type,
            entities: [entity]
          });
        }
      }
      
      // 2. Extract coreference chains if enabled
      if (enableCoreference) {
        const corefResult = await coreferenceResolver.resolveCoreferences(text);
        coreferenceCount = corefResult.chains.length;
        
        Logger.debug('Coreference resolution complete', { 
          chainCount: coreferenceCount,
          confidence: corefResult.confidence
        });
        
        // Convert coreference chains to facts
        for (const chain of corefResult.chains) {
          // Only include chains with multiple mentions
          if (chain.mentions.length > 1 && chain.confidence >= minConfidence) {
            // Find entities that match the representative mention
            const relatedEntities = entities.filter(entity => 
              chain.mentions.some(mention => 
                entity.startIndex === mention.startIndex && 
                entity.endIndex === mention.endIndex
              )
            );
            
            facts.push({
              factId: `coref_${facts.length}`,
              text: chain.representativeMention.text,
              type: FactType.COREFERENCE,
              confidence: chain.confidence,
              startIndex: chain.representativeMention.startIndex,
              endIndex: chain.representativeMention.endIndex,
              entityType: chain.entityType,
              coreference: chain,
              entities: relatedEntities
            });
          }
        }
      }
      
      // 3. Extract relationships if enabled
      if (enableRelationships) {
        const relationshipParams = {
          resolveCoref: enableCoreference,
          minConfidence,
          includeEvidence
        };
        
        const relationshipResult = await relationshipExtractor.extractRelationships(
          text, 
          relationshipParams
        );
        
        relationshipCount = relationshipResult.relationships.length;
        
        Logger.debug('Relationship extraction complete', { 
          count: relationshipCount,
          confidence: relationshipResult.confidence
        });
        
        // Convert relationships to facts
        for (const relationship of relationshipResult.relationships) {
          if (relationship.confidence >= minConfidence) {
            const relatedEntities = [
              relationship.source.entity,
              relationship.target.entity
            ];
            
            facts.push({
              factId: `rel_${facts.length}`,
              text: relationship.evidence || 
                    `${relationship.source.entity.text} ${relationship.type} ${relationship.target.entity.text}`,
              type: FactType.RELATIONSHIP,
              confidence: relationship.confidence,
              startIndex: relationship.startIndex,
              endIndex: relationship.endIndex,
              relationship,
              entities: relatedEntities
            });
          }
        }
      }
      
      // 4. Sort and filter facts
      const sortedFacts = this.sortFactsByPriority(facts, prioritizeFactTypes);
      const filteredFacts = sortedFacts
        .filter(fact => fact.confidence >= minConfidence)
        .slice(0, maxFacts);
      
      // 5. Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(filteredFacts);
      
      Logger.debug('Fact extraction complete', { 
        factCount: filteredFacts.length,
        confidence: overallConfidence
      });
      
      return {
        text,
        facts: filteredFacts,
        confidence: overallConfidence,
        entityCount,
        relationshipCount,
        coreferenceCount
      };
    } catch (error) {
      Logger.error('Enhanced fact extraction failed', error);
      throw new DataProcessingError(
        'Failed to extract facts',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Sort facts by priority and confidence
   */
  private sortFactsByPriority(facts: ExtractedFact[], priorityTypes: FactType[]): ExtractedFact[] {
    return [...facts].sort((a, b) => {
      // First sort by priority type
      const priorityA = priorityTypes.indexOf(a.type);
      const priorityB = priorityTypes.indexOf(b.type);
      
      if (priorityA !== priorityB) {
        // Lower index = higher priority
        return priorityA - priorityB;
      }
      
      // Then sort by confidence (higher first)
      return b.confidence - a.confidence;
    });
  }
  
  /**
   * Calculate overall confidence of fact extraction
   */
  private calculateOverallConfidence(facts: ExtractedFact[]): number {
    if (facts.length === 0) {
      return 0;
    }
    
    // Weight each fact type differently
    const typeWeights: Record<FactType, number> = {
      [FactType.ENTITY]: 1.0,
      [FactType.RELATIONSHIP]: 1.2,
      [FactType.COREFERENCE]: 0.9,
      [FactType.ATTRIBUTE]: 0.8,
      [FactType.STATEMENT]: 0.7,
      [FactType.SENTIMENT]: 0.6,
      [FactType.EVENT]: 1.1
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const fact of facts) {
      const weight = typeWeights[fact.type] || 1.0;
      weightedSum += fact.confidence * weight;
      totalWeight += weight;
    }
    
    // Logarithmic scaling based on fact count to reward more facts
    // but with diminishing returns
    const countFactor = 1 + Math.log10(Math.max(1, facts.length) / 10);
    
    // Final confidence score (capped at 1.0)
    return mathjs.min(1, (weightedSum / totalWeight) * countFactor);
  }
  
  /**
   * Extract statements as facts from text
   * This can be used separately or as part of the main extraction process
   */
  extractStatementFacts(text: string, minLength = 30): ExtractedFact[] {
    try {
      const facts: ExtractedFact[] = [];
      
      // Simple sentence splitting
      const sentences = text.split(/[.!?]/)
        .map(s => s.trim())
        .filter(s => s.length >= minLength);
      
      // Find sentence positions in original text
      let currentPosition = 0;
      
      for (const sentence of sentences) {
        const sentenceIndex = text.indexOf(sentence, currentPosition);
        
        if (sentenceIndex !== -1) {
          // Compute confidence based on sentence length and complexity
          const confidence = this.computeSentenceConfidence(sentence);
          
          facts.push({
            factId: `stmt_${facts.length}`,
            text: sentence,
            type: FactType.STATEMENT,
            confidence,
            startIndex: sentenceIndex,
            endIndex: sentenceIndex + sentence.length
          });
          
          currentPosition = sentenceIndex + sentence.length;
        }
      }
      
      return facts;
    } catch (error) {
      Logger.error('Statement extraction failed', error);
      return [];
    }
  }
  
  /**
   * Compute confidence score for a sentence
   */
  private computeSentenceConfidence(sentence: string): number {
    // Factors affecting confidence:
    // 1. Length (longer = higher confidence, up to a point)
    const lengthFactor = Math.min(1, sentence.length / 200);
    
    // 2. Complexity (more unique words = higher confidence)
    const words = sentence.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const complexityFactor = Math.min(1, uniqueWords.size / words.length);
    
    // 3. Structure (sentences with verbs are more likely to be meaningful)
    const hasVerb = /\b(is|are|was|were|has|have|had|do|does|did|will|shall|should|would|can|could|may|might)\b/i.test(sentence);
    const structureFactor = hasVerb ? 0.8 : 0.4;
    
    // Combined confidence score
    return mathjs.round(
      (lengthFactor * 0.3) + (complexityFactor * 0.3) + (structureFactor * 0.4),
      2
    );
  }
}

// Singleton instance
export const enhancedFactExtractor = new EnhancedFactExtractor();
