import { describe, it, expect } from '@jest/globals';
import {
  calculateDescriptiveStatistics,
  calculateCorrelation,
  advancedAnalyzeDataset,
  advancedStatisticalAnalysisSchema
} from '../advanced_statistical_analysis.js';

describe('Advanced Statistical Analysis', () => {
  describe('calculateDescriptiveStatistics', () => {
    describe('happy path', () => {
      it('should calculate basic descriptive statistics', () => {
        const data = [1, 2, 3, 4, 5];

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(3);
        expect(result.median).toBe(3);
        // mathjs std/variance are sample (unbiased) statistics
        expect(result.standardDeviation).toBeCloseTo(Math.sqrt(2.5), 10);
        expect(result.variance).toBeCloseTo(2.5, 10);
        expect(result.min).toBe(1);
        expect(result.max).toBe(5);
      });

      it('should handle decimal values', () => {
        const data = [1.5, 2.3, 3.7, 4.1, 5.9];

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBeCloseTo(3.5, 10);
        expect(result.median).toBeCloseTo(3.7, 10);
        expect(result.standardDeviation).toBeCloseTo(Math.sqrt(2.9), 10);
        expect(result.variance).toBeCloseTo(2.9, 10);
      });

      it('should handle single value array', () => {
        const data = [42];

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(42);
        expect(result.median).toBe(42);
        expect(result.standardDeviation).toBe(0);
        expect(result.variance).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle negative numbers', () => {
        const data = [-5, -2, 0, 2, 5];

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(0);
        expect(result.median).toBe(0);
        expect(result.standardDeviation).toBeCloseTo(Math.sqrt(14.5), 10);
        expect(result.min).toBe(-5);
        expect(result.max).toBe(5);
      });

      it('should handle large numbers', () => {
        const data = [1000000, 2000000, 3000000];

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(2000000);
        expect(result.median).toBe(2000000);
        expect(result.standardDeviation).toBeCloseTo(1000000, 5);
        expect(result.min).toBe(1000000);
        expect(result.max).toBe(3000000);
      });
    });
  });

  describe('calculateCorrelation', () => {
    describe('happy path', () => {
      it('should calculate perfect positive correlation', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [2, 4, 6, 8, 10];

        const result = calculateCorrelation(x, y);

        expect(result).toBeCloseTo(1, 10);
      });

      it('should calculate perfect negative correlation', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [10, 8, 6, 4, 2];

        const result = calculateCorrelation(x, y);

        expect(result).toBeCloseTo(-1, 10);
      });

      it('should calculate no correlation', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [3, 3, 3, 3, 3];

        const result = calculateCorrelation(x, y);

        // Constant y gives a zero denominator, so the result is NaN (or 0)
        expect(isNaN(result) || result === 0).toBe(true);
      });

      it('should handle decimal correlations', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [1.1, 2.2, 2.9, 4.1, 4.8];

        const result = calculateCorrelation(x, y);

        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0.9);
        expect(result).toBeLessThanOrEqual(1);
      });
    });

    describe('edge cases', () => {
      it('should handle arrays with identical values', () => {
        const x = [5, 5, 5, 5];
        const y = [10, 10, 10, 10];

        const result = calculateCorrelation(x, y);

        expect(isNaN(result)).toBe(true);
      });

      it('should handle negative values', () => {
        const x = [-2, -1, 0, 1, 2];
        const y = [-4, -2, 0, 2, 4];

        const result = calculateCorrelation(x, y);

        expect(result).toBeCloseTo(1, 10);
      });

      it('should handle minimum arrays (length 2)', () => {
        const x = [1, 2];
        const y = [3, 4];

        const result = calculateCorrelation(x, y);

        expect(result).toBeCloseTo(1, 10);
      });
    });

    describe('error handling', () => {
      it('should throw error for arrays of different lengths', () => {
        const x = [1, 2, 3];
        const y = [1, 2];

        expect(() => calculateCorrelation(x, y)).toThrow('Input arrays must have the same length');
      });

      it('should throw error for first array longer than second', () => {
        const x = [1, 2, 3, 4];
        const y = [1, 2, 3];

        expect(() => calculateCorrelation(x, y)).toThrow('Input arrays must have the same length');
      });

      it('should throw error for second array longer than first', () => {
        const x = [1, 2, 3];
        const y = [1, 2, 3, 4];

        expect(() => calculateCorrelation(x, y)).toThrow('Input arrays must have the same length');
      });
    });
  });

  describe('advancedAnalyzeDataset', () => {
    describe('happy path', () => {
      it('should perform descriptive analysis on single numeric column', async () => {
        const data = [
          { id: 1, value: 10 },
          { id: 2, value: 20 },
          { id: 3, value: 30 }
        ];

        const result = await advancedAnalyzeDataset(data, 'descriptive');

        expect(result).toContain('# Advanced Statistical Analysis');
        expect(result).toContain('## value - Descriptive Statistics');
        expect(result).toContain('**Mean**: 20.00');
        expect(result).toContain('**Median**: 20.00');
        // Sample standard deviation of [10, 20, 30] is 10
        expect(result).toContain('**Standard Deviation**: 10.00');
        expect(result).toContain('**Min**: 10');
        expect(result).toContain('**Max**: 30');
      });

      it('should perform descriptive analysis on multiple numeric columns', async () => {
        const data = [
          { name: 'A', score: 85, age: 25 },
          { name: 'B', score: 90, age: 30 },
          { name: 'C', score: 95, age: 35 }
        ];

        const result = await advancedAnalyzeDataset(data, 'descriptive');

        expect(result).toContain('## score - Descriptive Statistics');
        expect(result).toContain('## age - Descriptive Statistics');
      });

      it('should perform correlation analysis on multiple columns', async () => {
        const data = [
          { x: 1, y: 2, z: 3 },
          { x: 2, y: 4, z: 5 },
          { x: 3, y: 6, z: 7 }
        ];

        const result = await advancedAnalyzeDataset(data, 'correlation');

        expect(result).toContain('# Advanced Statistical Analysis');
        expect(result).toContain('## Correlation Analysis');
        expect(result).toContain('### Correlation between x and y');
        expect(result).toContain('### Correlation between x and z');
        expect(result).toContain('### Correlation between y and z');
        expect(result).toContain('**Correlation Coefficient**:');
      });

      it('should interpret correlation strength correctly', async () => {
        // Pairwise correlations: r(x, y) ≈ 0.96 (strong), r(x, z) = 0.30 (weak),
        // r(y, z) ≈ 0.48 (moderate)
        const data = [
          { x: 1, y: 1, z: 3 },
          { x: 2, y: 2, z: 1 },
          { x: 3, y: 4, z: 5 },
          { x: 4, y: 4, z: 2 },
          { x: 5, y: 5, z: 4 }
        ];

        const result = await advancedAnalyzeDataset(data, 'correlation');

        expect(result).toContain('Strong correlation');
        expect(result).toContain('Moderate correlation');
        expect(result).toContain('Weak correlation');
      });
    });

    describe('edge cases', () => {
      it('should handle dataset with mixed data types correctly', async () => {
        // Booleans are outside the declared signature; cast to exercise the
        // runtime numeric-column filtering
        const data = [
          { id: 1, name: 'Test', value: 100, active: true },
          { id: 2, name: 'Test2', value: 200, active: false }
        ] as unknown as Record<string, number | string>[];

        const result = await advancedAnalyzeDataset(data, 'descriptive');

        // Should only analyze numeric columns (id and value)
        expect(result).toContain('## id - Descriptive Statistics');
        expect(result).toContain('## value - Descriptive Statistics');
        expect(result).not.toContain('## name - Descriptive Statistics');
        expect(result).not.toContain('## active - Descriptive Statistics');
      });

      it('should handle single data point', async () => {
        const data = [{ value: 42 }];

        const result = await advancedAnalyzeDataset(data, 'descriptive');

        expect(result).toContain('**Mean**: 42.00');
        expect(result).toContain('**Standard Deviation**: 0.00');
      });

      it('should handle correlation with single numeric column', async () => {
        const data = [
          { name: 'A', value: 1 },
          { name: 'B', value: 2 }
        ];

        const result = await advancedAnalyzeDataset(data, 'correlation');

        expect(result).toContain('# Advanced Statistical Analysis');
        expect(result).toContain('## Correlation Analysis');
        // Should not have any correlation pairs since only one numeric column
        expect(result).not.toContain('### Correlation between');
      });
    });

    describe('error handling', () => {
      it('should throw error for empty array', async () => {
        await expect(advancedAnalyzeDataset([], 'descriptive'))
          .rejects
          .toThrow('Invalid data format. Please provide a non-empty array of data objects.');
      });

      it('should throw error for null data', async () => {
        await expect(advancedAnalyzeDataset(null as any, 'descriptive'))
          .rejects
          .toThrow('Invalid data format. Please provide a non-empty array of data objects.');
      });

      it('should throw error for non-array data', async () => {
        await expect(advancedAnalyzeDataset('not an array' as any, 'descriptive'))
          .rejects
          .toThrow('Invalid data format. Please provide a non-empty array of data objects.');
      });

      it('should throw error for dataset with no numeric columns', async () => {
        const data = [
          { name: 'John', city: 'NYC' },
          { name: 'Jane', city: 'LA' }
        ];

        await expect(advancedAnalyzeDataset(data, 'descriptive'))
          .rejects
          .toThrow('No numeric columns found in the dataset for analysis.');
      });

      it('should throw error for empty objects in dataset', async () => {
        const data = [{}];

        await expect(advancedAnalyzeDataset(data, 'descriptive'))
          .rejects
          .toThrow('No numeric columns found in the dataset for analysis.');
      });
    });
  });

  describe('schema validation', () => {
    describe('happy path', () => {
      it('should validate correct schema for descriptive analysis', () => {
        const validInput = {
          data: [{ value: 1 }, { value: 2 }],
          analysisType: 'descriptive' as const
        };

        const result = advancedStatisticalAnalysisSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should validate correct schema for correlation analysis', () => {
        const validInput = {
          data: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
          analysisType: 'correlation' as const
        };

        const result = advancedStatisticalAnalysisSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should reject invalid analysis type', () => {
        const invalidInput = {
          data: [{ value: 1 }],
          analysisType: 'invalid'
        };

        const result = advancedStatisticalAnalysisSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });

      it('should reject non-array data', () => {
        const invalidInput = {
          data: 'not an array',
          analysisType: 'descriptive'
        };

        const result = advancedStatisticalAnalysisSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });

      it('should accept empty data array at the schema level', () => {
        const input = {
          data: [],
          analysisType: 'descriptive'
        };

        const result = advancedStatisticalAnalysisSchema.safeParse(input);
        expect(result.success).toBe(true); // Schema allows empty array, but function will throw
      });
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: Math.random() * 100
      }));

      const startTime = Date.now();
      const result = await advancedAnalyzeDataset(largeData, 'descriptive');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toContain('# Advanced Statistical Analysis');
    });
  });
});
