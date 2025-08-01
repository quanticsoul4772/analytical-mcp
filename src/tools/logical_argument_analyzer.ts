// Import types
import { z } from 'zod';
import { ValidationHelpers } from '../utils/validation_helpers.js';
import { withErrorHandling, createValidationError } from '../utils/errors.js';
import { ArgumentStructureProvider } from './argument_structure_provider.js';
import { LogicalFallacyProvider } from './logical_fallacy_provider.js';
import { ArgumentValidityProvider } from './argument_validity_provider.js';
import { ArgumentStrengthProvider } from './argument_strength_provider.js';
import { RecommendationProvider } from './recommendation_provider.js';

/**
 * Logical Argument Analyzer Tool
 * Analyzes arguments for logical structure, fallacies, validity, and strength
 */

// Schema for the tool parameters
export const logicalArgumentAnalyzerSchema = z.object({
  argument: z.string().describe('The argument to analyze'),
  analysisType: z
    .enum(['structure', 'fallacies', 'validity', 'strength', 'comprehensive'])
    .default('comprehensive')
    .describe('Type of analysis to perform'),
  includeRecommendations: z
    .boolean()
    .default(true)
    .describe('Include recommendations for improving the argument'),
});

// Options interface for logical argument analysis
export interface AnalysisOptions {
  argument: string;
  analysisType?: 'structure' | 'fallacies' | 'validity' | 'strength' | 'comprehensive';
  includeRecommendations?: boolean;
}

/**
 * Logical Argument Analyzer Coordinator
 * Uses provider pattern for focused analysis
 */
export class LogicalArgumentAnalyzer {
  private structureProvider: ArgumentStructureProvider;
  private fallacyProvider: LogicalFallacyProvider;
  private validityProvider: ArgumentValidityProvider;
  private strengthProvider: ArgumentStrengthProvider;
  private recommendationProvider: RecommendationProvider;

  constructor() {
    this.structureProvider = new ArgumentStructureProvider();
    this.fallacyProvider = new LogicalFallacyProvider();
    this.validityProvider = new ArgumentValidityProvider();
    this.strengthProvider = new ArgumentStrengthProvider();
    this.recommendationProvider = new RecommendationProvider();
  }

  /**
   * Internal method - Analyzes logical argument using provider coordination
   */
  async analyzeInternal(options: AnalysisOptions): Promise<string> {
    // Destructure options with defaults
    const {
      argument,
      analysisType = 'comprehensive',
      includeRecommendations = true
    } = options;

    // Early validation with enhanced error handling
    if (!argument || typeof argument !== 'string' || argument.trim().length === 0) {
      throw createValidationError(
        'Argument is required and must be a non-empty string',
        { argument, type: typeof argument },
        'logical_argument_analyzer'
      );
    }

    if (!analysisType || typeof analysisType !== 'string') {
      throw createValidationError(
        'Analysis type is required and must be a valid string',
        { analysisType, type: typeof analysisType },
        'logical_argument_analyzer'
      );
    }

    // Determine which analyses to perform
    const analyzeStructure = analysisType === 'structure' || analysisType === 'comprehensive';
    const analyzeFallacies = analysisType === 'fallacies' || analysisType === 'comprehensive';
    const analyzeValidity = analysisType === 'validity' || analysisType === 'comprehensive';
    const analyzeStrength = analysisType === 'strength' || analysisType === 'comprehensive';

    // Build the result using provider coordination
    let result = `## Logical Argument Analysis\n\n`;

    // Add the argument text for reference
    result += `### Argument Text\n\n${argument}\n\n`;

    // Analyze argument structure using provider
    if (analyzeStructure) {
      result += this.structureProvider.analyzeArgumentStructure(argument);
    }

    // Analyze logical fallacies using provider
    if (analyzeFallacies) {
      result += this.fallacyProvider.analyzeLogicalFallacies(argument);
    }

    // Analyze argument validity using provider
    if (analyzeValidity) {
      result += this.validityProvider.analyzeArgumentValidity(argument);
    }

    // Analyze argument strength using provider
    if (analyzeStrength) {
      result += this.strengthProvider.analyzeArgumentStrength(argument);
    }

    // Add recommendations if requested using provider
    if (includeRecommendations) {
      result += this.recommendationProvider.generateArgumentRecommendations(argument, analysisType);
    }

    return result;
  }

  /**
   * Analyzes logical argument with error handling
   */
  analyze = withErrorHandling(
    'logical_argument_analyzer',
    async (options: AnalysisOptions): Promise<string> => {
      return this.analyzeInternal(options);
    }
  );
}

// Create singleton instance
const analyzerInstance = new LogicalArgumentAnalyzer();

/**
 * Main function for tool integration with error handling
 */
export const logicalArgumentAnalyzer = withErrorHandling(
  'logical_argument_analyzer',
  async (options: AnalysisOptions): Promise<string> => {
    return await analyzerInstance.analyzeInternal(options);
  }
);
