/**
 * Rule-Based NER Provider
 * 
 * Handles Named Entity Recognition using custom rule-based approaches.
 * Focused responsibility: Custom rule-based entity recognition.
 */

import natural from 'natural';
import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { EntityType, RecognizedEntity } from './advanced_ner.js';

// Context for rule-based entity classification
interface RuleBasedClassificationContext {
  currentEntity: { words: string[]; type: EntityType; startIndex: number };
  entities: RecognizedEntity[];
  text: string;
}

/**
 * RuleBasedNERProvider - Focused class for custom rule-based entity recognition
 */
export class RuleBasedNERProvider {
  private tokenizer = new natural.WordTokenizer();

  /**
   * Recognize entities using rule-based approaches
   */
  recognizeEntities(text: string): RecognizedEntity[] {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    try {
      const ruleBasedEntities = this.extractEntitiesWithRules(text);
      const directEntities = this.extractDirectEntities(text);
      
      // Merge and deduplicate results
      return this.mergeEntityResults([ruleBasedEntities, directEntities]);
    } catch (error) {
      Logger.error('Rule-based NER recognition failed', error);
      return [];
    }
  }

  /**
   * Extract entities using rule-based approach
   */
  private extractEntitiesWithRules(text: string): RecognizedEntity[] {
    const tokens = this.tokenizer.tokenize(text);
    const posTags = this.getPOSTags(text);
    const entities: RecognizedEntity[] = [];

    // Process tokens for rule-based entity detection
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const posTag = posTags[i]?.tag || 'NN';
      
      const entityType = this.determineEntityType(token);
      if (entityType !== EntityType.UNKNOWN) {
        const startIndex = text.indexOf(token);
        entities.push({
          text: token,
          type: entityType,
          startIndex,
          endIndex: startIndex + token.length,
          confidence: 0.7,
          metadata: {
            source: 'rule_based',
            posTag: posTag
          }
        });
      }
    }

    return entities;
  }

  /**
   * Recognize entities with rule-based patterns
   */
  private recognizeWithRules(text: string): RecognizedEntity[] {
    const tokens = this.tokenizer.tokenize(text);
    const entities: RecognizedEntity[] = [];
    let currentEntity: { words: string[]; type: EntityType; startIndex: number } | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const isCapitalized = /^[A-Z]/.test(token);
      
      if (isCapitalized) {
        if (currentEntity) {
          // Extend current entity
          currentEntity.words.push(token);
        } else {
          // Start new entity
          const startIndex = text.indexOf(token);
          currentEntity = {
            words: [token],
            type: EntityType.UNKNOWN,
            startIndex
          };
        }
      } else {
        // Finalize current entity if exists
        if (currentEntity) {
          const context: RuleBasedClassificationContext = {
            currentEntity,
            entities,
            text
          };
          this.classifyRuleBasedEntity(context);
          currentEntity = null;
        }
      }
    }

    // Handle last entity
    if (currentEntity) {
      const context: RuleBasedClassificationContext = {
        currentEntity,
        entities,
        text
      };
      this.classifyRuleBasedEntity(context);
    }

    return entities;
  }

  /**
   * Classify rule-based entity using context
   */
  private classifyRuleBasedEntity(context: RuleBasedClassificationContext): void {
    const { currentEntity, entities, text } = context;
    
    if (currentEntity.words.length === 0) {
      return;
    }

    const entityText = currentEntity.words.join(' ');
    const entityType = this.inferEntityTypeFromContext(entityText, text);
    const endIndex = currentEntity.startIndex + entityText.length;

    entities.push({
      text: entityText,
      type: entityType,
      startIndex: currentEntity.startIndex,
      endIndex,
      confidence: 0.6,
      metadata: {
        source: 'rule_based_classification',
        wordCount: currentEntity.words.length
      }
    });
  }

  /**
   * Determine entity type based on token characteristics
   */
  private determineEntityType(text: string): EntityType {
    const typeDetectionMapping = this.createTypeDetectionMapping();
    
    for (const [entityType, detector] of typeDetectionMapping) {
      if (detector(text)) {
        return entityType;
      }
    }

    return EntityType.UNKNOWN;
  }

  /**
   * Create type detection mapping
   */
  private createTypeDetectionMapping(): Map<EntityType, (text: string) => boolean> {
    return new Map([
      [EntityType.DATE, (text: string) => /^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$|^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i.test(text)],
      [EntityType.TIME, (text: string) => /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(text)],
      [EntityType.MONEY, (text: string) => /^\$[\d,]+(\.\d{2})?$/.test(text)],
      [EntityType.PERCENT, (text: string) => /^\d+\.?\d*%$/.test(text)],
      [EntityType.ORGANIZATION, (text: string) => /\b(Inc|Corp|LLC|Ltd|Company|Group|Organization|University|College|Hospital|School|Bank|Trust|Agency|Department|Bureau|Office|Commission|Authority|Board|Council|Institute|Foundation|Association|Society|Union|Federation|League)\b$/i.test(text)],
      [EntityType.PERSON, (text: string) => /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(text) && text.split(/\s+/).length <= 4],
      [EntityType.LOCATION, (text: string) => /\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|City|Town|Village|County|State|Province|Country|North|South|East|West|Central|University|Hospital|Airport|Station|Park|Bridge|Center|Centre)$/i.test(text.split(/\s+/).pop() || '')],
      [EntityType.FACILITY, (text: string) => /\b(Hospital|Clinic|School|University|College|Airport|Station|Stadium|Arena|Theater|Theatre|Museum|Library|Hotel|Resort|Restaurant|Mall|Plaza|Center|Centre|Market|Park|Building|Tower|Complex|Factory|Plant|Laboratory|Lab|Office|Facility)$/i.test(text.split(/\s+/).pop() || '')],
      [EntityType.PRODUCT, (text: string) => /^[A-Z][a-zA-Z0-9\s-]+(Version|v\d+|\d+\.\d+|Pro|Premium|Standard|Basic|Enterprise|Professional|Ultimate|Deluxe|Plus|Advanced|Lite|Mini|Max)$/i.test(text)],
      [EntityType.EVENT, (text: string) => /\b(Conference|Convention|Summit|Meeting|Seminar|Workshop|Symposium|Forum|Festival|Fair|Exhibition|Expo|Show|Awards|Ceremony|Celebration|Tournament|Championship|Competition|Contest|Race|Marathon|Concert|Performance|Event)$/i.test(text.split(/\s+/).pop() || '')]
    ]);
  }

  /**
   * Infer entity type from context
   */
  private inferEntityTypeFromContext(entity: string, context: string): EntityType {
    const contextWords = context.toLowerCase().split(/\s+/);
    const entityLower = entity.toLowerCase();
    
    const contextMappings = this.createContextInferenceMapping();
    
    for (const [entityType, contextDetector] of contextMappings) {
      if (contextDetector(entityLower, contextWords)) {
        return entityType;
      }
    }

    // Default classification based on capitalization patterns
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(entity)) {
      return EntityType.PERSON;
    }
    
    if (/\b(Inc|Corp|LLC|Ltd|Company|Group|University|College|Hospital|School)\b/i.test(entity)) {
      return EntityType.ORGANIZATION;
    }
    
    return EntityType.UNKNOWN;
  }

  /**
   * Create context inference mapping
   */
  private createContextInferenceMapping(): Map<EntityType, (entity: string, contextWords: string[]) => boolean> {
    return new Map([
      [EntityType.PERSON, (entity: string, contextWords: string[]) => {
        const personContexts = ['said', 'told', 'spoke', 'mr', 'mrs', 'ms', 'dr', 'professor', 'president', 'ceo', 'director', 'manager', 'employee', 'worker', 'person', 'people', 'individual', 'man', 'woman', 'guy', 'girl', 'boy'];
        return personContexts.some(word => contextWords.includes(word));
      }],
      [EntityType.ORGANIZATION, (entity: string, contextWords: string[]) => {
        const orgContexts = ['company', 'corporation', 'organization', 'business', 'firm', 'agency', 'department', 'ministry', 'bureau', 'office', 'institution', 'university', 'college', 'school', 'hospital', 'bank', 'government'];
        return orgContexts.some(word => contextWords.includes(word));
      }],
      [EntityType.LOCATION, (entity: string, contextWords: string[]) => {
        const locationContexts = ['in', 'at', 'from', 'to', 'near', 'city', 'town', 'country', 'state', 'province', 'region', 'area', 'place', 'location', 'street', 'road', 'avenue', 'building', 'address'];
        return locationContexts.some(word => contextWords.includes(word));
      }],
      [EntityType.EVENT, (entity: string, contextWords: string[]) => {
        const eventContexts = ['event', 'conference', 'meeting', 'summit', 'seminar', 'workshop', 'festival', 'celebration', 'ceremony', 'competition', 'tournament', 'championship', 'game', 'match', 'concert', 'show', 'performance'];
        return eventContexts.some(word => contextWords.includes(word));
      }],
      [EntityType.PRODUCT, (entity: string, contextWords: string[]) => {
        const productContexts = ['product', 'software', 'application', 'app', 'tool', 'system', 'platform', 'service', 'solution', 'device', 'gadget', 'equipment', 'machine', 'instrument', 'version', 'release', 'update'];
        return productContexts.some(word => contextWords.includes(word));
      }]
    ]);
  }

  /**
   * Extract direct entities using simple patterns
   */
  private extractDirectEntities(text: string): RecognizedEntity[] {
    const entities: RecognizedEntity[] = [];
    const directPatterns = this.createDirectPatternMapping();
    
    for (const [entityType, pattern] of directPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const startIndex = text.indexOf(match);
          entities.push({
            text: match,
            type: entityType,
            startIndex,
            endIndex: startIndex + match.length,
            confidence: 0.8,
            metadata: {
              source: 'direct_pattern',
              pattern: pattern.source
            }
          });
        }
      }
    }

    return entities;
  }

  /**
   * Create direct pattern mapping
   */
  private createDirectPatternMapping(): Map<EntityType, RegExp> {
    return new Map([
      [EntityType.DATE, /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi],
      [EntityType.TIME, /\b\d{1,2}:\d{2}(\s*(AM|PM))?\b/gi],
      [EntityType.MONEY, /\$[\d,]+(\.\d{2})?\b/g],
      [EntityType.PERCENT, /\b\d+\.?\d*%\b/g],
      [EntityType.ORGANIZATION, /\b[A-Z][a-zA-Z\s&]+(Inc|Corp|LLC|Ltd|Company|Group|University|College|Hospital|School|Bank|Trust|Agency|Department|Bureau|Office|Commission|Authority|Board|Council|Institute|Foundation|Association|Society|Union|Federation|League)\b/g]
    ]);
  }

  /**
   * Merge entity results from multiple sources
   */
  private mergeEntityResults(entityArrays: RecognizedEntity[][]): RecognizedEntity[] {
    const allEntities = entityArrays.flat();
    const uniqueEntities = new Map<string, RecognizedEntity>();
    
    for (const entity of allEntities) {
      const key = `${entity.text.toLowerCase()}_${entity.startIndex}_${entity.type}`;
      const existing = uniqueEntities.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        uniqueEntities.set(key, entity);
      }
    }

    return Array.from(uniqueEntities.values()).sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Get POS tags using Natural.js
   */
  private getPOSTags(text: string): Array<{word: string, tag: string}> {
    try {
      const tokens = this.tokenizer.tokenize(text);
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
      Logger.error('POS tagging failed in RuleBasedNERProvider', error);
      return [];
    }
  }
}
