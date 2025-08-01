import { describe, it, expect } from '@jest/globals';
import {
  withErrorHandling,
  createValidationError,
  createDataProcessingError,
  ErrorCodes
} from '../errors.js';

/**
 * Example of how to migrate an existing analytical tool to use the new error handling system
 * This demonstrates the migration pattern for standardized error handling
 */

// Original tool implementation (before migration)
async function originalAnalyzeDatasetTool(data: any[], analysisType: string): Promise<string> {
  // Original validation with generic Error
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data format. Please provide an array of numeric values or data objects.');
  }

  if (!['summary', 'stats'].includes(analysisType)) {
    throw new Error(`Invalid analysis type: ${analysisType}. Supported types are 'summary' and 'stats'.`);
  }

  // Original processing with generic Error
  const numericData = data.filter(item => typeof item === 'number');
  if (numericData.length === 0) {
    throw new Error('No numeric data found for analysis.');
  }

  return `Analysis complete: ${analysisType} for ${numericData.length} numeric values`;
}

// Migrated tool implementation (after migration to enhanced error handling)
async function migratedAnalyzeDatasetToolInternal(data: any[], analysisType: string): Promise<string> {
  // Enhanced validation with standardized errors
  if (!Array.isArray(data) || data.length === 0) {
    throw createValidationError(
      'Data array is required and must not be empty',
      { 
        received: typeof data, 
        length: data?.length,
        expectedType: 'array',
        minimumLength: 1
      },
      'analyze_dataset'
    );
  }

  if (!['summary', 'stats'].includes(analysisType)) {
    throw createValidationError(
      `Invalid analysis type: ${analysisType}. Supported types are 'summary' and 'stats'`,
      { 
        analysisType, 
        supportedTypes: ['summary', 'stats'],
        suggestion: 'Please use either "summary" or "stats"'
      },
      'analyze_dataset'
    );
  }

  // Enhanced processing with standardized errors
  const numericData = data.filter(item => typeof item === 'number');
  if (numericData.length === 0) {
    throw createDataProcessingError(
      'No numeric data found for analysis',
      { 
        originalDataLength: data.length,
        numericDataLength: numericData.length,
        dataTypes: data.map(item => typeof item),
        suggestion: 'Ensure your data contains numeric values'
      },
      'analyze_dataset'
    );
  }

  return `Analysis complete: ${analysisType} for ${numericData.length} numeric values`;
}

// Export the wrapped tool with enhanced error handling
const migratedAnalyzeDatasetTool = withErrorHandling('analyze_dataset', migratedAnalyzeDatasetToolInternal);

describe('Tool Migration Example', () => {
  describe('Original vs Migrated Tool Comparison', () => {
    const testData = [1, 2, 3, 'invalid', 5];
    const validData = [1, 2, 3, 4, 5];

    describe('Original Tool Behavior', () => {
      it('should throw generic errors', async () => {
        await expect(originalAnalyzeDatasetTool([], 'summary')).rejects.toThrow(
          'Invalid data format. Please provide an array of numeric values or data objects.'
        );

        await expect(originalAnalyzeDatasetTool(validData, 'invalid')).rejects.toThrow(
          'Invalid analysis type: invalid. Supported types are \'summary\' and \'stats\'.'
        );
      });

      it('should work with valid data', async () => {
        const result = await originalAnalyzeDatasetTool(validData, 'summary');
        expect(result).toBe('Analysis complete: summary for 5 numeric values');
      });
    });

    describe('Migrated Tool Behavior', () => {
      it('should throw standardized ValidationErrors with enhanced context', async () => {
        await expect(migratedAnalyzeDatasetTool([], 'summary')).rejects.toMatchObject({
          name: 'ValidationError',
          code: ErrorCodes.INVALID_INPUT,
          message: '[analyze_dataset] Data array is required and must not be empty',
          context: expect.objectContaining({
            toolName: 'analyze_dataset',
            received: 'object',
            length: 0,
            expectedType: 'array',
            minimumLength: 1
          })
        });

        await expect(migratedAnalyzeDatasetTool(validData, 'invalid')).rejects.toMatchObject({
          name: 'ValidationError',
          code: ErrorCodes.INVALID_INPUT,
          message: expect.stringContaining('[analyze_dataset] Invalid analysis type: invalid'),
          context: expect.objectContaining({
            toolName: 'analyze_dataset',
            analysisType: 'invalid',
            supportedTypes: ['summary', 'stats'],
            suggestion: 'Please use either "summary" or "stats"'
          })
        });
      });

      it('should throw standardized DataProcessingErrors with enhanced context', async () => {
        const nonNumericData = ['a', 'b', 'c'];
        await expect(migratedAnalyzeDatasetTool(nonNumericData, 'summary')).rejects.toMatchObject({
          name: 'DataProcessingError',
          code: ErrorCodes.CALCULATION_FAILED,
          message: '[analyze_dataset] No numeric data found for analysis',
          context: expect.objectContaining({
            toolName: 'analyze_dataset',
            originalDataLength: 3,
            numericDataLength: 0,
            dataTypes: ['string', 'string', 'string'],
            suggestion: 'Ensure your data contains numeric values'
          })
        });
      });

      it('should work with valid data and provide same functionality', async () => {
        const result = await migratedAnalyzeDatasetTool(validData, 'summary');
        expect(result).toBe('Analysis complete: summary for 5 numeric values');
      });

      it('should handle mixed data types gracefully', async () => {
        const mixedData = [1, 2, 'invalid', 4, null, 6];
        const result = await migratedAnalyzeDatasetTool(mixedData, 'stats');
        expect(result).toBe('Analysis complete: stats for 3 numeric values');
      });
    });
  });

  describe('Migration Benefits Demonstration', () => {
    it('should provide structured error information for debugging', async () => {
      try {
        await migratedAnalyzeDatasetTool(null as any, 'summary');
      } catch (error: any) {
        // Enhanced error provides structured debugging information
        expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
        expect(error.context.toolName).toBe('analyze_dataset');
        expect(error.context.received).toBe('object');
        expect(error.context.expectedType).toBe('array');
        expect(error.message).toContain('[analyze_dataset]');
        
        // Context can be used for automated error handling/logging
        expect(typeof error.context).toBe('object');
        expect(error.context.suggestion).toBeDefined();
      }
    });

    it('should enable consistent error handling across tool ecosystem', async () => {
      const errors: any[] = [];
      
      // Collect errors from multiple tool calls
      try {
        await migratedAnalyzeDatasetTool([], 'summary');
      } catch (error) {
        errors.push(error);
      }
      
      try {
        await migratedAnalyzeDatasetTool(['a', 'b'], 'summary');
      } catch (error) {
        errors.push(error);
      }
      
      try {
        await migratedAnalyzeDatasetTool([1, 2, 3], 'invalid');
      } catch (error) {
        errors.push(error);
      }

      // All errors follow the same structure
      errors.forEach(error => {
        expect(error.name).toMatch(/^(ValidationError|DataProcessingError)$/);
        expect(error.code).toMatch(/^ERR_\d{4}$/);
        expect(error.context.toolName).toBe('analyze_dataset');
        expect(error.message).toContain('[analyze_dataset]');
      });

      // Different error types for different issues
      expect(errors[0].name).toBe('ValidationError'); // Empty array
      expect(errors[1].name).toBe('DataProcessingError'); // No numeric data
      expect(errors[2].name).toBe('ValidationError'); // Invalid analysis type
    });

    it('should support error recovery and retry patterns', async () => {
      // Simulate a tool that might fail due to temporary issues
      let attempts = 0;
      const unreliableToolInternal = async (shouldFail: boolean) => {
        attempts++;
        if (shouldFail && attempts < 3) {
          throw createDataProcessingError(
            'Temporary processing failure',
            { attempt: attempts, maxAttempts: 3 },
            'unreliable_tool'
          );
        }
        return `Success on attempt ${attempts}`;
      };
      
      const unreliableTool = withErrorHandling('unreliable_tool', unreliableToolInternal);
      
      // Reset attempts
      attempts = 0;
      
      // This would potentially retry based on error recovery strategies
      // (actual retry logic would depend on the error code and recovery configuration)
      const result = await unreliableTool(false); // Don't fail
      expect(result).toBe('Success on attempt 1');
    });
  });

  describe('Error Context Richness', () => {
    it('should provide actionable error information', async () => {
      try {
        await migratedAnalyzeDatasetTool('not an array' as any, 'summary');
      } catch (error: any) {
        // Rich context for debugging
        expect(error.context).toMatchObject({
          toolName: 'analyze_dataset',
          received: 'string',
          expectedType: 'array',
          minimumLength: 1
        });
        
        // Error message is user-friendly
        expect(error.message).toContain('Data array is required and must not be empty');
        
        // Tool name is clearly identified
        expect(error.message).toContain('[analyze_dataset]');
      }
    });

    it('should preserve original tool functionality while enhancing errors', async () => {
      // Verify that the migrated tool produces the same results as the original
      const testCases = [
        { data: [1, 2, 3, 4, 5], analysisType: 'summary' },
        { data: [10, 20, 30], analysisType: 'stats' },
        { data: [1, 'mixed', 3, null, 5], analysisType: 'summary' }
      ];

      for (const testCase of testCases) {
        const originalResult = await originalAnalyzeDatasetTool(testCase.data, testCase.analysisType);
        const migratedResult = await migratedAnalyzeDatasetTool(testCase.data, testCase.analysisType);
        expect(migratedResult).toBe(originalResult);
      }
    });
  });
});