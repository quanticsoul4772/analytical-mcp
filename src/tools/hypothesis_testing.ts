import { z } from 'zod';
import * as mathjs from 'mathjs';
import { Logger } from '../utils/logger.js';
import { ValidationError, DataProcessingError } from '../utils/errors.js';
import { tTestPValue, chiSquarePValue, fTestPValue } from '../utils/statistics.js';

// Schema for hypothesis testing
const HypothesisTestingSchema = z.object({
  testType: z
    .enum(['t_test_independent', 't_test_paired', 'correlation', 'chi_square', 'anova'])
    .describe(
      "Which test to run: 't_test_independent' (Welch, two independent groups), 't_test_paired' (two paired groups), 'correlation' (Pearson r + significance), 'chi_square' (independence on a contingency table), or 'anova' (one-way, 2+ groups)."
    ),
  data: z
    .array(z.union([z.array(z.number()), z.array(z.record(z.string(), z.number()))]))
    .describe(
      'Shape depends on testType: t-tests and ANOVA take an array of numeric groups (number[][]); correlation takes two numeric arrays or an array of {x,y} records (see variables); chi_square takes a contingency table (rows x columns of counts).'
    ),
  variables: z
    .array(z.string())
    .optional()
    .describe(
      "For 'correlation' only: the two record keys to correlate when data is an array of objects. Ignored otherwise."
    ),
  alpha: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.05)
    .describe('Significance level for the reject/fail decision, 0.01-0.1 (default 0.05).'),
  alternativeHypothesis: z
    .string()
    .optional()
    .describe(
      "Direction: 'less' or 'greater' for a one-sided test; anything else (or omit) is two-sided."
    ),
});

type TTail = 'two-sided' | 'greater' | 'less';

// Type conversion utility
function toNumber(value: mathjs.MathType): number {
  return typeof value === 'number' ? value : Number(value);
}

/** Map the free-form alternativeHypothesis parameter to a t-test tail. */
function resolveTail(alternativeHypothesis?: string): TTail {
  const normalized = (alternativeHypothesis || '').trim().toLowerCase();
  if (normalized === 'less' || normalized === 'greater') return normalized;
  return 'two-sided';
}

/** Sample variance (n − 1 denominator). */
function sampleVariance(values: number[]): number {
  const sd = toNumber(mathjs.std(values, 'unbiased'));
  return sd * sd;
}

function conclusionRow(pValue: number, alpha: number): string {
  const decision = pValue < alpha ? 'Reject' : 'Fail to reject';
  return `| Conclusion | ${decision} null hypothesis at alpha = ${alpha} |\n`;
}

function requireNumericGroups(data: unknown[], count: number, testName: string): number[][] {
  const groups = data as number[][];
  if (count > 0 && groups.length !== count) {
    throw new ValidationError(
      'ERR_1001',
      `${testName} requires exactly ${count} groups of numbers, got ${groups.length}`
    );
  }
  for (const group of groups) {
    if (!Array.isArray(group) || group.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
      throw new ValidationError('ERR_1001', `${testName} requires numeric data groups`);
    }
    if (group.length < 2) {
      throw new ValidationError(
        'ERR_1001',
        `${testName} requires at least 2 observations per group`
      );
    }
  }
  return groups;
}

// Interpret correlation strength
function interpretCorrelation(r: number): string {
  const absR = Math.abs(r);
  if (absR < 0.3) return 'weak';
  if (absR < 0.7) return 'moderate';
  return 'strong';
}

/** Welch's independent-samples t-test (Welch–Satterthwaite degrees of freedom). */
function runIndependentTTest(data: unknown[], alpha: number, tail: TTail): string {
  const [group1, group2] = requireNumericGroups(data, 2, 'Independent t-test');
  const mean1 = toNumber(mathjs.mean(group1));
  const mean2 = toNumber(mathjs.mean(group2));
  const v1 = sampleVariance(group1);
  const v2 = sampleVariance(group2);
  const n1 = group1.length;
  const n2 = group2.length;

  const se1 = v1 / n1;
  const se2 = v2 / n2;
  const standardError = Math.sqrt(se1 + se2);
  if (standardError === 0) {
    throw new ValidationError(
      'ERR_1001',
      'Independent t-test requires non-zero variance in the data'
    );
  }
  const tStat = (mean1 - mean2) / standardError;
  const df = ((se1 + se2) * (se1 + se2)) / ((se1 * se1) / (n1 - 1) + (se2 * se2) / (n2 - 1));
  const pValue = tTestPValue(tStat, df, tail);

  let section = `## Independent T-Test Results (Welch)\n\n`;
  section += `| Statistic | Value |\n`;
  section += `|-----------|-------|\n`;
  section += `| Mean (Group 1) | ${mean1.toFixed(4)} |\n`;
  section += `| Mean (Group 2) | ${mean2.toFixed(4)} |\n`;
  section += `| T-Statistic | ${tStat.toFixed(4)} |\n`;
  section += `| Degrees of Freedom | ${df.toFixed(2)} |\n`;
  section += `| P-Value (${tail}) | ${pValue.toFixed(4)} |\n`;
  section += `| Significance Level | ${alpha} |\n`;
  section += conclusionRow(pValue, alpha);
  return section;
}

/** Paired-samples t-test on the differences. */
function runPairedTTest(data: unknown[], alpha: number, tail: TTail): string {
  const [before, after] = requireNumericGroups(data, 2, 'Paired t-test');
  if (before.length !== after.length) {
    throw new ValidationError(
      'ERR_1001',
      `Paired t-test requires groups of equal length (got ${before.length} and ${after.length})`
    );
  }
  const differences = before.map((value, i) => value - after[i]);
  const n = differences.length;
  const meanDiff = toNumber(mathjs.mean(differences));
  const sdDiff = toNumber(mathjs.std(differences, 'unbiased'));
  if (sdDiff === 0) {
    throw new ValidationError(
      'ERR_1001',
      'Paired t-test requires non-zero variance in the differences'
    );
  }
  const tStat = meanDiff / (sdDiff / Math.sqrt(n));
  const df = n - 1;
  const pValue = tTestPValue(tStat, df, tail);

  let section = `## Paired T-Test Results\n\n`;
  section += `| Statistic | Value |\n`;
  section += `|-----------|-------|\n`;
  section += `| Mean Difference | ${meanDiff.toFixed(4)} |\n`;
  section += `| T-Statistic | ${tStat.toFixed(4)} |\n`;
  section += `| Degrees of Freedom | ${df} |\n`;
  section += `| P-Value (${tail}) | ${pValue.toFixed(4)} |\n`;
  section += `| Significance Level | ${alpha} |\n`;
  section += conclusionRow(pValue, alpha);
  return section;
}

/** Extract the two variables for a correlation test from either data shape. */
function extractCorrelationSeries(
  data: unknown[],
  variables?: string[]
): { x: number[]; y: number[]; var1: string; var2: string } {
  // Shape A: two numeric arrays.
  if (Array.isArray(data[0]) && typeof (data[0] as unknown[])[0] === 'number') {
    const [x, y] = requireNumericGroups(data, 2, 'Correlation test');
    return { x, y, var1: variables?.[0] || 'x', var2: variables?.[1] || 'y' };
  }
  // Shape B: an array of records, optionally wrapped in an outer array.
  const rows = (Array.isArray(data[0]) ? data[0] : data) as Record<string, number>[];
  if (rows.length === 0 || typeof rows[0] !== 'object' || rows[0] === null) {
    throw new ValidationError(
      'ERR_1001',
      'Correlation test requires two numeric arrays or an array of records'
    );
  }
  const keys = Object.keys(rows[0]);
  const var1 = variables?.[0] || keys[0];
  const var2 = variables?.[1] || keys[1];
  if (!var1 || !var2) {
    throw new ValidationError('ERR_1001', 'Correlation test requires two variables');
  }
  const x = rows.map((row) => row[var1]);
  const y = rows.map((row) => row[var2]);
  if (x.some((v) => typeof v !== 'number') || y.some((v) => typeof v !== 'number')) {
    throw new ValidationError(
      'ERR_1001',
      `Correlation variables '${var1}' and '${var2}' must be numeric`
    );
  }
  return { x, y, var1, var2 };
}

/** Pearson correlation with significance test: t = r·sqrt((n−2)/(1−r²)), df = n−2. */
function runCorrelationTest(
  data: unknown[],
  alpha: number,
  tail: TTail,
  variables?: string[]
): string {
  const { x, y, var1, var2 } = extractCorrelationSeries(data, variables);
  if (x.length !== y.length) {
    throw new ValidationError('ERR_1001', 'Correlation test requires series of equal length');
  }
  const n = x.length;
  if (n < 3) {
    throw new ValidationError(
      'ERR_1001',
      `Correlation test requires at least 3 observations, got ${n}`
    );
  }
  const r = toNumber(mathjs.corr(x, y));
  const df = n - 2;
  // As |r| -> 1 the statistic diverges; the p-value limit is 0.
  const pValue = Math.abs(r) >= 1 ? 0 : tTestPValue(r * Math.sqrt(df / (1 - r * r)), df, tail);

  let section = `## Correlation Analysis\n\n`;
  section += `| Metric | Value |\n`;
  section += `|--------|-------|\n`;
  section += `| Pearson's r | ${r.toFixed(4)} (${interpretCorrelation(r)}) |\n`;
  section += `| Sample Size | ${n} |\n`;
  section += `| Degrees of Freedom | ${df} |\n`;
  section += `| P-Value (${tail}) | ${pValue.toFixed(4)} |\n`;
  section += `| Significance Level | ${alpha} |\n`;
  section += conclusionRow(pValue, alpha);
  section += `\nThe correlation coefficient (r = ${r.toFixed(4)}) indicates a ${interpretCorrelation(r)} ${r > 0 ? 'positive' : 'negative'} relationship between ${var1} and ${var2}.\n`;
  return section;
}

/** Chi-square test of independence on a contingency table (rows = data). */
function runChiSquareTest(data: unknown[], alpha: number): string {
  const table = data as number[][];
  if (table.length < 2 || table.some((row) => !Array.isArray(row) || row.length < 2)) {
    throw new ValidationError(
      'ERR_1001',
      'Chi-square test requires a contingency table with at least 2 rows and 2 columns'
    );
  }
  const cols = table[0].length;
  if (table.some((row) => row.length !== cols)) {
    throw new ValidationError(
      'ERR_1001',
      'Chi-square test requires all rows to have the same length'
    );
  }
  if (table.some((row) => row.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0))) {
    throw new ValidationError('ERR_1001', 'Chi-square test requires non-negative numeric counts');
  }

  const rowTotals = table.map((row) => row.reduce((sum, v) => sum + v, 0));
  const colTotals = table[0].map((_, j) => table.reduce((sum, row) => sum + row[j], 0));
  const grandTotal = rowTotals.reduce((sum, v) => sum + v, 0);
  if (grandTotal === 0 || rowTotals.some((v) => v === 0) || colTotals.some((v) => v === 0)) {
    throw new ValidationError(
      'ERR_1001',
      'Chi-square test requires every row and column total to be > 0'
    );
  }

  let chiSquare = 0;
  for (let i = 0; i < table.length; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / grandTotal;
      const diff = table[i][j] - expected;
      chiSquare += (diff * diff) / expected;
    }
  }
  const df = (table.length - 1) * (cols - 1);
  const pValue = chiSquarePValue(chiSquare, df);

  let section = `## Chi-Square Test of Independence\n\n`;
  section += `| Statistic | Value |\n`;
  section += `|-----------|-------|\n`;
  section += `| Chi-Square | ${chiSquare.toFixed(4)} |\n`;
  section += `| Degrees of Freedom | ${df} |\n`;
  section += `| P-Value | ${pValue.toFixed(4)} |\n`;
  section += `| Significance Level | ${alpha} |\n`;
  section += conclusionRow(pValue, alpha);
  return section;
}

/** One-way ANOVA across k groups. */
function runAnovaTest(data: unknown[], alpha: number): string {
  const groups = requireNumericGroups(data, 0, 'ANOVA');
  if (groups.length < 2) {
    throw new ValidationError('ERR_1001', `ANOVA requires at least 2 groups, got ${groups.length}`);
  }
  const allValues = groups.flat();
  const grandMean = toNumber(mathjs.mean(allValues));
  const totalN = allValues.length;
  const k = groups.length;

  let ssBetween = 0;
  let ssWithin = 0;
  for (const group of groups) {
    const groupMean = toNumber(mathjs.mean(group));
    ssBetween += group.length * (groupMean - grandMean) ** 2;
    ssWithin += group.reduce((sum, v) => sum + (v - groupMean) ** 2, 0);
  }
  const dfBetween = k - 1;
  const dfWithin = totalN - k;
  if (ssWithin === 0) {
    throw new ValidationError('ERR_1001', 'ANOVA requires non-zero within-group variance');
  }
  const fStat = ssBetween / dfBetween / (ssWithin / dfWithin);
  const pValue = fTestPValue(fStat, dfBetween, dfWithin);

  let section = `## One-Way ANOVA Results\n\n`;
  section += `| Statistic | Value |\n`;
  section += `|-----------|-------|\n`;
  section += `| F-Statistic | ${fStat.toFixed(4)} |\n`;
  section += `| Degrees of Freedom | (${dfBetween}, ${dfWithin}) |\n`;
  section += `| Sum of Squares (Between) | ${ssBetween.toFixed(4)} |\n`;
  section += `| Sum of Squares (Within) | ${ssWithin.toFixed(4)} |\n`;
  section += `| P-Value | ${pValue.toFixed(4)} |\n`;
  section += `| Significance Level | ${alpha} |\n`;
  section += conclusionRow(pValue, alpha);
  return section;
}

function dispatchTest(
  testType: string,
  data: unknown[],
  alpha: number,
  tail: TTail,
  variables?: string[]
): string {
  switch (testType) {
    case 't_test_independent':
      return runIndependentTTest(data, alpha, tail);
    case 't_test_paired':
      return runPairedTTest(data, alpha, tail);
    case 'correlation':
      return runCorrelationTest(data, alpha, tail, variables);
    case 'chi_square':
      return runChiSquareTest(data, alpha);
    case 'anova':
      return runAnovaTest(data, alpha);
    default:
      throw new ValidationError('ERR_1001', `Unsupported test type: ${testType}`);
  }
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
  try {
    HypothesisTestingSchema.parse({
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
      throw new ValidationError(
        'ERR_1001',
        `Invalid parameters for hypothesis testing: ${error.message}`,
        { issues: error.issues }
      );
    }
    throw error;
  }

  try {
    const tail = resolveTail(alternativeHypothesis);
    const section = dispatchTest(testType, data as unknown[], alpha, tail, variables);
    return `# Hypothesis Testing Report\n\n${section}`;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    Logger.error('Hypothesis Testing Error', error, {
      testType,
      dataLength: data.length,
    });
    throw new DataProcessingError(
      'ERR_3001',
      `Hypothesis testing failed: ${error instanceof Error ? error.message : String(error)}`,
      { testType }
    );
  }
}

// Explicit re-export of the function and schema
export { hypothesisTesting, HypothesisTestingSchema as hypothesisTestingSchema };
