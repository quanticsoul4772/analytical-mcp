import { z } from 'zod';
import { ValidationError, DataProcessingError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';
import { MAX_DECISION_ITEMS } from './limits.js';

// Schema for the tool parameters
export const decisionAnalysisSchema = z.object({
  options: z.array(z.string()).max(MAX_DECISION_ITEMS).describe('List of decision options to analyze'),
  criteria: z.array(z.string()).max(MAX_DECISION_ITEMS).describe('List of criteria to evaluate options against'),
  scores: z
    .array(z.array(z.number().min(0).max(10)).max(MAX_DECISION_ITEMS))
    .max(MAX_DECISION_ITEMS)
    .describe(
      'Score matrix: one row per option, one score (0-10) per criterion. ' +
        'scores[i][j] rates option i against criterion j.'
    ),
  weights: z
    .array(z.number())
    .max(MAX_DECISION_ITEMS)
    .optional()
    .describe('Optional weights for each criterion (must match criteria length)'),
});

// Interface for the function parameters
export interface DecisionAnalysisParams {
  options: string[];
  criteria: string[];
  scores: number[][];
  weights?: number[];
}

/**
 * Accepted input shape: `scores` is required by the tool schema and validated at
 * runtime, but typed optional here so partially-typed callers still compile and
 * receive a ValidationError instead of a compile break.
 */
type DecisionAnalysisInput = Omit<DecisionAnalysisParams, 'scores'> & { scores?: number[][] };

interface RankedOption {
  option: string;
  score: number;
  contributions: number[];
  scores: number[];
  strengths: string[];
  weaknesses: string[];
}

function validateInputs(
  options: string[],
  criteria: string[],
  scores: number[][],
  weights?: number[]
): void {
  if (!options || !Array.isArray(options) || options.length === 0) {
    throw new ValidationError('ERR_1001', 'At least one option must be provided');
  }
  if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
    throw new ValidationError('ERR_1001', 'At least one criterion must be provided');
  }
  if (options.some((opt) => typeof opt !== 'string' || opt.trim() === '')) {
    throw new ValidationError('ERR_1001', 'All options must be non-empty strings');
  }
  if (criteria.some((crit) => typeof crit !== 'string' || crit.trim() === '')) {
    throw new ValidationError('ERR_1001', 'All criteria must be non-empty strings');
  }

  if (!scores || !Array.isArray(scores)) {
    throw new ValidationError(
      'ERR_1001',
      'A scores matrix is required: one row per option, one score (0-10) per criterion'
    );
  }
  if (scores.length !== options.length) {
    throw new ValidationError(
      'ERR_1001',
      `Scores matrix must have one row per option (got ${scores.length} rows for ${options.length} options)`
    );
  }
  scores.forEach((row, i) => {
    if (!Array.isArray(row) || row.length !== criteria.length) {
      throw new ValidationError(
        'ERR_1001',
        `Scores row ${i} ("${options[i]}") must have one score per criterion ` +
          `(got ${Array.isArray(row) ? row.length : 'non-array'} for ${criteria.length} criteria)`
      );
    }
    if (row.some((s) => typeof s !== 'number' || !Number.isFinite(s) || s < 0 || s > 10)) {
      throw new ValidationError(
        'ERR_1001',
        `Scores row ${i} ("${options[i]}") must contain numbers between 0 and 10`
      );
    }
  });

  if (weights) {
    if (weights.length !== criteria.length) {
      throw new ValidationError(
        'ERR_1001',
        `Weights length (${weights.length}) must match criteria length (${criteria.length})`
      );
    }
    if (weights.some((w) => typeof w !== 'number' || isNaN(w) || w < 0)) {
      throw new ValidationError('ERR_1001', 'All weights must be non-negative numbers');
    }
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    if (weightSum <= 0) {
      throw new ValidationError('ERR_1001', 'Weights must sum to a positive number');
    }
    if (Math.abs(weightSum - 1) > 0.001 && Math.abs(weightSum - 100) > 0.001) {
      Logger.warn(
        `Weights don't sum to 1 or 100 (sum=${weightSum}). Proceeding with normalization.`
      );
    }
  }
}

/** Normalize weights so they sum to 1; equal weights when none provided. */
function normalizeWeights(criteriaCount: number, weights?: number[]): number[] {
  if (!weights) {
    return Array.from({ length: criteriaCount }, () => 1 / criteriaCount);
  }
  const sum = weights.reduce((total, w) => total + w, 0);
  return weights.map((w) => w / sum);
}

function rankOptions(
  options: string[],
  criteria: string[],
  scores: number[][],
  normalizedWeights: number[]
): RankedOption[] {
  return options
    .map((option, i) => {
      const contributions = scores[i].map((score, j) => score * normalizedWeights[j]);
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      scores[i].forEach((score, j) => {
        if (score >= 7) {
          strengths.push(`Strong in "${criteria[j]}" (score ${score})`);
        } else if (score <= 3) {
          weaknesses.push(`Weak in "${criteria[j]}" (score ${score})`);
        }
      });
      return {
        option,
        score: contributions.reduce((sum, c) => sum + c, 0),
        contributions,
        scores: scores[i],
        strengths,
        weaknesses,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function formatOptionDetail(
  item: RankedOption,
  criteria: string[],
  normalizedWeights: number[]
): string {
  let detail = `#### ${item.option} (Score: ${item.score.toFixed(2)})\n\n`;

  detail += `| Criterion | Score | Weight | Contribution |\n`;
  detail += `|-----------|-------|--------|--------------|\n`;
  criteria.forEach((criterion, j) => {
    detail += `| ${criterion} | ${item.scores[j]} | ${normalizedWeights[j].toFixed(3)} | ${item.contributions[j].toFixed(2)} |\n`;
  });

  detail += `\n**Strengths:**\n`;
  detail +=
    item.strengths.length > 0
      ? item.strengths.map((s) => `- ${s}\n`).join('')
      : `- No criterion scored 7 or above\n`;

  detail += `\n**Weaknesses:**\n`;
  detail +=
    item.weaknesses.length > 0
      ? item.weaknesses.map((w) => `- ${w}\n`).join('')
      : `- No criterion scored 3 or below\n`;

  return `${detail}\n`;
}

function formatResults(
  rankedOptions: RankedOption[],
  criteria: string[],
  normalizedWeights: number[]
): string {
  let result = `## Decision Analysis Results\n\n`;

  result += `### Ranked Options\n\n`;
  rankedOptions.forEach((item, i) => {
    result += `**${i + 1}. ${item.option}** (Score: ${item.score.toFixed(2)})\n`;
  });

  result += `\n### Detailed Analysis\n\n`;
  rankedOptions.forEach((item) => {
    result += formatOptionDetail(item, criteria, normalizedWeights);
  });

  const topOption = rankedOptions[0];
  result += `### Recommendation\n\n`;
  result += `Based on the weighted scores, **${topOption.option}** ranks first with a score of ${topOption.score.toFixed(2)}.\n`;
  if (topOption.strengths.length > 0) {
    result += `Its key strengths: ${topOption.strengths.join(', ')}.\n`;
  }
  if (rankedOptions.length > 1) {
    const runnerUp = rankedOptions[1];
    result += `\nThe second-ranked option is **${runnerUp.option}** with a score of ${runnerUp.score.toFixed(2)}.\n`;
  }

  return result;
}

// Tool implementation that accepts both a parameter object and individual parameters
export async function decisionAnalysis(
  optionsOrParams: string[] | DecisionAnalysisInput,
  criteriaArg?: string[],
  scoresArg?: number[][],
  weightsArg?: number[]
): Promise<string> {
  // Handle both parameter styles
  let options: string[];
  let criteria: string[];
  let scores: number[][];
  let weights: number[] | undefined;

  if (Array.isArray(optionsOrParams)) {
    options = optionsOrParams;
    criteria = criteriaArg || [];
    scores = scoresArg as number[][];
    weights = weightsArg;
  } else {
    options = optionsOrParams.options;
    criteria = optionsOrParams.criteria;
    scores = optionsOrParams.scores as number[][];
    weights = optionsOrParams.weights;
  }

  try {
    Logger.debug('Starting decision analysis', {
      optionsCount: options?.length,
      criteriaCount: criteria?.length,
      weightsProvided: !!weights,
    });

    validateInputs(options, criteria, scores, weights);
    const normalizedWeights = normalizeWeights(criteria.length, weights);
    const rankedOptions = rankOptions(options, criteria, scores, normalizedWeights);
    const result = formatResults(rankedOptions, criteria, normalizedWeights);

    Logger.debug('Decision analysis completed successfully', {
      optionsAnalyzed: options.length,
      topScore: rankedOptions[0].score,
    });

    return result;
  } catch (error) {
    if (!(error instanceof ValidationError) && !(error instanceof DataProcessingError)) {
      Logger.error('Unexpected error in decision analysis', error);
      throw new DataProcessingError(
        'ERR_3001',
        `Decision analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    throw error;
  }
}
