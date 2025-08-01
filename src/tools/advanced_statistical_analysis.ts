/**
 * Advanced Statistical Analysis module
 *
 * This module provides tools for performing advanced statistical analysis
 * on datasets, including descriptive statistics and correlation analysis.
 */

import { z } from 'zod';
import * as mathjs from 'mathjs';
import { 
  withErrorHandling, 
  createValidationError, 
  createDataProcessingError,
  ErrorCodes 
} from '../utils/errors.js';

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
  if (!Array.isArray(data) || data.length === 0) {
    throw createValidationError(
      'Data array is required and must not be empty',
      { 
        received: typeof data,
        length: data?.length,
        expectedType: 'array of numbers'
      },
      'calculateDescriptiveStatistics'
    );
  }

  if (data.some(val => typeof val !== 'number' || isNaN(val))) {
    throw createValidationError(
      'All data values must be valid numbers',
      {
        dataTypes: data.map(val => typeof val),
        invalidCount: data.filter(val => typeof val !== 'number' || isNaN(val)).length
      },
      'calculateDescriptiveStatistics'
    );
  }

  try {
    return {
      mean: Number(mathjs.mean(data)),
      median: Number(mathjs.median(data)),
      standardDeviation: Number(mathjs.std(data)),
      variance: Number(mathjs.variance(data)),
      min: Number(mathjs.min(data)),
      max: Number(mathjs.max(data)),
    };
  } catch (error) {
    throw createDataProcessingError(
      `Failed to calculate descriptive statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        dataLength: data.length,
        originalError: error instanceof Error ? error.message : 'Unknown error'
      },
      'calculateDescriptiveStatistics'
    );
  }
}

/**
 * Calculate Pearson correlation coefficient between two numeric arrays
 * @param x First array of numeric values
 * @param y Second array of numeric values
 * @returns Correlation coefficient between -1 and 1
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (!Array.isArray(x) || !Array.isArray(y)) {
    throw createValidationError(
      'Both input parameters must be arrays',
      {
        xType: typeof x,
        yType: typeof y,
        xIsArray: Array.isArray(x),
        yIsArray: Array.isArray(y)
      },
      'calculateCorrelation'
    );
  }

  if (x.length !== y.length) {
    throw createValidationError(
      'Input arrays must have the same length',
      {
        xLength: x.length,
        yLength: y.length,
        lengthDifference: Math.abs(x.length - y.length)
      },
      'calculateCorrelation'
    );
  }

  if (x.length === 0 || y.length === 0) {
    throw createValidationError(
      'Input arrays cannot be empty',
      { xLength: x.length, yLength: y.length },
      'calculateCorrelation'
    );
  }

  if (x.some(val => typeof val !== 'number' || isNaN(val)) || y.some(val => typeof val !== 'number' || isNaN(val))) {
    throw createValidationError(
      'All values in both arrays must be valid numbers',
      {
        invalidInX: x.filter(val => typeof val !== 'number' || isNaN(val)).length,
        invalidInY: y.filter(val => typeof val !== 'number' || isNaN(val)).length
      },
      'calculateCorrelation'
    );
  }

  try {
    const meanX = Number(mathjs.mean(x));
    const meanY = Number(mathjs.mean(y));

    const numerator = x.reduce((sum, xi, i) => {
      const yValue = y[i];
      return sum + (xi - meanX) * (yValue !== undefined ? yValue - meanY : 0);
    }, 0);

    const denominatorX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
    const denominatorY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));

    if (denominatorX === 0 || denominatorY === 0) {
      throw createDataProcessingError(
        'Cannot calculate correlation: one or both arrays have zero variance',
        {
          denominatorX,
          denominatorY,
          xVariance: Number(mathjs.variance(x)),
          yVariance: Number(mathjs.variance(y))
        },
        'calculateCorrelation'
      );
    }

    return numerator / (denominatorX * denominatorY);
  } catch (error) {
    if (error.context?.toolName === 'calculateCorrelation') {
      throw error; // Re-throw our own errors
    }
    throw createDataProcessingError(
      `Failed to calculate correlation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        xLength: x.length,
        yLength: y.length,
        originalError: error instanceof Error ? error.message : 'Unknown error'
      },
      'calculateCorrelation'
    );
  }
}

/**
 * Perform advanced statistical analysis on datasets
 * @param data Array of data objects
 * @param analysisType Type of analysis to perform
 * @returns Formatted markdown string with analysis results
 */
async function advancedAnalyzeDatasetInternal(
  data: Record<string, number | string>[],
  analysisType: string
): Promise<string> {
  // Validate inputs
  if (!Array.isArray(data) || data.length === 0) {
    throw createValidationError(
      'Data must be a non-empty array of objects',
      {
        received: typeof data,
        isArray: Array.isArray(data),
        length: data?.length,
        expectedType: 'array of objects'
      },
      'advancedAnalyzeDataset'
    );
  }

  if (!analysisType || typeof analysisType !== 'string') {
    throw createValidationError(
      'Analysis type must be a non-empty string',
      {
        received: typeof analysisType,
        value: analysisType,
        allowedValues: ['descriptive', 'correlation']
      },
      'advancedAnalyzeDataset'
    );
  }

  if (!['descriptive', 'correlation'].includes(analysisType)) {
    throw createValidationError(
      `Invalid analysis type: ${analysisType}`,
      {
        received: analysisType,
        allowedValues: ['descriptive', 'correlation']
      },
      'advancedAnalyzeDataset'
    );
  }

  // Extract numeric columns for analysis
  const firstItem = data[0];
  const numericColumns = firstItem ? Object.keys(firstItem).filter((key) => typeof firstItem[key] === 'number') : [];

  if (numericColumns.length === 0) {
    throw createValidationError(
      'No numeric columns found in the dataset for analysis',
      {
        dataLength: data.length,
        firstItemKeys: firstItem ? Object.keys(firstItem) : [],
        firstItemTypes: firstItem ? Object.keys(firstItem).map(key => typeof firstItem[key]) : []
      },
      'advancedAnalyzeDataset'
    );
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

export const advancedAnalyzeDataset = withErrorHandling('advancedAnalyzeDataset', advancedAnalyzeDatasetInternal);
