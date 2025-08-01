import { z } from 'zod';
import * as mathjs from 'mathjs';
import { Logger } from '../utils/logger.js';
import { 
  ValidationError, 
  DataProcessingError, 
  withErrorHandling,
  createValidationError,
  createDataProcessingError,
  ErrorCodes
} from '../utils/errors.js';

// Schema for hypothesis testing
const HypothesisTestingSchema = z.object({
  testType: z.enum(['t_test_independent', 't_test_paired', 'correlation', 'chi_square', 'anova']),
  data: z.array(z.union([z.array(z.number()), z.array(z.record(z.string(), z.number()))])),
  variables: z.array(z.string()).optional(),
  alpha: z.number().min(0.01).max(0.1).default(0.05),
  alternativeHypothesis: z.string().optional(),
});

// Type conversion utility
function toNumber(value: mathjs.MathType): number {
  return typeof value === 'number' ? value : Number(value);
}

// Utility to calculate simplified p-value
function calculateSimplifiedPValue(
  tStat: number,
  df: number,
  alternativeHypothesis: string
): number {
  // Simplified p-value calculation (mock implementation)
  return Math.abs(tStat) > 2 ? 0.05 : 0.5;
}

// Interpret correlation strength
function interpretCorrelation(r: number): string {
  const absR = Math.abs(r);
  if (absR < 0.3) return 'weak';
  if (absR < 0.7) return 'moderate';
  return 'strong';
}

// Internal hypothesis testing function (wrapped for error handling)
async function hypothesisTestingInternal(
  testType: string,
  data: number[][] | Record<string, any>[],
  variables?: string[],
  alpha: number = 0.05,
  alternativeHypothesis?: string
): Promise<string> {
  // Validate input
  try {
    const validatedInput = HypothesisTestingSchema.parse({
      testType,
      data,
      variables,
      alpha,
      alternativeHypothesis,
    });
    Logger.debug(`Validated hypothesis testing request`, {
      testType,
      dataLength: data.length,
      alpha,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      Logger.error('Hypothesis testing validation failed', error);
      throw createValidationError(
        `Invalid parameters for hypothesis testing: ${error.message}`,
        { issues: error.issues },
        'hypothesis_testing'
      );
    }
    throw error;
  }

  let result = `# Hypothesis Testing Report\n\n`;

  try {
    switch (testType) {
      case 't_test_independent':
        const [group1, group2] = data as number[][];
        const mean1 = toNumber(mathjs.mean(group1));
        const mean2 = toNumber(mathjs.mean(group2));
        const std1 = toNumber(mathjs.std(group1));
        const std2 = toNumber(mathjs.std(group2));
        const n1 = group1.length;
        const n2 = group2.length;
        const tStat = (mean1 - mean2) / Math.sqrt((std1 * std1) / n1 + (std2 * std2) / n2);
        const df = n1 + n2 - 2;
        const pValue = calculateSimplifiedPValue(tStat, df, alternativeHypothesis || 'two-sided');

        result += `## Independent T-Test Results\n\n`;
        result += `| Statistic | Value |\n`;
        result += `|-----------|-------|\n`;
        result += `| T-Statistic | ${tStat.toFixed(4)} |\n`;
        result += `| Degrees of Freedom | ${df} |\n`;
        result += `| P-Value | ${pValue.toFixed(4)} |\n`;
        result += `| Significance Level | ${alpha} |\n`;
        result += `| Conclusion | ${pValue < alpha ? 'Reject' : 'Fail to reject'} null hypothesis |\n`;
        break;

      case 'correlation':
        const correlationData = data as Record<string, number>[];
        const var1 = variables?.[0] || Object.keys(correlationData[0])[0];
        const var2 = variables?.[1] || Object.keys(correlationData[0])[1];

        const x = correlationData.map((row) => row[var1]);
        const y = correlationData.map((row) => row[var2]);

        const r = toNumber(mathjs.corr(x, y));

        result += `## Correlation Analysis\n\n`;
        result += `| Metric | Value |\n`;
        result += `|--------|-------|\n`;
        result += `| Pearson's r | ${r.toFixed(4)} | ${interpretCorrelation(r)} |\n`;
        result += `| Interpretation | ${r > 0 ? 'Positive' : 'Negative'} correlation |\n`;

        result += `\nThe correlation coefficient (r = ${r.toFixed(4)}) indicates a ${interpretCorrelation(r)} relationship between ${var1} and ${var2}.\n`;
        break;

      default:
        throw createValidationError(
          `Unsupported test type: ${testType}`,
          { supportedTypes: ['t_test_independent', 't_test_paired', 'correlation', 'chi_square', 'anova'] },
          'hypothesis_testing'
        );
    }

    return result;
  } catch (error) {
    // Re-throw ValidationError without modification
    if (error instanceof ValidationError) {
      throw error;
    }
    
    Logger.error('Hypothesis Testing Error', error, {
      testType,
      dataLength: data.length,
    });
    throw createDataProcessingError(
      `Hypothesis testing failed: ${error instanceof Error ? error.message : String(error)}`,
      { testType, originalError: error },
      'hypothesis_testing'
    );
  }
}

// Wrap the function with standardized error handling
export const hypothesisTesting = withErrorHandling(
  'hypothesis_testing',
  hypothesisTestingInternal
);

// Export schema
export { HypothesisTestingSchema as hypothesisTestingSchema };
