import { z } from 'zod';
import * as mathjs from 'mathjs';
import { Logger } from '../utils/logger.js';
import { ValidationError, DataProcessingError } from '../utils/errors.js';

// Enhanced type definition for numeric types
type MathNumericType = number | Record<string, number>;

// Utility function to convert to number
function toNumber(value: mathjs.MathType | MathNumericType): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'valueOf' in value) return Number(value.valueOf());
  return Number(value);
}

// Schema for advanced data preprocessing
const AdvancedDataPreprocessingSchema = z.object({
  data: z.array(z.union([z.number(), z.record(z.string(), z.number())])),
  preprocessingType: z.enum([
    'normalization',
    'standardization',
    'missing_value_handling',
    'outlier_detection',
  ]),
});

// Advanced data preprocessing function
async function advancedDataPreprocessing(
  data: MathNumericType[],
  preprocessingType: string
): Promise<string> {
  // Validate input
  try {
    const validatedInput = AdvancedDataPreprocessingSchema.parse({
      data,
      preprocessingType,
    });
    Logger.debug(`Validated data preprocessing input`, {
      preprocessingType,
      dataLength: data.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      Logger.error('Data preprocessing validation failed', error);
      throw new ValidationError(`Invalid parameters for data preprocessing: ${error.message}`, {
        issues: error.issues,
      });
    }
    throw error;
  }

  let result = `# Advanced Data Preprocessing Report\n\n`;
  result += `## Preprocessing Type: ${preprocessingType}\n\n`;

  try {
    const flatData = Array.isArray(data[0])
      ? (data as number[]).flat()
      : (data as Record<string, number>[]).flatMap((obj) => Object.values(obj));

    switch (preprocessingType) {
      case 'normalization':
        const min = toNumber(mathjs.min(flatData));
        const max = toNumber(mathjs.max(flatData));

        const normalizedData = flatData.map((v) =>
          max !== min ? (toNumber(v) - min) / (max - min) : 0
        );

        result += `### Normalization Details\n`;
        result += `- Minimum Value: ${min}\n`;
        result += `- Maximum Value: ${max}\n`;
        result += `- Normalized Range: [0, 1]\n\n`;
        result += `**Normalized Data Preview:**\n`;
        result += normalizedData
          .slice(0, 10)
          .map((v) => v.toFixed(4))
          .join(', ');
        break;

      case 'standardization':
        const mean = toNumber(mathjs.mean(flatData));
        const std = toNumber(mathjs.std(flatData));

        const standardizedData = flatData.map((v) => (std !== 0 ? (toNumber(v) - mean) / std : 0));

        result += `### Standardization Details\n`;
        result += `- Mean: ${mean.toFixed(4)}\n`;
        result += `- Standard Deviation: ${std.toFixed(4)}\n`;
        result += `- Standardized Mean: 0\n`;
        result += `- Standardized Standard Deviation: 1\n\n`;
        result += `**Standardized Data Preview:**\n`;
        result += standardizedData
          .slice(0, 10)
          .map((v) => v.toFixed(4))
          .join(', ');
        break;

      case 'missing_value_handling':
        const processedData = Array.isArray(data[0])
          ? (data as unknown as number[][])
          : (data as Record<string, number>[]).map((obj) => Object.values(obj));

        const cleanedData = processedData
          .flat()
          .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)));

        result += `### Missing Value Handling\n`;
        result += `- Original Data Points: ${processedData.flat().length}\n`;
        result += `- Cleaned Data Points: ${cleanedData.length}\n`;
        result += `- Removed Data Points: ${processedData.flat().length - cleanedData.length}\n\n`;
        result += `**Cleaned Data Preview:**\n`;
        result += cleanedData
          .slice(0, 10)
          .map((v) => Number(v).toFixed(4))
          .join(', ');
        break;

      case 'outlier_detection':
        const sortedData = [...flatData].sort((a, b) => toNumber(a) - toNumber(b));
        const q1 = toNumber(mathjs.quantileSeq(sortedData, 0.25));
        const q3 = toNumber(mathjs.quantileSeq(sortedData, 0.75));
        const iqr = q3 - q1;

        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        const outliers = flatData.filter(
          (v) => toNumber(v) < lowerBound || toNumber(v) > upperBound
        );

        result += `### Outlier Detection Details\n`;
        result += `- Q1 (25th Percentile): ${q1}\n`;
        result += `- Q3 (75th Percentile): ${q3}\n`;
        result += `- Interquartile Range (IQR): ${iqr}\n`;
        result += `- Lower Bound: ${lowerBound}\n`;
        result += `- Upper Bound: ${upperBound}\n`;
        result += `- Total Outliers: ${outliers.length}\n\n`;
        result += `**Detected Outliers:**\n`;
        result += outliers
          .slice(0, 10)
          .map((v) => toNumber(v).toFixed(4))
          .join(', ');
        break;

      default:
        throw new Error(`Unsupported preprocessing type: ${preprocessingType}`);
    }

    return result;
  } catch (error) {
    Logger.error('Advanced Data Preprocessing Error', error, {
      preprocessingType,
      dataLength: data.length,
    });
    throw new DataProcessingError(
      `Preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { preprocessingType }
    );
  }
}

// Export both the function and schema
export {
  advancedDataPreprocessing,
  AdvancedDataPreprocessingSchema as advancedDataPreprocessingSchema,
};
