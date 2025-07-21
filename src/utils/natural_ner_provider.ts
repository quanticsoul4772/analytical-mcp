/**
 * Natural NER Provider
 * 
 * Handles Named Entity Recognition using Natural.js library integration.
 * Focused responsibility: Third-party NER library integration.
 */

import natural from 'natural';
import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { EntityType, RecognizedEntity } from './advanced_ner.js';

/**
 * NaturalNERProvider - Focused class for Natural.js NER integration
 */
export class NaturalNERProvider {
  private tokenizer = new natural.WordTokenizer();
  private ner: any = null; // Natural.js NER is not available
  private nerModelLoaded = false;
  
  constructor() {
    // Natural.js NER is not available in current version
    if (this.ner) {
      try {
        // Load the built-in model asynchronously
        this.loadNerModel().catch(err => {
          Logger.error('Failed to load NER model', err);
        });
      } catch (error) {
        Logger.error('Error initializing natural.js NER', error);
      }
    }
  }

  /**
   * Load the natural.js NER model asynchronously
   */
  private async loadNerModel(): Promise<void> {
    if (this.ner && !this.nerModelLoaded) {
      try {
        await this.ner.load();
        this.nerModelLoaded = true;
        Logger.debug('Natural.js NER model loaded successfully');
      } catch (error) {
        Logger.error('Failed to load natural.js NER model', error);
        throw error;
      }
    }
  }

  /**
   * Recognize entities using Natural.js NER
   */
  recognizeEntities(text: string): RecognizedEntity[] {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    if (!this.shouldUseNaturalNER()) {
      return [];
    }

    return this.tryNaturalNER(text) || [];
  }

  /**
   * Recognize entities with Natural.js NER
   */
  private recognizeWithNaturalNER(text: string): RecognizedEntity[] {
    if (!this.ner || !this.nerModelLoaded) {
      Logger.debug('Natural.js NER not available or not loaded');
      return [];
    }

    try {
      const tokens = this.tokenizer.tokenize(text);
      const entities: RecognizedEntity[] = [];
      
      // Use Natural.js NER to identify entities
      const nerResults = this.ner.process(tokens);
      
      for (let i = 0; i < nerResults.length; i++) {
        const result = nerResults[i];
        
        if (result.entityType && result.entityType !== 'O') {
          const entityType = this.mapNaturalEntityType(result.entityType);
          const startIndex = this.findTokenStartIndex(text, tokens, i);
          const endIndex = startIndex + tokens[i].length;
          
          entities.push({
            text: tokens[i],
            type: entityType,
            startIndex,
            endIndex,
            confidence: result.confidence || 0.8,
            metadata: {
              source: 'natural_ner',
              originalType: result.entityType
            }
          });
        }
      }

      return entities;
    } catch (error) {
      Logger.error('Natural.js NER processing failed', error);
      return [];
    }
  }

  /**
   * Map Natural.js entity types to our EntityType enum
   */
  private mapNaturalEntityType(naturalType: string): EntityType {
    const naturalTypeMapping = this.createNaturalTypeMapping();
    return naturalTypeMapping.get(naturalType.toUpperCase()) || EntityType.UNKNOWN;
  }

  /**
   * Create Natural.js type mapping
   */
  private createNaturalTypeMapping(): Map<string, EntityType> {
    return new Map([
      ['PERSON', EntityType.PERSON],
      ['PER', EntityType.PERSON],
      ['ORGANIZATION', EntityType.ORGANIZATION],
      ['ORG', EntityType.ORGANIZATION],
      ['LOCATION', EntityType.LOCATION],
      ['LOC', EntityType.LOCATION],
      ['DATE', EntityType.DATE],
      ['TIME', EntityType.TIME],
      ['MONEY', EntityType.MONEY],
      ['PERCENT', EntityType.PERCENT],
      ['FACILITY', EntityType.FACILITY],
      ['PRODUCT', EntityType.PRODUCT],
      ['EVENT', EntityType.EVENT],
      ['LAW', EntityType.LAW],
      ['LANGUAGE', EntityType.LANGUAGE],
      ['WORK_OF_ART', EntityType.WORK_OF_ART]
    ]);
  }

  /**
   * Check if Natural NER should be used
   */
  private shouldUseNaturalNER(): boolean {
    return this.ner && this.nerModelLoaded;
  }

  /**
   * Try Natural NER processing
   */
  private tryNaturalNER(text: string): RecognizedEntity[] | null {
    try {
      if (!this.shouldUseNaturalNER()) {
        return null;
      }
      
      return this.recognizeWithNaturalNER(text);
    } catch (error) {
      Logger.error('Natural NER attempt failed', error);
      return null;
    }
  }

  /**
   * Find token start index in original text
   */
  private findTokenStartIndex(text: string, tokens: string[], tokenIndex: number): number {
    if (tokenIndex === 0) {
      return text.indexOf(tokens[0]);
    }
    
    // Find the start of this token by looking for it after previous tokens
    let searchFrom = 0;
    for (let i = 0; i < tokenIndex; i++) {
      const found = text.indexOf(tokens[i], searchFrom);
      if (found !== -1) {
        searchFrom = found + tokens[i].length;
      }
    }
    
    return text.indexOf(tokens[tokenIndex], searchFrom);
  }

  /**
   * Check if Natural.js NER is available and loaded
   */
  isAvailable(): boolean {
    return this.shouldUseNaturalNER();
  }

  /**
   * Get tokenized text using Natural.js tokenizer
   */
  tokenize(text: string): string[] {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    return this.tokenizer.tokenize(text) || [];
  }

  /**
   * Process text with POS tagging using Natural.js
   */
  getPOSTags(text: string): Array<{word: string, tag: string}> {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    try {
      const tokens = this.tokenize(text);
      if (natural.BrillPOSTagger) {
        try {
          const tagger = new natural.BrillPOSTagger(null, null);
          const result = tagger.tag(tokens);
          const tags = result.taggedWords || result;
          return Array.isArray(tags) ? tags.map(item => ({
            word: (item as any).token || (item as any).word || item,
            tag: (item as any).tag || 'NN'
          })) : [];
        } catch (err) {
          return tokens.map(token => ({ word: token, tag: 'NN' }));
        }
      } else {
        return tokens.map(token => ({ word: token, tag: 'NN' }));
      }
    } catch (error) {
      Logger.error('POS tagging failed', error);
      return [];
    }
  }
}
