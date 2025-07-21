/**
 * Argument Structure Provider
 * 
 * Handles logical argument structure analysis including sentence parsing,
 * premise/conclusion identification, and structural pattern recognition.
 */

import { ValidationHelpers } from '../utils/validation_helpers.js';

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
export class ArgumentStructureProvider {

  /**
   * Analyzes sentence structure of an argument
   */
  getSentenceAnalysis(argument: string): SentenceAnalysisResult {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(argument));
    
    const sentences = argument
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());
    
    return {
      sentenceCount: sentences.length,
      sentences
    };
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
   * Identifies premises and conclusions using indicator words
   */
  identifyPremisesAndConclusions(
    sentences: string[],
    conclusionIndicators: string[],
    premiseIndicators: string[]
  ): PremisesConclusionsResult {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(sentences));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(conclusionIndicators));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(premiseIndicators));
    
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
  }

  /**
   * Analyzes complete argument structure
   */
  analyzeArgumentStructure(argument: string): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(argument));
    
    let result = '### Argument Structure Analysis\n\n';

    // Get sentence analysis
    const { sentences } = this.getSentenceAnalysis(argument);

    // Get indicator words
    const { conclusionIndicators, premiseIndicators } = this.getIndicatorWords();

    // Identify premises and conclusions
    const { potentialPremises, potentialConclusions } = this.identifyPremisesAndConclusions(
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
  }
}
