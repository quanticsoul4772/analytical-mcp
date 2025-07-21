/**
 * Entity Extractor
 * 
 * Handles specialized entity extraction (dates, money, URLs, emails, etc.).
 * Focused responsibility: Specialized entity extraction and processing.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { EntityType, RecognizedEntity } from './advanced_ner.js';

/**
 * EntityExtractor - Focused class for specialized entity extraction
 */
export class EntityExtractor {
  
  /**
   * Extract specialized entities from text
   */
  extractEntities(text: string): RecognizedEntity[] {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return [];
    }

    try {
      const extractionResults = this.performAllExtractions(text);
      return this.mergeAndValidateResults(extractionResults);
    } catch (error) {
      Logger.error('Entity extraction failed', error);
      return [];
    }
  }

  /**
   * Perform all specialized extractions
   */
  private performAllExtractions(text: string): RecognizedEntity[] {
    const extractionMapping = this.createExtractionMapping();
    const allEntities: RecognizedEntity[] = [];

    for (const [extractorName, extractor] of extractionMapping) {
      try {
        const entities = extractor(text);
        allEntities.push(...entities);
      } catch (error) {
        Logger.error(`${extractorName} extraction failed`, error);
      }
    }

    return allEntities;
  }

  /**
   * Create extraction method mapping
   */
  private createExtractionMapping(): Map<string, (text: string) => RecognizedEntity[]> {
    return new Map([
      ['date', this.extractDateEntities.bind(this)],
      ['time', this.extractTimeEntities.bind(this)],
      ['money', this.extractMoneyEntities.bind(this)],
      ['percent', this.extractPercentEntities.bind(this)],
      ['url', this.extractUrlEntities.bind(this)],
      ['email', this.extractEmailEntities.bind(this)],
      ['phone', this.extractPhoneEntities.bind(this)],
      ['coordinates', this.extractCoordinateEntities.bind(this)],
      ['measurements', this.extractMeasurementEntities.bind(this)]
    ]);
  }

  /**
   * Extract date entities
   */
  private extractDateEntities(text: string): RecognizedEntity[] {
    const datePatterns = this.createDatePatternMapping();
    const entities: RecognizedEntity[] = [];

    for (const [patternName, pattern] of datePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push(this.createEntityFromMatch(
            match[0],
            EntityType.DATE,
            match.index,
            0.9,
            { source: 'date_pattern', pattern: patternName }
          ));
        }
      }
    }

    return entities;
  }

  /**
   * Create date pattern mapping
   */
  private createDatePatternMapping(): Map<string, RegExp> {
    return new Map([
      ['iso_date', /\b\d{4}-\d{2}-\d{2}\b/g],
      ['us_date', /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g],
      ['long_date', /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi],
      ['short_date', /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi],
      ['day_month_year', /\b\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi]
    ]);
  }

  /**
   * Extract time entities
   */
  private extractTimeEntities(text: string): RecognizedEntity[] {
    const timePatterns = this.createTimePatternMapping();
    const entities: RecognizedEntity[] = [];

    for (const [patternName, pattern] of timePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push(this.createEntityFromMatch(
            match[0],
            EntityType.TIME,
            match.index,
            0.85,
            { source: 'time_pattern', pattern: patternName }
          ));
        }
      }
    }

    return entities;
  }

  /**
   * Create time pattern mapping
   */
  private createTimePatternMapping(): Map<string, RegExp> {
    return new Map([
      ['24_hour', /\b\d{1,2}:\d{2}(:\d{2})?\b/g],
      ['12_hour', /\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)\b/g],
      ['relative_time', /\b(morning|afternoon|evening|night|dawn|dusk|noon|midnight)\b/gi],
      ['time_zone', /\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\s*(EST|CST|MST|PST|UTC|GMT|EDT|CDT|MDT|PDT)\b/g]
    ]);
  }

  /**
   * Extract money entities
   */
  private extractMoneyEntities(text: string): RecognizedEntity[] {
    const moneyPatterns = this.createMoneyPatternMapping();
    const entities: RecognizedEntity[] = [];

    for (const [patternName, pattern] of moneyPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push(this.createEntityFromMatch(
            match[0],
            EntityType.MONEY,
            match.index,
            0.95,
            { source: 'money_pattern', pattern: patternName }
          ));
        }
      }
    }

    return entities;
  }

  /**
   * Create money pattern mapping
   */
  private createMoneyPatternMapping(): Map<string, RegExp> {
    return new Map([
      ['dollar_amount', /\$[\d,]+(\.\d{2})?\b/g],
      ['written_currency', /\b(USD|EUR|GBP|JPY|CAD|AUD|CHF)\s*[\d,]+(\.\d{2})?\b/gi],
      ['currency_symbol', /[€£¥₹₽]\s*[\d,]+(\.\d{2})?\b/g],
      ['written_amounts', /\b(dollars?|cents?|euros?|pounds?|yen)\b/gi]
    ]);
  }

  /**
   * Extract percentage entities
   */
  private extractPercentEntities(text: string): RecognizedEntity[] {
    const percentPattern = /\b\d+(\.\d+)?%\b/g;
    const entities: RecognizedEntity[] = [];

    const matches = Array.from(text.matchAll(percentPattern));
    for (const match of matches) {
      if (match.index !== undefined && match[0]) {
        entities.push(this.createEntityFromMatch(
          match[0],
          EntityType.PERCENT,
          match.index,
          0.9,
          { source: 'percent_pattern' }
        ));
      }
    }

    return entities;
  }

  /**
   * Extract URL entities
   */
  private extractUrlEntities(text: string): RecognizedEntity[] {
    const urlPatterns = this.createUrlPatternMapping();
    const entities: RecognizedEntity[] = [];

    for (const [patternName, pattern] of urlPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push(this.createEntityFromMatch(
            match[0],
            EntityType.URL,
            match.index,
            0.9,
            { source: 'url_pattern', pattern: patternName }
          ));
        }
      }
    }

    return entities;
  }

  /**
   * Create URL pattern mapping
   */
  private createUrlPatternMapping(): Map<string, RegExp> {
    return new Map([
      ['http_url', /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi],
      ['www_url', /www\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})/gi],
      ['domain_only', /\b[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.(com|org|net|edu|gov|mil|int|co|io|ai|tech)\b/gi]
    ]);
  }

  /**
   * Extract email entities
   */
  private extractEmailEntities(text: string): RecognizedEntity[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const entities: RecognizedEntity[] = [];

    const matches = Array.from(text.matchAll(emailPattern));
    for (const match of matches) {
      if (match.index !== undefined && match[0]) {
        entities.push(this.createEntityFromMatch(
          match[0],
          EntityType.EMAIL,
          match.index,
          0.95,
          { source: 'email_pattern' }
        ));
      }
    }

    return entities;
  }

  /**
   * Extract phone number entities
   */
  private extractPhoneEntities(text: string): RecognizedEntity[] {
    const phonePatterns = this.createPhonePatternMapping();
    const entities: RecognizedEntity[] = [];

    for (const [patternName, pattern] of phonePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push(this.createEntityFromMatch(
            match[0],
            EntityType.PHONE,
            match.index,
            0.85,
            { source: 'phone_pattern', pattern: patternName }
          ));
        }
      }
    }

    return entities;
  }

  /**
   * Create phone pattern mapping
   */
  private createPhonePatternMapping(): Map<string, RegExp> {
    return new Map([
      ['us_phone', /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g],
      ['international', /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g],
      ['extension', /\b\d{3}-\d{3}-\d{4}\s*(ext|extension)\.?\s*\d+\b/gi]
    ]);
  }

  /**
   * Extract coordinate entities
   */
  private extractCoordinateEntities(text: string): RecognizedEntity[] {
    const coordinatePatterns = this.createCoordinatePatternMapping();
    const entities: RecognizedEntity[] = [];

    for (const [patternName, pattern] of coordinatePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push(this.createEntityFromMatch(
            match[0],
            EntityType.COORDINATES,
            match.index,
            0.8,
            { source: 'coordinate_pattern', pattern: patternName }
          ));
        }
      }
    }

    return entities;
  }

  /**
   * Create coordinate pattern mapping
   */
  private createCoordinatePatternMapping(): Map<string, RegExp> {
    return new Map([
      ['decimal_degrees', /-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+/g],
      ['degrees_minutes', /\d{1,3}°\s*\d{1,2}'\s*\d{1,2}"\s*[NSEW]/gi],
      ['lat_long', /\b(latitude|lat):\s*-?\d{1,3}\.\d+,?\s*(longitude|lon|lng):\s*-?\d{1,3}\.\d+/gi]
    ]);
  }

  /**
   * Extract measurement entities
   */
  private extractMeasurementEntities(text: string): RecognizedEntity[] {
    const measurementPatterns = this.createMeasurementPatternMapping();
    const entities: RecognizedEntity[] = [];

    for (const [patternName, pattern] of measurementPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push(this.createEntityFromMatch(
            match[0],
            EntityType.MEASUREMENT,
            match.index,
            0.8,
            { source: 'measurement_pattern', pattern: patternName }
          ));
        }
      }
    }

    return entities;
  }

  /**
   * Create measurement pattern mapping
   */
  private createMeasurementPatternMapping(): Map<string, RegExp> {
    return new Map([
      ['distance', /\b\d+(\.\d+)?\s*(mm|cm|m|km|in|ft|yd|mi|miles?|meters?|kilometers?|feet|inches?|yards?)\b/gi],
      ['weight', /\b\d+(\.\d+)?\s*(mg|g|kg|oz|lb|lbs|pounds?|grams?|kilograms?|ounces?)\b/gi],
      ['volume', /\b\d+(\.\d+)?\s*(ml|l|fl\.?\s*oz|cup|cups|pint|pints|quart|quarts|gallon|gallons|liters?|milliliters?)\b/gi],
      ['temperature', /\b-?\d+(\.\d+)?°?\s*(C|F|K|Celsius|Fahrenheit|Kelvin)\b/gi],
      ['area', /\b\d+(\.\d+)?\s*(sq\.?\s*ft|sq\.?\s*m|acres?|hectares?)\b/gi]
    ]);
  }

  /**
   * Create entity from regex match
   */
  private createEntityFromMatch(
    text: string,
    type: EntityType,
    startIndex: number,
    confidence: number,
    metadata: Record<string, any>
  ): RecognizedEntity {
    return {
      text,
      type,
      startIndex,
      endIndex: startIndex + text.length,
      confidence,
      metadata: {
        ...metadata,
        source: 'entity_extractor'
      }
    };
  }

  /**
   * Merge and validate extraction results
   */
  private mergeAndValidateResults(entities: RecognizedEntity[]): RecognizedEntity[] {
    // Remove duplicates based on text and position
    const uniqueEntities = new Map<string, RecognizedEntity>();
    
    for (const entity of entities) {
      const key = `${entity.text}_${entity.startIndex}_${entity.type}`;
      const existing = uniqueEntities.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        uniqueEntities.set(key, entity);
      }
    }

    // Sort by start index
    return Array.from(uniqueEntities.values()).sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Validate entity against text
   */
  private validateEntity(entity: RecognizedEntity, originalText: string): boolean {
    // Check if entity position is valid
    if (entity.startIndex < 0 || entity.endIndex > originalText.length) {
      return false;
    }

    // Check if entity text matches position in original text
    const extractedText = originalText.substring(entity.startIndex, entity.endIndex);
    return extractedText === entity.text;
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats(text: string): Record<string, number> {
    const textValidation = ValidationHelpers.validateNonEmptyString(text);
    if (!textValidation.isValid) {
      return {};
    }

    const entities = this.extractEntities(text);
    const stats: Record<string, number> = {};

    for (const entity of entities) {
      const typeName = EntityType[entity.type] || 'UNKNOWN';
      stats[typeName] = (stats[typeName] || 0) + 1;
    }

    stats.total = entities.length;
    return stats;
  }
}
