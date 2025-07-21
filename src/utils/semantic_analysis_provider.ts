/**
 * Semantic Analysis Provider
 * 
 * Handles semantic relationship extraction through apposition and possessive patterns.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { RecognizedEntity, EntityType } from './advanced_ner.js';
import { RelationshipType, RelationshipSubtype, Relationship, RelationshipCreationOptions, RelationshipRoleContext } from './relationship_extractor.js';

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
 * Semantic Analysis Provider Class
 * Implements pattern-based semantic relationship extraction
 */
export class SemanticAnalysisProvider {

  /**
   * Extract relationships based on apposition patterns (X, the Y of Z)
   */
  extractAppositionRelationships(context: SentenceExtractionContext, createRelationshipFn: (options: RelationshipCreationOptions) => Relationship): Relationship[] {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context.sentence));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(context.entities));
    
    const relationships: Relationship[] = [];
    
    // Look for patterns like "X, the Y of Z"
    const appositionRegex = /(\w+),\s+the\s+(\w+)\s+of\s+(\w+)/gi;
    let match;
    
    while ((match = appositionRegex.exec(context.sentence)) !== null) {
      const fullMatch = match[0];
      const firstPart = match[1]; // X
      const role = match[2]; // Y
      const secondPart = match[3]; // Z
      
      // Find entities that match the first and second parts
      const firstEntity = context.entities.find(entity => 
        context.sentence.substring(
          entity.startIndex - context.sentenceOffset, 
          entity.endIndex - context.sentenceOffset
        ).includes(firstPart)
      );
      
      const secondEntity = context.entities.find(entity => 
        context.sentence.substring(
          entity.startIndex - context.sentenceOffset, 
          entity.endIndex - context.sentenceOffset
        ).includes(secondPart)
      );
      
      if (firstEntity && secondEntity) {
        // Determine relationship type based on entities and role
        const relationshipInfo = this.determineRelationshipFromRole({
          role: role.toLowerCase(),
          firstEntity,
          secondEntity
        });
        
        if (relationshipInfo) {
          const evidence = context.includeEvidence ? fullMatch : '';
          
          const relationship = createRelationshipFn({
            type: relationshipInfo.type,
            subtype: relationshipInfo.subtype,
            sourceEntity: firstEntity,
            sourceRole: relationshipInfo.sourceRole,
            targetEntity: secondEntity,
            targetRole: relationshipInfo.targetRole,
            evidence,
            confidence: relationshipInfo.confidence,
            startIndex: Math.min(firstEntity.startIndex, secondEntity.startIndex),
            endIndex: Math.max(firstEntity.endIndex, secondEntity.endIndex)
          });
          
          relationships.push(relationship);
        }
      }
    }
    
    return relationships;
  }
  
  /**
   * Extract relationships based on possessive patterns (X's Y)
   */
  extractPossessiveRelationships(context: SentenceExtractionContext, createRelationshipFn: (options: RelationshipCreationOptions) => Relationship): Relationship[] {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(context.sentence));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(context.entities));
    
    const relationships: Relationship[] = [];
    
    // Look for possessive patterns like "X's Y"
    const possessiveRegex = /(\w+)'s\s+(\w+)/gi;
    let match;
    
    while ((match = possessiveRegex.exec(context.sentence)) !== null) {
      const fullMatch = match[0];
      const owner = match[1]; // X
      const possession = match[2]; // Y
      
      // Find entities that match the owner and possession
      const ownerEntity = context.entities.find(entity => 
        context.sentence.substring(
          entity.startIndex - context.sentenceOffset, 
          entity.endIndex - context.sentenceOffset
        ).includes(owner)
      );
      
      const possessionEntity = context.entities.find(entity => 
        context.sentence.substring(
          entity.startIndex - context.sentenceOffset, 
          entity.endIndex - context.sentenceOffset
        ).includes(possession)
      );
      
      if (ownerEntity && possessionEntity) {
        // Determine relationship type based on entities
        const relationshipType = this.determinePossessiveRelationshipType(
          ownerEntity,
          possessionEntity
        );
        
        const evidence = context.includeEvidence ? fullMatch : '';
        
        const relationship = createRelationshipFn({
          type: relationshipType.type,
          subtype: undefined, // No specific subtype for possessive relationships
          sourceEntity: ownerEntity,
          sourceRole: relationshipType.sourceRole,
          targetEntity: possessionEntity,
          targetRole: relationshipType.targetRole,
          evidence,
          confidence: 0.7, // Default confidence for possessive relationships
          startIndex: Math.min(ownerEntity.startIndex, possessionEntity.startIndex),
          endIndex: Math.max(ownerEntity.endIndex, possessionEntity.endIndex)
        });
        
        relationships.push(relationship);
      }
    }
    
    return relationships;
  }

  /**
   * Determine relationship type and roles from apposition role context
   */
  private determineRelationshipFromRole(context: RelationshipRoleContext): {
    type: RelationshipType;
    subtype?: RelationshipSubtype;
    sourceRole: string;
    targetRole: string;
    confidence: number;
  } | null {
    // Family relationships
    if (
      context.role === 'father' || 
      context.role === 'mother' || 
      context.role === 'parent'
    ) {
      return {
        type: RelationshipType.FAMILY,
        subtype: RelationshipSubtype.PARENT,
        sourceRole: context.role,
        targetRole: 'child',
        confidence: 0.8
      };
    }
    
    if (
      context.role === 'son' || 
      context.role === 'daughter' || 
      context.role === 'child'
    ) {
      return {
        type: RelationshipType.FAMILY,
        subtype: RelationshipSubtype.CHILD,
        sourceRole: context.role,
        targetRole: 'parent',
        confidence: 0.8
      };
    }
    
    if (
      context.role === 'brother' || 
      context.role === 'sister' || 
      context.role === 'sibling'
    ) {
      return {
        type: RelationshipType.FAMILY,
        subtype: RelationshipSubtype.SIBLING,
        sourceRole: context.role,
        targetRole: 'sibling',
        confidence: 0.8
      };
    }
    
    // Employment relationships
    if (
      context.role === 'ceo' || 
      context.role === 'president' || 
      context.role === 'director'
    ) {
      return {
        type: RelationshipType.EMPLOYMENT,
        subtype: RelationshipSubtype.CEO,
        sourceRole: context.role,
        targetRole: 'organization',
        confidence: 0.8
      };
    }
    
    if (
      context.role === 'employee' || 
      context.role === 'worker' || 
      context.role === 'staff'
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
      context.role === 'founder' || 
      context.role === 'creator' || 
      context.role === 'owner'
    ) {
      return {
        type: RelationshipType.OWNERSHIP,
        subtype: RelationshipSubtype.FOUNDER,
        sourceRole: context.role,
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
}
