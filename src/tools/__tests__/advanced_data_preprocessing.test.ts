import { describe, it, expect } from '@jest/globals';
import { advancedDataPreprocessing } from '../advanced_data_preprocessing.js';
import { ValidationError } from '../../utils/errors.js';

describe('advancedDataPreprocessing', () => {
  it('normalizes to [0, 1] using min/max', async () => {
    // [10, 20, 30] -> min 10, max 30 -> [0, 0.5, 1]
    const report = await advancedDataPreprocessing([10, 20, 30], 'normalization');
    expect(report).toContain('Minimum Value: 10');
    expect(report).toContain('Maximum Value: 30');
    expect(report).toContain('0.0000, 0.5000, 1.0000');
  });

  it('standardizes to mean 0 / std 1', async () => {
    // [10, 20, 30] -> mean 20, sample std 10 -> [-1, 0, 1]
    const report = await advancedDataPreprocessing([10, 20, 30], 'standardization');
    expect(report).toContain('Mean: 20.0000');
    expect(report).toContain('Standard Deviation: 10.0000');
    expect(report).toContain('-1.0000, 0.0000, 1.0000');
  });

  it('detects an IQR outlier', async () => {
    // [1,2,3,4,5,100] -> 100 is beyond Q3 + 1.5*IQR
    const report = await advancedDataPreprocessing([1, 2, 3, 4, 5, 100], 'outlier_detection');
    expect(report).toContain('Total Outliers: 1');
    expect(report).toContain('100.0000');
  });

  it('reports missing-value handling counts on clean numeric data', async () => {
    const report = await advancedDataPreprocessing([1, 2, 3], 'missing_value_handling');
    expect(report).toContain('Original Data Points: 3');
    expect(report).toContain('Removed Data Points: 0');
  });

  it('throws ValidationError on empty input', async () => {
    await expect(advancedDataPreprocessing([], 'normalization')).rejects.toThrow(ValidationError);
  });
});
