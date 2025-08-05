/**
 * Advanced Relationship Extraction
 * 
 * This module provides enhanced relationship extraction capabilities for identifying
 * semantic relationships between entities in text.
 */

import { Logger } from './logger.js';
import { nlpToolkit } from './nlp_toolkit.js';
import { advancedNER, RecognizedEntity, EntityType } from './advanced_ner.js';
import { coreferenceResolver, CoreferenceResult } from './coreference_resolver.js';
import { DataProcessingError } from './errors.js';
import { v4 as uuidv4 } from 'uuid';
import { SentenceProcessingProvider } from './sentence_processing_provider.js';

/**
 * Types of relationships that can be extracted
 */
export enum RelationshipType {
  FAMILY = 'FAMILY',             // Family relationships
  EMPLOYMENT = 'EMPLOYMENT',     // Employment relationships
  OWNERSHIP = 'OWNERSHIP',       // Ownership relationships
  LOCATION = 'LOCATION',         // Location relationships
  HEADQUARTERS = 'HEADQUARTERS', // Organization headquarters
  ACQUISITION = 'ACQUISITION',   // Company acquisitions
  PARTNERSHIP = 'PARTNERSHIP',   // Business partnerships
  COMMUNICATION = 'COMMUNICATION', // Communication between entities
  TEMPORAL = 'TEMPORAL',         // Temporal relationships
  OTHER = 'OTHER'                // Other relationships
}

/**
 * Relationship subtypes for more specific categorization
 */
export enum RelationshipSubtype {
  // FAMILY subtypes
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  SIBLING = 'SIBLING',
  SPOUSE = 'SPOUSE',
  
  // EMPLOYMENT subtypes
  CEO = 'CEO',
  EMPLOYEE = 'EMPLOYEE',
  FOUNDER = 'FOUNDER',
  
  // COMMUNICATION subtypes
  SPOKE_TO = 'SPOKE_TO',
  WROTE_TO = 'WROTE_TO',
  
  // TEMPORAL subtypes
  BEFORE = 'BEFORE',
  DURING = 'DURING',
  AFTER = 'AFTER',
  
  // Default
  GENERAL = 'GENERAL'
}

/**
 * Extracted relationship between entities
 */
export interface Relationship {
  id: string;
  type: RelationshipType;
  subtype?: RelationshipSubtype;
  sourceEntity: RecognizedEntity;
  sourceRole: string;
  targetEntity: RecognizedEntity;
  targetRole: string;
  evidence: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Parameters for relationship extraction
 */
export interface RelationshipExtractionParams {
  resolveCoref?: boolean;
  minConfidence?: number;
  includeEvidence?: boolean;
}

/**
 * Result of relationship extraction
 */
export interface RelationshipExtractionResult {
  text: string;
  relationships: Relationship[];
  confidence: number;
  entities: RecognizedEntity[];
}

/**
 * Options for creating a relationship
 */
export interface RelationshipCreationOptions {
  type: RelationshipType;
  subtype?: RelationshipSubtype;
  sourceEntity: RecognizedEntity;
  sourceRole: string;
  targetEntity: RecognizedEntity;
  targetRole: string;
  evidence: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Context for sentence-level relationship extraction
 */
export interface SentenceExtractionContext {
  sentence: string;
  entities: RecognizedEntity[];
  sentenceOffset: number;
  includeEvidence: boolean;
}

export interface RelationshipRoleContext {
  role: string;
  firstEntity: RecognizedEntity;
  secondEntity: RecognizedEntity;
}

/**
 * Relationship Extractor Class
 * Streamlined coordinator using provider pattern
 */
export class RelationshipExtractor {
  private sentenceProcessor: SentenceProcessingProvider;

  constructor() {
    this.sentenceProcessor = new SentenceProcessingProvider();
  }

  /**
   * Extract relationships from text using provider pattern coordination
   */
  async extractRelationships(
    text: string,
    params: RelationshipExtractionParams = {}
  ): Promise<RelationshipExtractionResult> {
    const {
      resolveCoref = true,
      minConfidence = 0.5,
      includeEvidence = true
    } = params;
    
    try {
      Logger.debug('Starting relationship extraction', { textLength: text.length });
      
      // 1. Preprocess text with coreference resolution if requested
      let processedText = text;
      let corefResult: CoreferenceResult | null = null;
      
      if (resolveCoref) {
        corefResult = await coreferenceResolver.resolveCoreferences(text);
        processedText = corefResult.resolvedText;
        Logger.debug('Applied coreference resolution', { 
          chainCount: corefResult.chains.length,
          confidence: corefResult.confidence 
        });
      }
      
      // 2. Extract entities
      const entities = await advancedNER.recognizeEntities(processedText);
      Logger.debug('Extracted entities', { count: entities.length });
      
      // 3. Extract sentences using provider
      const sentences = this.sentenceProcessor.extractSentences(processedText);
      Logger.debug('Extracted sentences', { count: sentences.length });
      
      // 4. Extract relationships using provider coordination
      const relationships: Relationship[] = [];
      
      for (const sentence of sentences) {
        // Get entities in this sentence
        const sentenceEntities = entities.filter(entity => 
          entity.startIndex >= sentence.startIndex && 
          entity.endIndex <= sentence.endIndex
        );
        
        // Skip if fewer than 2 entities
        if (sentenceEntities.length < 2) {
          continue;
        }
        
        // Extract relationships from this sentence using provider
        const sentenceRelationships = this.sentenceProcessor.extractRelationshipsFromSentence({
          sentence: sentence.text,
          entities: sentenceEntities,
          sentenceOffset: sentence.startIndex,
          includeEvidence
        }, this.createRelationship);
        
        // Filter by confidence
        const filteredRelationships = sentenceRelationships.filter(
          rel => rel.confidence >= minConfidence
        );
        
        relationships.push(...filteredRelationships);
      }
      
      // 5. Calculate overall confidence using provider
      const confidence = this.sentenceProcessor.calculateOverallConfidence(relationships);
      
      return {
        text,
        relationships,
        confidence,
        entities
      };
    } catch (error) {
      Logger.error('Relationship extraction failed', error);
      throw new DataProcessingError(
        'ERR_1001',
        'Failed to extract relationships',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Create a relationship with proper structure
   */
  private createRelationship(options: RelationshipCreationOptions): Relationship {
    return {
      id: uuidv4(),
      type: options.type,
      subtype: options.subtype,
      sourceEntity: options.sourceEntity,
      sourceRole: options.sourceRole,
      targetEntity: options.targetEntity,
      targetRole: options.targetRole,
      evidence: options.evidence,
      confidence: options.confidence,
      startIndex: options.startIndex,
      endIndex: options.endIndex
    };
  }
}

// Singleton instance
export const relationshipExtractor = new RelationshipExtractor();
