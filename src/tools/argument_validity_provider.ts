/**
 * Argument Validity Provider
 * 
 * Handles validity analysis of logical arguments including pattern detection,
 * circular reasoning checks, and validity scoring.
 */

import { ValidationHelpers } from '../utils/validation_helpers.js';

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
 * Argument Validity Provider Class
 * Analyzes logical validity of arguments
 */
export class ArgumentValidityProvider {

  /**
   * Validates validity analysis inputs
   */
  private validateValidityAnalysisInputs(argument: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(argument));
  }

  /**
   * Detects validity patterns in argument text
   */
  private detectValidityPatterns(argLower: string): ValidityPatterns {
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
  private createValidityScoringMapping(): Record<string, (patterns: ValidityPatterns) => ScoringResult> {
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
  private detectCircularReasoning(sentences: string[]): ScoringResult {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(sentences));
    
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
   * Analyzes argument validity
   */
  analyzeArgumentValidity(argument: string): string {
    // Apply ValidationHelpers early return patterns
    this.validateValidityAnalysisInputs(argument);
    
    let result = `### Argument Validity\n\n`;
    
    // Parse sentences and prepare argument
    const sentences = argument
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());
    const argLower = argument.toLowerCase();
    
    // Detect validity patterns using focused helper
    const patterns = this.detectValidityPatterns(argLower);
    
    // Calculate validity score using mapping pattern
    const scoringMethods = this.createValidityScoringMapping();
    let validityScore = 0;
    let validityAssessment = '';
    
    // Apply each scoring method
    Object.values(scoringMethods).forEach(method => {
      const result = method(patterns);
      validityScore += result.score;
      validityAssessment += result.assessment;
    });
    
    // Check for circular reasoning
    const circularResult = this.detectCircularReasoning(sentences);
    validityScore += circularResult.score;
    validityAssessment += circularResult.assessment;
    
    // Generate overall validity assessment
    result += '**Validity Assessment:**\n\n';
    
    if (validityScore >= 3) {
      result += 'The argument appears to follow valid logical structure with clear premises leading to conclusions.\n\n';
    } else if (validityScore >= 1) {
      result += 'The argument has some elements of valid logical structure but could be improved for clarity and coherence.\n\n';
    } else {
      result += 'The argument may have significant logical structure issues that affect its validity.\n\n';
    }
    
    result += validityAssessment + '\n';
    result += "**Note:** This is a preliminary assessment of logical structure and doesn't evaluate the factual accuracy of premises or the strength of inference.\n\n";
    
    return result;
  }

  /**
   * Gets validity patterns for an argument
   */
  getValidityPatterns(argument: string): ValidityPatterns {
    this.validateValidityAnalysisInputs(argument);
    return this.detectValidityPatterns(argument.toLowerCase());
  }
}
