/**
 * Logical Fallacy Provider
 * 
 * Handles detection and analysis of logical fallacies in arguments
 * using pattern matching and heuristic approaches.
 */

import { ValidationHelpers } from '../utils/validation_helpers.js';
import { 
  withErrorHandling, 
  createValidationError, 
  createDataProcessingError,
  ErrorCodes 
} from '../utils/errors.js';

/**
 * Fallacy type definition interface
 */
export interface FallacyType {
  name: string;
  description: string;
  example: string;
}

/**
 * Detected fallacy result interface
 */
export interface DetectedFallacy {
  name: string;
  description: string;
  evidence: string;
  confidence: number;
}

/**
 * Logical Fallacy Provider Class
 * Detects and analyzes logical fallacies in arguments
 */
class LogicalFallacyProviderClass {

  // Types of logical fallacies with descriptions
  private readonly fallacyTypes: Record<string, FallacyType> = {
    adHominem: {
      name: 'Ad Hominem',
      description: 'Attacking the person rather than addressing their argument',
      example: "You can't trust his economic policy because he's never worked a real job.",
    },
    strawMan: {
      name: 'Straw Man',
      description: "Misrepresenting someone's argument to make it easier to attack",
      example:
        'She wants environmental regulations, so she obviously wants to destroy all businesses.',
    },
    appealToAuthority: {
      name: 'Appeal to Authority',
      description: "Using an authority's opinion as evidence without addressing the argument itself",
      example: 'Dr. Smith believes in this treatment, so it must be effective.',
    },
    falseEquivalence: {
      name: 'False Equivalence',
      description: "Comparing two things that aren't comparable",
      example: 'Making children eat vegetables is the same as dictatorial control.',
    },
    slipperySlope: {
      name: 'Slippery Slope',
      description: 'Asserting that a small step will lead to a chain of events without evidence',
      example: 'If we allow same-sex marriage, next people will want to marry their pets.',
    },
    circularReasoning: {
      name: 'Circular Reasoning',
      description: 'Making an argument where the conclusion is included in the premise',
      example:
        "The Bible is true because it's the word of God, and we know it's the word of God because the Bible says so.",
    },
    falseDichotomy: {
      name: 'False Dichotomy',
      description: 'Presenting only two options when more exist',
      example: 'Either we cut all environmental regulations or we lose all our jobs.',
    },
    hastyGeneralization: {
      name: 'Hasty Generalization',
      description: 'Drawing a conclusion based on insufficient evidence',
      example: 'I met two rude people from that country, so everyone from there must be rude.',
    },
    appealToEmotion: {
      name: 'Appeal to Emotion',
      description: 'Manipulating emotions rather than using valid reasoning',
      example: 'Think of the children! We must pass this law to protect them.',
    },
    redHerring: {
      name: 'Red Herring',
      description: 'Introducing an irrelevant topic to divert attention',
      example:
        'Why worry about climate change when there are children starving in developing countries?',
    },
  };

  /**
   * Validates fallacy analysis inputs
   */
  private validateFallacyAnalysisInputs(argument: string): void {
    const validation = ValidationHelpers.validateNonEmptyString(argument);
    if (!validation.isValid) {
      throw createValidationError(
        validation.errorMessage || 'Invalid argument input: expected non-empty string',
        { field: 'argument', received: typeof argument },
        'logical_fallacy_provider'
      );
    }
  }

  /**
   * Creates fallacy detection mapping with pattern matching functions
   */
  private createFallacyDetectionMapping(): Record<string, (lowerArg: string) => DetectedFallacy | null> {
    return {
      adHominem: (lowerArg) => {
        if (
          /they are|he is|she is|you are|they're|he's|she's|you're/.test(lowerArg) &&
          /stupid|dumb|idiot|fool|incompetent|ignorant|uneducated|inexperienced/.test(lowerArg)
        ) {
          return {
            name: this.fallacyTypes.adHominem.name,
            description: this.fallacyTypes.adHominem.description,
            evidence: 'The argument appears to attack personal characteristics rather than addressing the substance of the opposing position.',
            confidence: 0.7,
          };
        }
        return null;
      },
      strawMan: (lowerArg) => {
        if (
          /(no one|nobody) is saying|claiming|suggesting/.test(lowerArg) ||
          /that's not what|that isn't what|misrepresent/.test(lowerArg)
        ) {
          return {
            name: this.fallacyTypes.strawMan.name,
            description: this.fallacyTypes.strawMan.description,
            evidence: "The argument may be refuting a position that wasn't actually presented by the opposition.",
            confidence: 0.6,
          };
        }
        return null;
      },
      appealToAuthority: (lowerArg) => {
        if (
          /expert|authority|professor|doctor|scientist|research|study|according to/.test(lowerArg) &&
          !/evidence|data|experiment|finding/.test(lowerArg)
        ) {
          return {
            name: this.fallacyTypes.appealToAuthority.name,
            description: this.fallacyTypes.appealToAuthority.description,
            evidence: 'The argument relies on authority figures without discussing the substance of their findings or the evidence they present.',
            confidence: 0.5,
          };
        }
        return null;
      },
      slipperySlope: (lowerArg) => {
        if (
          /next|then|lead to|result in|eventually|ultimately|soon|before you know it/.test(lowerArg) &&
          /will|would|could|might|may|can/.test(lowerArg)
        ) {
          return {
            name: this.fallacyTypes.slipperySlope.name,
            description: this.fallacyTypes.slipperySlope.description,
            evidence: 'The argument suggests that one event will lead to a series of negative consequences without providing evidence for this chain of events.',
            confidence: 0.6,
          };
        }
        return null;
      },
      circularReasoning: (lowerArg) => {
        if (/because|since/.test(lowerArg) && /true|right|correct|valid/.test(lowerArg)) {
          const words = lowerArg.split(/\s+/);
          const uniqueWords = new Set(words);
          if (words.length - uniqueWords.size > words.length * 0.3) {
            return {
              name: this.fallacyTypes.circularReasoning.name,
              description: this.fallacyTypes.circularReasoning.description,
              evidence: 'The argument may be using its conclusion as support for itself.',
              confidence: 0.4,
            };
          }
        }
        return null;
      },
      falseDichotomy: (lowerArg) => {
        if (
          /either|or|only two|two choices|two options/.test(lowerArg) ||
          (/if not|if we don't|unless/.test(lowerArg) && /then|will|must/.test(lowerArg))
        ) {
          return {
            name: this.fallacyTypes.falseDichotomy.name,
            description: this.fallacyTypes.falseDichotomy.description,
            evidence: 'The argument presents a limited set of options when other alternatives may exist.',
            confidence: 0.5,
          };
        }
        return null;
      },
      hastyGeneralization: (lowerArg) => {
        if (
          /all|every|always|never|none/.test(lowerArg) &&
          /one|two|few|some|once|twice/.test(lowerArg)
        ) {
          return {
            name: this.fallacyTypes.hastyGeneralization.name,
            description: this.fallacyTypes.hastyGeneralization.description,
            evidence: 'The argument may be drawing broad conclusions from limited examples.',
            confidence: 0.5,
          };
        }
        return null;
      },
      appealToEmotion: (lowerArg) => {
        if (
          /think of|consider|imagine|feel|emotional|heartbreaking|tragic|terrible|wonderful/.test(lowerArg) &&
          !/evidence|data|fact|study|research/.test(lowerArg)
        ) {
          return {
            name: this.fallacyTypes.appealToEmotion.name,
            description: this.fallacyTypes.appealToEmotion.description,
            evidence: 'The argument relies heavily on emotional language without substantial evidence.',
            confidence: 0.4,
          };
        }
        return null;
      },
    };
  }

  /**
   * Detects fallacies from argument text
   */
  private detectFallaciesFromArgument(lowerArg: string): DetectedFallacy[] {
    const detectedFallacies: DetectedFallacy[] = [];
    const fallacyDetectors = this.createFallacyDetectionMapping();

    Object.values(fallacyDetectors).forEach(detector => {
      const result = detector(lowerArg);
      if (result) {
        detectedFallacies.push(result);
      }
    });
    
    return detectedFallacies;
  }

  /**
   * Analyzes logical fallacies in an argument (internal implementation)
   */
  public analyzeLogicalFallaciesInternal(argument: string): string {
    // Apply ValidationHelpers early return patterns
    this.validateFallacyAnalysisInputs(argument);
    
    try {
      let result = `### Logical Fallacy Analysis\n\n`;
      const lowerArg = argument.toLowerCase();
      
      // Detect fallacies using focused helper
      const detectedFallacies = this.detectFallaciesFromArgument(lowerArg);
      
      // Report detected fallacies
      if (detectedFallacies.length === 0) {
        result +=
          "No common logical fallacies were detected in this argument. However, fallacy detection is complex and the absence of detection doesn't guarantee a fallacy-free argument.\n\n";
      } else {
        result += `**Potential Logical Fallacies Detected:**\n\n`;

        detectedFallacies.forEach((fallacy, index) => {
          result += `${index + 1}. **${fallacy.name}** (Confidence: ${(fallacy.confidence * 100).toFixed(0)}%)  \n`;
          result += `   *${fallacy.description}*  \n`;
          result += `   Evidence: ${fallacy.evidence}\n\n`;
        });

        result +=
          'Note: Fallacy detection is based on text patterns and may not accurately capture the nuance of the argument. These are potential fallacies that should be evaluated in context.\n\n';
      }

      return result;
    } catch (error) {
      if (error instanceof Error && (error.name.includes('ValidationError') || error.name.includes('DataProcessingError'))) {
        throw error; // Re-throw standardized errors
      }
      throw createDataProcessingError(
        `Failed to analyze logical fallacies: ${error instanceof Error ? error.message : String(error)}`,
        { argument: argument.slice(0, 100) + '...' },
        'logical_fallacy_provider'
      );
    }
  }

  /**
   * Gets all supported fallacy types
   */
  getFallacyTypes(): Record<string, FallacyType> {
    return { ...this.fallacyTypes };
  }
}

// Create provider instance
const logicalFallacyProvider = new LogicalFallacyProviderClass();

// Export wrapped functions
export const analyzeLogicalFallacies = withErrorHandling('logical_fallacy_provider', logicalFallacyProvider.analyzeLogicalFallaciesInternal.bind(logicalFallacyProvider));

// Export getFallacyTypes as-is since it doesn't need error handling
export const getFallacyTypes = logicalFallacyProvider.getFallacyTypes.bind(logicalFallacyProvider);

// Export the class for backward compatibility
export { LogicalFallacyProviderClass as LogicalFallacyProvider };
