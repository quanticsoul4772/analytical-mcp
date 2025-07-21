/**
 * Text Processor
 * 
 * Handles text processing utilities (proper nouns, pattern matching, normalization).
 * Focused responsibility: Text processing utilities and preprocessing.
 */

import natural from 'natural';
import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { EntityType, RecognizedEntity } from './advanced_ner.js';

/**
 * TextProcessor - Focused class for text processing utilities
 */
export class TextProcessor {
  private tokenizer = new natural.WordTokenizer();
  private stemmer = natural.PorterStemmer;
  
  /**
   * Process proper nouns in text
   */
  processProperNouns(text: string): RecognizedEntity[] {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    try {
      return this.extractProperNounEntities(text);
    } catch (error) {
      Logger.error('Proper noun processing failed', error);
      return [];
    }
  }

  /**
   * Normalize text for processing
   */
  normalizeText(text: string): string {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return '';
    }

    try {
      const normalizationSteps = this.createNormalizationStepMapping();
      let normalizedText = text;

      for (const [stepName, normalizer] of normalizationSteps) {
        normalizedText = normalizer(normalizedText);
      }

      return normalizedText;
    } catch (error) {
      Logger.error('Text normalization failed', error);
      return text;
    }
  }

  /**
   * Create normalization step mapping
   */
  private createNormalizationStepMapping(): Map<string, (text: string) => string> {
    return new Map([
      ['whitespace', this.normalizeWhitespace.bind(this)],
      ['unicode', this.normalizeUnicode.bind(this)],
      ['punctuation', this.normalizePunctuation.bind(this)],
      ['quotes', this.normalizeQuotes.bind(this)],
      ['dashes', this.normalizeDashes.bind(this)],
      ['case', this.normalizeCase.bind(this)]
    ]);
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Normalize Unicode characters
   */
  private normalizeUnicode(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  }

  /**
   * Normalize punctuation
   */
  private normalizePunctuation(text: string): string {
    return text
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/…/g, '...')
      .replace(/–/g, '-')
      .replace(/—/g, '--');
  }

  /**
   * Normalize quotes
   */
  private normalizeQuotes(text: string): string {
    return text
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/„/g, '"')
      .replace(/"/g, '"');
  }

  /**
   * Normalize dashes
   */
  private normalizeDashes(text: string): string {
    return text
      .replace(/–/g, '-')
      .replace(/—/g, '--')
      .replace(/−/g, '-');
  }

  /**
   * Normalize case for processing
   */
  private normalizeCase(text: string): string {
    // Keep original case but provide consistent processing
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract proper noun entities
   */
  private extractProperNounEntities(text: string): RecognizedEntity[] {
    const tokens = this.tokenizer.tokenize(text);
    const entities: RecognizedEntity[] = [];
    let currentProperNoun: { words: string[]; startIndex: number } | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const isProperNoun = this.isProperNoun(token);

      if (isProperNoun) {
        if (currentProperNoun) {
          currentProperNoun.words.push(token);
        } else {
          const startIndex = this.findTokenPosition(text, tokens, i);
          currentProperNoun = {
            words: [token],
            startIndex
          };
        }
      } else {
        if (currentProperNoun && currentProperNoun.words.length > 0) {
          const entity = this.createProperNounEntity(currentProperNoun, text);
          entities.push(entity);
          currentProperNoun = null;
        }
      }
    }

    // Handle last proper noun
    if (currentProperNoun && currentProperNoun.words.length > 0) {
      const entity = this.createProperNounEntity(currentProperNoun, text);
      entities.push(entity);
    }

    return entities;
  }

  /**
   * Check if token is a proper noun
   */
  private isProperNoun(token: string): boolean {
    const properNounCriteria = this.createProperNounCriteriaMapping();
    
    for (const [criteriaName, checker] of properNounCriteria) {
      if (checker(token)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create proper noun criteria mapping
   */
  private createProperNounCriteriaMapping(): Map<string, (token: string) => boolean> {
    return new Map([
      ['capitalized', (token: string) => /^[A-Z]/.test(token)],
      ['title_case', (token: string) => /^[A-Z][a-z]+$/.test(token)],
      ['acronym', (token: string) => /^[A-Z]{2,}$/.test(token)],
      ['mixed_case', (token: string) => /^[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*$/.test(token)]
    ]);
  }

  /**
   * Create proper noun entity
   */
  private createProperNounEntity(
    properNoun: { words: string[]; startIndex: number },
    text: string
  ): RecognizedEntity {
    const entityText = properNoun.words.join(' ');
    const endIndex = properNoun.startIndex + entityText.length;

    return {
      text: entityText,
      type: this.classifyProperNoun(entityText),
      startIndex: properNoun.startIndex,
      endIndex,
      confidence: 0.7,
      metadata: {
        source: 'text_processor',
        wordCount: properNoun.words.length,
        processingType: 'proper_noun'
      }
    };
  }

  /**
   * Classify proper noun by type
   */
  private classifyProperNoun(text: string): EntityType {
    const classificationMapping = this.createProperNounClassificationMapping();
    
    for (const [entityType, classifier] of classificationMapping) {
      if (classifier(text)) {
        return entityType;
      }
    }

    return EntityType.UNKNOWN;
  }

  /**
   * Create proper noun classification mapping
   */
  private createProperNounClassificationMapping(): Map<EntityType, (text: string) => boolean> {
    return new Map([
      [EntityType.PERSON, (text: string) => {
        const parts = text.split(/\s+/);
        return parts.length >= 2 && parts.length <= 4 && 
               parts.every(part => /^[A-Z][a-z]+$/.test(part));
      }],
      [EntityType.ORGANIZATION, (text: string) => {
        return /\b(Inc|Corp|LLC|Ltd|Company|Group|University|College|School|Hospital|Bank|Trust|Agency|Department|Bureau|Office|Commission|Authority|Board|Council|Institute|Foundation|Association|Society|Union|Federation|League)\b$/i.test(text);
      }],
      [EntityType.LOCATION, (text: string) => {
        return /\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|City|Town|Village|County|State|Province|Country|North|South|East|West|Central|National|International|Park|Bridge|Center|Centre|Mountain|River|Lake|Ocean|Sea|Island|Valley|Hills?|Beach|Bay|Harbor|Port)\b$/i.test(text);
      }],
      [EntityType.FACILITY, (text: string) => {
        return /\b(Hospital|Clinic|School|University|College|Airport|Station|Stadium|Arena|Theater|Theatre|Museum|Library|Hotel|Resort|Restaurant|Mall|Plaza|Center|Centre|Market|Building|Tower|Complex|Factory|Plant|Laboratory|Lab|Office|Facility)\b$/i.test(text);
      }],
      [EntityType.PRODUCT, (text: string) => {
        return /\b(Version|v\d+|\d+\.\d+|Pro|Premium|Standard|Basic|Enterprise|Professional|Ultimate|Deluxe|Plus|Advanced|Lite|Mini|Max|Software|Application|App|Tool|System|Platform|Service|Solution|Device|Product)\b$/i.test(text);
      }]
    ]);
  }

  /**
   * Find token position in original text
   */
  private findTokenPosition(text: string, tokens: string[], tokenIndex: number): number {
    if (tokenIndex === 0) {
      return text.indexOf(tokens[0]);
    }

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
   * Match text patterns
   */
  matchPatterns(text: string, patterns: Record<string, RegExp>): Record<string, string[]> {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return {};
    }

    const results: Record<string, string[]> = {};

    try {
      for (const [patternName, pattern] of Object.entries(patterns)) {
        const matches = Array.from(text.matchAll(pattern));
        results[patternName] = matches.map(match => match[0]);
      }
    } catch (error) {
      Logger.error('Pattern matching failed', error);
    }

    return results;
  }

  /**
   * Tokenize text
   */
  tokenize(text: string): string[] {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    try {
      return this.tokenizer.tokenize(text) || [];
    } catch (error) {
      Logger.error('Tokenization failed', error);
      return [];
    }
  }

  /**
   * Stem words
   */
  stemWords(words: string[]): string[] {
    const validation = ValidationHelpers.validateDataArray(words);
    if (!validation.isValid) {
      return [];
    }

    try {
      return words.map(word => this.stemmer.stem(word));
    } catch (error) {
      Logger.error('Word stemming failed', error);
      return words;
    }
  }

  /**
   * Clean text for processing
   */
  cleanText(text: string): string {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return '';
    }

    try {
      const cleaningSteps = this.createTextCleaningMapping();
      let cleanedText = text;

      for (const [stepName, cleaner] of cleaningSteps) {
        cleanedText = cleaner(cleanedText);
      }

      return cleanedText;
    } catch (error) {
      Logger.error('Text cleaning failed', error);
      return text;
    }
  }

  /**
   * Create text cleaning mapping
   */
  private createTextCleaningMapping(): Map<string, (text: string) => string> {
    return new Map([
      ['html_tags', (text: string) => text.replace(/<[^>]*>/g, '')],
      ['extra_whitespace', (text: string) => text.replace(/\s+/g, ' ').trim()],
      ['special_chars', (text: string) => text.replace(/[^\w\s\-.,!?;:'"()]/g, '')],
      ['multiple_punctuation', (text: string) => text.replace(/([.!?]){2,}/g, '$1')],
      ['leading_trailing', (text: string) => text.trim()]
    ]);
  }

  /**
   * Extract text statistics
   */
  getTextStatistics(text: string): Record<string, number> {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return {};
    }

    try {
      const tokens = this.tokenize(text);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = tokens.filter(token => /\w/.test(token));
      const properNouns = this.processProperNouns(text);

      return {
        characterCount: text.length,
        wordCount: words.length,
        sentenceCount: sentences.length,
        tokenCount: tokens.length,
        properNounCount: properNouns.length,
        averageWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
        averageCharactersPerWord: words.length > 0 ? 
          words.reduce((sum, word) => sum + word.length, 0) / words.length : 0
      };
    } catch (error) {
      Logger.error('Text statistics calculation failed', error);
      return {};
    }
  }

  /**
   * Preprocess text for NER
   */
  preprocessForNER(text: string): string {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return '';
    }

    try {
      const preprocessingSteps = this.createPreprocessingMapping();
      let processedText = text;

      for (const [stepName, preprocessor] of preprocessingSteps) {
        processedText = preprocessor(processedText);
      }

      return processedText;
    } catch (error) {
      Logger.error('NER preprocessing failed', error);
      return text;
    }
  }

  /**
   * Create preprocessing mapping
   */
  private createPreprocessingMapping(): Map<string, (text: string) => string> {
    return new Map([
      ['normalize', this.normalizeText.bind(this)],
      ['clean', this.cleanText.bind(this)],
      ['preserve_entities', this.preserveEntityMarkers.bind(this)]
    ]);
  }

  /**
   * Preserve entity markers during preprocessing
   */
  private preserveEntityMarkers(text: string): string {
    // Protect common entity patterns from aggressive cleaning
    return text
      .replace(/(\$[\d,]+(?:\.\d{2})?)/g, '⟨MONEY⟩$1⟨/MONEY⟩')
      .replace(/(\d{1,2}\/\d{1,2}\/\d{4})/g, '⟨DATE⟩$1⟨/DATE⟩')
      .replace(/(\b\d+\.?\d*%\b)/g, '⟨PERCENT⟩$1⟨/PERCENT⟩')
      .replace(/(https?:\/\/[^\s]+)/g, '⟨URL⟩$1⟨/URL⟩')
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '⟨EMAIL⟩$1⟨/EMAIL⟩');
  }
}
