/**
 * Verb Pattern Extractor Provider
 * 
 * Handles verb-based relationship pattern matching for relationship extraction.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { RecognizedEntity } from './advanced_ner.js';
import { RelationshipType, RelationshipSubtype, Relationship, RelationshipCreationOptions } from './relationship_extractor.js';

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
 * Verb Pattern Extractor Provider Class
 * Implements verb-based relationship pattern matching
 */
export class VerbPatternExtractor {
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
    'spouse of': {
      type: RelationshipType.FAMILY,
      subtype: RelationshipSubtype.SPOUSE,
      sourceRole: 'spouse',
      targetRole: 'spouse',
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
    'CEO of': {
      type: RelationshipType.EMPLOYMENT,
      subtype: RelationshipSubtype.CEO,
      sourceRole: 'CEO',
      targetRole: 'organization',
      confidence: 0.9
    },
    'founded': {
      type: RelationshipType.EMPLOYMENT,
      subtype: RelationshipSubtype.FOUNDER,
      sourceRole: 'founder',
      targetRole: 'organization',
      confidence: 0.9
    },
    'founded by': {
      type: RelationshipType.EMPLOYMENT,
      subtype: RelationshipSubtype.FOUNDER,
      sourceRole: 'organization',
      targetRole: 'founder',
      confidence: 0.9
    },
    
    // OWNERSHIP relationships
    'owns': {
      type: RelationshipType.OWNERSHIP,
      sourceRole: 'owner',
      targetRole: 'owned',
      confidence: 0.8
    },
    'owned by': {
      type: RelationshipType.OWNERSHIP,
      sourceRole: 'owned',
      targetRole: 'owner',
      confidence: 0.8
    },
    
    // LOCATION relationships
    'located in': {
      type: RelationshipType.LOCATION,
      sourceRole: 'entity',
      targetRole: 'location',
      confidence: 0.8
    },
    'based in': {
      type: RelationshipType.LOCATION,
      sourceRole: 'entity',
      targetRole: 'location',
      confidence: 0.8
    },
    'headquarters in': {
      type: RelationshipType.HEADQUARTERS,
      sourceRole: 'organization',
      targetRole: 'location',
      confidence: 0.9
    },
    
    // ACQUISITION relationships
    'acquired': {
      type: RelationshipType.ACQUISITION,
      sourceRole: 'acquirer',
      targetRole: 'acquired',
      confidence: 0.9
    },
    'acquired by': {
      type: RelationshipType.ACQUISITION,
      sourceRole: 'acquired',
      targetRole: 'acquirer',
      confidence: 0.9
    },
    'bought': {
      type: RelationshipType.ACQUISITION,
      sourceRole: 'buyer',
      targetRole: 'bought',
      confidence: 0.8
    },
    'sold to': {
      type: RelationshipType.ACQUISITION,
      sourceRole: 'sold',
      targetRole: 'buyer',
      confidence: 0.8
    },
    
    // PARTNERSHIP relationships
    'collaborates with': {
      type: RelationshipType.PARTNERSHIP,
      sourceRole: 'partner',
      targetRole: 'partner',
      confidence: 0.8
    },
    'partnership with': {
      type: RelationshipType.PARTNERSHIP,
      sourceRole: 'partner',
      targetRole: 'partner',
      confidence: 0.8
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
    
    // COMMUNICATION relationships
    'spoke to': {
      type: RelationshipType.COMMUNICATION,
      subtype: RelationshipSubtype.SPOKE_TO,
      sourceRole: 'speaker',
      targetRole: 'listener',
      confidence: 0.7
    },
    'wrote to': {
      type: RelationshipType.COMMUNICATION,
      subtype: RelationshipSubtype.WROTE_TO,
      sourceRole: 'writer',
      targetRole: 'recipient',
      confidence: 0.7
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
   * Extract verb-based relationship patterns from sentence
   */
  extractVerbPatternRelationships(context: SentenceExtractionContext, createRelationshipFn: (options: RelationshipCreationOptions) => Relationship): Relationship[] {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context.sentence));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(context.entities));
    
    const relationships: Relationship[] = [];
    const lowerSentence = context.sentence.toLowerCase();
    
    // Check for each relationship verb pattern
    for (const [verbPattern, relInfo] of Object.entries(this.RELATIONSHIP_VERBS)) {
      const verbIndex = lowerSentence.indexOf(verbPattern);
      
      if (verbIndex !== -1) {
        // Find entities before and after the verb
        const entitiesBefore = context.entities.filter(
          entity => entity.endIndex <= context.sentenceOffset + verbIndex
        );
        
        const entitiesAfter = context.entities.filter(
          entity => entity.startIndex >= context.sentenceOffset + verbIndex + verbPattern.length
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
          const evidence = context.includeEvidence ? 
            context.sentence.substring(
              Math.max(0, closestBefore.startIndex - context.sentenceOffset),
              Math.min(context.sentence.length, closestAfter.endIndex - context.sentenceOffset)
            ) : '';
          
          const relationship = createRelationshipFn({
            type: relInfo.type,
            subtype: relInfo.subtype,
            sourceEntity: closestBefore,
            sourceRole: relInfo.sourceRole,
            targetEntity: closestAfter,
            targetRole: relInfo.targetRole,
            evidence,
            confidence: relInfo.confidence,
            startIndex: closestBefore.startIndex,
            endIndex: closestAfter.endIndex
          });
          
          relationships.push(relationship);
        }
      }
    }
    
    return relationships;
  }

  /**
   * Get available verb patterns
   */
  getVerbPatterns(): Record<string, {type: RelationshipType; subtype?: RelationshipSubtype; sourceRole: string; targetRole: string; confidence: number}> {
    return { ...this.RELATIONSHIP_VERBS };
  }
}
