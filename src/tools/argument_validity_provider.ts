/**
 * Argument Validity Provider
 * 
 * Handles validity analysis of logical arguments including pattern detection,
 * circular reasoning checks, and validity scoring.
 */

import { z } from 'zod';
import { ValidationHelpers } from '../utils/validation_helpers.js';
import { Logger } from '../utils/logger.js';
import {
  AnalyticalError,
  withErrorHandling,
  createValidationError,
  createDataProcessingError
} from '../utils/errors.js';

// Input schema for argument validity analysis
const ArgumentValiditySchema = z.object({
  argument: z.string().min(1).describe('The argument text to analyze for logical validity')
});

/**
 * Validity patterns interface
 */
export interface ValidityPatterns {
  hasConditional: boolean;
  hasPremiseConnectors: boolean;
  hasConclusionConnectors: boolean;
  hasEvidenceTerms: boolean;
}

/**
 * Scoring result interface
 */
export interface ScoringResult {
  score: number;
  assessment: string;
}

/**
 * Validity analysis result interface
 */
export interface ValidityAnalysisResult {
  argument: string;
  validityScore: number;
  validityAssessment: string;
  patterns: ValidityPatterns;
  overallAssessment: string;
  processingTime: number;
}

/**
 * Detects validity patterns in argument text
 */
function detectValidityPatterns(argLower: string): ValidityPatterns {
  return {
    hasConditional: /if.*then|when.*then|unless.*then|given.*it follows|since.*therefore/.test(argLower),
    hasPremiseConnectors: /because|since|as|given that|for|considering that/.test(argLower),
    hasConclusionConnectors: /therefore|thus|hence|consequently|so|it follows that|as a result/.test(argLower),
    hasEvidenceTerms: /evidence|data|study|research|statistics|example|survey|experiment|observation/.test(argLower),
  };
}

/**
 * Creates validity scoring mapping with scoring functions
 */
function createValidityScoringMapping(): Record<string, (patterns: ValidityPatterns) => ScoringResult> {
  return {
    conditional: (patterns) => {
      if (patterns.hasConditional) {
        return {
          score: 2,
          assessment: '- The argument uses conditional reasoning (if-then structure), which is a valid logical form when properly applied.\n',
        };
      }
      return { score: 0, assessment: '' };
    },
    connectors: (patterns) => {
      if (patterns.hasPremiseConnectors && patterns.hasConclusionConnectors) {
        return {
          score: 2,
          assessment: '- The argument clearly distinguishes premises from conclusions using appropriate connectors.\n',
        };
      } else if (patterns.hasPremiseConnectors || patterns.hasConclusionConnectors) {
        return {
          score: 1,
          assessment: '- The argument uses some logical connectors, but could be more explicit in distinguishing premises from conclusions.\n',
        };
      } else {
        return {
          score: 0,
          assessment: '- The argument lacks clear logical connectors to distinguish premises from conclusions.\n',
        };
      }
    },
    evidence: (patterns) => {
      if (patterns.hasEvidenceTerms) {
        return {
          score: 1,
          assessment: '- The argument references evidence or supporting information, which strengthens its logical foundation.\n',
        };
      } else {
        return {
          score: 0,
          assessment: '- The argument may lack explicit reference to evidence or supporting information.\n',
        };
      }
    },
  };
}

/**
 * Detects circular reasoning in sentences
 */
function detectCircularReasoning(sentences: string[]): ScoringResult {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return { score: 0, assessment: '' };
  }
  
  if (sentences.length >= 2) {
    const firstSentence = sentences[0].toLowerCase();
    const lastSentence = sentences[sentences.length - 1].toLowerCase();

    const similarWords = firstSentence
      .split(/\s+/)
      .filter((word) => lastSentence.split(/\s+/).includes(word) && word.length > 3);

    if (similarWords.length >= 3) {
      return {
        score: -2,
        assessment: '- The argument may contain circular reasoning, as the conclusion appears to restate the premise.\n',
      };
    }
  }
  return { score: 0, assessment: '' };
}

/**
 * Internal argument validity analysis function
 */
async function argumentValidityAnalysisInternal(
  input: z.infer<typeof ArgumentValiditySchema>
): Promise<ValidityAnalysisResult> {
  const { argument } = ArgumentValiditySchema.parse(input);
  const startTime = Date.now();
  
  Logger.info(`[argument_validity] Analyzing argument validity (${argument.length} characters)`);

  // Validate input
  if (!argument || argument.trim().length === 0) {
    throw createValidationError(
      'Argument text is required and cannot be empty',
      { argumentLength: argument?.length },
      'argument_validity'
    );
  }

  try {
    // Parse sentences and prepare argument
    const sentences = argument
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());
    
    if (sentences.length === 0) {
      throw createDataProcessingError(
        'No valid sentences found in argument text',
        { argument },
        'argument_validity'
      );
    }

    const argLower = argument.toLowerCase();
    
    // Detect validity patterns using focused helper
    const patterns = detectValidityPatterns(argLower);
    
    // Calculate validity score using mapping pattern
    const scoringMethods = createValidityScoringMapping();
    let validityScore = 0;
    let validityAssessment = '';
    
    // Apply each scoring method
    Object.values(scoringMethods).forEach(method => {
      const result = method(patterns);
      validityScore += result.score;
      validityAssessment += result.assessment;
    });
    
    // Check for circular reasoning
    const circularResult = detectCircularReasoning(sentences);
    validityScore += circularResult.score;
    validityAssessment += circularResult.assessment;
    
    // Generate overall validity assessment
    let overallAssessment = '';
    
    if (validityScore >= 3) {
      overallAssessment = 'The argument appears to follow valid logical structure with clear premises leading to conclusions.';
    } else if (validityScore >= 1) {
      overallAssessment = 'The argument has some elements of valid logical structure but could be improved for clarity and coherence.';
    } else {
      overallAssessment = 'The argument may have significant logical structure issues that affect its validity.';
    }
    
    const processingTime = Date.now() - startTime;
    
    Logger.info(`[argument_validity] Analysis completed in ${processingTime}ms`, {
      validityScore,
      patternsFound: Object.values(patterns).filter(Boolean).length
    });

    return {
      argument,
      validityScore,
      validityAssessment,
      patterns,
      overallAssessment,
      processingTime
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(
        'Invalid argument validity input',
        { issues: error.issues },
        'argument_validity'
      );
    }

    if (error instanceof AnalyticalError) {
      throw error;
    }

    throw createDataProcessingError(
      `Argument validity analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { argument, error },
      'argument_validity'
    );
  }
}

/**
 * Helper function to get validity patterns for an argument
 */
export function getValidityPatterns(argument: string): ValidityPatterns {
  if (!argument || argument.trim().length === 0) {
    throw new Error('Argument text is required');
  }
  return detectValidityPatterns(argument.toLowerCase());
}

// Export the main function with error handling wrapper
export const argumentValidityAnalysis = withErrorHandling('argument_validity', argumentValidityAnalysisInternal);
