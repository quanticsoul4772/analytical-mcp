/**
 * Advanced Named Entity Recognition - Coordinator
 * 
 * Orchestrates multiple NER providers using ValidationHelpers + mapping patterns.
 * Focused responsibility: NER coordination and orchestration.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { config, isFeatureEnabled } from './config.js';
import { APIError, DataProcessingError } from './errors.js';

// Import provider classes
import { ExaNERProvider } from './exa_ner_provider.js';
import { NaturalNERProvider } from './natural_ner_provider.js';
import { RuleBasedNERProvider } from './rule_based_ner_provider.js';
import { EntityExtractor } from './entity_extractor.js';
import { TextProcessor } from './text_processor.js';

// Entity types supported (kept for backward compatibility)
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
  URL = 'URL',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  COORDINATES = 'COORDINATES',
  MEASUREMENT = 'MEASUREMENT',
  UNKNOWN = 'UNKNOWN'
}

// Recognized entity interface (kept for backward compatibility)
export interface RecognizedEntity {
  text: string;
  type: EntityType;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata?: Record<string, any>;
}

// Provider strategy type
type ProviderStrategy = 'exa' | 'natural' | 'rule_based' | 'specialized' | 'text_processing';

// Provider result interface
interface ProviderResult {
  entities: RecognizedEntity[];
  providerName: string;
  confidence: number;
  processingTime: number;
}

/**
 * Advanced Named Entity Recognition - Coordinator Class
 * Orchestrates multiple focused NER providers using mapping patterns
 */
export class AdvancedNER {
  private exaNERProvider: ExaNERProvider;
  private naturalNERProvider: NaturalNERProvider;
  private ruleBasedNERProvider: RuleBasedNERProvider;
  private entityExtractor: EntityExtractor;
  private textProcessor: TextProcessor;
  
  constructor() {
    // Initialize all provider instances
    this.exaNERProvider = new ExaNERProvider();
    this.naturalNERProvider = new NaturalNERProvider();
    this.ruleBasedNERProvider = new RuleBasedNERProvider();
    this.entityExtractor = new EntityExtractor();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Recognize entities in text using the best available method
   */
  async recognizeEntities(text: string): Promise<RecognizedEntity[]> {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      throw new DataProcessingError('ERR_3001', 'Invalid input text for entity recognition', { text });
    }

    try {
      const preprocessedText = this.preprocessText(text);
      const providerResults = await this.executeProviderStrategy(preprocessedText);
      const mergedEntities = this.mergeProviderResults(providerResults);
      return this.postProcessEntities(mergedEntities, text);
    } catch (error) {
      Logger.error('Entity recognition failed', error);
      throw new DataProcessingError(
        'ERR_3001',
        'Failed to recognize entities',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Preprocess text using TextProcessor
   */
  private preprocessText(text: string): string {
    try {
      return this.textProcessor.preprocessForNER(text);
    } catch (error) {
      Logger.warn('Text preprocessing failed, using original text', error);
      return text;
    }
  }

  /**
   * Execute provider strategy using mapping patterns
   */
  private async executeProviderStrategy(text: string): Promise<ProviderResult[]> {
    const providerMapping = this.createProviderExecutionMapping();
    const results: ProviderResult[] = [];

    for (const [providerName, executor] of providerMapping) {
      try {
        if (this.shouldUseProvider(providerName)) {
          const startTime = Date.now();
          const entities = await executor(text);
          const processingTime = Date.now() - startTime;
          
          results.push({
            entities,
            providerName,
            confidence: this.calculateProviderConfidence(providerName, entities),
            processingTime
          });
        }
      } catch (error) {
        Logger.warn(`Provider ${providerName} failed`, error);
      }
    }

    return results;
  }

  /**
   * Create provider execution mapping
   */
  private createProviderExecutionMapping(): Map<ProviderStrategy, (text: string) => Promise<RecognizedEntity[]>> {
    return new Map([
      ['exa', this.executeExaProvider.bind(this)],
      ['natural', this.executeNaturalProvider.bind(this)],
      ['rule_based', this.executeRuleBasedProvider.bind(this)],
      ['specialized', this.executeSpecializedProvider.bind(this)],
      ['text_processing', this.executeTextProcessingProvider.bind(this)]
    ]);
  }

  /**
   * Execute Exa provider
   */
  private async executeExaProvider(text: string): Promise<RecognizedEntity[]> {
    return await this.exaNERProvider.recognizeEntities(text);
  }

  /**
   * Execute Natural provider
   */
  private async executeNaturalProvider(text: string): Promise<RecognizedEntity[]> {
    return this.naturalNERProvider.recognizeEntities(text);
  }

  /**
   * Execute rule-based provider
   */
  private async executeRuleBasedProvider(text: string): Promise<RecognizedEntity[]> {
    return this.ruleBasedNERProvider.recognizeEntities(text);
  }

  /**
   * Execute specialized entity extractor
   */
  private async executeSpecializedProvider(text: string): Promise<RecognizedEntity[]> {
    return this.entityExtractor.extractEntities(text);
  }

  /**
   * Execute text processing provider
   */
  private async executeTextProcessingProvider(text: string): Promise<RecognizedEntity[]> {
    return this.textProcessor.processProperNouns(text);
  }

  /**
   * Check if provider should be used
   */
  private shouldUseProvider(providerName: ProviderStrategy): boolean {
    const providerAvailabilityMapping = this.createProviderAvailabilityMapping();
    const checker = providerAvailabilityMapping.get(providerName);
    return checker ? checker() : false;
  }

  /**
   * Create provider availability mapping
   */
  private createProviderAvailabilityMapping(): Map<ProviderStrategy, () => boolean> {
    return new Map([
      ['exa', () => this.shouldUseExaNER()],
      ['natural', () => this.shouldUseNaturalNER()],
      ['rule_based', () => true], // Always available
      ['specialized', () => true], // Always available
      ['text_processing', () => true] // Always available
    ]);
  }

  /**
   * Check if Exa-based NER should be used
   */
  private shouldUseExaNER(): boolean {
    return isFeatureEnabled('researchIntegration') && config.NLP_USE_EXA === 'true';
  }

  /**
   * Check if Natural.js NER should be used
   */
  private shouldUseNaturalNER(): boolean {
    return this.naturalNERProvider.isAvailable();
  }

  /**
   * Calculate provider confidence score
   */
  private calculateProviderConfidence(providerName: ProviderStrategy, entities: RecognizedEntity[]): number {
    if (entities.length === 0) return 0;
    
    const confidenceMapping = this.createProviderConfidenceMapping();
    const baseConfidence = confidenceMapping.get(providerName) || 0.5;
    const entityConfidenceAvg = entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length;
    
    return (baseConfidence + entityConfidenceAvg) / 2;
  }

  /**
   * Create provider confidence mapping
   */
  private createProviderConfidenceMapping(): Map<ProviderStrategy, number> {
    return new Map([
      ['exa', 0.9],           // Highest confidence - research-based
      ['specialized', 0.85],   // High confidence - pattern-based
      ['natural', 0.7],       // Medium confidence - ML-based
      ['rule_based', 0.6],    // Medium confidence - rule-based
      ['text_processing', 0.5] // Lowest confidence - heuristic-based
    ]);
  }

  /**
   * Merge provider results using priority and confidence
   */
  private mergeProviderResults(results: ProviderResult[]): RecognizedEntity[] {
    if (results.length === 0) return [];
    
    // Sort results by confidence and priority
    const sortedResults = results.sort((a, b) => b.confidence - a.confidence);
    
    // Create entity map for deduplication
    const entityMap = new Map<string, RecognizedEntity>();
    
    for (const result of sortedResults) {
      for (const entity of result.entities) {
        const entityKey = this.createEntityKey(entity);
        const existingEntity = entityMap.get(entityKey);
        
        if (!existingEntity || entity.confidence > existingEntity.confidence) {
          entityMap.set(entityKey, {
            ...entity,
            metadata: {
              ...entity.metadata,
              provider: result.providerName,
              processingTime: result.processingTime
            }
          });
        }
      }
    }

    return Array.from(entityMap.values()).sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Create unique entity key for deduplication
   */
  private createEntityKey(entity: RecognizedEntity): string {
    return `${entity.text.toLowerCase()}_${entity.type}_${entity.startIndex}_${entity.endIndex}`;
  }

  /**
   * Post-process entities for quality and consistency
   */
  private postProcessEntities(entities: RecognizedEntity[], originalText: string): RecognizedEntity[] {
    const postProcessingSteps = this.createPostProcessingMapping();
    let processedEntities = entities;

    for (const [stepName, processor] of postProcessingSteps) {
      try {
        processedEntities = processor(processedEntities, originalText);
      } catch (error) {
        Logger.warn(`Post-processing step ${stepName} failed`, error);
      }
    }

    return processedEntities;
  }

  /**
   * Create post-processing mapping
   */
  private createPostProcessingMapping(): Map<string, (entities: RecognizedEntity[], text: string) => RecognizedEntity[]> {
    return new Map([
      ['validate_positions', this.validateEntityPositions.bind(this)],
      ['resolve_overlaps', this.resolveEntityOverlaps.bind(this)],
      ['enhance_confidence', this.enhanceEntityConfidence.bind(this)],
      ['filter_low_quality', this.filterLowQualityEntities.bind(this)]
    ]);
  }

  /**
   * Validate entity positions against original text
   */
  private validateEntityPositions(entities: RecognizedEntity[], originalText: string): RecognizedEntity[] {
    return entities.filter(entity => {
      if (entity.startIndex < 0 || entity.endIndex > originalText.length) {
        return false;
      }
      
      const extractedText = originalText.substring(entity.startIndex, entity.endIndex);
      return extractedText === entity.text;
    });
  }

  /**
   * Resolve overlapping entities by keeping highest confidence
   */
  private resolveEntityOverlaps(entities: RecognizedEntity[], originalText: string): RecognizedEntity[] {
    const sortedEntities = entities.sort((a, b) => a.startIndex - b.startIndex);
    const resolvedEntities: RecognizedEntity[] = [];
    
    for (const entity of sortedEntities) {
      const hasOverlap = resolvedEntities.some(existing => 
        this.entitiesOverlap(entity, existing)
      );
      
      if (!hasOverlap) {
        resolvedEntities.push(entity);
      } else {
        // Replace with higher confidence entity
        const overlappingIndex = resolvedEntities.findIndex(existing => 
          this.entitiesOverlap(entity, existing)
        );
        
        if (overlappingIndex !== -1 && entity.confidence > resolvedEntities[overlappingIndex].confidence) {
          resolvedEntities[overlappingIndex] = entity;
        }
      }
    }
    
    return resolvedEntities;
  }

  /**
   * Check if two entities overlap
   */
  private entitiesOverlap(entity1: RecognizedEntity, entity2: RecognizedEntity): boolean {
    return !(entity1.endIndex <= entity2.startIndex || entity2.endIndex <= entity1.startIndex);
  }

  /**
   * Enhance entity confidence based on context
   */
  private enhanceEntityConfidence(entities: RecognizedEntity[], originalText: string): RecognizedEntity[] {
    return entities.map(entity => {
      const contextBonus = this.calculateContextBonus(entity, originalText);
      return {
        ...entity,
        confidence: Math.min(1.0, entity.confidence + contextBonus)
      };
    });
  }

  /**
   * Calculate context bonus for entity confidence
   */
  private calculateContextBonus(entity: RecognizedEntity, originalText: string): number {
    const contextMapping = this.createContextBonusMapping();
    let bonus = 0;
    
    for (const [contextType, calculator] of contextMapping) {
      bonus += calculator(entity, originalText);
    }
    
    return Math.min(0.2, bonus); // Cap bonus at 0.2
  }

  /**
   * Create context bonus mapping
   */
  private createContextBonusMapping(): Map<string, (entity: RecognizedEntity, text: string) => number> {
    return new Map([
      ['multiple_providers', (entity: RecognizedEntity, text: string): number => {
        return entity.metadata?.multipleProviders ? 0.1 : 0;
      }],
      ['pattern_validation', (entity: RecognizedEntity, text: string): number => {
        return this.hasValidPattern(entity) ? 0.05 : 0;
      }],
      ['context_keywords', (entity: RecognizedEntity, text: string): number => {
        return this.hasContextKeywords(entity, text) ? 0.05 : 0;
      }]
    ]);
  }

  /**
   * Check if entity has valid pattern
   */
  private hasValidPattern(entity: RecognizedEntity): boolean {
    // Basic pattern validation for different entity types
    switch (entity.type) {
      case EntityType.EMAIL:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entity.text);
      case EntityType.URL:
        return /^https?:\/\//.test(entity.text);
      case EntityType.MONEY:
        return /^\$[\d,]+(\.\d{2})?$/.test(entity.text);
      case EntityType.DATE:
        return /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/.test(entity.text);
      default:
        return true; // Assume valid for other types
    }
  }

  /**
   * Check if entity has supporting context keywords
   */
  private hasContextKeywords(entity: RecognizedEntity, text: string): boolean {
    const contextKeywords: Record<string, string[]> = {
      [EntityType.PERSON]: ['said', 'told', 'spoke', 'mr', 'mrs', 'ms', 'dr'],
      [EntityType.ORGANIZATION]: ['company', 'corporation', 'inc', 'corp', 'llc'],
      [EntityType.LOCATION]: ['in', 'at', 'from', 'to', 'near', 'city', 'country'],
      [EntityType.MONEY]: ['cost', 'price', 'worth', 'value', 'paid', 'spend'],
      [EntityType.DATE]: ['on', 'when', 'during', 'since', 'until', 'by']
    };
    
    const keywords = contextKeywords[entity.type] || [];
    const textLower = text.toLowerCase();
    
    return keywords.some(keyword => textLower.includes(keyword));
  }

  /**
   * Filter low quality entities
   */
  private filterLowQualityEntities(entities: RecognizedEntity[], originalText: string): RecognizedEntity[] {
    const minimumConfidence = 0.3;
    const minimumLength = 2;
    
    return entities.filter(entity => 
      entity.confidence >= minimumConfidence &&
      entity.text.trim().length >= minimumLength &&
      !/^\s*$/.test(entity.text)
    );
  }

  /**
   * Get entity recognition statistics
   */
  getRecognitionStats(text: string): Promise<Record<string, any>> {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return Promise.resolve({});
    }

    return this.recognizeEntities(text).then(entities => {
      const stats: Record<string, any> = {
        totalEntities: entities.length,
        averageConfidence: entities.length > 0 ? 
          entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length : 0,
        entityTypes: {},
        providerUsage: {}
      };

      // Count entities by type
      for (const entity of entities) {
        const typeName = EntityType[entity.type] || 'UNKNOWN';
        stats.entityTypes[typeName] = (stats.entityTypes[typeName] || 0) + 1;
        
        const provider = entity.metadata?.provider || 'unknown';
        stats.providerUsage[provider] = (stats.providerUsage[provider] || 0) + 1;
      }

      return stats;
    });
  }
}

// Singleton instance for backward compatibility
export const advancedNER = new AdvancedNER();
