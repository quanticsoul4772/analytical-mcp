import { z } from 'zod';
import * as math from 'mathjs';
import { ValidationError, DataProcessingError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

// Type definitions
type Dataset = number[] | Record<string, any>[];

// Schema for the tool parameters
export const analyzeDatasetSchema = z.object({
  data: z
    .array(z.number())
    .or(z.array(z.record(z.string(), z.any())))
    .describe('Array of data to analyze'),
  analysisType: z
    .enum(['summary', 'stats'])
    .default('summary')
    .describe('Type of analysis to perform'),
});

// Tool implementation
export async function analyzeDataset(data: Dataset, analysisType: string): Promise<string> {
  try {
    Logger.debug(`Analyzing dataset`, { analysisType, dataLength: data?.length });

    // Validate inputs
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError(
        'Invalid data format. Please provide an array of numeric values or data objects.'
      );
    }

    if (!['summary', 'stats'].includes(analysisType)) {
      throw new ValidationError(
        `Invalid analysis type: ${analysisType}. Supported types are 'summary' and 'stats'.`
      );
    }

    // Convert to numeric array if it's an array of objects with a single numeric property
    let numericData: number[] = [];
    try {
      if (typeof data[0] === 'object') {
        // If array of objects, use the first numeric property found
        const firstObject = data[0] as Record<string, any>;
        const numericProperty = Object.keys(firstObject).find(
          (key) => typeof firstObject[key] === 'number'
        );

        if (!numericProperty) {
          throw new ValidationError(
            'Could not find numeric property in data objects for analysis.'
          );
        }

        numericData = data.map((item) => (item as Record<string, any>)[numericProperty] as number);
        Logger.debug(`Extracted numeric data from property: ${numericProperty}`);
      } else {
        // If already array of numbers
        numericData = data as number[];
      }

      // Validate numeric data
      if (numericData.some((val) => typeof val !== 'number' || isNaN(val))) {
        throw new ValidationError('Dataset contains non-numeric values.');
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      Logger.error('Error processing dataset', error);
      throw new DataProcessingError(
        `Failed to process dataset: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (analysisType === 'stats') {
      // Perform statistical analysis
      try {
        const meanCalc = math.mean(numericData);
        const medianCalc = math.median(numericData);
        const minCalc = math.min(...numericData);
        const maxCalc = math.max(...numericData);
        const stdCalc = math.std(numericData, 'uncorrected');
        // Calculate variance manually
        const varianceCalc = calculateVariance(numericData);
        const sumCalc = math.sum(numericData);
        const quartiles = getQuartiles(numericData);

        // Ensure numeric values
        const mean = Number(meanCalc);
        const median = Number(medianCalc);
        const min = Number(minCalc);
        const max = Number(maxCalc);
        const std = Number(stdCalc);
        const variance = Number(varianceCalc);
        const sum = Number(sumCalc);

        Logger.debug(`Statistical analysis completed`, {
          mean,
          median,
          min,
          max,
          std,
          variance,
          sum,
        });

        return `
## Statistical Analysis

- **Count**: ${numericData.length} values
- **Sum**: ${sum.toFixed(2)}
- **Range**: ${min} to ${max}
- **Quartiles**: 
  - Q1 (25%): ${quartiles.q1.toFixed(2)}
  - Q2 (50%, median): ${quartiles.q2.toFixed(2)}
  - Q3 (75%): ${quartiles.q3.toFixed(2)}
- **Central Tendency**:
  - Mean: ${mean.toFixed(2)}
  - Median: ${median.toFixed(2)}
- **Dispersion**:
  - Standard Deviation: ${std.toFixed(2)}
  - Variance: ${variance.toFixed(2)}
  - Coefficient of Variation: ${((std / mean) * 100).toFixed(2)}%
    `;
      } catch (error) {
        Logger.error('Error during statistical calculations', error);
        throw new DataProcessingError(
          `Statistical calculation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // Provide a general summary
      try {
        const meanCalc = math.mean(numericData);
        const minCalc = math.min(...numericData);
        const maxCalc = math.max(...numericData);
        const sumCalc = math.sum(numericData);

        // Ensure numeric values
        const mean = Number(meanCalc);
        const min = Number(minCalc);
        const max = Number(maxCalc);
        const sum = Number(sumCalc);

        Logger.debug(`Summary analysis completed`, {
          mean,
          min,
          max,
          sum,
        });

        return `
## Data Summary

This dataset contains ${numericData.length} values.

**Overview:**
- Average value: ${mean.toFixed(2)}
- Lowest value: ${min}
- Highest value: ${max}
- Total sum: ${sum.toFixed(2)}

**Sample Data:**
${numericData.slice(0, 5).join(', ')}${numericData.length > 5 ? ', ...' : ''}
    `;
      } catch (error) {
        Logger.error('Error during summary calculations', error);
        throw new DataProcessingError(
          `Summary calculation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } catch (error) {
    // Ensure all errors are properly logged
    if (!(error instanceof ValidationError) && !(error instanceof DataProcessingError)) {
      Logger.error('Unexpected error in dataset analysis', error);
      throw new DataProcessingError(
        `Dataset analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Re-throw ValidationError and DataProcessingError
    throw error;
  }
}

// Helper function to calculate quartiles
function getQuartiles(arr: number[]): { q1: number; q2: number; q3: number } {
  const sorted = [...arr].sort((a, b) => a - b);
  const q2 = Number(math.median(sorted));

  const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const upperHalf =
    sorted.length % 2 === 0
      ? sorted.slice(Math.floor(sorted.length / 2))
      : sorted.slice(Math.floor(sorted.length / 2) + 1);

  const q1 = Number(math.median(lowerHalf));
  const q3 = Number(math.median(upperHalf));

  return { q1, q2, q3 };
}

// Helper function to calculate variance
function calculateVariance(arr: number[]): number {
  if (arr.length === 0) return 0;

  const mean = Number(math.mean(arr));
  const squares = arr.map((x) => Math.pow(x - mean, 2));
  const sum = squares.reduce((sum, square) => sum + square, 0);

  return sum / arr.length;
}
