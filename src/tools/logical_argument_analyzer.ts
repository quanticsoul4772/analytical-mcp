// Import types
import { z } from 'zod';
import { ValidationHelpers } from '../utils/validation_helpers.js';
import { ArgumentStructureProvider } from './argument_structure_provider.js';
import { LogicalFallacyProvider } from './logical_fallacy_provider.js';
import { ArgumentValidityProvider } from './argument_validity_provider.js';
import { ArgumentStrengthProvider } from './argument_strength_provider.js';
import { RecommendationProvider } from './recommendation_provider.js';
import { 
  withErrorHandling, 
  createValidationError, 
  createDataProcessingError,
  ErrorCodes 
} from '../utils/errors.js';

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
class LogicalArgumentAnalyzerInternal {
  private structureProvider: ArgumentStructureProvider;
  private fallacyProvider: LogicalFallacyProvider;
  private validityProvider: ArgumentValidityProvider;
  private strengthProvider: ArgumentStrengthProvider;
  private recommendationProvider: RecommendationProvider;

  constructor() {
    try {
      this.structureProvider = new ArgumentStructureProvider();
      this.fallacyProvider = new LogicalFallacyProvider();
      this.validityProvider = new ArgumentValidityProvider();
      this.strengthProvider = new ArgumentStrengthProvider();
      this.recommendationProvider = new RecommendationProvider();
    } catch (error) {
      throw createDataProcessingError(
        `Failed to initialize argument analyzer providers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error instanceof Error ? error.message : 'Unknown error' },
        'logical_argument_analyzer'
      );
    }
  }

  /**
   * Analyzes logical argument using provider coordination
   */
  async analyze(options: AnalysisOptions): Promise<string> {
    // Validate options parameter
    if (!options || typeof options !== 'object') {
      throw createValidationError(
        'Options parameter is required and must be an object',
        {
          received: typeof options,
          value: options
        },
        'logical_argument_analyzer'
      );
    }

    // Destructure options with defaults
    const {
      argument,
      analysisType = 'comprehensive',
      includeRecommendations = true
    } = options;

    // Validate argument
    if (!argument || typeof argument !== 'string' || argument.trim().length === 0) {
      throw createValidationError(
        'Argument must be a non-empty string',
        {
          received: typeof argument,
          length: argument?.length || 0,
          trimmedLength: argument?.trim()?.length || 0
        },
        'logical_argument_analyzer'
      );
    }

    // Validate analysisType
    const validAnalysisTypes = ['structure', 'fallacies', 'validity', 'strength', 'comprehensive'];
    if (!validAnalysisTypes.includes(analysisType)) {
      throw createValidationError(
        `Invalid analysis type: ${analysisType}`,
        {
          received: analysisType,
          allowedValues: validAnalysisTypes
        },
        'logical_argument_analyzer'
      );
    }

    // Validate includeRecommendations
    if (typeof includeRecommendations !== 'boolean') {
      throw createValidationError(
        'includeRecommendations must be a boolean value',
        {
          received: typeof includeRecommendations,
          value: includeRecommendations
        },
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

    try {
      // Analyze argument structure using provider
      if (analyzeStructure) {
        result += this.structureProvider.analyzeArgumentStructureInternal(argument);
      }

      // Analyze logical fallacies using provider
      if (analyzeFallacies) {
        result += this.fallacyProvider.analyzeLogicalFallaciesInternal(argument);
      }

      // Analyze argument validity using provider
      if (analyzeValidity) {
        result += this.validityProvider.analyzeArgumentValidityInternal(argument);
      }

      // Analyze argument strength using provider
      if (analyzeStrength) {
        result += this.strengthProvider.analyzeArgumentStrengthInternal(argument);
      }

      // Add recommendations if requested using provider
      if (includeRecommendations) {
        result += this.recommendationProvider.generateArgumentRecommendationsInternal(argument, analysisType);
      }
    } catch (error) {
      throw createDataProcessingError(
        `Failed to analyze argument: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          argument: argument.substring(0, 100) + (argument.length > 100 ? '...' : ''),
          analysisType,
          includeRecommendations,
          originalError: error instanceof Error ? error.message : 'Unknown error'
        },
        'logical_argument_analyzer'
      );
    }

    return result;
  }
}

// Create internal instance
const analyzerInstanceInternal = new LogicalArgumentAnalyzerInternal();

/**
 * Internal function for tool integration
 */
async function logicalArgumentAnalyzerInternal(
  options: AnalysisOptions
): Promise<string> {
  return await analyzerInstanceInternal.analyze(options);
}

// Export wrapped function with enhanced error handling
export const logicalArgumentAnalyzer = withErrorHandling('logical_argument_analyzer', logicalArgumentAnalyzerInternal);
