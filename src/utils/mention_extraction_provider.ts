/**
 * Mention Extraction Provider
 * 
 * Handles extraction of all types of mentions from text:
 * - Proper mentions (named entities)
 * - Pronominal mentions (pronouns)
 * - Nominal mentions (common nouns)
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { advancedNER, RecognizedEntity, EntityType } from './advanced_ner.js';
import { nlpToolkit } from './nlp_toolkit.js';

/**
 * Represents a mention of an entity in text
 */
export interface Mention {
  text: string;
  type: MentionType;
  startIndex: number;
  endIndex: number;
  headWord: string;
  gender?: Gender;
  number?: NumberType;
  animacy?: Animacy;
}

/**
 * Types of mentions
 */
export enum MentionType {
  PROPER = 'PROPER',      // Proper nouns: "John Smith", "Google"
  NOMINAL = 'NOMINAL',    // Common nouns: "the man", "the company"
  PRONOMINAL = 'PRONOMINAL' // Pronouns: "he", "she", "it", "they"
}

/**
 * Gender attributes for mentions
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NEUTRAL = 'NEUTRAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Number attributes for mentions
 */
export enum NumberType {
  SINGULAR = 'SINGULAR',
  PLURAL = 'PLURAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Animacy attributes for mentions
 */
export enum Animacy {
  ANIMATE = 'ANIMATE',
  INANIMATE = 'INANIMATE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Mention Extraction Provider Class
 * Extracts mentions from text using multiple strategies
 */
export class MentionExtractionProvider {
  private readonly PRONOUN_MAP: Record<string, {gender: Gender, number: NumberType, animacy: Animacy}> = {
    // Personal pronouns
    'he': { gender: Gender.MALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    'him': { gender: Gender.MALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    'his': { gender: Gender.MALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    'himself': { gender: Gender.MALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    
    'she': { gender: Gender.FEMALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    'her': { gender: Gender.FEMALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    'hers': { gender: Gender.FEMALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    'herself': { gender: Gender.FEMALE, number: NumberType.SINGULAR, animacy: Animacy.ANIMATE },
    
    'it': { gender: Gender.NEUTRAL, number: NumberType.SINGULAR, animacy: Animacy.INANIMATE },
    'its': { gender: Gender.NEUTRAL, number: NumberType.SINGULAR, animacy: Animacy.INANIMATE },
    'itself': { gender: Gender.NEUTRAL, number: NumberType.SINGULAR, animacy: Animacy.INANIMATE },
    
    'they': { gender: Gender.UNKNOWN, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'them': { gender: Gender.UNKNOWN, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'their': { gender: Gender.UNKNOWN, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'theirs': { gender: Gender.UNKNOWN, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'themselves': { gender: Gender.UNKNOWN, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    
    // Demonstrative pronouns
    'this': { gender: Gender.NEUTRAL, number: NumberType.SINGULAR, animacy: Animacy.UNKNOWN },
    'that': { gender: Gender.NEUTRAL, number: NumberType.SINGULAR, animacy: Animacy.UNKNOWN },
    'these': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'those': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN }
  };

  /**
   * Extract all potential mentions from text
   */
  async extractMentions(text: string): Promise<Mention[]> {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    const mentions: Mention[] = [];
    
    // Extract entities first (for proper mentions)
    const entities = await advancedNER.recognizeEntities(text);
    
    // Convert entities to mentions
    for (const entity of entities) {
      mentions.push({
        text: entity.text,
        type: MentionType.PROPER,
        startIndex: entity.startIndex,
        endIndex: entity.endIndex,
        headWord: this.extractHeadWord(entity.text),
        ...this.inferAttributes(entity)
      });
    }
    
    // Extract pronominal mentions
    const pronounMentions = this.extractPronominalMentions(text);
    mentions.push(...pronounMentions);
    
    // Extract nominal mentions
    const nominalMentions = this.extractNominalMentions(text, entities);
    mentions.push(...nominalMentions);
    
    // Sort mentions by position in text
    return mentions.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Extract pronominal mentions (pronouns) from text
   */
  extractPronominalMentions(text: string): Mention[] {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    const mentions: Mention[] = [];
    const words = text.split(/\\s+/);
    
    let currentIndex = 0;
    for (const word of words) {
      // Clean the word (remove punctuation)
      const cleanWord = word.toLowerCase().replace(/[^\\w\\s]/g, '');
      
      // Check if it's a pronoun
      if (this.PRONOUN_MAP[cleanWord]) {
        // Find the exact position in the original text
        const wordIndex = text.indexOf(word, currentIndex);
        
        if (wordIndex !== -1) {
          mentions.push({
            text: word,
            type: MentionType.PRONOMINAL,
            startIndex: wordIndex,
            endIndex: wordIndex + word.length,
            headWord: word, // Use the pronoun itself as the head word
            ...this.PRONOUN_MAP[cleanWord]
          });
        }
      }
      
      currentIndex += word.length + 1; // +1 for space
    }
    
    return mentions;
  }

  /**
   * Extract nominal mentions from text using NLP toolkit
   */
  extractNominalMentions(text: string, entities: RecognizedEntity[]): Mention[] {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    const mentions: Mention[] = [];
    
    try {
      // Use POS tagging to find determiners followed by nouns
      const posTags = nlpToolkit.getPOSTags(text);
      
      for (let i = 0; i < posTags.length - 1; i++) {
        const current = posTags[i];
        
        // Look for determiners that indicate mentions
        if (this.isDeterminer(current.tag)) {
          const nounResult = this.findNounAfterDeterminer(posTags, i, text);
          
          if (!nounResult) continue;
          
          const { nounIndex, nounPhrase } = nounResult;
          
          if (nounIndex !== -1 && nounPhrase) {
            // Find the phrase in the original text
            const phraseIndex = text.indexOf(nounPhrase);
            
            if (phraseIndex !== -1) {
              // Skip if this overlaps with an entity
              const overlaps = this.checkEntityOverlap(phraseIndex, nounPhrase, entities);
              
              if (!overlaps) {
                const nounPosTag = posTags[nounIndex];
                if (nounPosTag) {
                  // Determine attributes based on the head noun
                  const headWord = nounPosTag.word;
                  const attributes = this.inferAttributesFromNoun(headWord, nounPosTag.tag);
                  
                  mentions.push({
                    text: nounPhrase,
                    type: MentionType.NOMINAL,
                    startIndex: phraseIndex,
                    endIndex: phraseIndex + nounPhrase.length,
                    headWord,
                    ...attributes
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      Logger.error('Error extracting nominal mentions', error);
    }
    
    return mentions;
  }

  /**
   * Extract head word from a phrase
   */
  private extractHeadWord(phrase: string): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(phrase));
    
    // Simple strategy: use the last word as head
    const words = phrase.trim().split(/\\s+/);
    return words[words.length - 1];
  }

  /**
   * Infer attributes from entity
   */
  private inferAttributes(entity: RecognizedEntity): {gender: Gender, number: NumberType, animacy: Animacy} {
    const defaults = {
      gender: Gender.UNKNOWN,
      number: NumberType.UNKNOWN,
      animacy: Animacy.UNKNOWN
    };

    if (!entity.type) return defaults;

    // Basic attribute inference based on entity type
    switch (entity.type) {
      case EntityType.PERSON:
        return {
          gender: Gender.UNKNOWN, // Would need additional analysis
          number: NumberType.SINGULAR,
          animacy: Animacy.ANIMATE
        };
      case EntityType.ORGANIZATION:
      case EntityType.LOCATION:
      case EntityType.FACILITY:
        return {
          gender: Gender.NEUTRAL,
          number: NumberType.SINGULAR,
          animacy: Animacy.INANIMATE
        };
      default:
        return defaults;
    }
  }

  /**
   * Infer gender, number, and animacy attributes from a noun and its POS tag
   */
  private inferAttributesFromNoun(noun: string, posTag: string): {gender: Gender, number: NumberType, animacy: Animacy} {
    const attributes = {
      gender: Gender.UNKNOWN,
      number: this.inferNumber(noun, posTag),
      animacy: this.inferAnimacy(noun)
    };

    return attributes;
  }

  /**
   * Infer number from noun and POS tag
   */
  private inferNumber(noun: string, posTag: string): NumberType {
    // Plural POS tags
    if (posTag === 'NNS' || posTag === 'NNPS') {
      return NumberType.PLURAL;
    }
    
    // Singular POS tags
    if (posTag === 'NN' || posTag === 'NNP') {
      return NumberType.SINGULAR;
    }
    
    return NumberType.UNKNOWN;
  }

  /**
   * Infer animacy from noun
   */
  private inferAnimacy(noun: string): Animacy {
    const lowerNoun = noun.toLowerCase();
    
    // Animate words
    const animateWords = ['person', 'people', 'man', 'woman', 'child', 'baby', 'boy', 'girl', 'doctor', 'teacher', 'student'];
    if (animateWords.some(word => lowerNoun.includes(word))) {
      return Animacy.ANIMATE;
    }
    
    // Inanimate words
    const inanimateWords = ['thing', 'object', 'item', 'building', 'car', 'book', 'table', 'computer'];
    if (inanimateWords.some(word => lowerNoun.includes(word))) {
      return Animacy.INANIMATE;
    }
    
    return Animacy.UNKNOWN;
  }

  /**
   * Check if POS tag is a determiner
   */
  private isDeterminer(tag: string): boolean {
    return tag === 'DT' || tag === 'PRP$' || tag === 'WDT';
  }

  /**
   * Find noun phrase after determiner
   */
  private findNounAfterDeterminer(posTags: any[], determinerIndex: number, text: string): {nounIndex: number, nounPhrase: string} | null {
    for (let i = determinerIndex + 1; i < posTags.length; i++) {
      const tag = posTags[i];
      
      // Stop at sentence boundaries or other determiners
      if (tag.tag === '.' || tag.tag === '!' || tag.tag === '?' || this.isDeterminer(tag.tag)) {
        break;
      }
      
      // Found a noun
      if (tag.tag.startsWith('NN')) {
        // Build the noun phrase from determiner to noun
        const startIndex = determinerIndex;
        const endIndex = i;
        
        const phrase = posTags.slice(startIndex, endIndex + 1)
          .map(t => t.word)
          .join(' ');
        
        return {
          nounIndex: i,
          nounPhrase: phrase
        };
      }
    }
    
    return null;
  }

  /**
   * Check if a phrase overlaps with any entities
   */
  private checkEntityOverlap(phraseStart: number, phrase: string, entities: RecognizedEntity[]): boolean {
    const phraseEnd = phraseStart + phrase.length;
    
    for (const entity of entities) {
      // Check for overlap
      if (!(phraseEnd <= entity.startIndex || phraseStart >= entity.endIndex)) {
        return true; // Overlap found
      }
    }
    
    return false; // No overlap
  }
}
