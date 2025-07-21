/**
 * Exa NER Provider
 * 
 * Handles Named Entity Recognition using Exa research integration.
 * Focused responsibility: External research-based entity recognition.
 */

import { Logger } from './logger.js';
import { exaResearch } from './exa_research.js';
import { ValidationHelpers } from './validation_helpers.js';
import { EntityType, RecognizedEntity } from './advanced_ner.js';

/**
 * ExaNERProvider - Focused class for Exa research-based entity recognition
 */
export class ExaNERProvider {
  
  /**
   * Recognize entities using Exa research
   */
  async recognizeEntities(text: string): Promise<RecognizedEntity[]> {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    try {
      const searchQuery = this.generateExaSearchQuery(text);
      const searchResults = await this.performExaSearch(searchQuery);
      
      if (!searchResults?.results?.length) {
        return [];
      }

      return this.processAndMergeExaResults(searchResults, text);
    } catch (error) {
      Logger.error('Exa NER recognition failed', error);
      return [];
    }
  }

  /**
   * Generate context summary for Exa search
   */
  private generateContextSummary(text: string): string {
    const words = text.split(/\s+/);
    const maxWords = 50;
    
    if (words.length <= maxWords) {
      return text;
    }
    
    return words.slice(0, maxWords).join(' ') + '...';
  }

  /**
   * Process Exa search results for entity extraction
   */
  private processExaSearchResults(
    searchResults: any, 
    originalText: string
  ): RecognizedEntity[] {
    const resultsValidation = ValidationHelpers.validateDataArray(searchResults?.results || []);
    if (!resultsValidation.isValid) {
      return [];
    }

    const entities: RecognizedEntity[] = [];
    
    for (const result of searchResults.results) {
      const extractedEntities = this.processSearchResultContent(result, originalText);
      entities.push(...extractedEntities);
    }

    return entities;
  }

  /**
   * Extract entities from search results
   */
  private extractEntitiesFromSearchResults(searchResults: any, originalText: string): RecognizedEntity[] {
    const entities: RecognizedEntity[] = [];
    
    for (const result of searchResults.results || []) {
      if (result.text) {
        const extractedEntities = this.processSearchResultContent(result, originalText);
        entities.push(...extractedEntities);
      }
    }

    const confidence = this.calculateOverallConfidence(entities);
    
    return entities.map(entity => ({
      ...entity,
      confidence: Math.min(entity.confidence, confidence)
    }));
  }

  /**
   * Process individual search result content
   */
  private processSearchResultContent(result: any, originalText: string): RecognizedEntity[] {
    if (!result?.text) {
      return [];
    }

    const entities: RecognizedEntity[] = [];
    
    // Extract from highlighted text if available
    if (result.highlights) {
      for (const highlight of result.highlights) {
        const highlightEntities = this.identifyEntitiesInFact(highlight, originalText);
        entities.push(...highlightEntities);
      }
    }

    // Extract from main text
    const textEntities = this.identifyEntitiesInFact(result, originalText);
    entities.push(...textEntities);

    return entities;
  }

  /**
   * Calculate overall confidence for entities
   */
  private calculateOverallConfidence(entities: RecognizedEntity[]): number {
    if (entities.length === 0) return 0;
    
    const totalConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0);
    return totalConfidence / entities.length;
  }

  /**
   * Identify entities in fact data
   */
  private identifyEntitiesInFact(fact: any, originalText: string): RecognizedEntity[] {
    const entities: RecognizedEntity[] = [];
    
    // Process explicit entities if available
    if (fact.entities) {
      const explicitEntities = this.processExplicitEntities(fact);
      entities.push(...explicitEntities);
    }

    // Process text-based entities
    if (fact.text) {
      const textEntities = this.processFactTextEntities(fact);
      const matchedEntities = this.matchEntitiesToOriginalText(textEntities, originalText);
      entities.push(...matchedEntities);
    }

    return entities;
  }

  /**
   * Process explicit entities from fact data
   */
  private processExplicitEntities(fact: any): RecognizedEntity[] {
    const entities: RecognizedEntity[] = [];
    
    if (!fact.entities || !Array.isArray(fact.entities)) {
      return entities;
    }

    for (const entityData of fact.entities) {
      if (entityData.text && entityData.type) {
        const entity = this.createEntityFromFactData(entityData.text, fact);
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Create entity from fact data
   */
  private createEntityFromFactData(entityText: string, fact: any): RecognizedEntity {
    return {
      text: entityText,
      type: EntityType.UNKNOWN,
      startIndex: -1,
      endIndex: -1,
      confidence: 0.7,
      metadata: {
        source: 'exa_research',
        originalFact: fact
      }
    };
  }

  /**
   * Process text entities from fact data
   */
  private processFactTextEntities(fact: any): RecognizedEntity[] {
    const entities: RecognizedEntity[] = [];
    const text = fact.text || '';
    
    // Simple pattern matching for common entity types
    const patterns = this.createEntityPatternMapping();
    
    for (const [entityType, pattern] of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            text: match,
            type: entityType,
            startIndex: -1,
            endIndex: -1,
            confidence: 0.6,
            metadata: { source: 'exa_pattern_match' }
          });
        }
      }
    }

    return entities;
  }

  /**
   * Create entity pattern mapping
   */
  private createEntityPatternMapping(): Map<EntityType, RegExp> {
    return new Map([
      [EntityType.DATE, /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g],
      [EntityType.MONEY, /\$[\d,]+(\.\d{2})?/g],
      [EntityType.PERCENT, /\d+\.?\d*%/g],
      [EntityType.ORGANIZATION, /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Group)\b/g]
    ]);
  }

  /**
   * Match entities to original text
   */
  private matchEntitiesToOriginalText(
    entities: RecognizedEntity[], 
    originalText: string
  ): RecognizedEntity[] {
    const matchedEntities: RecognizedEntity[] = [];
    
    for (const entity of entities) {
      const index = originalText.toLowerCase().indexOf(entity.text.toLowerCase());
      if (index !== -1) {
        matchedEntities.push({
          ...entity,
          startIndex: index,
          endIndex: index + entity.text.length
        });
      }
    }

    return matchedEntities;
  }

  /**
   * Generate Exa search query from text
   */
  private generateExaSearchQuery(text: string): string {
    const contextSummary = this.generateContextSummary(text);
    return `entities named in: ${contextSummary}`;
  }

  /**
   * Perform Exa search
   */
  private async performExaSearch(searchQuery: string): Promise<any> {
    try {
      const response = await exaResearch.search({
        query: searchQuery,
        numResults: 5,
        includeContents: true
      });
      return response;
    } catch (error) {
      Logger.error('Exa search failed', error);
      throw error;
    }
  }

  /**
   * Process and merge Exa results
   */
  private processAndMergeExaResults(searchResults: any, text: string): RecognizedEntity[] {
    const entities = this.extractEntitiesFromSearchResults(searchResults, text);
    
    // Remove duplicates and merge similar entities
    const uniqueEntities = new Map<string, RecognizedEntity>();
    
    for (const entity of entities) {
      const key = `${entity.text.toLowerCase()}_${entity.type}`;
      const existing = uniqueEntities.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        uniqueEntities.set(key, entity);
      }
    }

    return Array.from(uniqueEntities.values());
  }
}
