/**
 * Argument Structure Provider
 * 
 * Handles logical argument structure analysis including sentence parsing,
 * premise/conclusion identification, and structural pattern recognition.
 */

import { ValidationHelpers } from '../utils/validation_helpers.js';
import { 
  withErrorHandling, 
  createValidationError, 
  createDataProcessingError,
  ErrorCodes 
} from '../utils/errors.js';

/**
 * Result interface for sentence analysis
 */
export interface SentenceAnalysisResult {
  sentenceCount: number;
  sentences: string[];
}

/**
 * Result interface for indicator words
 */
export interface IndicatorWordsResult {
  conclusionIndicators: string[];
  premiseIndicators: string[];
}

/**
 * Result interface for premise/conclusion identification
 */
export interface PremisesConclusionsResult {
  potentialPremises: string[];
  potentialConclusions: string[];
}

/**
 * Argument Structure Provider Class
 * Analyzes logical argument structure and components
 */
class ArgumentStructureProviderClass {

  /**
   * Analyzes sentence structure of an argument (internal implementation)
   */
  public getSentenceAnalysisInternal(argument: string): SentenceAnalysisResult {
    const validation = ValidationHelpers.validateNonEmptyString(argument);
    if (!validation.isValid) {
      throw createValidationError(
        validation.errorMessage || 'Invalid argument input: expected non-empty string',
        { field: 'argument', received: typeof argument },
        'argument_structure_provider'
      );
    }
    
    try {
      const sentences = argument
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim());
      
      return {
        sentenceCount: sentences.length,
        sentences
      };
    } catch (error) {
      throw createDataProcessingError(
        `Failed to analyze sentence structure: ${error instanceof Error ? error.message : String(error)}`,
        { argument: argument.slice(0, 100) + '...' },
        'argument_structure_provider'
      );
    }
  }

  /**
   * Gets indicator word arrays for premise and conclusion detection
   */
  getIndicatorWords(): IndicatorWordsResult {
    const conclusionIndicators = [
      'therefore',
      'thus',
      'hence',
      'consequently',
      'so',
      'it follows that',
      'as a result',
      'which means that',
    ];
    const premiseIndicators = [
      'because',
      'since',
      'as',
      'given that',
      'assuming that',
      'for',
      'considering that',
    ];
    
    return { conclusionIndicators, premiseIndicators };
  }

  /**
   * Identifies premises and conclusions using indicator words (internal implementation)
   */
  public identifyPremisesAndConclusionsInternal(
    sentences: string[],
    conclusionIndicators: string[],
    premiseIndicators: string[]
  ): PremisesConclusionsResult {
    // Validate all inputs
    const sentencesValidation = ValidationHelpers.validateDataArray(sentences);
    if (!sentencesValidation.isValid) {
      throw createValidationError(
        sentencesValidation.errorMessage || 'Invalid sentences input: expected non-empty array',
        { field: 'sentences', received: typeof sentences },
        'argument_structure_provider'
      );
    }
    
    const conclusionValidation = ValidationHelpers.validateDataArray(conclusionIndicators);
    if (!conclusionValidation.isValid) {
      throw createValidationError(
        conclusionValidation.errorMessage || 'Invalid conclusion indicators: expected non-empty array',
        { field: 'conclusionIndicators', received: typeof conclusionIndicators },
        'argument_structure_provider'
      );
    }
    
    const premiseValidation = ValidationHelpers.validateDataArray(premiseIndicators);
    if (!premiseValidation.isValid) {
      throw createValidationError(
        premiseValidation.errorMessage || 'Invalid premise indicators: expected non-empty array',
        { field: 'premiseIndicators', received: typeof premiseIndicators },
        'argument_structure_provider'
      );
    }
    
    try {
      const potentialPremises: string[] = [];
      const potentialConclusions: string[] = [];

      // Attempt to identify premises and conclusions by indicator words
      for (const sentence of sentences) {
        let isConclusion = false;
        let isPremise = false;

        // Check for conclusion indicators
        for (const indicator of conclusionIndicators) {
          if (sentence.toLowerCase().includes(indicator.toLowerCase())) {
            isConclusion = true;
            break;
          }
        }

        // Check for premise indicators (only if not already a conclusion)
        if (!isConclusion) {
          for (const indicator of premiseIndicators) {
            if (sentence.toLowerCase().includes(indicator.toLowerCase())) {
              isPremise = true;
              break;
            }
          }
        }

        // Categorize the sentence
        if (isConclusion) {
          potentialConclusions.push(sentence);
        } else if (isPremise) {
          potentialPremises.push(sentence);
        } else {
          // If no clear indicators, classify based on position heuristic
          // Last sentence is often the conclusion, others are premises
          if (sentences.indexOf(sentence) === sentences.length - 1 && sentences.length > 1) {
            potentialConclusions.push(sentence);
          } else {
            potentialPremises.push(sentence);
          }
        }
      }

      return { potentialPremises, potentialConclusions };
    } catch (error) {
      throw createDataProcessingError(
        `Failed to identify premises and conclusions: ${error instanceof Error ? error.message : String(error)}`,
        { sentenceCount: sentences.length, indicatorCounts: { conclusion: conclusionIndicators.length, premise: premiseIndicators.length } },
        'argument_structure_provider'
      );
    }
  }

  /**
   * Analyzes complete argument structure (internal implementation)
   */
  public analyzeArgumentStructureInternal(argument: string): string {
    const validation = ValidationHelpers.validateNonEmptyString(argument);
    if (!validation.isValid) {
      throw createValidationError(
        validation.errorMessage || 'Invalid argument input: expected non-empty string',
        { field: 'argument', received: typeof argument },
        'argument_structure_provider'
      );
    }
    
    try {
      let result = '### Argument Structure Analysis\n\n';

      // Get sentence analysis
      const { sentences } = this.getSentenceAnalysisInternal(argument);

      // Get indicator words
      const { conclusionIndicators, premiseIndicators } = this.getIndicatorWords();

      // Identify premises and conclusions
      const { potentialPremises, potentialConclusions } = this.identifyPremisesAndConclusionsInternal(
        sentences,
        conclusionIndicators,
        premiseIndicators
      );

      // Analyze argument complexity
      result += `**Argument Complexity:** ${sentences.length} sentence(s)\n\n`;

      // Categorize argument type
      if (sentences.length === 1) {
        result += 'This is a **simple argument** contained within a single sentence.\n\n';
      } else if (sentences.length === 2) {
        result += 'This is a **basic argument** with premise(s) and conclusion.\n\n';
      } else {
        result +=
          'This is a **complex argument** with multiple premises supporting the conclusion.\n\n';
      }

      // Identify argument pattern
      if (
        argument.toLowerCase().includes('if') &&
        (argument.toLowerCase().includes('then') || argument.toLowerCase().includes('therefore'))
      ) {
        result += 'The argument follows a **conditional (if-then) pattern**.\n\n';
      } else if (potentialConclusions.length > 1) {
        result += 'The argument has **multiple conclusions** or sub-conclusions.\n\n';
      }

      // Display identified premises and conclusions
      result += '**Identified Premises:**\n';
      if (potentialPremises.length > 0) {
        potentialPremises.forEach((premise, index) => {
          result += `${index + 1}. ${premise}\n`;
        });
      } else {
        result += 'No clear premises identified.\n';
      }

      result += '\n**Identified Conclusions:**\n';
      if (potentialConclusions.length > 0) {
        potentialConclusions.forEach((conclusion, index) => {
          result += `${index + 1}. ${conclusion}\n`;
        });
      } else {
        result += 'No clear conclusion identified.\n';
      }

      result += '\n';
      return result;
    } catch (error) {
      if (error instanceof Error && (error.name.includes('ValidationError') || error.name.includes('DataProcessingError'))) {
        throw error; // Re-throw standardized errors
      }
      throw createDataProcessingError(
        `Failed to analyze argument structure: ${error instanceof Error ? error.message : String(error)}`,
        { argument: argument.slice(0, 100) + '...' },
        'argument_structure_provider'
      );
    }
  }
}

// Create provider instance
const argumentStructureProvider = new ArgumentStructureProviderClass();

// Export wrapped functions
export const getSentenceAnalysis = withErrorHandling('argument_structure_provider', argumentStructureProvider.getSentenceAnalysisInternal.bind(argumentStructureProvider));
export const identifyPremisesAndConclusions = withErrorHandling('argument_structure_provider', argumentStructureProvider.identifyPremisesAndConclusionsInternal.bind(argumentStructureProvider));
export const analyzeArgumentStructure = withErrorHandling('argument_structure_provider', argumentStructureProvider.analyzeArgumentStructureInternal.bind(argumentStructureProvider));

// Export getIndicatorWords as-is since it doesn't need error handling (no external inputs)
export const getIndicatorWords = argumentStructureProvider.getIndicatorWords.bind(argumentStructureProvider);

// Export the class for backward compatibility
export { ArgumentStructureProviderClass as ArgumentStructureProvider };
