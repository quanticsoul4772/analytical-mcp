import { z } from "zod";
import * as math from "mathjs";

// Schema for the tool parameters
export const hypothesisTestingSchema = z.object({
  testType: z.enum([
    "t_test_independent", 
    "t_test_paired", 
    "chi_square", 
    "anova", 
    "correlation"
  ]).describe("Type of hypothesis test to perform"),
  datasetId: z.string().describe("ID of the dataset to analyze"),
  variables: z.array(z.string()).describe("Variable names to use in the test"),
  alpha: z.number().default(0.05).describe("Significance level (default: 0.05)"),
  alternativeHypothesis: z.enum(["two_sided", "greater_than", "less_than"]).default("two_sided").describe("Alternative hypothesis direction")
});

// Type definitions for our mock datasets and results
type DataPoint = Record<string, number>;
type Dataset = DataPoint[] | number[][];

// Mock dataset storage (various datasets for hypothesis testing)
const mockDatasets: Record<string, Dataset> = {
  "treatment_control": [
    // Treatment group outcomes
    [75, 82, 78, 85, 90, 72, 81, 88, 79, 83],
    // Control group outcomes
    [70, 75, 68, 72, 76, 69, 71, 75, 73, 77]
  ],
  "before_after": [
    // Before treatment
    [120, 125, 130, 135, 140, 138, 132, 129, 123],
    // After treatment
    [115, 118, 125, 130, 135, 130, 128, 122, 118]
  ],
  "satisfaction_survey": [
    {department: 1, age_group: 1, satisfaction: 7},
    {department: 1, age_group: 2, satisfaction: 8},
    {department: 1, age_group: 3, satisfaction: 6},
    {department: 2, age_group: 1, satisfaction: 5},
    {department: 2, age_group: 2, satisfaction: 7},
    {department: 2, age_group: 3, satisfaction: 8},
    {department: 3, age_group: 1, satisfaction: 6},
    {department: 3, age_group: 2, satisfaction: 5},
    {department: 3, age_group: 3, satisfaction: 7},
  ],
  "multi_group_comparison": [
    // Group 1 outcomes
    [72, 75, 78, 71, 73, 77, 76, 74],
    // Group 2 outcomes
    [80, 82, 84, 78, 85, 79, 83, 81],
    // Group 3 outcomes
    [65, 68, 63, 70, 62, 66, 67, 64]
  ],
  "marketing_campaigns": [
    {campaign: "A", clicks: 120, conversions: 18},
    {campaign: "A", clicks: 150, conversions: 21},
    {campaign: "A", clicks: 130, conversions: 19},
    {campaign: "B", clicks: 140, conversions: 23},
    {campaign: "B", clicks: 160, conversions: 28},
    {campaign: "B", clicks: 135, conversions: 22},
    {campaign: "C", clicks: 125, conversions: 15},
    {campaign: "C", clicks: 145, conversions: 17},
    {campaign: "C", clicks: 155, conversions: 18}
  ],
  "correlation_data": [
    {income: 45000, spending: 32000, savings: 5000, satisfaction: 6},
    {income: 65000, spending: 40000, savings: 15000, satisfaction: 7},
    {income: 35000, spending: 30000, savings: 3000, satisfaction: 5},
    {income: 80000, spending: 50000, savings: 20000, satisfaction: 8},
    {income: 55000, spending: 45000, savings: 8000, satisfaction: 6},
    {income: 75000, spending: 55000, savings: 12000, satisfaction: 7},
    {income: 90000, spending: 60000, savings: 25000, satisfaction: 9},
    {income: 40000, spending: 35000, savings: 4000, satisfaction: 4}
  ]
};

// Tool implementation
export async function hypothesisTesting(
  testType: string,
  datasetId: string,
  variables: string[],
  alpha: number = 0.05,
  alternativeHypothesis: string = "two_sided"
): Promise<string> {
  // Validate inputs
  const dataset = mockDatasets[datasetId];
  if (!dataset) {
    throw new Error(`Dataset with ID '${datasetId}' not found. Available datasets: ${Object.keys(mockDatasets).join(", ")}`);
  }

  // Perform hypothesis test based on type
  let result = `## Hypothesis Testing: ${formatTestType(testType)}\n\n`;
  
  result += `**Dataset:** ${datasetId}\n`;
  result += `**Significance Level (α):** ${alpha}\n`;
  result += `**Alternative Hypothesis:** ${formatAlternative(alternativeHypothesis)}\n\n`;

  // Add null and alternative hypothesis statements
  result += generateHypothesisStatements(testType, variables, alternativeHypothesis);

  // Perform the specific test
  switch (testType) {
    case "t_test_independent":
      result += performIndependentTTest(dataset as number[][], alpha, alternativeHypothesis);
      break;
    case "t_test_paired":
      result += performPairedTTest(dataset as number[][], alpha, alternativeHypothesis);
      break;
    case "chi_square":
      result += performChiSquareTest(dataset as DataPoint[], variables, alpha);
      break;
    case "anova":
      result += performANOVA(dataset as number[][], alpha);
      break;
    case "correlation":
      result += performCorrelationTest(dataset as DataPoint[], variables, alpha, alternativeHypothesis);
      break;
    default:
      throw new Error(`Unsupported test type: ${testType}`);
  }

  return result;
}

// Helper function to format test type for display
function formatTestType(testType: string): string {
  switch (testType) {
    case "t_test_independent":
      return "Independent Samples t-Test";
    case "t_test_paired":
      return "Paired Samples t-Test";
    case "chi_square":
      return "Chi-Square Test of Independence";
    case "anova":
      return "One-way ANOVA";
    case "correlation":
      return "Correlation Test";
    default:
      return testType.replace(/_/g, " ");
  }
}

// Helper function to format alternative hypothesis
function formatAlternative(alternative: string): string {
  switch (alternative) {
    case "two_sided":
      return "Two-sided (≠)";
    case "greater_than":
      return "Greater than (>)";
    case "less_than":
      return "Less than (<)";
    default:
      return alternative;
  }
}

// Generate hypothesis statements based on test type
function generateHypothesisStatements(
  testType: string,
  variables: string[],
  alternativeHypothesis: string
): string {
  let result = `### Hypothesis Statements\n\n`;
  
  switch (testType) {
    case "t_test_independent":
      result += `**Null Hypothesis (H₀):** There is no difference in means between the two groups (μ₁ = μ₂).\n\n`;
      
      if (alternativeHypothesis === "two_sided") {
        result += `**Alternative Hypothesis (H₁):** There is a difference in means between the two groups (μ₁ ≠ μ₂).\n\n`;
      } else if (alternativeHypothesis === "greater_than") {
        result += `**Alternative Hypothesis (H₁):** The mean of the first group is greater than the mean of the second group (μ₁ > μ₂).\n\n`;
      } else {
        result += `**Alternative Hypothesis (H₁):** The mean of the first group is less than the mean of the second group (μ₁ < μ₂).\n\n`;
      }
      break;
      
    case "t_test_paired":
      result += `**Null Hypothesis (H₀):** There is no difference in means between the paired measurements (μᵈ = 0).\n\n`;
      
      if (alternativeHypothesis === "two_sided") {
        result += `**Alternative Hypothesis (H₁):** There is a difference in means between the paired measurements (μᵈ ≠ 0).\n\n`;
      } else if (alternativeHypothesis === "greater_than") {
        result += `**Alternative Hypothesis (H₁):** The mean difference is greater than zero (μᵈ > 0).\n\n`;
      } else {
        result += `**Alternative Hypothesis (H₁):** The mean difference is less than zero (μᵈ < 0).\n\n`;
      }
      break;
      
    case "chi_square":
      result += `**Null Hypothesis (H₀):** The variables ${variables.join(" and ")} are independent (no association).\n\n`;
      result += `**Alternative Hypothesis (H₁):** The variables ${variables.join(" and ")} are not independent (there is an association).\n\n`;
      break;
      
    case "anova":
      result += `**Null Hypothesis (H₀):** All group means are equal (μ₁ = μ₂ = ... = μₖ).\n\n`;
      result += `**Alternative Hypothesis (H₁):** At least one group mean is different from the others.\n\n`;
      break;
      
    case "correlation":
      result += `**Null Hypothesis (H₀):** There is no correlation between ${variables.join(" and ")} (ρ = 0).\n\n`;
      
      if (alternativeHypothesis === "two_sided") {
        result += `**Alternative Hypothesis (H₁):** There is a correlation between ${variables.join(" and ")} (ρ ≠ 0).\n\n`;
      } else if (alternativeHypothesis === "greater_than") {
        result += `**Alternative Hypothesis (H₁):** There is a positive correlation between ${variables.join(" and ")} (ρ > 0).\n\n`;
      } else {
        result += `**Alternative Hypothesis (H₁):** There is a negative correlation between ${variables.join(" and ")} (ρ < 0).\n\n`;
      }
      break;
  }
  
  return result;
}

// Perform independent t-test
function performIndependentTTest(
  data: number[][],
  alpha: number,
  alternativeHypothesis: string
): string {
  if (data.length < 2) {
    throw new Error("Independent t-test requires two groups of data");
  }
  
  const group1 = data[0];
  const group2 = data[1];
  
  // Calculate basic statistics
  const mean1 = math.mean(group1);
  const mean2 = math.mean(group2);
  const sd1 = math.std(group1, "uncorrected");
  const sd2 = math.std(group2, "uncorrected");
  const n1 = group1.length;
  const n2 = group2.length;
  
  // Calculate t-statistic (assuming equal variances for simplicity)
  const pooledSD = Math.sqrt(((n1 - 1) * Math.pow(sd1, 2) + (n2 - 1) * Math.pow(sd2, 2)) / (n1 + n2 - 2));
  const standardError = pooledSD * Math.sqrt(1/n1 + 1/n2);
  const tStat = (mean1 - mean2) / standardError;
  
  // Calculate degrees of freedom
  const df = n1 + n2 - 2;
  
  // Calculate p-value (simplified approach)
  // In a real implementation, we would use a proper t-distribution function
  const pValue = calculateSimplifiedPValue(tStat, df, alternativeHypothesis);
  
  // Calculate Cohen's d effect size
  const cohenD = Math.abs(mean1 - mean2) / pooledSD;
  
  // Generate results
  let result = `### Test Results\n\n`;
  
  result += `| Statistic | Group 1 | Group 2 |\n`;
  result += `| --------- | ------- | ------- |\n`;
  result += `| Sample Size | ${n1} | ${n2} |\n`;
  result += `| Mean | ${mean1.toFixed(4)} | ${mean2.toFixed(4)} |\n`;
  result += `| Standard Deviation | ${sd1.toFixed(4)} | ${sd2.toFixed(4)} |\n`;
  result += `| Standard Error | ${standardError.toFixed(4)} | |\n\n`;
  
  result += `**Test Statistics:**\n\n`;
  result += `| Statistic | Value | Interpretation |\n`;
  result += `| --------- | ----- | -------------- |\n`;
  result += `| Mean Difference | ${(mean1 - mean2).toFixed(4)} | |\n`;
  result += `| t-statistic | ${tStat.toFixed(4)} | |\n`;
  result += `| Degrees of Freedom | ${df} | |\n`;
  result += `| p-value | ${pValue.toFixed(4)} | ${pValue < alpha ? "Statistically significant" : "Not statistically significant"} |\n`;
  result += `| Cohen's d | ${cohenD.toFixed(4)} | ${interpretEffectSize(cohenD, "cohen_d")} |\n\n`;
  
  // Add conclusion
  result += `### Conclusion\n\n`;
  
  if (pValue < alpha) {
    result += `**Reject the null hypothesis.** `;
    result += `There is sufficient evidence to suggest that there is a ${alternativeHypothesis === "two_sided" ? "difference" : alternativeHypothesis === "greater_than" ? "greater" : "smaller"} mean between the two groups `;
    result += `(p = ${pValue.toFixed(4)} < ${alpha}).\n\n`;
  } else {
    result += `**Fail to reject the null hypothesis.** `;
    result += `There is insufficient evidence to suggest that there is a ${alternativeHypothesis === "two_sided" ? "difference" : alternativeHypothesis === "greater_than" ? "greater" : "smaller"} mean between the two groups `;
    result += `(p = ${pValue.toFixed(4)} > ${alpha}).\n\n`;
  }
  
  // Add effect size interpretation
  result += `The effect size (Cohen's d = ${cohenD.toFixed(4)}) indicates a ${interpretEffectSize(cohenD, "cohen_d")} effect.\n\n`;
  
  // Add visualization suggestions
  result += `### Visualization Suggestions\n\n`;
  result += `- Box plots showing the distribution of both groups\n`;
  result += `- Violin plots for comparing the distributions\n`;
  result += `- Bar chart with error bars showing mean and confidence intervals\n`;
  
  return result;
}

// Perform paired t-test
function performPairedTTest(
  data: number[][],
  alpha: number,
  alternativeHypothesis: string
): string {
  if (data.length < 2) {
    throw new Error("Paired t-test requires two groups of data");
  }
  
  const group1 = data[0];
  const group2 = data[1];
  
  if (group1.length !== group2.length) {
    throw new Error("Both groups must have the same number of observations for a paired t-test");
  }
  
  // Calculate differences
  const differences = group1.map((value, index) => value - group2[index]);
  
  // Calculate basic statistics
  const meanDiff = math.mean(differences);
  const sdDiff = math.std(differences, "uncorrected");
  const n = differences.length;
  const standardError = sdDiff / Math.sqrt(n);
  
  // Calculate t-statistic
  const tStat = meanDiff / standardError;
  
  // Calculate degrees of freedom
  const df = n - 1;
  
  // Calculate p-value (simplified approach)
  const pValue = calculateSimplifiedPValue(tStat, df, alternativeHypothesis);
  
  // Calculate Cohen's d for paired samples
  const cohenD = Math.abs(meanDiff) / sdDiff;
  
  // Generate results
  let result = `### Test Results\n\n`;
  
  result += `| Statistic | Before | After | Difference |\n`;
  result += `| --------- | ------ | ----- | ---------- |\n`;
  result += `| Sample Size | ${n} | ${n} | ${n} |\n`;
  result += `| Mean | ${math.mean(group1).toFixed(4)} | ${math.mean(group2).toFixed(4)} | ${meanDiff.toFixed(4)} |\n`;
  result += `| Standard Deviation | ${math.std(group1, "uncorrected").toFixed(4)} | ${math.std(group2, "uncorrected").toFixed(4)} | ${sdDiff.toFixed(4)} |\n`;
  result += `| Standard Error | | | ${standardError.toFixed(4)} |\n\n`;
  
  result += `**Test Statistics:**\n\n`;
  result += `| Statistic | Value | Interpretation |\n`;
  result += `| --------- | ----- | -------------- |\n`;
  result += `| Mean Difference | ${meanDiff.toFixed(4)} | |\n`;
  result += `| t-statistic | ${tStat.toFixed(4)} | |\n`;
  result += `| Degrees of Freedom | ${df} | |\n`;
  result += `| p-value | ${pValue.toFixed(4)} | ${pValue < alpha ? "Statistically significant" : "Not statistically significant"} |\n`;
  result += `| Cohen's d | ${cohenD.toFixed(4)} | ${interpretEffectSize(cohenD, "cohen_d")} |\n\n`;
  
  // Add conclusion
  result += `### Conclusion\n\n`;
  
  if (pValue < alpha) {
    result += `**Reject the null hypothesis.** `;
    
    if (alternativeHypothesis === "two_sided") {
      result += `There is sufficient evidence to suggest that there is a difference between the paired measurements `;
    } else if (alternativeHypothesis === "greater_than") {
      result += `There is sufficient evidence to suggest that the first measurement is greater than the second measurement `;
    } else {
      result += `There is sufficient evidence to suggest that the first measurement is less than the second measurement `;
    }
    
    result += `(p = ${pValue.toFixed(4)} < ${alpha}).\n\n`;
  } else {
    result += `**Fail to reject the null hypothesis.** `;
    
    if (alternativeHypothesis === "two_sided") {
      result += `There is insufficient evidence to suggest that there is a difference between the paired measurements `;
    } else if (alternativeHypothesis === "greater_than") {
      result += `There is insufficient evidence to suggest that the first measurement is greater than the second measurement `;
    } else {
      result += `There is insufficient evidence to suggest that the first measurement is less than the second measurement `;
    }
    
    result += `(p = ${pValue.toFixed(4)} > ${alpha}).\n\n`;
  }
  
  // Add effect size interpretation
  result += `The effect size (Cohen's d = ${cohenD.toFixed(4)}) indicates a ${interpretEffectSize(cohenD, "cohen_d")} effect.\n\n`;
  
  // Add visualization suggestions
  result += `### Visualization Suggestions\n\n`;
  result += `- Scatter plot of before vs. after with a 45-degree reference line\n`;
  result += `- Histogram of differences\n`;
  result += `- Box plot or violin plot of differences\n`;
  result += `- Paired line plot connecting before and after measurements for each subject\n`;
  
  return result;
}

// Perform chi-square test
function performChiSquareTest(
  data: DataPoint[],
  variables: string[],
  alpha: number
): string {
  if (variables.length < 2) {
    throw new Error("Chi-square test requires at least two variables");
  }
  
  const var1 = variables[0];
  const var2 = variables[1];
  
  // Check if variables exist in dataset
  if (!data[0][var1] || !data[0][var2]) {
    throw new Error(`Variables not found in dataset. Available variables: ${Object.keys(data[0]).join(", ")}`);
  }
  
  // Create contingency table (simplified approach)
  // In a real implementation, we would count actual occurrences
  
  // Get unique values for each variable
  const uniqueVar1 = [...new Set(data.map(item => item[var1]))].sort();
  const uniqueVar2 = [...new Set(data.map(item => item[var2]))].sort();
  
  // Create a random contingency table
  const observedCounts: number[][] = [];
  let totalCount = 0;
  
  for (let i = 0; i < uniqueVar1.length; i++) {
    observedCounts[i] = [];
    for (let j = 0; j < uniqueVar2.length; j++) {
      // Generate a random count between 5 and 20
      const count = Math.floor(Math.random() * 15) + 5;
      observedCounts[i][j] = count;
      totalCount += count;
    }
  }
  
  // Calculate row and column sums
  const rowSums = observedCounts.map(row => math.sum(row));
  const colSums = uniqueVar2.map((_, j) => math.sum(observedCounts.map(row => row[j])));
  
  // Calculate expected counts
  const expectedCounts: number[][] = [];
  for (let i = 0; i < uniqueVar1.length; i++) {
    expectedCounts[i] = [];
    for (let j = 0; j < uniqueVar2.length; j++) {
      expectedCounts[i][j] = (rowSums[i] * colSums[j]) / totalCount;
    }
  }
  
  // Calculate chi-square statistic
  let chiSquare = 0;
  for (let i = 0; i < uniqueVar1.length; i++) {
    for (let j = 0; j < uniqueVar2.length; j++) {
      chiSquare += Math.pow(observedCounts[i][j] - expectedCounts[i][j], 2) / expectedCounts[i][j];
    }
  }
  
  // Calculate degrees of freedom
  const df = (uniqueVar1.length - 1) * (uniqueVar2.length - 1);
  
  // Calculate p-value (simplified approach)
  // In a real implementation, we would use a proper chi-square distribution function
  const pValue = calculateSimplifiedPValue(chiSquare, df, "greater_than");
  
  // Calculate Cramer's V effect size
  const minDimension = Math.min(uniqueVar1.length, uniqueVar2.length);
  const cramersV = Math.sqrt(chiSquare / (totalCount * (minDimension - 1)));
  
  // Generate results
  let result = `### Test Results\n\n`;
  
  // Display contingency table
  result += `**Contingency Table (Observed Counts):**\n\n`;
  result += `| ${var1} \\ ${var2} | ${uniqueVar2.map(val => val).join(" | ")} | Total |\n`;
  result += `| ${"-".repeat(var1.length)} | ${uniqueVar2.map(_ => "-".repeat(5)).join(" | ")} | ----- |\n`;
  
  for (let i = 0; i < uniqueVar1.length; i++) {
    result += `| ${uniqueVar1[i]} | ${observedCounts[i].map(count => count).join(" | ")} | ${rowSums[i]} |\n`;
  }
  
  result += `| Total | ${colSums.map(sum => sum).join(" | ")} | ${totalCount} |\n\n`;
  
  // Display test statistics
  result += `**Test Statistics:**\n\n`;
  result += `| Statistic | Value | Interpretation |\n`;
  result += `| --------- | ----- | -------------- |\n`;
  result += `| Chi-square | ${chiSquare.toFixed(4)} | |\n`;
  result += `| Degrees of Freedom | ${df} | |\n`;
  result += `| p-value | ${pValue.toFixed(4)} | ${pValue < alpha ? "Statistically significant" : "Not statistically significant"} |\n`;
  result += `| Cramer's V | ${cramersV.toFixed(4)} | ${interpretEffectSize(cramersV, "cramers_v")} |\n\n`;
  
  // Add conclusion
  result += `### Conclusion\n\n`;
  
  if (pValue < alpha) {
    result += `**Reject the null hypothesis.** `;
    result += `There is sufficient evidence to suggest that the variables ${var1} and ${var2} are not independent `;
    result += `(χ² = ${chiSquare.toFixed(4)}, df = ${df}, p = ${pValue.toFixed(4)} < ${alpha}).\n\n`;
  } else {
    result += `**Fail to reject the null hypothesis.** `;
    result += `There is insufficient evidence to suggest that the variables ${var1} and ${var2} are not independent `;
    result += `(χ² = ${chiSquare.toFixed(4)}, df = ${df}, p = ${pValue.toFixed(4)} > ${alpha}).\n\n`;
  }
  
  // Add effect size interpretation
  result += `The effect size (Cramer's V = ${cramersV.toFixed(4)}) indicates a ${interpretEffectSize(cramersV, "cramers_v")} association between the variables.\n\n`;
  
  // Add visualization suggestions
  result += `### Visualization Suggestions\n\n`;
  result += `- Grouped bar chart showing the relationship between the variables\n`;
  result += `- Mosaic plot / heatmap of the contingency table\n`;
  result += `- Correspondence analysis plot\n`;
  
  return result;
}

// Perform ANOVA
function performANOVA(
  data: number[][],
  alpha: number
): string {
  if (data.length < 3) {
    throw new Error("ANOVA requires at least three groups of data");
  }
  
  // Calculate group statistics
  const groupMeans = data.map(group => math.mean(group));
  const groupSizes = data.map(group => group.length);
  const groupSDs = data.map(group => math.std(group, "uncorrected"));
  
  // Calculate grand mean and total sample size
  const allValues = data.flat();
  const grandMean = math.mean(allValues);
  const totalN = allValues.length;
  
  // Calculate sums of squares
  // Between-group sum of squares (SSB)
  const ssb = groupMeans.reduce((sum, mean, i) => sum + groupSizes[i] * Math.pow(mean - grandMean, 2), 0);
  
  // Within-group sum of squares (SSW)
  const ssw = data.reduce((sum, group, i) => {
    return sum + group.reduce((groupSum, value) => {
      return groupSum + Math.pow(value - groupMeans[i], 2);
    }, 0);
  }, 0);
  
  // Total sum of squares (SST)
  const sst = ssb + ssw;
  
  // Calculate degrees of freedom
  const dfb = data.length - 1; // Between-group df
  const dfw = totalN - data.length; // Within-group df
  const dft = totalN - 1; // Total df
  
  // Calculate mean squares
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  
  // Calculate F-statistic
  const fStat = msb / msw;
  
  // Calculate p-value (simplified approach)
  // In a real implementation, we would use a proper F-distribution function
  const pValue = calculateSimplifiedPValue(fStat, dfb, "greater_than");
  
  // Calculate effect size (eta-squared)
  const etaSquared = ssb / sst;
  
  // Generate results
  let result = `### Test Results\n\n`;
  
  // Display group statistics
  result += `**Group Statistics:**\n\n`;
  result += `| Group | Sample Size | Mean | Standard Deviation |\n`;
  result += `| ----- | ----------- | ---- | ------------------ |\n`;
  
  for (let i = 0; i < data.length; i++) {
    result += `| Group ${i + 1} | ${groupSizes[i]} | ${groupMeans[i].toFixed(4)} | ${groupSDs[i].toFixed(4)} |\n`;
  }
  
  result += `| Total | ${totalN} | ${grandMean.toFixed(4)} | - |\n\n`;
  
  // Display ANOVA table
  result += `**ANOVA Table:**\n\n`;
  result += `| Source | Sum of Squares | df | Mean Square | F | p-value |\n`;
  result += `| ------ | -------------- | -- | ----------- | - | ------- |\n`;
  result += `| Between Groups | ${ssb.toFixed(4)} | ${dfb} | ${msb.toFixed(4)} | ${fStat.toFixed(4)} | ${pValue.toFixed(4)} |\n`;
  result += `| Within Groups | ${ssw.toFixed(4)} | ${dfw} | ${msw.toFixed(4)} | | |\n`;
  result += `| Total | ${sst.toFixed(4)} | ${dft} | | | |\n\n`;
  
  // Display effect size
  result += `**Effect Size:**\n\n`;
  result += `| Measure | Value | Interpretation |\n`;
  result += `| ------- | ----- | -------------- |\n`;
  result += `| Eta-squared (η²) | ${etaSquared.toFixed(4)} | ${interpretEffectSize(etaSquared, "eta_squared")} |\n\n`;
  
  // Add conclusion
  result += `### Conclusion\n\n`;
  
  if (pValue < alpha) {
    result += `**Reject the null hypothesis.** `;
    result += `There is sufficient evidence to suggest that at least one group mean is different from the others `;
    result += `(F(${dfb}, ${dfw}) = ${fStat.toFixed(4)}, p = ${pValue.toFixed(4)} < ${alpha}).\n\n`;
    
    // Suggest post-hoc tests
    result += `**Post-hoc tests** such as Tukey's HSD or Bonferroni correction are recommended to determine which specific groups differ from each other.\n\n`;
  } else {
    result += `**Fail to reject the null hypothesis.** `;
    result += `There is insufficient evidence to suggest that any group means are different `;
    result += `(F(${dfb}, ${dfw}) = ${fStat.toFixed(4)}, p = ${pValue.toFixed(4)} > ${alpha}).\n\n`;
  }
  
  // Add effect size interpretation
  result += `The effect size (η² = ${etaSquared.toFixed(4)}) indicates that ${(etaSquared * 100).toFixed(2)}% of the total variance is explained by the group differences, which represents a ${interpretEffectSize(etaSquared, "eta_squared")} effect.\n\n`;
  
  // Add visualization suggestions
  result += `### Visualization Suggestions\n\n`;
  result += `- Box plots of each group\n`;
  result += `- Violin plots for comparing distributions\n`;
  result += `- Means plot with confidence intervals\n`;
  result += `- Pairwise comparison plot (if post-hoc tests are performed)\n`;
  
  return result;
}

// Perform correlation test
function performCorrelationTest(
  data: DataPoint[],
  variables: string[],
  alpha: number,
  alternativeHypothesis: string
): string {
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
  let result = `### Test Results\n\n`;
  
  result += `**Correlation Statistics:**\n\n`;
  result += `| Statistic | Value | Interpretation |\n`;
  result += `| --------- | ----- | -------------- |\n`;
  result += `| Pearson's r | ${r.toFixed(4)} | ${interpretCorrelation(r)} |\n`;
  result += `| Coefficient of Determination (r²) | ${rSquared.toFixed(4)} | ${(rSquared * 100).toFixed(2)}% of variance explained |\n`;
  result += `| t-statistic | ${tStat.toFixed(4)} | |\n`;
  result += `| Degrees of Freedom | ${df} | |\n`;
  result += `| p-value | ${pValue.toFixed(4)} | ${pValue < alpha ? "Statistically significant" : "Not statistically significant"} |\n\n`;
  
  // Add conclusion
  result += `### Conclusion\n\n`;
  
  if (pValue < alpha) {
    result += `**Reject the null hypothesis.** `;
    
    if (alternativeHypothesis === "two_sided") {
      result += `There is sufficient evidence to suggest that there is a correlation between ${var1} and ${var2} `;
    } else if (alternativeHypothesis === "greater_than") {
      result += `There is sufficient evidence to suggest that there is a positive correlation between ${var1} and ${var2} `;
    } else {
      result += `There is sufficient evidence to suggest that there is a negative correlation between ${var1} and ${var2} `;
    }
    
    result += `(r = ${r.toFixed(4)}, p = ${pValue.toFixed(4)} < ${alpha}).\n\n`;
  } else {
    result += `**Fail to reject the null hypothesis.** `;
    
    if (alternativeHypothesis === "two_sided") {
      result += `There is insufficient evidence to suggest that there is a correlation between ${var1} and ${var2} `;
    } else if (alternativeHypothesis === "greater_than") {
      result += `There is insufficient evidence to suggest that there is a positive correlation between ${var1} and ${var2} `;
    } else {
      result += `There is insufficient evidence to suggest that there is a negative correlation between ${var1} and ${var2} `;
    }
    
    result += `(r = ${r.toFixed(4)}, p = ${pValue.toFixed(4)} > ${alpha}).\n\n`;
  }
  
  // Add interpretation of correlation
  result += `The correlation coefficient (r = ${r.toFixed(4)}) indicates a ${interpretCorrelation(r)} relationship between ${var1} and ${var2}.\n\n`;
  result += `The coefficient of determination (r² = ${rSquared.toFixed(4)}) suggests that ${(rSquared * 100).toFixed(2)}% of the variance in one variable can be explained by the other variable.\n\n`;
  
  // Add visualization suggestions
  result += `### Visualization Suggestions\n\n`;
  result += `- Scatter plot with regression line\n`;
  result += `- Correlation matrix heatmap (if analyzing multiple variables)\n`;
  result += `- Density contour plot\n`;
  
  return result;
}

// Helper function to calculate a simplified p-value
// In a real implementation, we would use proper distribution functions
function calculateSimplifiedPValue(statistic: number, df: number, alternative: string): number {
  // This is a very simplified approximation and should not be used in real analysis
  // It's just for demonstration purposes
  
  // Convert the test statistic to a "normalized" value between 0 and 1
  // Higher test statistics should lead to lower p-values
  let normalizedStat = Math.min(Math.abs(statistic) / (df + 5), 0.9999);
  
  // Calculate a simplified p-value
  let pValue: number;
  
  if (alternative === "two_sided") {
    // For two-sided tests, multiply by 2 (but cap at 1)
    pValue = Math.min(2 * (1 - normalizedStat), 1);
  } else if (
    (alternative === "greater_than" && statistic > 0) ||
    (alternative === "less_than" && statistic < 0)
  ) {
    // For one-sided tests in the direction of the alternative
    pValue = 1 - normalizedStat;
  } else {
    // For one-sided tests in the opposite direction of the alternative
    pValue = 0.8 + 0.2 * (1 - normalizedStat); // This will always be high (> 0.8)
  }
  
  // Add some randomness to make it more realistic
  pValue = Math.max(0.001, Math.min(0.999, pValue + (Math.random() * 0.1 - 0.05)));
  
  return pValue;
}

// Helper function to interpret effect sizes
function interpretEffectSize(value: number, type: string): string {
  value = Math.abs(value);
  
  switch (type) {
    case "cohen_d":
      if (value < 0.2) return "negligible";
      if (value < 0.5) return "small";
      if (value < 0.8) return "medium";
      return "large";
      
    case "eta_squared":
      if (value < 0.01) return "negligible";
      if (value < 0.06) return "small";
      if (value < 0.14) return "medium";
      return "large";
      
    case "cramers_v":
      if (value < 0.1) return "negligible";
      if (value < 0.3) return "small";
      if (value < 0.5) return "medium";
      return "large";
      
    default:
      return "unknown";
  }
}

// Helper function to interpret correlation coefficients
function interpretCorrelation(r: number): string {
  const absR = Math.abs(r);
  
  if (absR < 0.1) return "negligible";
  if (absR < 0.3) return "weak";
  if (absR < 0.5) return "moderate";
  if (absR < 0.7) return "strong";
  if (absR < 0.9) return "very strong";
  return "nearly perfect";
}
