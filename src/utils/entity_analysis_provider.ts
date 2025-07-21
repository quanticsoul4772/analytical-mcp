/**
 * Entity Analysis Provider
 * 
 * Handles entity type inference, noun phrase analysis,
 * and entity overlap detection for coreference resolution.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { RecognizedEntity, EntityType } from './advanced_ner.js';

/**
 * Entity Analysis Provider Class
 * Provides entity analysis utilities for coreference resolution
 */
export class EntityAnalysisProvider {

  /**
   * Infer entity type from text using simple heuristics
   */
  inferEntityTypeFromText(text: string): EntityType | undefined {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    // Simple heuristics for entity type detection
    const lowerText = text.toLowerCase();
    
    if (
      lowerText.includes(' inc') ||
      lowerText.includes(' corp') ||
      lowerText.includes(' llc') ||
      lowerText.includes(' ltd') ||
      lowerText.includes(' company')
    ) {
      return EntityType.ORGANIZATION;
    }
    
    if (
      lowerText.includes(' street') ||
      lowerText.includes(' avenue') ||
      lowerText.includes(' road') ||
      lowerText.includes(' city') ||
      lowerText.includes(' state') ||
      lowerText.includes(' country')
    ) {
      return EntityType.LOCATION;
    }
    
    // Default to person for simplicity
    return EntityType.PERSON;
  }

  /**
   * Find noun phrase after determiner in POS tags
   */
  findNounAfterDeterminer(
    posTags: any[], 
    determinerIndex: number, 
    text: string
  ): { nounIndex: number; nounPhrase: string } | null {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    // Look for a following noun within a reasonable window
    for (let j = determinerIndex + 1; j < Math.min(determinerIndex + 5, posTags.length); j++) {
      const nextTag = posTags[j];
      if (nextTag && nextTag.tag.startsWith('NN')) {
        // Build the noun phrase from determiner to noun
        const nounPhrase = posTags.slice(determinerIndex, j + 1)
          .filter(item => item !== undefined)
          .map(item => item!.word)
          .join(' ');
        
        return {
          nounIndex: j,
          nounPhrase
        };
      }
    }
    
    return null;
  }

  /**
   * Check if a phrase overlaps with any existing entities
   */
  checkEntityOverlap(
    phraseIndex: number, 
    nounPhrase: string, 
    entities: RecognizedEntity[]
  ): boolean {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(nounPhrase));
    
    return entities.some(
      entity => (
        (phraseIndex >= entity.startIndex && phraseIndex < entity.endIndex) ||
        (phraseIndex + nounPhrase.length > entity.startIndex && 
         phraseIndex + nounPhrase.length <= entity.endIndex)
      )
    );
  }

  /**
   * Analyze entity distribution in text
   */
  analyzeEntityDistribution(entities: RecognizedEntity[]): {
    totalEntities: number;
    byType: Record<string, number>;
    averageLength: number;
    density: number;
    textLength: number;
  } {
    const totalEntities = entities.length;
    const byType: Record<string, number> = {};
    let totalLength = 0;
    let textSpan = 0;
    
    for (const entity of entities) {
      // Count by type
      const type = entity.type?.toString() || 'UNKNOWN';
      byType[type] = (byType[type] || 0) + 1;
      
      // Calculate lengths
      totalLength += entity.text.length;
      textSpan = Math.max(textSpan, entity.endIndex);
    }
    
    const averageLength = totalEntities > 0 ? totalLength / totalEntities : 0;
    const density = textSpan > 0 ? totalEntities / textSpan : 0;
    
    return {
      totalEntities,
      byType,
      averageLength,
      density,
      textLength: textSpan
    };
  }

  /**
   * Find overlapping entities
   */
  findOverlappingEntities(entities: RecognizedEntity[]): Array<{
    entity1: RecognizedEntity;
    entity2: RecognizedEntity;
    overlapStart: number;
    overlapEnd: number;
    overlapLength: number;
  }> {
    const overlaps: Array<{
      entity1: RecognizedEntity;
      entity2: RecognizedEntity;
      overlapStart: number;
      overlapEnd: number;
      overlapLength: number;
    }> = [];
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        
        // Check for overlap
        const overlapStart = Math.max(entity1.startIndex, entity2.startIndex);
        const overlapEnd = Math.min(entity1.endIndex, entity2.endIndex);
        
        if (overlapStart < overlapEnd) {
          overlaps.push({
            entity1,
            entity2,
            overlapStart,
            overlapEnd,
            overlapLength: overlapEnd - overlapStart
          });
        }
      }
    }
    
    return overlaps;
  }

  /**
   * Validate entity structure
   */
  validateEntities(entities: RecognizedEntity[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const entity of entities) {
      // Check for required fields
      if (!entity.text || entity.text.trim().length === 0) {
        errors.push(`Entity missing text: ${JSON.stringify(entity)}`);
      }
      
      if (entity.startIndex < 0) {
        errors.push(`Entity has negative start index: ${entity.startIndex}`);
      }
      
      if (entity.endIndex <= entity.startIndex) {
        errors.push(`Entity has invalid index range: ${entity.startIndex}-${entity.endIndex}`);
      }
      
      // Check for warnings
      if (!entity.type) {
        warnings.push(`Entity missing type: ${entity.text}`);
      }
      
      if (entity.text.length > 100) {
        warnings.push(`Entity text unusually long: ${entity.text.substring(0, 50)}...`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
