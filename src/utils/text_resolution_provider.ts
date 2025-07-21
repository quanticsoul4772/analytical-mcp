/**
 * Text Resolution Provider
 * 
 * Handles generation of resolved text where pronouns and nominals
 * are replaced with their antecedents, and calculation of overall
 * confidence scores for coreference resolution.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { Mention, MentionType } from './mention_extraction_provider.js';
import { CoreferenceChain } from './mention_clustering_provider.js';

/**
 * Text Resolution Provider Class
 * Generates resolved text and confidence metrics
 */
export class TextResolutionProvider {

  /**
   * Generate resolved text where mentions are replaced with representative mentions
   */
  generateResolvedText(text: string, chains: CoreferenceChain[]): string {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
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
  calculateOverallConfidence(chains: CoreferenceChain[]): number {
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

  /**
   * Generate detailed resolution statistics
   */
  generateResolutionStats(chains: CoreferenceChain[]): {
    totalChains: number;
    totalMentions: number;
    averageChainLength: number;
    highConfidenceChains: number;
    resolutionCount: number;
  } {
    const totalChains = chains.length;
    const totalMentions = chains.reduce((sum, chain) => sum + chain.mentions.length, 0);
    const averageChainLength = totalChains > 0 ? totalMentions / totalChains : 0;
    const highConfidenceChains = chains.filter(chain => chain.confidence > 0.7).length;
    
    // Count how many mentions were actually resolved (non-singleton chains)
    const resolutionCount = chains
      .filter(chain => chain.mentions.length > 1)
      .reduce((sum, chain) => sum + chain.mentions.length - 1, 0); // -1 because representative doesn't count as resolved
    
    return {
      totalChains,
      totalMentions,
      averageChainLength,
      highConfidenceChains,
      resolutionCount
    };
  }

  /**
   * Validate resolved text quality
   */
  validateResolvedText(originalText: string, resolvedText: string): {
    isValid: boolean;
    lengthRatio: number;
    hasErrors: boolean;
    errorCount: number;
  } {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(originalText));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(resolvedText));
    
    const lengthRatio = resolvedText.length / originalText.length;
    
    // Basic quality checks
    let errorCount = 0;
    
    // Check for obvious errors like repeated words
    const repeatedPattern = /(\b\w+\b)\s+\1\b/g;
    const repeatedMatches = resolvedText.match(repeatedPattern);
    if (repeatedMatches) {
      errorCount += repeatedMatches.length;
    }
    
    // Check for broken punctuation
    const brokenPunctuationPattern = /\s+[,.!?;:]/g;
    const punctuationMatches = resolvedText.match(brokenPunctuationPattern);
    if (punctuationMatches) {
      errorCount += punctuationMatches.length;
    }
    
    // Check for extremely long or short length ratios
    const hasLengthIssues = lengthRatio < 0.5 || lengthRatio > 2.0;
    if (hasLengthIssues) {
      errorCount += 1;
    }
    
    return {
      isValid: errorCount === 0,
      lengthRatio,
      hasErrors: errorCount > 0,
      errorCount
    };
  }
}
