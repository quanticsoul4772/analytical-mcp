/**
 * Mention Clustering Provider
 * 
 * Handles clustering of mentions into coreference chains using
 * compatibility scoring and chain merging strategies.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { Mention, MentionType, Gender, NumberType, Animacy } from './mention_extraction_provider.js';

/**
 * A coreference chain links multiple mentions of the same entity
 */
export interface CoreferenceChain {
  id: string;
  mentions: Mention[];
  representativeMention: Mention;
  entityType?: string;
  confidence: number;
}

/**
 * Mention Clustering Provider Class
 * Groups mentions into coreference chains
 */
export class MentionClusteringProvider {

  /**
   * Cluster mentions into coreference chains
   */
  clusterMentions(mentions: Mention[], text: string): CoreferenceChain[] {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
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
    
    // Merge compatible nominal/proper chains
    this.mergeNominalChains(chains, text);
    
    return chains.filter(chain => chain.mentions.length > 0);
  }

  /**
   * Check compatibility between two mentions for coreference
   */
  checkCompatibility(mention: Mention, antecedent: Mention): number {
    let score = 0;
    
    // Type compatibility: pronouns can refer to proper/nominal
    if (mention.type === MentionType.PRONOMINAL) {
      if (antecedent.type === MentionType.PROPER || antecedent.type === MentionType.NOMINAL) {
        score += 0.3; // Base score for valid antecedent type
      } else {
        return 0; // Pronouns can't refer to other pronouns directly
      }
    } else {
      // Nominal/proper mentions need exact text match or semantic similarity
      if (mention.text.toLowerCase() === antecedent.text.toLowerCase()) {
        score += 0.8; // High score for exact match
      } else if (mention.headWord.toLowerCase() === antecedent.headWord.toLowerCase()) {
        score += 0.4; // Medium score for head word match
      } else {
        return 0; // No text compatibility
      }
    }
    
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
  mergeNominalChains(chains: CoreferenceChain[], text: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    for (let i = 0; i < chains.length; i++) {
      const chain1 = chains[i];
      if (!chain1 || chain1.mentions.length === 0) continue;
      
      for (let j = i + 1; j < chains.length; j++) {
        const chain2 = chains[j];
        if (!chain2 || chain2.mentions.length === 0) continue;
        
        // Try to merge based on proper-nominal compatibility
        const compatibility = this.calcNominalProperCompatibility(chain1, chain2);
        
        if (compatibility > 0.6) {
          // Merge chain2 into chain1
          chain1.mentions.push(...chain2.mentions);
          chain1.confidence = (chain1.confidence + chain2.confidence) / 2;
          
          // Update representative mention (prefer proper over nominal)
          if (chain2.representativeMention.type === MentionType.PROPER && 
              chain1.representativeMention.type === MentionType.NOMINAL) {
            chain1.representativeMention = chain2.representativeMention;
          }
          
          // Clear the merged chain
          chain2.mentions = [];
          
          Logger.debug('Merged chains', { 
            chain1: chain1.id, 
            chain2: chain2.id, 
            compatibility 
          });
        }
      }
    }
  }

  /**
   * Calculate compatibility between nominal and proper mention chains
   */
  private calcNominalProperCompatibility(chain1: CoreferenceChain, chain2: CoreferenceChain): number {
    let bestScore = 0;
    
    // Check all pairs of mentions between chains
    for (const mention1 of chain1.mentions) {
      for (const mention2 of chain2.mentions) {
        // Only consider proper-nominal or nominal-proper pairs
        if ((mention1.type === MentionType.PROPER && mention2.type === MentionType.NOMINAL) ||
            (mention1.type === MentionType.NOMINAL && mention2.type === MentionType.PROPER)) {
          
          let score = 0;
          
          // Check if the nominal mention's head word is compatible with the proper mention
          const properMention = mention1.type === MentionType.PROPER ? mention1 : mention2;
          const nominalMention = mention1.type === MentionType.NOMINAL ? mention1 : mention2;
          
          // Simple heuristic: check if proper mention contains words from nominal
          const properWords = properMention.text.toLowerCase().split(/\\s+/);
          const nominalWords = nominalMention.text.toLowerCase().split(/\\s+/);
          
          // Check for word overlap
          const overlap = properWords.some(word => nominalWords.includes(word));
          if (overlap) {
            score += 0.4;
          }
          
          // Check head word compatibility
          if (nominalMention.headWord.toLowerCase() === 'person' || 
              nominalMention.headWord.toLowerCase() === 'company' ||
              nominalMention.headWord.toLowerCase() === 'organization') {
            // Generic nominal mentions can refer to proper mentions
            score += 0.3;
          }
          
          // Entity type compatibility (if available)
          if (chain1.entityType && chain2.entityType && chain1.entityType === chain2.entityType) {
            score += 0.3;
          }
          
          // Proximity bonus
          const distance = Math.abs(mention1.startIndex - mention2.startIndex);
          const proximityScore = Math.max(0, 1 - (distance / 300));
          score += 0.2 * proximityScore;
          
          bestScore = Math.max(bestScore, score);
        }
      }
    }
    
    return bestScore;
  }
}
