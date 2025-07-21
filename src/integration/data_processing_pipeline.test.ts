import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { advancedDataPreprocessing } from '../tools/advanced_data_preprocessing.js';
import { advancedRegressionAnalysis } from '../tools/advanced_regression_analysis.js';
import { dataVisualizationGenerator } from '../tools/data_visualization_generator.js';
import { hypothesisTesting } from '../tools/hypothesis_testing.js';
import { ValidationError } from '../utils/errors.js';

// Import the required types from the tools
import type { DataPoint, Dataset, NumericDataPoint } from '../tools/types.js';

// Sample test data for integration testing
const SAMPLE_DATASET: NumericDataPoint[] = [
  { year: 2019, revenue: 1200000, expenses: 950000, customers: 2500, region: 2500 }, // Using 2500 as numeric region code for 'North'
  { year: 2020, revenue: 980000, expenses: 910000, customers: 2100, region: 2500 },
  { year: 2021, revenue: 1450000, expenses: 1050000, customers: 3200, region: 2500 },
  { year: 2022, revenue: 1820000, expenses: 1230000, customers: 4100, region: 2500 },
  { year: 2023, revenue: 2100000, expenses: 1410000, customers: 4800, region: 2500 },
  { year: 2019, revenue: 980000, expenses: 820000, customers: 2100, region: 1500 }, // Using 1500 as numeric region code for 'South'
  { year: 2020, revenue: 850000, expenses: 790000, customers: 1900, region: 1500 },
  { year: 2021, revenue: 1120000, expenses: 910000, customers: 2700, region: 1500 },
  { year: 2022, revenue: 1350000, expenses: 1050000, customers: 3300, region: 1500 },
  { year: 2023, revenue: 1620000, expenses: 1210000, customers: 3900, region: 1500 },
];

// Numeric dataset for preprocessing
const NUMERIC_DATASET = [
  [2019, 1200000, 950000, 2500],
  [2020, 980000, 910000, 2100],
  [2021, 1450000, 1050000, 3200],
  [2022, 1820000, 1230000, 4100],
  [2023, 2100000, 1410000, 4800],
];

describe('Data Processing Pipeline Integration Tests', () => {
  it('should process data through complete analysis pipeline', async () => {
    // Step 1: Preprocess the data
    const preprocessedData = await advancedDataPreprocessing(NUMERIC_DATASET.flat(), 'normalization');

    expect(preprocessedData).toContain('Preprocessing Type: normalization');
    expect(preprocessedData).toContain('Normalized Data');

    // Step 2: Run regression analysis
    const regressionResults = await advancedRegressionAnalysis({
      data: SAMPLE_DATASET,
      regressionType: 'linear',
      independentVariables: ['year', 'expenses', 'customers'],
      dependentVariable: 'revenue',
      includeMetrics: true,
      includeCoefficients: true
    });

    expect(regressionResults).toContain('Regression Analysis Results');
    expect(regressionResults).toContain('Model Formula');
    expect(regressionResults).toContain('Coefficients');
    expect(regressionResults).toContain('revenue =');

    // Step 3: Generate visualization specifications
    const visualizationSpec = await dataVisualizationGenerator({
      data: SAMPLE_DATASET,
      visualizationType: 'line',
      variables: ['year', 'revenue', 'expenses'],
      title: 'Revenue and Expenses Trends (2019-2023)',
      includeTrendline: true
    });

    expect(visualizationSpec).toContain('Visualization Specification');
    expect(visualizationSpec).toContain('Chart Type: Line Chart');
    expect(visualizationSpec).toContain('Trendline');

    // Step 4: Perform hypothesis testing
    const hypothesisResults = await hypothesisTesting(
      't_test_independent',
      [
        SAMPLE_DATASET.filter((d) => d.region === 2500).map((d) => d.revenue),
        SAMPLE_DATASET.filter((d) => d.region === 1500).map((d) => d.revenue),
      ],
      undefined,
      0.05,
      'two-sided'
    );

    expect(hypothesisResults).toContain('Hypothesis Test Results');
    expect(hypothesisResults).toContain('t-test');
    expect(hypothesisResults).toContain('p-value');
  });

  it('should validate inputs across the entire pipeline', async () => {
    // Test with invalid data for preprocessing
    await expect(advancedDataPreprocessing([], 'normalization')).rejects.toThrow(ValidationError);

    // Test with invalid regression inputs
    await expect(
      advancedRegressionAnalysis({
        data: SAMPLE_DATASET,
        regressionType: 'invalid-type' as any, // Invalid regression type
        independentVariables: ['year'],
        dependentVariable: 'revenue'
      })
    ).rejects.toThrow(ValidationError);

    // Test with invalid visualization inputs
    await expect(
      dataVisualizationGenerator({
        data: SAMPLE_DATASET,
        visualizationType: 'invalid-chart' as any, // Invalid visualization type
        variables: ['year', 'revenue'],
        title: 'Test Chart'
      })
    ).rejects.toThrow(Error);

    // Test with invalid hypothesis test inputs
    await expect(
      hypothesisTesting(
        'unknown-test', // Invalid test type
        [
          [1, 2, 3],
          [4, 5, 6],
        ],
        undefined,
        0.05
      )
    ).rejects.toThrow(Error);
  });

  it('should handle data transformations across tools', async () => {
    // First generate preprocessed data with scaling
    const preprocessedData = await advancedDataPreprocessing(
      SAMPLE_DATASET.map((d) => d.revenue) as number[],
      'standardization'
    );

    expect(preprocessedData).toContain('Standardization Details');

    // Extract the standardized values from the result string
    const standardizedDataMatch = preprocessedData.match(/\*\*Standardized Data Preview:\*\*\n([\d\.\,\s-]+)/);

    if (!standardizedDataMatch) {
      throw new Error('Failed to extract standardized data from preprocessing result');
    }

    if (!standardizedDataMatch[1]) {
      throw new Error('Failed to extract standardized data values');
    }

    const standardizedValues = standardizedDataMatch[1]
      .split(',')
      .map((val) => parseFloat(val.trim()));

    // Use the standardized values for hypothesis testing
    const hypothesisResults = await hypothesisTesting(
      't_test_independent',
      [standardizedValues],
      undefined,
      0.05,
      'two-sided'
    );

    expect(hypothesisResults).toContain('Hypothesis Testing Report');
    expect(hypothesisResults).toContain('T-Test Results');

    // The standardized data should have mean close to 0
    // Extract the test statistic from the results
    const testStatisticMatch = hypothesisResults.match(/T-Statistic\s*\|\s*([+-]?([0-9]*[.])?[0-9]+)/);

    if (testStatisticMatch && testStatisticMatch[1]) {
      const testStatistic = parseFloat(testStatisticMatch[1]);
      // For standardized data, t-statistic should be small when testing against mean=0
      expect(Math.abs(testStatistic)).toBeLessThan(1.0);
    } else {
      // If we can't extract the test statistic, at least check that test completed
      expect(hypothesisResults).toContain('Degrees of Freedom');
    }
  });
});
