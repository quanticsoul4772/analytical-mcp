import { z } from 'zod';
import { ValidationError, DataProcessingError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

// Schema for the tool parameters
export const decisionAnalysisSchema = z.object({
  options: z.array(z.string()).describe('List of decision options to analyze'),
  criteria: z.array(z.string()).describe('List of criteria to evaluate options against'),
  weights: z
    .array(z.number())
    .optional()
    .describe('Optional weights for each criterion (must match criteria length)'),
});

// Interface for the function parameters
export interface DecisionAnalysisParams {
  options: string[];
  criteria: string[];
  weights?: number[];
}

// Tool implementation that accepts both a parameter object and individual parameters
export async function decisionAnalysis(
  optionsOrParams: string[] | DecisionAnalysisParams,
  criteriaOrVoid?: string[],
  weights?: number[]
): Promise<string> {
  // Handle both parameter styles
  let options: string[];
  let criteria: string[];
  
  if (Array.isArray(optionsOrParams)) {
    // Old style with separate parameters
    options = optionsOrParams;
    criteria = criteriaOrVoid || [];
  } else {
    // New style with parameter object
    options = optionsOrParams.options;
    criteria = optionsOrParams.criteria;
    weights = optionsOrParams.weights;
  }
  try {
    Logger.debug('Starting decision analysis', {
      optionsCount: options.length,
      criteriaCount: criteria.length,
      weightsProvided: !!weights,
    });

    // Validate inputs
    if (!options || !Array.isArray(options) || options.length === 0) {
      throw new ValidationError('ERR_1001', 'At least one option must be provided');
    }

    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      throw new ValidationError('ERR_1001', 'At least one criterion must be provided');
    }

    // Check for empty strings in options
    if (options.some((opt) => typeof opt !== 'string' || opt.trim() === '')) {
      throw new ValidationError('ERR_1001', 'All options must be non-empty strings');
    }

    // Check for empty strings in criteria
    if (criteria.some((crit) => typeof crit !== 'string' || crit.trim() === '')) {
      throw new ValidationError('ERR_1001', 'All criteria must be non-empty strings');
    }

    // Use equal weights if none provided
    const normalizedWeights = weights || criteria.map(() => 1 / criteria.length);

    // Validate weights length
    if (normalizedWeights.length !== criteria.length) {
      throw new ValidationError(
        'ERR_1001',
        `Weights length (${normalizedWeights.length}) must match criteria length (${criteria.length})`
      );
    }

    // Validate weights are numbers and sum to approximately 1
    if (weights) {
      if (weights.some((w) => typeof w !== 'number' || isNaN(w))) {
        throw new ValidationError('ERR_1001', 'All weights must be valid numbers');
      }

      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      if (Math.abs(weightSum - 1) > 0.001 && Math.abs(weightSum - 100) > 0.001) {
        Logger.warn(
          `Weights don't sum to 1 or 100 (sum=${weightSum}). Proceeding with normalization.`
        );
      }
    }

    try {
      // Generate random scores for demo purposes
      // In a real implementation, this would use real data or ask for user input
      const scores: number[][] = [];
      const pros: string[][] = [];
      const cons: string[][] = [];

      for (let i = 0; i < options.length; i++) {
        scores[i] = [];
        pros[i] = [];
        cons[i] = [];

        for (let j = 0; j < criteria.length; j++) {
          // Generate a random score between 1-10
          const score = Math.floor(Math.random() * 10) + 1;
          scores[i][j] = score;

          // Generate pros and cons based on score
          if (score >= 7) {
            pros[i].push(`Strong in "${criteria[j]}"`);
          } else if (score >= 4) {
            // No strong pro or con
          } else {
            cons[i].push(`Weak in "${criteria[j]}"`);
          }
        }

        // Add a few more realistic pros and cons
        if (Math.random() > 0.5) {
          pros[i].push('Implementation is straightforward');
        }

        if (Math.random() > 0.5) {
          cons[i].push('May require additional resources');
        }

        if (Math.random() > 0.7) {
          pros[i].push('Aligned with organizational goals');
        }

        if (Math.random() > 0.7) {
          cons[i].push('Potential regulatory challenges');
        }
      }

      // Calculate weighted scores
      const weightedScores = options.map((option, i) => {
        return scores[i].reduce((sum, score, j) => {
          return sum + score * normalizedWeights[j];
        }, 0);
      });

      // Define interfaces for clear types
      interface RankedOption {
        option: string;
        score: number;
        pros: string[];
        cons: string[];
      }

      // Rank options with type safety
      const rankedOptions: RankedOption[] = options
        .map((option, i) => ({
          option,
          score: weightedScores[i],
          pros: pros[i] || [],
          cons: cons[i] || [],
        }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      // Format output
      let result = `## Decision Analysis Results\n\n`;

      // Add ranked options
      result += `### Ranked Options\n\n`;
      rankedOptions.forEach((item, i) => {
        result += `**${i + 1}. ${item.option}** (Score: ${item.score.toFixed(2)})\n`;
      });

      // Add details for each option
      result += `\n### Detailed Analysis\n\n`;
      rankedOptions.forEach((item) => {
        result += `#### ${item.option} (Score: ${item.score.toFixed(2)})\n\n`;

        // Pros
        result += `**Pros:**\n`;
        if (item.pros && item.pros.length > 0) {
          item.pros.forEach((pro) => {
            result += `- ${pro}\n`;
          });
        } else {
          result += `- No significant advantages identified\n`;
        }

        // Cons
        result += `\n**Cons:**\n`;
        if (item.cons && item.cons.length > 0) {
          item.cons.forEach((con) => {
            result += `- ${con}\n`;
          });
        } else {
          result += `- No significant disadvantages identified\n`;
        }

        result += `\n`;
      });

      // Add recommendations
      const topOption = rankedOptions.length > 0 ? rankedOptions[0] : null;
      result += `### Recommendation\n\n`;
      
      if (topOption) {
        result += `Based on the analysis, **${topOption.option}** appears to be the strongest option with a score of ${topOption.score.toFixed(2)}.\n`;
        result += `Its key strengths include: ${topOption.pros && topOption.pros.length > 0 ? topOption.pros.join(', ') : 'No significant pros identified'}.\n`;

        if (rankedOptions.length > 1) {
          const runnerUp = rankedOptions[1];
          result += `\nThe second-best option is **${runnerUp.option}** with a score of ${runnerUp.score.toFixed(2)}.\n`;
        }
      } else {
        result += `No options were available for ranking.\n`;
      }

      Logger.debug('Decision analysis completed successfully', {
        optionsAnalyzed: options.length,
        topScore: rankedOptions.length > 0 ? rankedOptions[0].score : 0,
      });

      return result;
    } catch (error) {
      Logger.error('Error generating decision analysis results', error);
      throw new DataProcessingError(
        'ERR_3001',
        `Failed to generate decision analysis: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } catch (error) {
    // Ensure all errors are properly logged and categorized
    if (!(error instanceof ValidationError) && !(error instanceof DataProcessingError)) {
      Logger.error('Unexpected error in decision analysis', error);
      throw new DataProcessingError(
        'ERR_3001',
        `Decision analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Re-throw ValidationError and DataProcessingError
    throw error;
  }
}
