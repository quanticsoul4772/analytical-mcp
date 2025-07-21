/**
 * Text Preprocessing Provider
 * 
 * Handles text preprocessing for relationship extraction including
 * coreference resolution, entity extraction, and sentence splitting.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { advancedNER, RecognizedEntity } from './advanced_ner.js';
import { coreferenceResolver, CoreferenceResult } from './coreference_resolver.js';
import { DataProcessingError } from './errors.js';

/**
 * Parameters for text preprocessing
 */
export interface TextPreprocessingParams {
  resolveCoref?: boolean;
  includeEvidence?: boolean;
}

/**
 * Result of text preprocessing
 */
export interface TextPreprocessingResult {
  processedText: string;
  entities: RecognizedEntity[];
  sentences: Array<{text: string, startIndex: number, endIndex: number}>;
  corefResult?: CoreferenceResult;
}

/**
 * Text Preprocessing Provider Class
 * Implements text preprocessing for relationship extraction
 */
export class TextPreprocessingProvider {

  /**
   * Preprocess text for relationship extraction
   */
  async preprocessText(
    text: string, 
    params: TextPreprocessingParams = {}
  ): Promise<TextPreprocessingResult> {
    // Apply ValidationHelpers early return patterns
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    const {
      resolveCoref = true,
      includeEvidence = true
    } = params;
    
    try {
      Logger.debug('Starting text preprocessing', { textLength: text.length });
      
      // 1. Preprocess text with coreference resolution if requested
      let processedText = text;
      let corefResult: CoreferenceResult | undefined;
      
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
      
      return {
        processedText,
        entities,
        sentences,
        corefResult
      };
    } catch (error) {
      Logger.error('Text preprocessing failed', error);
      throw new DataProcessingError(
        'Failed to preprocess text',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): Array<{text: string, startIndex: number, endIndex: number}> {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    const sentences: Array<{text: string, startIndex: number, endIndex: number}> = [];
    
    // Split by sentence boundaries (periods, exclamation marks, question marks)
    // This is a simplified implementation - could be enhanced with more sophisticated sentence boundary detection
    const sentenceRegex = /[.!?]+\s*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = sentenceRegex.exec(text)) !== null) {
      const sentenceText = text.substring(lastIndex, match.index + match[0].length).trim();
      
      if (sentenceText.length > 0) {
        sentences.push({
          text: sentenceText,
          startIndex: lastIndex,
          endIndex: match.index + match[0].length
        });
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add the last sentence if it doesn't end with punctuation
    if (lastIndex < text.length) {
      const lastSentence = text.substring(lastIndex).trim();
      if (lastSentence.length > 0) {
        sentences.push({
          text: lastSentence,
          startIndex: lastIndex,
          endIndex: text.length
        });
      }
    }
    
    return sentences;
  }

  /**
   * Filter entities by sentence boundaries
   */
  getEntitiesInSentence(
    entities: RecognizedEntity[],
    sentence: {text: string, startIndex: number, endIndex: number}
  ): RecognizedEntity[] {
    // Apply ValidationHelpers validation
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(entities));
    
    return entities.filter(entity => 
      entity.startIndex >= sentence.startIndex && 
      entity.endIndex <= sentence.endIndex
    );
  }
}
