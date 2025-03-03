/**
 * Coreference Resolution Module
 * 
 * Implements a coreference resolution system to identify and link mentions
 * of the same entity in text.
 */

import { Logger } from './logger.js';
import { nlpToolkit } from './nlp_toolkit.js';
import { advancedNER, RecognizedEntity, EntityType } from './advanced_ner.js';
import { DataProcessingError } from './errors.js';

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
 * A coreference chain links multiple mentions of the same entity
 */
export interface CoreferenceChain {
  id: string;
  mentions: Mention[];
  representativeMention: Mention;
  entityType?: EntityType;
  confidence: number;
}

/**
 * Result of coreference resolution
 */
export interface CoreferenceResult {
  text: string;
  chains: CoreferenceChain[];
  resolvedText: string;
  confidence: number;
}

/**
 * Coreference Resolver Class
 * Implements a simplified mention-pair model for coreference resolution
 */
export class CoreferenceResolver {
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
    
    'they': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'them': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'their': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'theirs': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'themselves': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    
    // Demonstrative pronouns
    'this': { gender: Gender.NEUTRAL, number: NumberType.SINGULAR, animacy: Animacy.UNKNOWN },
    'that': { gender: Gender.NEUTRAL, number: NumberType.SINGULAR, animacy: Animacy.UNKNOWN },
    'these': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
    'those': { gender: Gender.NEUTRAL, number: NumberType.PLURAL, animacy: Animacy.UNKNOWN },
  };

  private readonly NOMINAL_TRIGGERS: string[] = [
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ];

  // Store chains for lookup
  private chains: CoreferenceChain[] = [];

  /**
   * Get a coreference chain by ID
   */
  getChainById(chainId: string): CoreferenceChain | null {
    return this.chains.find(chain => chain.id === chainId) || null;
  }

  /**
   * Resolve coreferences in text
   */
  async resolveCoreferences(text: string): Promise<CoreferenceResult> {
    try {
      Logger.debug('Starting coreference resolution', { textLength: text.length });
      
      // 1. Extract all mentions from text
      const mentions = await this.extractMentions(text);
      Logger.debug('Extracted mentions', { count: mentions.length });
      
      // 2. Cluster mentions into coreference chains
      const chains = this.clusterMentions(mentions, text);
      this.chains = chains; // Store for later lookup
      Logger.debug('Created coreference chains', { count: chains.length });
      
      // 3. Generate resolved text
      const resolvedText = this.generateResolvedText(text, chains);
      
      // 4. Calculate overall confidence
      const confidence = this.calculateOverallConfidence(chains);
      
      return {
        text,
        chains,
        resolvedText,
        confidence
      };
    } catch (error) {
      Logger.error('Coreference resolution failed', error);
      throw new DataProcessingError(
        'Failed to resolve coreferences',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Extract all potential mentions from text
   */
  private async extractMentions(text: string): Promise<Mention[]> {
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
  private extractPronominalMentions(text: string): Mention[] {
    const mentions: Mention[] = [];
    const words = text.split(/\s+/);
    
    let currentIndex = 0;
    for (const word of words) {
      // Clean the word (remove punctuation)
      const cleanWord = word.toLowerCase().replace(/[^\w\s]/g, '');
      
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
          
          currentIndex = wordIndex + word.length;
        }
      } else {
        // Update currentIndex for next search
        const wordIndex = text.indexOf(word, currentIndex);
        if (wordIndex !== -1) {
          currentIndex = wordIndex + word.length;
        }
      }
    }
    
    return mentions;
  }
  
  /**
   * Extract nominal mentions (noun phrases with determiners) from text
   */
  private extractNominalMentions(text: string, entities: RecognizedEntity[]): Mention[] {
    const mentions: Mention[] = [];
    const posTags = nlpToolkit.getPOSTags(text);
    
    // Find noun phrases with determiners
    for (let i = 0; i < posTags.length; i++) {
      const posTag = posTags[i];
      if (!posTag) continue;
      
      const { word, tag } = posTag;
      
      // Check if it's a potential determiner
      if (this.NOMINAL_TRIGGERS.includes(word.toLowerCase())) {
        // Look for a following noun
        let nounIndex = -1;
        let nounPhrase = '';
        
        for (let j = i + 1; j < Math.min(i + 5, posTags.length); j++) {
          const nextTag = posTags[j];
          if (nextTag && nextTag.tag.startsWith('NN')) {
            nounIndex = j;
            // Build the noun phrase from determiner to noun
            nounPhrase = posTags.slice(i, j + 1)
              .filter(item => item !== undefined)
              .map(item => item!.word)
              .join(' ');
            break;
          }
        }
        
        if (nounIndex !== -1 && nounPhrase) {
          // Find the phrase in the original text
          const phraseIndex = text.indexOf(nounPhrase);
          
          if (phraseIndex !== -1) {
            // Skip if this overlaps with an entity
            const overlaps = entities.some(
              entity => (
                (phraseIndex >= entity.startIndex && phraseIndex < entity.endIndex) ||
                (phraseIndex + nounPhrase.length > entity.startIndex && 
                 phraseIndex + nounPhrase.length <= entity.endIndex)
              )
            );
            
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
    
    return mentions;
  }
  
  /**
   * Infer gender, number, and animacy attributes from a noun and its POS tag
   */
  private inferAttributesFromNoun(
    noun: string, 
    posTag: string
  ): { gender?: Gender; number?: NumberType; animacy?: Animacy } {
    const attributes: { gender?: Gender; number?: NumberType; animacy?: Animacy } = {
      gender: Gender.UNKNOWN,
      number: NumberType.UNKNOWN,
      animacy: Animacy.UNKNOWN
    };
    
    // Determine number from POS tag
    if (posTag === 'NN' || posTag === 'NNP') {
      attributes.number = NumberType.SINGULAR;
    } else if (posTag === 'NNS' || posTag === 'NNPS') {
      attributes.number = NumberType.PLURAL;
    }
    
    // Simple heuristics for animacy and gender
    // These are very basic and would need to be expanded
    const lowerNoun = noun.toLowerCase();
    
    // Person words are usually animate
    if (
      lowerNoun === 'person' || lowerNoun === 'man' || lowerNoun === 'woman' ||
      lowerNoun === 'boy' || lowerNoun === 'girl' || lowerNoun === 'child' ||
      lowerNoun === 'people' || lowerNoun === 'men' || lowerNoun === 'women'
    ) {
      attributes.animacy = Animacy.ANIMATE;
      
      // Simple gender guessing
      if (
        lowerNoun === 'man' || lowerNoun === 'boy' || lowerNoun === 'men'
      ) {
        attributes.gender = Gender.MALE;
      } else if (
        lowerNoun === 'woman' || lowerNoun === 'girl' || lowerNoun === 'women'
      ) {
        attributes.gender = Gender.FEMALE;
      }
    }
    
    return attributes;
  }
  
  /**
   * Infer attributes from entity
   */
  private inferAttributes(
    entity: RecognizedEntity
  ): { gender?: Gender; number?: NumberType; animacy?: Animacy } {
    const attributes: { gender?: Gender; number?: NumberType; animacy?: Animacy } = {
      gender: Gender.UNKNOWN,
      number: NumberType.SINGULAR, // Default assumption
      animacy: Animacy.UNKNOWN
    };
    
    // Infer based on entity type
    switch (entity.type) {
      case EntityType.PERSON:
        attributes.animacy = Animacy.ANIMATE;
        // Could add gender detection based on first name databases
        break;
        
      case EntityType.ORGANIZATION:
        attributes.animacy = Animacy.INANIMATE;
        attributes.gender = Gender.NEUTRAL;
        break;
        
      case EntityType.LOCATION:
      case EntityType.FACILITY:
      case EntityType.PRODUCT:
        attributes.animacy = Animacy.INANIMATE;
        attributes.gender = Gender.NEUTRAL;
        break;
    }
    
    return attributes;
  }
  
  /**
   * Extract the head word from a multi-word phrase
   */
  private extractHeadWord(phrase: string): string {
    // Handle null, undefined, or empty phrases
    if (!phrase || phrase.trim() === '') {
      return 'unknown'; // Default value for empty phrases
    }
    
    // Very simple heuristic: the last word is often the head
    const words = phrase.split(/\s+/).filter(word => word.length > 0);
    
    // Ensure we always return a string
    if (words.length > 0) {
      const lastWord = words[words.length - 1];
      return lastWord || phrase; // Fallback to phrase if lastWord is somehow undefined
    }
    
    return phrase.trim() || 'unknown'; // Final fallback
  }
  
  /**
   * Cluster mentions into coreference chains
   */
  private clusterMentions(mentions: Mention[], text: string): CoreferenceChain[] {
    // Initialize each proper and nominal mention as its own cluster
    const chains: CoreferenceChain[] = [];
    const mentionToChain = new Map<Mention, CoreferenceChain>();
    
    // First, create initial chains for proper and nominal mentions
    for (const mention of mentions) {
      if (mention.type === MentionType.PROPER || mention.type === MentionType.NOMINAL) {
        const chain: CoreferenceChain = {
          id: `chain_${chains.length + 1}`,
          mentions: [mention],
          representativeMention: mention,
          confidence: 0.7
        };
        
        chains.push(chain);
        mentionToChain.set(mention, chain);
      }
    }
    
    // Process pronouns
    for (const mention of mentions) {
      if (mention.type === MentionType.PRONOMINAL) {
        // Find the most recent compatible antecedent
        let bestChain: CoreferenceChain | null = null;
        let bestScore = -1;
        
        // Look backward for potential antecedents
        for (let i = chains.length - 1; i >= 0; i--) {
          const currentChain = chains[i];
          if (!currentChain) continue;
          
          const compatibility = this.checkCompatibility(mention, currentChain.representativeMention);
          
          if (compatibility > bestScore) {
            bestScore = compatibility;
            bestChain = currentChain;
          }
        }
        
        // If we found a compatible chain with good score
        if (bestChain && bestScore > 0.5) {
          bestChain.mentions.push(mention);
          mentionToChain.set(mention, bestChain);
          
          // Update confidence
          bestChain.confidence = (bestChain.confidence + bestScore) / 2;
        } else {
          // Create a new singleton chain for the pronoun
          const chain: CoreferenceChain = {
            id: `chain_${chains.length + 1}`,
            mentions: [mention],
            representativeMention: mention,
            confidence: 0.3 // Low confidence for singleton pronouns
          };
          
          chains.push(chain);
          mentionToChain.set(mention, chain);
        }
      }
    }
    
    // Merge nominal mentions with proper mentions when appropriate
    this.mergeNominalChains(chains, text);
    
    // Set entity types for chains based on representative mentions
    for (const chain of chains) {
      if (chain.representativeMention.type === MentionType.PROPER) {
        // Extract entity type from text using our NER
        const entityText = chain.representativeMention.text;
        const entityType = this.inferEntityTypeFromText(entityText);
        
        if (entityType) {
          chain.entityType = entityType;
        }
      }
    }
    
    return chains;
  }
  
  /**
   * Check compatibility between a mention and a potential antecedent
   */
  private checkCompatibility(mention: Mention, antecedent: Mention): number {
    let score = 0;
    
    // Gender compatibility
    if (
      mention.gender !== undefined && 
      antecedent.gender !== undefined &&
      mention.gender !== Gender.UNKNOWN && 
      antecedent.gender !== Gender.UNKNOWN
    ) {
      if (mention.gender === antecedent.gender) {
        score += 0.3;
      } else {
        return 0; // Gender mismatch is a hard constraint
      }
    }
    
    // Number compatibility
    if (
      mention.number !== undefined && 
      antecedent.number !== undefined &&
      mention.number !== NumberType.UNKNOWN && 
      antecedent.number !== NumberType.UNKNOWN
    ) {
      if (mention.number === antecedent.number) {
        score += 0.3;
      } else {
        return 0; // Number mismatch is a hard constraint
      }
    }
    
    // Animacy compatibility
    if (
      mention.animacy !== undefined && 
      antecedent.animacy !== undefined &&
      mention.animacy !== Animacy.UNKNOWN && 
      antecedent.animacy !== Animacy.UNKNOWN
    ) {
      if (mention.animacy === antecedent.animacy) {
        score += 0.2;
      } else {
        return 0; // Animacy mismatch is a hard constraint
      }
    }
    
    // Proximity score (closer is better)
    const distance = mention.startIndex - antecedent.endIndex;
    if (distance > 0) {
      // Normalize distance: closer = higher score
      const proximityScore = Math.max(0, 1 - (distance / 500)); // Arbitrary 500 char window
      score += 0.2 * proximityScore;
    } else {
      // Mention appears before antecedent, not valid
      return 0;
    }
    
    return score;
  }
  
  /**
   * Merge chains with nominal mentions into chains with proper mentions
   */
  private mergeNominalChains(chains: CoreferenceChain[], text: string): void {
    const properChains = chains.filter(
      chain => chain.representativeMention.type === MentionType.PROPER
    );
    
    const nominalChains = chains.filter(
      chain => chain.representativeMention.type === MentionType.NOMINAL
    );
    
    for (const nominalChain of nominalChains) {
      let bestChain: CoreferenceChain | null = null;
      let bestScore = -1;
      
      for (const properChain of properChains) {
        const score = this.calcNominalProperCompatibility(
          nominalChain.representativeMention,
          properChain.representativeMention,
          text
        );
        
        if (score > bestScore) {
          bestScore = score;
          bestChain = properChain;
        }
      }
      
      // If we found a compatible proper chain with good score
      if (bestChain && bestScore > 0.6) {
        // Merge nominal chain into proper chain
        bestChain.mentions.push(...nominalChain.mentions);
        
        // Update confidence
        bestChain.confidence = (bestChain.confidence + bestScore) / 2;
        
        // Remove the nominal chain from the overall chains list
        const index = chains.indexOf(nominalChain);
        if (index !== -1) {
          chains.splice(index, 1);
        }
      }
    }
  }
  
  /**
   * Calculate compatibility between a nominal mention and a proper mention
   */
  private calcNominalProperCompatibility(
    nominal: Mention,
    proper: Mention,
    text: string
  ): number {
    let score = 0;
    
    // Check if the nominal appears after the proper (anaphora)
    if (nominal.startIndex > proper.endIndex) {
      // Text in between shouldn't be too long
      const distance = nominal.startIndex - proper.endIndex;
      if (distance < 500) { // Arbitrary threshold
        score += 0.3 * (1 - (distance / 500));
      } else {
        score += 0.1; // Minor contribution for distant mentions
      }
    } else {
      // Nominal before proper is less likely (cataphora)
      score += 0.1;
    }
    
    // Check if the head word of nominal is related to proper
    if (nominal.headWord && proper.text.toLowerCase().includes(nominal.headWord.toLowerCase())) {
      score += 0.3;
    }
    
    // Type compatibility
    if (
      nominal.animacy !== undefined && 
      proper.animacy !== undefined && 
      nominal.animacy !== Animacy.UNKNOWN &&
      proper.animacy !== Animacy.UNKNOWN
    ) {
      if (nominal.animacy === proper.animacy) {
        score += 0.2;
      } else {
        return 0; // Animacy mismatch is a hard constraint
      }
    }
    
    // Gender compatibility
    if (
      nominal.gender !== undefined && 
      proper.gender !== undefined && 
      nominal.gender !== Gender.UNKNOWN &&
      proper.gender !== Gender.UNKNOWN
    ) {
      if (nominal.gender === proper.gender) {
        score += 0.2;
      } else {
        return 0; // Gender mismatch is a hard constraint
      }
    }
    
    return score;
  }
  
  /**
   * Infer entity type from text
   */
  private inferEntityTypeFromText(text: string): EntityType | undefined {
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
   * Generate text with resolved coreferences
   */
  private generateResolvedText(text: string, chains: CoreferenceChain[]): string {
    // Sort all mentions across all chains by position (descending to avoid index shifting)
    const allMentions = chains
      .flatMap(chain => 
        chain.mentions.map(mention => ({ 
          mention, 
          representativeMention: chain.representativeMention 
        }))
      )
      .sort((a, b) => b.mention.startIndex - a.mention.startIndex);
    
    // Make a copy of the text to modify
    let resolvedText = text;
    
    // Replace mentions with their representative mention
    for (const { mention, representativeMention } of allMentions) {
      // Skip representative mentions
      if (mention === representativeMention) {
        continue;
      }
      
      // Replace pronoun or nominal with the representative mention
      if (mention.type === MentionType.PRONOMINAL || mention.type === MentionType.NOMINAL) {
        resolvedText = 
          resolvedText.substring(0, mention.startIndex) +
          representativeMention.text +
          resolvedText.substring(mention.endIndex);
      }
    }
    
    return resolvedText;
  }
  
  /**
   * Calculate overall confidence of coreference resolution
   */
  private calculateOverallConfidence(chains: CoreferenceChain[]): number {
    if (chains.length === 0) {
      return 0;
    }
    
    // Average chain confidence, weighted by chain size
    let totalConfidence = 0;
    let totalWeight = 0;
    
    for (const chain of chains) {
      const weight = chain.mentions.length;
      totalConfidence += chain.confidence * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalConfidence / totalWeight : 0;
  }
}

// Singleton instance
export const coreferenceResolver = new CoreferenceResolver();
