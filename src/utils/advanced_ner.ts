/**
 * Advanced Named Entity Recognition
 * 
 * This module provides enhanced named entity recognition capabilities using 
 * a combination of Exa research integration and rule-based approaches.
 */

import natural from 'natural';
import { Logger } from './logger.js';
import { nlpToolkit } from './nlp_toolkit.js';
import { exaResearch } from './exa_research.js';
import { factExtractor } from './advanced_fact_extraction.js';
import { config, isFeatureEnabled } from './config.js';
import { APIError, DataProcessingError } from './errors.js';

// Entity types supported
export enum EntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  DATE = 'DATE',
  TIME = 'TIME',
  MONEY = 'MONEY',
  PERCENT = 'PERCENT',
  FACILITY = 'FACILITY',
  PRODUCT = 'PRODUCT',
  EVENT = 'EVENT',
  LAW = 'LAW',
  LANGUAGE = 'LANGUAGE',
  WORK_OF_ART = 'WORK_OF_ART',
  UNKNOWN = 'UNKNOWN'
}

// Recognized entity
export interface RecognizedEntity {
  text: string;
  type: EntityType;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata?: Record<string, any>;
}

// Exa search result with extracted entities
interface ExaEntityExtractionResult {
  entities: RecognizedEntity[];
  confidence: number;
}

/**
 * Advanced Named Entity Recognition class
 * Combines multiple techniques for robust entity recognition
 */
export class AdvancedNER {
  private tokenizer = new natural.WordTokenizer();
  private ner = natural.NER ? new natural.NER() : null;
  private nerModelLoaded = false;
  
  constructor() {
    // Initialize natural.js NER model if available
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
   * Recognize entities in text using the best available method
   */
  async recognizeEntities(text: string): Promise<RecognizedEntity[]> {
    try {
      // Try Exa-based NER first if research integration is enabled
      if (isFeatureEnabled('researchIntegration') && config.NLP_USE_EXA === 'true') {
        try {
          return await this.recognizeWithExa(text);
        } catch (error) {
          Logger.warn('Exa-based NER failed, falling back to alternative methods', error);
          // Fall through to alternative methods
        }
      }
      
      // Try natural.js NER if model is loaded
      if (this.ner && this.nerModelLoaded) {
        try {
          return this.recognizeWithNaturalNER(text);
        } catch (error) {
          Logger.warn('Natural.js NER failed, falling back to rule-based approach', error);
          // Fall through to rule-based approach
        }
      }
      
      // Fall back to rule-based approach
      return this.recognizeWithRules(text);
    } catch (error) {
      Logger.error('Entity recognition failed', error);
      throw new DataProcessingError(
        'Failed to recognize entities',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Recognize entities using Exa search and research capabilities
   */
  private async recognizeWithExa(text: string): Promise<RecognizedEntity[]> {
    try {
      Logger.debug('Using Exa-based entity recognition for text', { textLength: text.length });
      
      // Extract some context to help focus the search query
      const contextSummary = this.generateContextSummary(text);
      
      // Create a search query focused on entity recognition
      const searchQuery = `Identify entities in: "${contextSummary}"`;
      
      // Use Exa search to get relevant information
      const searchResults = await exaResearch.search({
        query: searchQuery,
        numResults: config.NLP_EXA_SEARCH_PARAMS.numResults,
        useWebResults: config.NLP_EXA_SEARCH_PARAMS.useWebResults,
        useNewsResults: config.NLP_EXA_SEARCH_PARAMS.useNewsResults,
        includeContents: true
      });
      
      // Process search results to extract entities
      const extractionResult = this.processExaSearchResults(searchResults, text);
      
      // Combine with direct text analysis for more accurate results
      const directEntities = this.extractDirectEntities(text);
      
      // Merge results, removing duplicates and combining confidence scores
      const mergedEntities = this.mergeEntityResults(extractionResult.entities, directEntities);
      
      Logger.debug('Exa-based entity recognition complete', { 
        entityCount: mergedEntities.length
      });
      
      return mergedEntities;
    } catch (error) {
      Logger.error('Exa-based entity recognition failed', error);
      
      if (error instanceof APIError) {
        throw error; // Rethrow API errors for proper handling
      }
      
      throw new DataProcessingError(
        'Failed to recognize entities with Exa',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Generate a shortened context summary for search
   */
  private generateContextSummary(text: string): string {
    // Extract the first few sentences or a limited character count
    const maxChars = 200;
    if (text.length <= maxChars) {
      return text;
    }
    
    // Try to find a sentence boundary
    const sentenceMatch = text.substring(0, maxChars).match(/^(.*?[.!?])\s/);
    if (sentenceMatch) {
      return sentenceMatch[1];
    }
    
    // Fall back to character truncation
    return text.substring(0, maxChars) + '...';
  }
  
  /**
   * Process Exa search results to extract entities
   */
  private processExaSearchResults(
    searchResults: any, 
    originalText: string
  ): ExaEntityExtractionResult {
    const allEntities: RecognizedEntity[] = [];
    let totalConfidence = 0;
    
    // Process each search result
    if (searchResults && searchResults.results && Array.isArray(searchResults.results)) {
      for (const result of searchResults.results) {
        if (result.contents) {
          // Extract entities from the content using our fact extractor
          const facts = factExtractor.extractFacts(result.contents, {
            maxFacts: 10,
            requireEntities: true,
            filterBoilerplate: true
          });
          
          // Process extracted facts into entities
          for (const fact of facts) {
            const extractedEntities = this.identifyEntitiesInFact(fact, originalText);
            allEntities.push(...extractedEntities);
          }
        }
      }
    }
    
    // Attempt to locate entities in the original text
    const matchedEntities = this.matchEntitiesToOriginalText(allEntities, originalText);
    
    // Calculate overall confidence
    const confidence = matchedEntities.length > 0 ? 
      matchedEntities.reduce((sum, entity) => sum + entity.confidence, 0) / matchedEntities.length :
      0;
    
    return {
      entities: matchedEntities,
      confidence
    };
  }
  
  /**
   * Identify entities in an extracted fact
   */
  private identifyEntitiesInFact(fact: any, originalText: string): RecognizedEntity[] {
    const entities: RecognizedEntity[] = [];
    
    // Check if the fact has explicit entities
    if (fact.entities && Array.isArray(fact.entities)) {
      for (const entity of fact.entities) {
        // Skip very short entities
        if (typeof entity !== 'string' || entity.length < 2) {
          continue;
        }
        
        // Try to determine entity type
        const entityType = this.inferEntityTypeFromContext(entity, fact.text);
        
        entities.push({
          text: entity,
          type: entityType,
          startIndex: -1, // Will be filled in by matchEntitiesToOriginalText
          endIndex: -1,   // Will be filled in by matchEntitiesToOriginalText
          confidence: fact.score || 0.6 // Use fact score if available, otherwise default
        });
      }
    }
    
    // If no explicit entities, try to extract entities from the fact text
    if (entities.length === 0 && fact.text) {
      // Use rule-based extraction as a fallback
      const extractedEntities = this.extractEntitiesWithRules(fact.text);
      
      for (const entity of extractedEntities) {
        entities.push({
          text: entity.text,
          type: entity.type,
          startIndex: -1, // Will be filled in by matchEntitiesToOriginalText
          endIndex: -1,   // Will be filled in by matchEntitiesToOriginalText
          confidence: 0.5 // Lower confidence for rule-based extraction from facts
        });
      }
    }
    
    return entities;
  }
  
  /**
   * Match extracted entities to positions in the original text
   */
  private matchEntitiesToOriginalText(
    entities: RecognizedEntity[], 
    originalText: string
  ): RecognizedEntity[] {
    const matchedEntities: RecognizedEntity[] = [];
    
    for (const entity of entities) {
      // Skip entities that already have positions
      if (entity.startIndex !== -1 && entity.endIndex !== -1) {
        matchedEntities.push(entity);
        continue;
      }
      
      // Try to find the entity in the original text
      const entityIndex = originalText.indexOf(entity.text);
      if (entityIndex !== -1) {
        matchedEntities.push({
          ...entity,
          startIndex: entityIndex,
          endIndex: entityIndex + entity.text.length
        });
      }
    }
    
    return matchedEntities;
  }
  
  /**
   * Extract entities directly from the text
   */
  private extractDirectEntities(text: string): RecognizedEntity[] {
    // Use a combination of NLP toolkit and rule-based extraction
    const entities: RecognizedEntity[] = [];
    
    // Extract named entities using NLP toolkit
    const namedEntities = nlpToolkit.extractNamedEntities(text);
    
    // Convert to our entity format
    for (const person of namedEntities.persons) {
      const index = text.indexOf(person);
      if (index !== -1) {
        entities.push({
          text: person,
          type: EntityType.PERSON,
          startIndex: index,
          endIndex: index + person.length,
          confidence: 0.7
        });
      }
    }
    
    for (const org of namedEntities.organizations) {
      const index = text.indexOf(org);
      if (index !== -1) {
        entities.push({
          text: org,
          type: EntityType.ORGANIZATION,
          startIndex: index,
          endIndex: index + org.length,
          confidence: 0.6
        });
      }
    }
    
    for (const location of namedEntities.locations) {
      const index = text.indexOf(location);
      if (index !== -1) {
        entities.push({
          text: location,
          type: EntityType.LOCATION,
          startIndex: index,
          endIndex: index + location.length,
          confidence: 0.6
        });
      }
    }
    
    // Add rule-based entities
    const ruleEntities = this.extractEntitiesWithRules(text);
    
    // Convert to our format with positions
    for (const entity of ruleEntities) {
      const index = text.indexOf(entity.text);
      if (index !== -1) {
        entities.push({
          ...entity,
          startIndex: index,
          endIndex: index + entity.text.length
        });
      }
    }
    
    return entities;
  }
  
  /**
   * Extract entities using rule-based patterns
   */
  private extractEntitiesWithRules(text: string): RecognizedEntity[] {
    const entities: RecognizedEntity[] = [];
    
    // Define patterns for different entity types
    const patterns = [
      // Date patterns
      { 
        regex: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}\b/gi,
        type: EntityType.DATE,
        confidence: 0.8
      },
      { 
        regex: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
        type: EntityType.DATE,
        confidence: 0.7
      },
      
      // Money patterns
      { 
        regex: /\$\d+(?:\.\d+)?(?:\s+(?:million|billion|trillion))?\b/g,
        type: EntityType.MONEY,
        confidence: 0.8
      },
      { 
        regex: /\b\d+(?:\.\d+)?\s+(?:dollars|euros|pounds|yen)\b/gi,
        type: EntityType.MONEY,
        confidence: 0.7
      },
      
      // Percentage patterns
      { 
        regex: /\b\d+(?:\.\d+)?%\b/g,
        type: EntityType.PERCENT,
        confidence: 0.8
      },
      { 
        regex: /\b\d+(?:\.\d+)?\s+percent\b/gi,
        type: EntityType.PERCENT,
        confidence: 0.8
      },
      
      // Organization patterns (simplified)
      { 
        regex: /\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)+\s+(?:Inc\.|Corp\.|LLC|Ltd\.|Company|Association|University|College|School|Foundation)\b/g,
        type: EntityType.ORGANIZATION,
        confidence: 0.7
      },
      
      // Location patterns (simplified)
      { 
        regex: /\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\s+(?:Street|Avenue|Road|Lane|Boulevard|City|County|State|Country)\b/g,
        type: EntityType.LOCATION,
        confidence: 0.7
      }
    ];
    
    // Apply each pattern
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex) || [];
      
      for (const match of matches) {
        entities.push({
          text: match,
          type: pattern.type,
          startIndex: -1, // Position not determined at this stage
          endIndex: -1,   // Position not determined at this stage
          confidence: pattern.confidence
        });
      }
    }
    
    return entities;
  }
  
  /**
   * Infer entity type from context
   */
  private inferEntityTypeFromContext(entity: string, context: string): EntityType {
    const entityLower = entity.toLowerCase();
    const contextLower = context.toLowerCase();
    
    // Check for organization indicators
    if (
      entityLower.includes(' inc') || 
      entityLower.includes(' corp') || 
      entityLower.includes(' llc') ||
      entityLower.includes(' ltd') ||
      entityLower.includes(' company') ||
      entityLower.includes(' association') ||
      entityLower.includes(' university') ||
      entityLower.includes(' college') ||
      entityLower.includes(' school') ||
      entityLower.includes(' foundation') ||
      // Context indicators
      contextLower.includes(`${entityLower} announced`) ||
      contextLower.includes(`${entityLower} reported`) ||
      contextLower.includes(`${entityLower} said`)
    ) {
      return EntityType.ORGANIZATION;
    }
    
    // Check for location indicators
    if (
      entityLower.includes(' street') || 
      entityLower.includes(' avenue') || 
      entityLower.includes(' road') ||
      entityLower.includes(' lane') ||
      entityLower.includes(' boulevard') ||
      entityLower.includes(' city') ||
      entityLower.includes(' county') ||
      entityLower.includes(' state') ||
      entityLower.includes(' country') ||
      // Context indicators
      contextLower.includes(`in ${entityLower}`) ||
      contextLower.includes(`at ${entityLower}`) ||
      contextLower.includes(`to ${entityLower}`) ||
      contextLower.includes(`from ${entityLower}`)
    ) {
      return EntityType.LOCATION;
    }
    
    // Check for person indicators in context
    if (
      contextLower.includes(`mr. ${entityLower}`) ||
      contextLower.includes(`ms. ${entityLower}`) ||
      contextLower.includes(`mrs. ${entityLower}`) ||
      contextLower.includes(`dr. ${entityLower}`) ||
      contextLower.includes(`${entityLower} says`) ||
      contextLower.includes(`${entityLower} said`)
    ) {
      return EntityType.PERSON;
    }
    
    // Default to person if we can't determine
    // This is a simplistic approach and would need improvement
    return EntityType.PERSON;
  }
  
  /**
   * Merge entity results from different sources
   */
  private mergeEntityResults(
    exaEntities: RecognizedEntity[], 
    directEntities: RecognizedEntity[]
  ): RecognizedEntity[] {
    const mergedEntities: RecognizedEntity[] = [];
    const entityMap = new Map<string, RecognizedEntity>();
    
    // Process Exa entities first (they generally have higher confidence)
    for (const entity of exaEntities) {
      const key = `${entity.text}|${entity.type}|${entity.startIndex}|${entity.endIndex}`;
      entityMap.set(key, entity);
    }
    
    // Add or update with direct entities
    for (const entity of directEntities) {
      const key = `${entity.text}|${entity.type}|${entity.startIndex}|${entity.endIndex}`;
      
      if (entityMap.has(key)) {
        // Entity exists, update confidence
        const existingEntity = entityMap.get(key)!;
        const newConfidence = (existingEntity.confidence + entity.confidence) / 2;
        entityMap.set(key, {
          ...existingEntity,
          confidence: newConfidence
        });
      } else {
        // New entity
        entityMap.set(key, entity);
      }
    }
    
    // Convert map back to array
    for (const entity of entityMap.values()) {
      mergedEntities.push(entity);
    }
    
    return mergedEntities;
  }
  
  /**
   * Recognize entities using natural.js NER
   */
  private recognizeWithNaturalNER(text: string): RecognizedEntity[] {
    if (!this.ner || !this.nerModelLoaded) {
      throw new Error('Natural.js NER not initialized or model not loaded');
    }
    
    try {
      // Tokenize the text
      const tokens = this.tokenizer.tokenize(text);
      
      // Get entity tags
      const tags = this.ner.getEntities(tokens);
      
      // Process natural.js NER results
      const entities: RecognizedEntity[] = [];
      let currentEntity: {
        type: string;
        words: string[];
        startIndex: number;
      } | null = null;
      
      let currentIndex = 0;
      
      // Find the start index of each token in the original text
      const tokenPositions: number[] = [];
      let searchIndex = 0;
      
      for (const token of tokens) {
        const tokenIndex = text.indexOf(token, searchIndex);
        if (tokenIndex !== -1) {
          tokenPositions.push(tokenIndex);
          searchIndex = tokenIndex + token.length;
        } else {
          // Fallback if token not found
          tokenPositions.push(searchIndex);
        }
      }
      
      // Process tags
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        const token = tokens[i];
        const startIndex = tokenPositions[i];
        
        if (tag !== 'O') {
          if (!currentEntity || currentEntity.type !== tag) {
            if (currentEntity) {
              const entityText = currentEntity.words.join(' ');
              const startIndex = currentEntity.startIndex;
              const endIndex = text.indexOf(entityText, startIndex) + entityText.length;
              
              entities.push({
                text: entityText,
                type: this.mapNaturalEntityType(currentEntity.type),
                startIndex,
                endIndex,
                confidence: 0.7 // Default confidence for natural.js
              });
            }
            
            currentEntity = {
              type: tag,
              words: [token],
              startIndex
            };
          } else {
            currentEntity.words.push(token);
          }
        } else if (currentEntity) {
          const entityText = currentEntity.words.join(' ');
          const startIndex = currentEntity.startIndex;
          const endIndex = startIndex + entityText.length;
          
          entities.push({
            text: entityText,
            type: this.mapNaturalEntityType(currentEntity.type),
            startIndex,
            endIndex,
            confidence: 0.7 // Default confidence for natural.js
          });
          
          currentEntity = null;
        }
      }
      
      // Add the last entity if any
      if (currentEntity) {
        const entityText = currentEntity.words.join(' ');
        const startIndex = currentEntity.startIndex;
        const endIndex = startIndex + entityText.length;
        
        entities.push({
          text: entityText,
          type: this.mapNaturalEntityType(currentEntity.type),
          startIndex,
          endIndex,
          confidence: 0.7 // Default confidence for natural.js
        });
      }
      
      return entities;
    } catch (error) {
      Logger.error('Natural.js NER failed', error);
      throw new DataProcessingError(
        'Failed to recognize entities with natural.js',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Map natural.js entity types to our system
   */
  private mapNaturalEntityType(naturalType: string): EntityType {
    switch (naturalType) {
      case 'person':
        return EntityType.PERSON;
      case 'organization':
        return EntityType.ORGANIZATION;
      case 'location':
        return EntityType.LOCATION;
      case 'date':
        return EntityType.DATE;
      case 'time':
        return EntityType.TIME;
      case 'money':
        return EntityType.MONEY;
      case 'percent':
        return EntityType.PERCENT;
      default:
        return EntityType.UNKNOWN;
    }
  }
  
  /**
   * Recognize entities using rule-based approach
   */
  private recognizeWithRules(text: string): RecognizedEntity[] {
    try {
      const entities: RecognizedEntity[] = [];
      
      // Use POS tagging from NLP toolkit
      const posTags = nlpToolkit.getPOSTags(text);
      
      // Find proper nouns (potential entities)
      let currentEntity: {
        words: string[];
        type: EntityType;
        startIndex: number;
      } | null = null;
      
      // Find all tokens in original text
      let currentIndex = 0;
      for (let i = 0; i < posTags.length; i++) {
        const { word, tag } = posTags[i];
        
        // Find the word in the original text
        const wordIndex = text.indexOf(word, currentIndex);
        const startIndex = wordIndex !== -1 ? wordIndex : currentIndex;
        currentIndex = startIndex + word.length;
        
        // Handle proper nouns
        if (tag === 'NNP' || tag === 'NNPS') {
          if (!currentEntity) {
            currentEntity = {
              words: [word],
              type: EntityType.UNKNOWN,
              startIndex
            };
          } else {
            currentEntity.words.push(word);
          }
        } else if (currentEntity) {
          // End of a named entity - try to classify it
          this.classifyRuleBasedEntity(currentEntity, entities, text);
          currentEntity = null;
        }
        
        // Look for specific patterns
        this.extractDateEntities(text, posTags, i, entities);
        this.extractMoneyEntities(text, posTags, i, entities);
      }
      
      // Add the last entity if any
      if (currentEntity) {
        this.classifyRuleBasedEntity(currentEntity, entities, text);
      }
      
      return entities;
    } catch (error) {
      Logger.error('Rule-based entity recognition failed', error);
      throw new DataProcessingError(
        'Failed to recognize entities with rule-based approach',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Classify an entity based on rules and add it to the entities array
   */
  private classifyRuleBasedEntity(
    currentEntity: { words: string[]; type: EntityType; startIndex: number },
    entities: RecognizedEntity[],
    text: string
  ): void {
    const entityText = currentEntity.words.join(' ');
    const startIndex = currentEntity.startIndex;
    const endIndex = startIndex + entityText.length;
    
    // Try to classify the entity type
    const entityType = this.determineEntityType(entityText);
    
    entities.push({
      text: entityText,
      type: entityType,
      startIndex,
      endIndex,
      confidence: 0.6 // Default confidence for rule-based approach
    });
  }
  
  /**
   * Determine the entity type based on patterns and rules
   */
  private determineEntityType(text: string): EntityType {
    // Check for organization indicators
    if (
      text.includes(' Inc') || 
      text.includes(' Corp') || 
      text.includes(' LLC') ||
      text.includes(' Ltd') ||
      text.includes(' Company') ||
      text.includes(' Association') ||
      text.includes(' University') ||
      text.includes(' College') ||
      text.includes(' School') ||
      text.includes(' Foundation')
    ) {
      return EntityType.ORGANIZATION;
    }
    
    // Check for location indicators
    if (
      text.includes(' Street') || 
      text.includes(' Avenue') || 
      text.includes(' Road') ||
      text.includes(' Lane') ||
      text.includes(' Boulevard') ||
      text.includes(' City') ||
      text.includes(' County') ||
      text.includes(' State') ||
      text.includes(' Country')
    ) {
      return EntityType.LOCATION;
    }
    
    // Default to person if we can't determine
    // This is a simplistic approach and would need improvement
    return EntityType.PERSON;
  }
  
  /**
   * Extract date entities from text
   */
  private extractDateEntities(
    text: string, 
    posTags: Array<{word: string, tag: string}>, 
    currentIndex: number,
    entities: RecognizedEntity[]
  ): void {
    // Simple date extraction
    if (currentIndex + 2 < posTags.length) {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      const currentWord = posTags[currentIndex].word.toLowerCase();
      const nextWord = posTags[currentIndex + 1].word;
      const thirdWord = posTags[currentIndex + 2].word;
      
      // Check for "Month Day, Year" pattern
      if (
        monthNames.includes(currentWord) &&
        /^[0-9]{1,2}(st|nd|rd|th)?$/.test(nextWord) &&
        /^[0-9]{4}$/.test(thirdWord)
      ) {
        const dateText = `${posTags[currentIndex].word} ${nextWord} ${thirdWord}`;
        const startIndex = text.indexOf(dateText);
        
        if (startIndex !== -1) {
          entities.push({
            text: dateText,
            type: EntityType.DATE,
            startIndex,
            endIndex: startIndex + dateText.length,
            confidence: 0.75
          });
        }
      }
    }
  }
  
  /**
   * Extract money entities from text
   */
  private extractMoneyEntities(
    text: string, 
    posTags: Array<{word: string, tag: string}>, 
    currentIndex: number,
    entities: RecognizedEntity[]
  ): void {
    // Simple money extraction
    const currencySymbols = ['$', '€', '£', '¥'];
    const currentWord = posTags[currentIndex].word;
    
    // Check for currency symbol followed by number
    if (
      currencySymbols.includes(currentWord) &&
      currentIndex + 1 < posTags.length &&
      /^[0-9]+(\.[0-9]+)?$/.test(posTags[currentIndex + 1].word)
    ) {
      const moneyText = `${currentWord}${posTags[currentIndex + 1].word}`;
      const startIndex = text.indexOf(moneyText);
      
      if (startIndex !== -1) {
        entities.push({
          text: moneyText,
          type: EntityType.MONEY,
          startIndex,
          endIndex: startIndex + moneyText.length,
          confidence: 0.8
        });
      }
    }
    
    // Check for number followed by currency words
    if (
      /^[0-9]+(\.[0-9]+)?$/.test(currentWord) &&
      currentIndex + 1 < posTags.length &&
      ['dollars', 'euros', 'pounds', 'yen'].includes(posTags[currentIndex + 1].word.toLowerCase())
    ) {
      const moneyText = `${currentWord} ${posTags[currentIndex + 1].word}`;
      const startIndex = text.indexOf(moneyText);
      
      if (startIndex !== -1) {
        entities.push({
          text: moneyText,
          type: EntityType.MONEY,
          startIndex,
          endIndex: startIndex + moneyText.length,
          confidence: 0.8
        });
      }
    }
  }
}

// Singleton instance
export const advancedNER = new AdvancedNER();
