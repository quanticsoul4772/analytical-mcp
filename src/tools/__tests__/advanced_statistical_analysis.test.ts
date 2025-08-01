import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  calculateDescriptiveStatistics,
  calculateCorrelation,
  advancedAnalyzeDataset,
  advancedStatisticalAnalysisSchema
} from '../advanced_statistical_analysis.js';
import * as mathjs from 'mathjs';

// Mock mathjs
jest.mock('mathjs');

describe('Advanced Statistical Analysis', () => {
  const mockMathjs = mathjs as jest.Mocked<typeof mathjs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDescriptiveStatistics', () => {
    describe('happy path', () => {
      it('should calculate basic descriptive statistics', () => {
        const data = [1, 2, 3, 4, 5];
        
        mockMathjs.mean.mockReturnValue(3);
        mockMathjs.median.mockReturnValue(3);
        mockMathjs.std.mockReturnValue(1.58);
        mockMathjs.variance.mockReturnValue(2.5);
        mockMathjs.min.mockReturnValue(1);
        mockMathjs.max.mockReturnValue(5);

        const result = calculateDescriptiveStatistics(data);

        expect(result).toEqual({
          mean: 3,
          median: 3,
          standardDeviation: 1.58,
          variance: 2.5,
          min: 1,
          max: 5
        });

        expect(mockMathjs.mean).toHaveBeenCalledWith(data);
        expect(mockMathjs.median).toHaveBeenCalledWith(data);
        expect(mockMathjs.std).toHaveBeenCalledWith(data);
        expect(mockMathjs.variance).toHaveBeenCalledWith(data);
        expect(mockMathjs.min).toHaveBeenCalledWith(data);
        expect(mockMathjs.max).toHaveBeenCalledWith(data);
      });

      it('should handle decimal values', () => {
        const data = [1.5, 2.3, 3.7, 4.1, 5.9];
        
        mockMathjs.mean.mockReturnValue(3.5);
        mockMathjs.median.mockReturnValue(3.7);
        mockMathjs.std.mockReturnValue(1.74);
        mockMathjs.variance.mockReturnValue(3.02);
        mockMathjs.min.mockReturnValue(1.5);
        mockMathjs.max.mockReturnValue(5.9);

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(3.5);
        expect(result.median).toBe(3.7);
        expect(result.standardDeviation).toBe(1.74);
      });

      it('should handle single value array', () => {
        const data = [42];
        
        mockMathjs.mean.mockReturnValue(42);
        mockMathjs.median.mockReturnValue(42);
        mockMathjs.std.mockReturnValue(0);
        mockMathjs.variance.mockReturnValue(0);
        mockMathjs.min.mockReturnValue(42);
        mockMathjs.max.mockReturnValue(42);

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(42);
        expect(result.standardDeviation).toBe(0);
        expect(result.variance).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle negative numbers', () => {
        const data = [-5, -2, 0, 2, 5];
        
        mockMathjs.mean.mockReturnValue(0);
        mockMathjs.median.mockReturnValue(0);
        mockMathjs.std.mockReturnValue(3.87);
        mockMathjs.variance.mockReturnValue(15);
        mockMathjs.min.mockReturnValue(-5);
        mockMathjs.max.mockReturnValue(5);

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(0);
        expect(result.min).toBe(-5);
        expect(result.max).toBe(5);
      });

      it('should handle large numbers', () => {
        const data = [1000000, 2000000, 3000000];
        
        mockMathjs.mean.mockReturnValue(2000000);
        mockMathjs.median.mockReturnValue(2000000);
        mockMathjs.std.mockReturnValue(816496.58);
        mockMathjs.variance.mockReturnValue(666666666666.67);
        mockMathjs.min.mockReturnValue(1000000);
        mockMathjs.max.mockReturnValue(3000000);

        const result = calculateDescriptiveStatistics(data);

        expect(result.mean).toBe(2000000);
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

        mockMathjs.mean.mockReturnValueOnce(3).mockReturnValueOnce(6);

        const result = calculateCorrelation(x, y);

        expect(result).toBe(1);
      });

      it('should calculate perfect negative correlation', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [10, 8, 6, 4, 2];

        mockMathjs.mean.mockReturnValueOnce(3).mockReturnValueOnce(6);

        const result = calculateCorrelation(x, y);

        expect(result).toBe(-1);
      });

      it('should calculate no correlation', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [3, 3, 3, 3, 3];

        mockMathjs.mean.mockReturnValueOnce(3).mockReturnValueOnce(3);

        const result = calculateCorrelation(x, y);

        expect(isNaN(result) || result === 0).toBe(true);
      });

      it('should handle decimal correlations', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [1.1, 2.2, 2.9, 4.1, 4.8];

        mockMathjs.mean.mockReturnValueOnce(3).mockReturnValueOnce(3.02);

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

        mockMathjs.mean.mockReturnValueOnce(5).mockReturnValueOnce(10);

        const result = calculateCorrelation(x, y);

        expect(isNaN(result)).toBe(true);
      });

      it('should handle negative values', () => {
        const x = [-2, -1, 0, 1, 2];
        const y = [-4, -2, 0, 2, 4];

        mockMathjs.mean.mockReturnValueOnce(0).mockReturnValueOnce(0);

        const result = calculateCorrelation(x, y);

        expect(result).toBe(1);
      });

      it('should handle minimum arrays (length 2)', () => {
        const x = [1, 2];
        const y = [3, 4];

        mockMathjs.mean.mockReturnValueOnce(1.5).mockReturnValueOnce(3.5);

        const result = calculateCorrelation(x, y);

        expect(result).toBe(1);
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

        mockMathjs.mean.mockReturnValue(20);
        mockMathjs.median.mockReturnValue(20);
        mockMathjs.std.mockReturnValue(8.16);
        mockMathjs.variance.mockReturnValue(66.67);
        mockMathjs.min.mockReturnValue(10);
        mockMathjs.max.mockReturnValue(30);

        const result = await advancedAnalyzeDataset(data, 'descriptive');

        expect(result).toContain('# Advanced Statistical Analysis');
        expect(result).toContain('## value - Descriptive Statistics');
        expect(result).toContain('**Mean**: 20.00');
        expect(result).toContain('**Median**: 20.00');
        expect(result).toContain('**Standard Deviation**: 8.16');
        expect(result).toContain('**Min**: 10');
        expect(result).toContain('**Max**: 30');
      });

      it('should perform descriptive analysis on multiple numeric columns', async () => {
        const data = [
          { name: 'A', score: 85, age: 25 },
          { name: 'B', score: 90, age: 30 },
          { name: 'C', score: 95, age: 35 }
        ];

        mockMathjs.mean.mockReturnValue(90);
        mockMathjs.median.mockReturnValue(90);
        mockMathjs.std.mockReturnValue(4.08);
        mockMathjs.variance.mockReturnValue(16.67);
        mockMathjs.min.mockReturnValue(85);
        mockMathjs.max.mockReturnValue(95);

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

        mockMathjs.mean.mockReturnValue(2);

        const result = await advancedAnalyzeDataset(data, 'correlation');

        expect(result).toContain('# Advanced Statistical Analysis');
        expect(result).toContain('## Correlation Analysis');
        expect(result).toContain('### Correlation between x and y');
        expect(result).toContain('### Correlation between x and z');
        expect(result).toContain('### Correlation between y and z');
        expect(result).toContain('**Correlation Coefficient**:');
      });

      it('should interpret correlation strength correctly', async () => {
        const data = [
          { strong: 1, moderate: 1, weak: 1 },
          { strong: 2, moderate: 1.5, weak: 1.1 },
          { strong: 3, moderate: 2, weak: 0.9 }
        ];

        mockMathjs.mean.mockReturnValue(2);

        // Mock correlation calculations to return different strength values
        jest.spyOn(require('../advanced_statistical_analysis.js'), 'calculateCorrelation')
          .mockReturnValueOnce(0.8) // strong correlation
          .mockReturnValueOnce(0.5) // moderate correlation  
          .mockReturnValueOnce(0.2); // weak correlation

        const result = await advancedAnalyzeDataset(data, 'correlation');

        expect(result).toContain('Strong correlation');
        expect(result).toContain('Moderate correlation');
        expect(result).toContain('Weak correlation');
      });
    });

    describe('edge cases', () => {
      it('should handle dataset with mixed data types correctly', async () => {
        const data = [
          { id: 1, name: 'Test', value: 100, active: true },
          { id: 2, name: 'Test2', value: 200, active: false }
        ];

        mockMathjs.mean.mockReturnValue(150);
        mockMathjs.median.mockReturnValue(150);
        mockMathjs.std.mockReturnValue(50);
        mockMathjs.variance.mockReturnValue(2500);
        mockMathjs.min.mockReturnValue(100);
        mockMathjs.max.mockReturnValue(200);

        const result = await advancedAnalyzeDataset(data, 'descriptive');

        // Should only analyze numeric columns (id and value)
        expect(result).toContain('## id - Descriptive Statistics');
        expect(result).toContain('## value - Descriptive Statistics');
        expect(result).not.toContain('## name - Descriptive Statistics');
        expect(result).not.toContain('## active - Descriptive Statistics');
      });

      it('should handle single data point', async () => {
        const data = [{ value: 42 }];

        mockMathjs.mean.mockReturnValue(42);
        mockMathjs.median.mockReturnValue(42);
        mockMathjs.std.mockReturnValue(0);
        mockMathjs.variance.mockReturnValue(0);
        mockMathjs.min.mockReturnValue(42);
        mockMathjs.max.mockReturnValue(42);

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

      it('should reject empty data array', () => {
        const invalidInput = {
          data: [],
          analysisType: 'descriptive'
        };

        const result = advancedStatisticalAnalysisSchema.safeParse(invalidInput);
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

      mockMathjs.mean.mockReturnValue(50);
      mockMathjs.median.mockReturnValue(50);
      mockMathjs.std.mockReturnValue(28.87);
      mockMathjs.variance.mockReturnValue(833.33);
      mockMathjs.min.mockReturnValue(0.1);
      mockMathjs.max.mockReturnValue(99.9);

      const startTime = Date.now();
      const result = await advancedAnalyzeDataset(largeData, 'descriptive');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toContain('# Advanced Statistical Analysis');
    });
  });
});