import { z } from "zod";
import * as math from "mathjs";

// Type definitions
type Dataset = number[][] | Record<string, any>[];

// Schema for the tool parameters
export const hypothesisTestingSchema = z.object({
  testType: z.enum([
    "t_test_independent",
    "t_test_paired",
    "chi_square",
    "anova",
    "correlation"
  ]).describe("Type of hypothesis test to perform"),
  data: z.array(z.number()).or(z.array(z.array(z.number()))).or(z.array(z.record(z.string(), z.any())))
    .describe("Data to analyze. For t-tests and ANOVA: array of arrays for groups. For correlation and chi-square: array of objects."),
  variables: z.array(z.string())
    .describe("Variable names to use in the test (properties in data objects for chi-square and correlation)"),
  alpha: z.number().default(0.05)
    .describe("Significance level (default: 0.05)"),
  alternativeHypothesis: z.enum(["two_sided", "greater_than", "less_than"]).default("two_sided")
    .describe("Alternative hypothesis direction")
});

// Tool implementation
export async function hypothesisTesting(
  testType: string,
  data: Dataset,
  variables: string[],
  alpha: number = 0.05,
  alternativeHypothesis: string = "two_sided"
): Promise<string> {
  // Rest of the implementation remains the same as in the previous version...
}

// Rest of the implementations for helper functions (performIndependentTTest, performPairedTTest, etc.) remain the same...

// Perform correlation test
function performCorrelationTest(data: Record<string, any>[], variables: string[], alpha: number, alternativeHypothesis: string): string {
  if (variables.length < 2) {
    throw new Error("Correlation test requires at least two variables");
  }

  const var1 = variables[0];
  const var2 = variables[1];

  // Check if variables exist in dataset
  if (!data[0][var1] || !data[0][var2]) {
    throw new Error(`Variables not found in dataset. Available variables: ${Object.keys(data[0]).join(", ")}`);
  }

  // Extract values for each variable
  const values1 = data.map(item => item[var1]);
  const values2 = data.map(item => item[var2]);

  // Calculate correlation coefficient (Pearson's r)
  const mean1 = math.mean(values1);
  const mean2 = math.mean(values2);
  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;

  for (let i = 0; i < values1.length; i++) {
    const dev1 = values1[i] - mean1;
    const dev2 = values2[i] - mean2;
    numerator += dev1 * dev2;
    denom1 += dev1 * dev1;
    denom2 += dev2 * dev2;
  }

  const r = numerator / Math.sqrt(denom1 * denom2);

  // Calculate t-statistic for testing correlation
  const n = values1.length;
  const tStat = r * Math.sqrt((n - 2) / (1 - r * r));

  // Calculate degrees of freedom
  const df = n - 2;

  // Calculate p-value (simplified approach)
  const pValue = calculateSimplifiedPValue(tStat, df, alternativeHypothesis);

  // Calculate coefficient of determination (r-squared)
  const rSquared = r * r;

  // Generate results
  let result = `### Test Results\
\
`;
  result += `**Correlation Statistics:**\
\
`;
  result += `| Statistic | Value | Interpretation |\
`;
  result += `| --------- | ----- | -------------- |\
`;
  result += `| Pearson's r | ${r.toFixed(4)} | ${interpretCorrelation(r)} |\
`;
  result += `| Coefficient of Determination (r²) | ${rSquared.toFixed(4)} | ${(rSquared * 100).toFixed(2)}% of variance explained |\
`;
  result += `| t-statistic | ${tStat.toFixed(4)} | |\
`;
  result += `| Degrees of Freedom | ${df} | |\
`;
  result += `| p-value | ${pValue.toFixed(4)} | ${pValue < alpha ? "Statistically significant" : "Not statistically significant"} |\
\
`;

  // Add conclusion
  result += `### Conclusion\
\
`;
  if (pValue < alpha) {
    result += `**Reject the null hypothesis.** `;
    if (alternativeHypothesis === "two_sided") {
      result += `There is sufficient evidence to suggest that there is a correlation between ${var1} and ${var2} `;
    } else if (alternativeHypothesis === "greater_than") {
      result += `There is sufficient evidence to suggest that there is a positive correlation between ${var1} and ${var2} `;
    } else {
      result += `There is sufficient evidence to suggest that there is a negative correlation between ${var1} and ${var2} `;
    }
    result += `(r = ${r.toFixed(4)}, p = ${pValue.toFixed(4)} < ${alpha}).\
\
`;
  } else {
    result += `**Fail to reject the null hypothesis.** `;
    if (alternativeHypothesis === "two_sided") {
      result += `There is insufficient evidence to suggest that there is a correlation between ${var1} and ${var2} `;
    } else if (alternativeHypothesis === "greater_than") {
      result += `There is insufficient evidence to suggest that there is a positive correlation between ${var1} and ${var2} `;
    } else {
      result += `There is insufficient evidence to suggest that there is a negative correlation between ${var1} and ${var2} `;
    }
    result += `(r = ${r.toFixed(4)}, p = ${pValue.toFixed(4)} > ${alpha}).\
\
`;
  }

  // Add interpretation of correlation
  result += `The correlation coefficient (r = ${r.toFixed(4)}) indicates a ${interpretCorrelation(r)} relationship between ${var1} and ${var2}.\
\
`;
  result += `The coefficient of determination (r² = ${rSquared.toFixed(4)}) suggests that ${(rSquared * 100).toFixed(2)}% of the variance in one variable can be explained by the other variable.\
\
`;

  // Add visualization suggestions
  result += `### Visualization Suggestions\
\
`;
  result += `- Scatter plot with regression line\
`;
  result += `- Correlation matrix heatmap (if analyzing multiple variables)\
`;
  result += `- Density contour plot\
`;

  return result;
}

// Helper functions remain the same as in the previous implementation

export { hypothesisTesting, hypothesisTestingSchema };
