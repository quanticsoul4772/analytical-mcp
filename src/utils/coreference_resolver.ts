/**
 * Coreference Resolution Module
 * 
 * Implements a coreference resolution system to identify and link mentions
 * of the same entity in text using provider pattern architecture.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import { DataProcessingError } from './errors.js';
import { MentionExtractionProvider, Mention } from './mention_extraction_provider.js';
import { MentionClusteringProvider, CoreferenceChain } from './mention_clustering_provider.js';
import { TextResolutionProvider } from './text_resolution_provider.js';
import { EntityAnalysisProvider } from './entity_analysis_provider.js';

// Re-export types for external use
export type { Mention, MentionType, Gender, NumberType, Animacy } from './mention_extraction_provider.js';
export type { CoreferenceChain } from './mention_clustering_provider.js';

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
 * Coreference Resolver Coordinator
 * Uses provider pattern for focused coreference resolution
 */
export class CoreferenceResolver {
  private mentionExtractor: MentionExtractionProvider;
  private mentionClusterer: MentionClusteringProvider;
  private textResolver: TextResolutionProvider;
  private entityAnalyzer: EntityAnalysisProvider;

  constructor() {
    this.mentionExtractor = new MentionExtractionProvider();
    this.mentionClusterer = new MentionClusteringProvider();
    this.textResolver = new TextResolutionProvider();
    this.entityAnalyzer = new EntityAnalysisProvider();
  }

  /**
   * Resolve coreferences in text using provider coordination
   */
  async resolveCoreferences(text: string): Promise<CoreferenceResult> {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    try {
      Logger.debug('Starting coreference resolution', { textLength: text.length });
      
      // 1. Extract all mentions from text using provider
      const mentions = await this.mentionExtractor.extractMentions(text);
      Logger.debug('Extracted mentions', { count: mentions.length });
      
      // 2. Cluster mentions into coreference chains using provider
      const chains = this.mentionClusterer.clusterMentions(mentions, text);
      Logger.debug('Created coreference chains', { count: chains.length });
      
      // 3. Generate resolved text using provider
      const resolvedText = this.textResolver.generateResolvedText(text, chains);
      
      // 4. Calculate overall confidence using provider
      const confidence = this.textResolver.calculateOverallConfidence(chains);
      
      return {
        text,
        chains,
        resolvedText,
        confidence
      };
    } catch (error) {
      Logger.error('Coreference resolution failed', error);
      throw new DataProcessingError(
        'ERR_1001',
        'Failed to resolve coreferences',
        { originalText: text, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get detailed resolution statistics
   */
  async analyzeText(text: string): Promise<{
    result: CoreferenceResult;
    stats: any;
    validation: any;
  }> {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    
    const result = await this.resolveCoreferences(text);
    const stats = this.textResolver.generateResolutionStats(result.chains);
    const validation = this.textResolver.validateResolvedText(text, result.resolvedText);
    
    return {
      result,
      stats,
      validation
    };
  }

  /**
   * Extract mentions only (for debugging/analysis)
   */
  async extractMentions(text: string): Promise<Mention[]> {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    return await this.mentionExtractor.extractMentions(text);
  }

  /**
   * Cluster pre-extracted mentions (for debugging/analysis)
   */
  clusterMentions(mentions: Mention[], text: string): CoreferenceChain[] {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(text));
    return this.mentionClusterer.clusterMentions(mentions, text);
  }
}

// Create singleton instance
const coreferenceResolverInstance = new CoreferenceResolver();

/**
 * Main function for external integration
 */
export async function resolveCoreferences(text: string): Promise<CoreferenceResult> {
  return await coreferenceResolverInstance.resolveCoreferences(text);
}

/**
 * Singleton instance export
 */
export const coreferenceResolver = coreferenceResolverInstance;
