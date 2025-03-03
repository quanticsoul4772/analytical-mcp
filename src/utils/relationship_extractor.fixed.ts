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
  subtype: RelationshipSubtype;
  source: {
    entity: RecognizedEntity;
    role: string;
  };
  target: {
    entity: RecognizedEntity;
    role: string;
  };
  confidence: number;
  temporalContext?: string;
  spatialContext?: string;
  evidence: string;
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
 * Relationship Extractor Class
 * Implements advanced relationship extraction techniques
 */
export class RelationshipExtractor {
  // Verb patterns that indicate relationships
  private readonly RELATIONSHIP_VERBS: Record<string, {
    type: RelationshipType;
    subtype?: RelationshipSubtype;
    sourceRole: string;
    targetRole: string;
    confidence: number;
  }> = {
    // FAMILY relationships
    'parent of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.PARENT,
      sourceRole: 'parent',
      targetRole: 'child',
      confidence: 0.9
    },
    'father of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.PARENT,
      sourceRole: 'father',
      targetRole: 'child',
      confidence: 0.9
    },
    'mother of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.PARENT,
      sourceRole: 'mother',
      targetRole: 'child',
      confidence: 0.9
    },
    'child of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.CHILD,
      sourceRole: 'child',
      targetRole: 'parent',
      confidence: 0.9
    },
    'son of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.CHILD,
      sourceRole: 'son',
      targetRole: 'parent',
      confidence: 0.9
    },
    'daughter of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.CHILD,
      sourceRole: 'daughter',
      targetRole: 'parent',
      confidence: 0.9
    },
    'sibling of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.SIBLING,
      sourceRole: 'sibling',
      targetRole: 'sibling',
      confidence: 0.9
    },
    'brother of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.SIBLING,
      sourceRole: 'brother',
      targetRole: 'sibling',
      confidence: 0.9
    },
    'sister of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.SIBLING,
      sourceRole: 'sister',
      targetRole: 'sibling',
      confidence: 0.9
    },
    'married to': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.SPOUSE,
      sourceRole: 'spouse',
      targetRole: 'spouse',
      confidence: 0.9
    },
    'husband of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.SPOUSE,
      sourceRole: 'husband',
      targetRole: 'wife',
      confidence: 0.9
    },
    'wife of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.SPOUSE,
      sourceRole: 'wife',
      targetRole: 'husband',
      confidence: 0.9
    },
    
    // EMPLOYMENT relationships
    'works for': {
      type: RelationshipType.EMPLOYMENT,
      subtype: RelationshipSubtype.EMPLOYEE,
      sourceRole: 'employee',
      targetRole: 'employer',
      confidence: 0.8
    },
    'employed by': {
      type: RelationshipType.EMPLOYMENT,
      subtype: RelationshipSubtype.EMPLOYEE,
      sourceRole: 'employee',
      targetRole: 'employer',
      confidence: 0.8
    },
    'works at': {
      type: RelationshipType.EMPLOYMENT,
      subtype: RelationshipSubtype.EMPLOYEE,
      sourceRole: 'employee',
      targetRole: 'employer',
      confidence: 0.7
    },
    'ceo of': {
      type: RelationshipType.EMPLOYMENT,
      subtype: RelationshipSubtype.CEO,
      sourceRole: 'CEO',
      targetRole: 'company',
      confidence: 0.9
    },
    'founded': {
      type: RelationshipType.OWNERSHIP,
      subtype: RelationshipSubtype.FOUNDER,
      sourceRole: 'founder',
      targetRole: 'organization',
      confidence: 0.9
    },
    'created': {
      type: RelationshipType.OWNERSHIP,
      subtype: RelationshipSubtype.FOUNDER,
      sourceRole: 'creator',
      targetRole: 'creation',
      confidence: 0.7
    },
    
    // COMMUNICATION relationships
    'spoke to': {
      type: RelationshipType.COMMUNICATION,
      subtype: RelationshipSubtype.SPOKE_TO,
      sourceRole: 'speaker',
      targetRole: 'listener',
      confidence: 0.8
    },
    'talked to': {
      type: RelationshipType.COMMUNICATION,
      subtype: RelationshipSubtype.SPOKE_TO,
      sourceRole: 'speaker',
      targetRole: 'listener',
      confidence: 0.8
    },
    'wrote to': {
      type: RelationshipType.COMMUNICATION,
      subtype: RelationshipSubtype.WROTE_TO,
      sourceRole: 'writer',
      targetRole: 'recipient',
      confidence: 0.8
    },
    'called': {
      type: RelationshipType.COMMUNICATION,
      subtype: RelationshipSubtype.SPOKE_TO,
      sourceRole: 'caller',
      targetRole: 'recipient',
      confidence: 0.7
    },
    
    // LOCATION relationships
    'located in': {
      type: RelationshipType.LOCATION,
      sourceRole: 'entity',
      targetRole: 'location',
      confidence: 0.8
    },
    'based in': {
      type: RelationshipType.HEADQUARTERS,
      sourceRole: 'organization',
      targetRole: 'location',
      confidence: 0.8
    },
    'headquartered in': {
      type: RelationshipType.HEADQUARTERS,
      sourceRole: 'organization',
      targetRole: 'location',
      confidence: 0.9
    },
    'lives in': {
      type: RelationshipType.LOCATION,
      sourceRole: 'person',
      targetRole: 'location',
      confidence: 0.8
    },
    'visited': {
      type: RelationshipType.LOCATION,
      sourceRole: 'visitor',
      targetRole: 'location',
      confidence: 0.7
    },
    'traveled to': {
      type: RelationshipType.LOCATION,
      sourceRole: 'traveler',
      targetRole: 'destination',
      confidence: 0.7
    },
    
    // ORGANIZATION relationships
    'acquired': {
      type: RelationshipType.ACQUISITION,
      sourceRole: 'acquirer',
      targetRole: 'acquired',
      confidence: 0.9
    },
    'merged with': {
      type: RelationshipType.PARTNERSHIP,
      sourceRole: 'organization',
      targetRole: 'organization',
      confidence: 0.9
    },
    'partnered with': {
      type: RelationshipType.PARTNERSHIP,
      sourceRole: 'partner',
      targetRole: 'partner',
      confidence: 0.8
    },
    
    // TEMPORAL relationships
    'occurred on': {
      type: RelationshipType.TEMPORAL,
      subtype: RelationshipSubtype.DURING,
      sourceRole: 'event',
      targetRole: 'time',
      confidence: 0.8
    },
    'happened before': {
      type: RelationshipType.TEMPORAL,
      subtype: RelationshipSubtype.BEFORE,
      sourceRole: 'event',
      targetRole: 'reference',
      confidence: 0.8
    },
    'happened after': {
      type: RelationshipType.TEMPORAL,
      subtype: RelationshipSubtype.AFTER,
      sourceRole: 'event',
      targetRole: 'reference',
      confidence: 0.8
    }
  };
  
  /**
   * Create a relationship object from extracted information
   */
  private createRelationship(
    type: RelationshipType,
    subtype: RelationshipSubtype | undefined,
    sourceEntity: RecognizedEntity,
    sourceRole: string,
    targetEntity: RecognizedEntity,
    targetRole: string,
    evidence: string,
    confidence: number,
    startIndex: number,
    endIndex: number
  ): Relationship {
    // Ensure subtype is not undefined for the Relationship type
    const finalSubtype = subtype || RelationshipSubtype.GENERAL;
    
    return {
      id: `rel_${uuidv4()}`,
      type,
      subtype: finalSubtype,
      source: {
        entity: sourceEntity,
        role: sourceRole
      },
      target: {
        entity: targetEntity,
        role: targetRole
      },
      evidence,
      confidence,
      startIndex,
      endIndex
    };
  }
  
  /**
   * Extract relationships from text
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
      
      // 3. Extract sentences
      const sentences = this.extractSentences(processedText);
      Logger.debug('Extracted sentences', { count: sentences.length });
      
      // 4. Extract relationships
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
        
        // Extract relationships from this sentence
        const sentenceRelationships = this.extractRelationshipsFromSentence(
          sentence.text,
          sentenceEntities,
          sentence.startIndex,
          includeEvidence
        );
        
        // Filter by confidence
        const filteredRelationships = sentenceRelationships.filter(
          rel => rel.confidence >= minConfidence
        );
        
        relationships.push(...filteredRelationships);
      }
      
      // 5. Calculate overall confidence
      const confidence = this.calculateOverallConfidence(relationships);
      
      return {
        text,
        relationships,
        confidence,
        entities
      };
    } catch (error) {
      Logger.error('Relationship extraction failed', error);
      throw new DataProcessingError(
        'Failed to extract relationships',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): Array<{text: string, startIndex: number, endIndex: number}> {
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
   * Extract relationships from a single sentence
   */
  private extractRelationshipsFromSentence(
    sentence: string,
    entities: RecognizedEntity[],
    sentenceOffset: number,
    includeEvidence: boolean
  ): Relationship[] {
    const relationships: Relationship[] = [];
    
    // 1. Extract relationships based on verb patterns
    const verbPatternRelationships = this.extractVerbPatternRelationships(
      sentence,
      entities,
      sentenceOffset,
      includeEvidence
    );
    relationships.push(...verbPatternRelationships);
    
    // 2. Extract apposition relationships (X, the Y of Z)
    const appositionRelationships = this.extractAppositionRelationships(
      sentence,
      entities,
      sentenceOffset,
      includeEvidence
    );
    relationships.push(...appositionRelationships);
    
    // 3. Extract possessive relationships (X's Y)
    const possessiveRelationships = this.extractPossessiveRelationships(
      sentence,
      entities,
      sentenceOffset,
      includeEvidence
    );
    relationships.push(...possessiveRelationships);
    
    // Assign unique IDs to relationships
    for (let i = 0; i < relationships.length; i++) {
      relationships[i].id = `rel_${sentenceOffset}_${i}`;
    }
    
    return relationships;
  }
  
  /**
   * Extract relationships based on verb patterns
   */
  private extractVerbPatternRelationships(
    sentence: string,
    entities: RecognizedEntity[],
    sentenceOffset: number,
    includeEvidence: boolean
  ): Relationship[] {
    const relationships: Relationship[] = [];
    const lowerSentence = sentence.toLowerCase();
    
    // Check for each relationship verb pattern
    for (const [verbPattern, relInfo] of Object.entries(this.RELATIONSHIP_VERBS)) {
      const verbIndex = lowerSentence.indexOf(verbPattern);
      
      if (verbIndex !== -1) {
        // Find entities before and after the verb
        const entitiesBefore = entities.filter(
          entity => entity.endIndex <= sentenceOffset + verbIndex
        );
        
        const entitiesAfter = entities.filter(
          entity => entity.startIndex >= sentenceOffset + verbIndex + verbPattern.length
        );
        
        // Skip if no entities before or after
        if (entitiesBefore.length === 0 || entitiesAfter.length === 0) {
          continue;
        }
        
        // Get closest entity before and after
        const closestBefore = entitiesBefore.reduce((closest, entity) => 
          !closest || entity.endIndex > closest.endIndex ? entity : closest
        , null as RecognizedEntity | null);
        
        const closestAfter = entitiesAfter.reduce((closest, entity) => 
          !closest || entity.startIndex < closest.startIndex ? entity : closest
        , null as RecognizedEntity | null);
        
        if (closestBefore && closestAfter) {
          // Create the relationship
          const evidence = includeEvidence ? 
            sentence.substring(
              Math.max(0, closestBefore.startIndex - sentenceOffset),
              Math.min(sentence.length, closestAfter.endIndex - sentenceOffset)
            ) : '';
          
          const relationship = this.createRelationship(
            relInfo.type,
            relInfo.subtype,
            closestBefore,
            relInfo.sourceRole,
            closestAfter,
            relInfo.targetRole,
            evidence,
            relInfo.confidence,
            closestBefore.startIndex,
            closestAfter.endIndex
          );
          
          relationships.push(relationship);
        }
      }
    }
    
    return relationships;
  }
  
  /**
   * Extract relationships based on apposition patterns (X, the Y of Z)
   */
  private extractAppositionRelationships(
    sentence: string,
    entities: RecognizedEntity[],
    sentenceOffset: number,
    includeEvidence: boolean
  ): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Look for patterns like "X, the Y of Z"
    const appositionRegex = /(\w+),\s+the\s+(\w+)\s+of\s+(\w+)/gi;
    let match;
    
    while ((match = appositionRegex.exec(sentence)) !== null) {
      const fullMatch = match[0];
      const firstPart = match[1]; // X
      const role = match[2]; // Y
      const secondPart = match[3]; // Z
      
      // Find entities that match the first and second parts
      const firstEntity = entities.find(entity => 
        sentence.substring(
          entity.startIndex - sentenceOffset, 
          entity.endIndex - sentenceOffset
        ).includes(firstPart)
      );
      
      const secondEntity = entities.find(entity => 
        sentence.substring(
          entity.startIndex - sentenceOffset, 
          entity.endIndex - sentenceOffset
        ).includes(secondPart)
      );
      
      if (firstEntity && secondEntity) {
        // Determine relationship type based on entities and role
        const relationshipInfo = this.determineRelationshipFromRole(
          role.toLowerCase(),
          firstEntity,
          secondEntity
        );
        
        if (relationshipInfo) {
          const evidence = includeEvidence ? fullMatch : '';
          
          const relationship = this.createRelationship(
            relationshipInfo.type,
            relationshipInfo.subtype,
            firstEntity,
            relationshipInfo.sourceRole,
            secondEntity,
            relationshipInfo.targetRole,
            evidence,
            relationshipInfo.confidence,
            Math.min(firstEntity.startIndex, secondEntity.startIndex),
            Math.max(firstEntity.endIndex, secondEntity.endIndex)
          );
          
          relationships.push(relationship);
        }
      }
    }
    
    return relationships;
  }
  
  /**
   * Extract relationships based on possessive patterns (X's Y)
   */
  private extractPossessiveRelationships(
    sentence: string,
    entities: RecognizedEntity[],
    sentenceOffset: number,
    includeEvidence: boolean
  ): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Look for possessive patterns like "X's Y"
    const possessiveRegex = /(\w+)'s\s+(\w+)/gi;
    let match;
    
    while ((match = possessiveRegex.exec(sentence)) !== null) {
      const fullMatch = match[0];
      const owner = match[1]; // X
      const possession = match[2]; // Y
      
      // Find entities that match the owner and possession
      const ownerEntity = entities.find(entity => 
        sentence.substring(
          entity.startIndex - sentenceOffset, 
          entity.endIndex - sentenceOffset
        ).includes(owner)
      );
      
      const possessionEntity = entities.find(entity => 
        sentence.substring(
          entity.startIndex - sentenceOffset, 
          entity.endIndex - sentenceOffset
        ).includes(possession)
      );
      
      if (ownerEntity && possessionEntity) {
        // Determine relationship type based on entities
        const relationshipType = this.determinePossessiveRelationshipType(
          ownerEntity,
          possessionEntity
        );
        
        const evidence = includeEvidence ? fullMatch : '';
        
        const relationship = this.createRelationship(
          relationshipType.type,
          undefined, // No specific subtype for possessive relationships
          ownerEntity,
          relationshipType.sourceRole,
          possessionEntity,
          relationshipType.targetRole,
          evidence,
          0.7, // Default confidence for possessive relationships
          Math.min(ownerEntity.startIndex, possessionEntity.startIndex),
          Math.max(ownerEntity.endIndex, possessionEntity.endIndex)
        );
        
        relationships.push(relationship);
      }
    }
    
    return relationships;
  }
  
  /**
   * Determine relationship type from role description
   */
  private determineRelationshipFromRole(
    role: string,
    firstEntity: RecognizedEntity,
    secondEntity: RecognizedEntity
  ): {
    type: RelationshipType;
    subtype?: RelationshipSubtype;
    sourceRole: string;
    targetRole: string;
    confidence: number;
  } | null {
    // Family relationships
    if (
      role === 'father' || 
      role === 'mother' || 
      role === 'parent'
    ) {
      return {
        type: RelationshipType.FAMILY,
        subtype: RelationshipSubtype.PARENT,
        sourceRole: role,
        targetRole: 'child',
        confidence: 0.8
      };
    }
    
    if (
      role === 'son' || 
      role === 'daughter' || 
      role === 'child'
    ) {
      return {
        type: RelationshipType.FAMILY,
        subtype: RelationshipSubtype.CHILD,
        sourceRole: role,
        targetRole: 'parent',
        confidence: 0.8
      };
    }
    
    if (
      role === 'brother' || 
      role === 'sister' || 
      role === 'sibling'
    ) {
      return {
        type: RelationshipType.FAMILY,
        subtype: RelationshipSubtype.SIBLING,
        sourceRole: role,
        targetRole: 'sibling',
        confidence: 0.8
      };
    }
    
    // Employment relationships
    if (
      role === 'ceo' || 
      role === 'president' || 
      role === 'director'
    ) {
      return {
        type: RelationshipType.EMPLOYMENT,
        subtype: RelationshipSubtype.CEO,
        sourceRole: role,
        targetRole: 'organization',
        confidence: 0.8
      };
    }
    
    if (
      role === 'employee' || 
      role === 'worker' || 
      role === 'staff'
    ) {
      return {
        type: RelationshipType.EMPLOYMENT,
        subtype: RelationshipSubtype.EMPLOYEE,
        sourceRole: 'employee',
        targetRole: 'employer',
        confidence: 0.8
      };
    }
    
    if (
      role === 'founder' || 
      role === 'creator' || 
      role === 'owner'
    ) {
      return {
        type: RelationshipType.OWNERSHIP,
        subtype: RelationshipSubtype.FOUNDER,
        sourceRole: role,
        targetRole: 'organization',
        confidence: 0.8
      };
    }
    
    // Generic relationship
    return {
      type: RelationshipType.OTHER,
      sourceRole: 'subject',
      targetRole: 'object',
      confidence: 0.6
    };
  }
  
  /**
   * Determine relationship type for possessive relationship
   */
  private determinePossessiveRelationshipType(
    ownerEntity: RecognizedEntity,
    possessionEntity: RecognizedEntity
  ): {
    type: RelationshipType;
    sourceRole: string;
    targetRole: string;
  } {
    // Person owns Organization
    if (
      ownerEntity.type === EntityType.PERSON && 
      possessionEntity.type === EntityType.ORGANIZATION
    ) {
      return {
        type: RelationshipType.OWNERSHIP,
        sourceRole: 'owner',
        targetRole: 'owned'
      };
    }
    
    // Organization owns Organization
    if (
      ownerEntity.type === EntityType.ORGANIZATION && 
      possessionEntity.type === EntityType.ORGANIZATION
    ) {
      return {
        type: RelationshipType.ACQUISITION,
        sourceRole: 'parent',
        targetRole: 'subsidiary'
      };
    }
    
    // Person and Location
    if (
      ownerEntity.type === EntityType.PERSON && 
      possessionEntity.type === EntityType.LOCATION
    ) {
      return {
        type: RelationshipType.LOCATION,
        sourceRole: 'resident',
        targetRole: 'residence'
      };
    }
    
    // Organization and Location
    if (
      ownerEntity.type === EntityType.ORGANIZATION && 
      possessionEntity.type === EntityType.LOCATION
    ) {
      return {
        type: RelationshipType.HEADQUARTERS,
        sourceRole: 'organization',
        targetRole: 'location'
      };
    }
    
    // Default to general ownership
    return {
      type: RelationshipType.OWNERSHIP,
      sourceRole: 'owner',
      targetRole: 'possession'
    };
  }
  
  /**
   * Calculate overall confidence score for all relationships
   */
  private calculateOverallConfidence(relationships: Relationship[]): number {
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

// Singleton instance
export const relationshipExtractor = new RelationshipExtractor();
