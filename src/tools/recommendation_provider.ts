/**
 * Recommendation Provider
 * 
 * Handles generation of improvement recommendations for logical arguments
 * based on analysis of argument features and identified weaknesses.
 */

import { ValidationHelpers } from '../utils/validation_helpers.js';
import { 
  withErrorHandling, 
  createValidationError, 
  createDataProcessingError,
  ErrorCodes 
} from '../utils/errors.js';

/**
 * Argument features interface
 */
export interface ArgumentFeatures {
  sentenceCount: number;
  hasEvidence: boolean;
  hasLogicalConnectors: boolean;
  hasQualifiers: boolean;
  hasCounterarguments: boolean;
  hasAlternatives: boolean;
}

/**
 * Recommendation Provider Class
 * Generates improvement recommendations for logical arguments
 */
class RecommendationProviderClass {

  /**
   * Analyzes argument features
   */
  private analyzeArgumentFeatures(argument: string): ArgumentFeatures {
    const validation = ValidationHelpers.validateNonEmptyString(argument);
    if (!validation.isValid) {
      throw createValidationError(
        validation.errorMessage || 'Invalid argument input: expected non-empty string',
        { field: 'argument', received: typeof argument },
        'recommendation_provider'
      );
    }
    
    try {
      const argLower = argument.toLowerCase();
      const sentenceCount = argument.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

      return {
        sentenceCount,
        hasEvidence: /evidence|data|study|research|statistics|survey|experiment|observation/.test(argLower),
        hasLogicalConnectors: /because|since|therefore|thus|hence|consequently/.test(argLower),
        hasQualifiers: /likely|probably|possibly|suggests|indicates|may|might|could/.test(argLower),
        hasCounterarguments: /objection|criticism|counter-argument|counterargument|opponents argue|some might say/.test(argLower),
        hasAlternatives: /alternative|other explanation|other possibility|could also be|might also/.test(argLower),
      };
    } catch (error) {
      throw createDataProcessingError(
        `Failed to analyze argument features: ${error instanceof Error ? error.message : String(error)}`,
        { argument: argument.slice(0, 100) + '...' },
        'recommendation_provider'
      );
    }
  }

  /**
   * Generates tailored recommendations based on argument features
   */
  private generateTailoredRecommendations(features: ArgumentFeatures): string[] {
    // Validate features object has required properties
    if (!features || typeof features !== 'object') {
      throw createValidationError(
        'Invalid features object provided: expected ArgumentFeatures object',
        { field: 'features', received: typeof features },
        'recommendation_provider'
      );
    }
    
    try {
      const recommendations: string[] = [];

      // Structure recommendations
      if (!features.hasLogicalConnectors) {
        recommendations.push(
          "**Clarify Logical Structure**: Use logical connectors like 'because,' 'since,' 'therefore,' or 'thus' to clearly distinguish premises from conclusions and show the flow of reasoning."
        );
      }

      if (features.sentenceCount < 3) {
        recommendations.push(
          '**Develop the Argument**: Expand your argument by providing more premises that support your conclusion. A well-developed argument typically includes multiple supporting points.'
        );
      }

      // Evidence recommendations
      if (!features.hasEvidence) {
        recommendations.push(
          '**Add Supporting Evidence**: Strengthen your argument by including specific evidence, data, or examples that support your premises. Concrete evidence makes your argument more persuasive.'
        );
      }

      // Logical balance recommendations
      if (!features.hasQualifiers) {
        recommendations.push(
          "**Use Appropriate Qualifiers**: Consider adding qualifying language (e.g., 'likely,' 'probably,' 'suggests') when appropriate to avoid overstating certainty beyond what your evidence supports."
        );
      }

      if (!features.hasCounterarguments) {
        recommendations.push(
          '**Address Counterarguments**: Strengthen your argument by acknowledging potential objections and explaining why your conclusion still holds despite these challenges.'
        );
      }

      if (!features.hasAlternatives) {
        recommendations.push(
          '**Consider Alternatives**: When making causal claims or proposing explanations, consider alternative possibilities and explain why your preferred explanation is more plausible.'
        );
      }

      return recommendations;
    } catch (error) {
      throw createDataProcessingError(
        `Failed to generate tailored recommendations: ${error instanceof Error ? error.message : String(error)}`,
        { features },
        'recommendation_provider'
      );
    }
  }

  /**
   * Generates general improvement recommendations when all basic elements are present
   */
  private generateGeneralRecommendations(): string[] {
    return [
      '**Further Strengthen Evidence**: While your argument includes evidence, consider adding more specific, quantitative, or authoritative sources to bolster your case.',
      '**Refine Logical Connections**: Even though your argument has a clear structure, you might further clarify how each premise specifically supports the conclusion.',
      '**Expand Counterargument Consideration**: Build on your existing counterargument treatment by addressing the strongest possible objections to your position.',
    ];
  }

  /**
   * Generates argument recommendations based on analysis (internal implementation)
   */
  public generateArgumentRecommendationsInternal(argument: string, analysisType: string): string {
    const argValidation = ValidationHelpers.validateNonEmptyString(argument);
    if (!argValidation.isValid) {
      throw createValidationError(
        argValidation.errorMessage || 'Invalid argument input: expected non-empty string',
        { field: 'argument', received: typeof argument },
        'recommendation_provider'
      );
    }
    
    const typeValidation = ValidationHelpers.validateNonEmptyString(analysisType);
    if (!typeValidation.isValid) {
      throw createValidationError(
        typeValidation.errorMessage || 'Invalid analysis type: expected non-empty string',
        { field: 'analysisType', received: typeof analysisType },
        'recommendation_provider'
      );
    }
    
    try {
      let result = `### Recommendations for Improvement\n\n`;

      // Analyze argument features
      const features = this.analyzeArgumentFeatures(argument);

      // Generate tailored recommendations based on what the argument is missing
      const recommendations = this.generateTailoredRecommendations(features);

      // If all common elements are present, add general improvement recommendations
      if (recommendations.length === 0) {
        const generalRecommendations = this.generateGeneralRecommendations();
        recommendations.push(...generalRecommendations);
      }

      // Add the recommendations to the result
      if (recommendations.length > 0) {
        recommendations.forEach((rec, index) => {
          result += `${index + 1}. ${rec}\n\n`;
        });
      }

      return result;
    } catch (error) {
      if (error instanceof Error && (error.name.includes('ValidationError') || error.name.includes('DataProcessingError'))) {
        throw error; // Re-throw standardized errors
      }
      throw createDataProcessingError(
        `Failed to generate argument recommendations: ${error instanceof Error ? error.message : String(error)}`,
        { argument: argument.slice(0, 100) + '...', analysisType },
        'recommendation_provider'
      );
    }
  }

  /**
   * Gets argument features for analysis (internal implementation)
   */
  public getArgumentFeaturesInternal(argument: string): ArgumentFeatures {
    return this.analyzeArgumentFeatures(argument);
  }

  /**
   * Gets specific recommendations by category (internal implementation)
   */
  public getRecommendationsByCategoryInternal(argument: string): Record<string, string[]> {
    const features = this.analyzeArgumentFeatures(argument);
    
    return {
      structure: features.hasLogicalConnectors ? [] : ['Use logical connectors to clarify argument flow'],
      development: features.sentenceCount >= 3 ? [] : ['Expand argument with additional supporting premises'],
      evidence: features.hasEvidence ? [] : ['Add supporting evidence, data, or examples'],
      qualifiers: features.hasQualifiers ? [] : ['Use appropriate qualifying language when expressing certainty'],
      counterarguments: features.hasCounterarguments ? [] : ['Address potential objections to strengthen argument'],
      alternatives: features.hasAlternatives ? [] : ['Consider alternative explanations or possibilities'],
    };
  }
}

// Create provider instance
const recommendationProvider = new RecommendationProviderClass();

// Export wrapped functions
export const generateArgumentRecommendations = withErrorHandling('recommendation_provider', recommendationProvider.generateArgumentRecommendationsInternal.bind(recommendationProvider));
export const getArgumentFeatures = withErrorHandling('recommendation_provider', recommendationProvider.getArgumentFeaturesInternal.bind(recommendationProvider));
export const getRecommendationsByCategory = withErrorHandling('recommendation_provider', recommendationProvider.getRecommendationsByCategoryInternal.bind(recommendationProvider));

// Export the class for backward compatibility
export { RecommendationProviderClass as RecommendationProvider };
