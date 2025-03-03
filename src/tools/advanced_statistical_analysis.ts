/**
 * Advanced Statistical Analysis module
 *
 * This module provides tools for performing advanced statistical analysis
 * on datasets, including descriptive statistics and correlation analysis.
 */

import { z } from 'zod';
import * as mathjs from 'mathjs';

/**
 * Advanced Statistical Analysis Schema
 * Defines the input parameters for advanced statistical analysis
 */
export const advancedStatisticalAnalysisSchema = z.object({
  data: z
    .array(z.record(z.string(), z.number().or(z.string())))
    .describe('Array of data objects for statistical analysis'),
  analysisType: z
    .enum(['descriptive', 'correlation'])
    .describe('Type of statistical analysis to perform'),
});

/**
 * Calculate descriptive statistics for a numeric dataset
 * @param data Array of numeric values
 * @returns Object containing various descriptive statistics
 */
export function calculateDescriptiveStatistics(data: number[]) {
  return {
    mean: Number(mathjs.mean(data)),
    median: Number(mathjs.median(data)),
    standardDeviation: Number(mathjs.std(data)),
    variance: Number(mathjs.variance(data)),
    min: Number(mathjs.min(data)),
    max: Number(mathjs.max(data)),
  };
}

/**
 * Calculate Pearson correlation coefficient between two numeric arrays
 * @param x First array of numeric values
 * @param y Second array of numeric values
 * @returns Correlation coefficient between -1 and 1
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length) {
    throw new Error('Input arrays must have the same length');
  }

  const meanX = Number(mathjs.mean(x));
  const meanY = Number(mathjs.mean(y));

  const numerator = x.reduce((sum, xi, i) => {
    const yValue = y[i];
    return sum + (xi - meanX) * (yValue !== undefined ? yValue - meanY : 0);
  }, 0);

  const denominatorX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));

  const denominatorY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));

  return numerator / (denominatorX * denominatorY);
}

/**
 * Perform advanced statistical analysis on datasets
 * @param data Array of data objects
 * @param analysisType Type of analysis to perform
 * @returns Formatted markdown string with analysis results
 */
export async function advancedAnalyzeDataset(
  data: Record<string, number | string>[],
  analysisType: string
): Promise<string> {
  // Validate inputs
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data format. Please provide a non-empty array of data objects.');
  }

  // Extract numeric columns for analysis
  const firstItem = data[0];
  const numericColumns = firstItem ? Object.keys(firstItem).filter((key) => typeof firstItem[key] === 'number') : [];

  if (numericColumns.length === 0) {
    throw new Error('No numeric columns found in the dataset for analysis.');
  }

  let result = `# Advanced Statistical Analysis\n\n`;

  if (analysisType === 'descriptive') {
    numericColumns.forEach((column) => {
      const values = data.map((item) => Number(item[column]));

      const stats = calculateDescriptiveStatistics(values);

      result += `## ${column} - Descriptive Statistics\n\n`;
      result += `- **Mean**: ${stats.mean.toFixed(2)}\n`;
      result += `- **Median**: ${stats.median.toFixed(2)}\n`;
      result += `- **Standard Deviation**: ${stats.standardDeviation.toFixed(2)}\n`;
      result += `- **Variance**: ${stats.variance.toFixed(2)}\n`;
      result += `- **Min**: ${stats.min}\n`;
      result += `- **Max**: ${stats.max}\n\n`;
    });
  } else if (analysisType === 'correlation') {
    result += `## Correlation Analysis\n\n`;

    // Compute correlation between all numeric column pairs
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i] || '';
        const col2 = numericColumns[j] || '';
        
        if (!col1 || !col2) continue;

        const x = data.map((item) => Number(item[col1]));
        const y = data.map((item) => Number(item[col2]));

        const correlation = calculateCorrelation(x, y);

        result += `### Correlation between ${col1} and ${col2}\n\n`;
        result += `**Correlation Coefficient**: ${correlation.toFixed(4)}\n\n`;
        result += `*Interpretation*: ${
          Math.abs(correlation) > 0.7
            ? 'Strong correlation'
            : Math.abs(correlation) > 0.3
              ? 'Moderate correlation'
              : 'Weak correlation'
        }\n\n`;
      }
    }
  }

  return result;
}
