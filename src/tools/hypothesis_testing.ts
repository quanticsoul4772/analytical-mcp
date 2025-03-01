import { z } from 'zod';
import * as mathjs from 'mathjs';

// Schema for hypothesis testing
const HypothesisTestingSchema = z.object({
  testType: z.enum([
    't_test_independent', 
    't_test_paired', 
    'correlation', 
    'chi_square', 
    'anova'
  ]),
  data: z.array(z.union([
    z.array(z.number()),
    z.array(z.record(z.string(), z.number()))
  ])),
  variables: z.array(z.string()).optional(),
  alpha: z.number().min(0.01).max(0.1).default(0.05),
  alternativeHypothesis: z.string().optional()
});

// Type conversion utility
function toNumber(value: mathjs.MathType): number {
  return typeof value === 'number' ? value : Number(value);
}

// Utility to calculate simplified p-value
function calculateSimplifiedPValue(tStat: number, df: number, alternativeHypothesis: string): number {
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

// Hypothesis testing function
async function hypothesisTesting(
  testType: string,
  data: number[][] | Record<string, any>[],
  variables?: string[],
  alpha: number = 0.05,
  alternativeHypothesis?: string
): Promise<string> {
  // Validate input
  const validatedInput = HypothesisTestingSchema.parse({
    testType,
    data,
    variables,
    alpha,
    alternativeHypothesis
  });

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
        const tStat = (mean1 - mean2) / 
          Math.sqrt((std1 * std1 / n1) + (std2 * std2 / n2));
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
        
        const x = correlationData.map(row => row[var1]);
        const y = correlationData.map(row => row[var2]);
        
        const r = toNumber(mathjs.corr(x, y));

        result += `## Correlation Analysis\n\n`;
        result += `| Metric | Value |\n`;
        result += `|--------|-------|\n`;
        result += `| Pearson's r | ${r.toFixed(4)} | ${interpretCorrelation(r)} |\n`;
        result += `| Interpretation | ${r > 0 ? 'Positive' : 'Negative'} correlation |\n`;
        
        result += `\nThe correlation coefficient (r = ${r.toFixed(4)}) indicates a ${interpretCorrelation(r)} relationship between ${var1} and ${var2}.\n`;
        break;

      default:
        throw new Error(`Unsupported test type: ${testType}`);
    }

    return result;
  } catch (error) {
    console.error('Hypothesis Testing Error:', error);
    throw new Error(`Hypothesis testing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Explicit re-export of the function and schema
export { hypothesisTesting, HypothesisTestingSchema as hypothesisTestingSchema };
