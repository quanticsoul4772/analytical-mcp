import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { advancedDataPreprocessing } from '../tools/advanced_data_preprocessing.js';
import { advancedRegressionAnalysis } from '../tools/advanced_regression_analysis.js';
import { dataVisualizationGenerator } from '../tools/data_visualization_generator.js';
import { hypothesisTesting } from '../tools/hypothesis_testing.js';
import { ValidationError } from '../utils/errors.js';

// Import the required types from the tools
import type { DataPoint, Dataset, NumericDataPoint } from '../tools/types.js';

// Sample test data for integration testing.
// Revenue and expenses are expressed in thousands of dollars; region is a numeric
// code (2500 = 'North', 1500 = 'South'). The predictors used for regression
// (year, expenses, customers) are kept on a comparable scale and given genuine
// independent variation so the OLS design matrix is well-conditioned rather than
// collinear (customers is not a linear function of year and expenses).
const SAMPLE_DATASET: NumericDataPoint[] = [
  { year: 2019, revenue: 1200, expenses: 950, customers: 2500, region: 2500 },
  { year: 2020, revenue: 980, expenses: 910, customers: 3100, region: 2500 },
  { year: 2021, revenue: 1450, expenses: 1050, customers: 2800, region: 2500 },
  { year: 2022, revenue: 1820, expenses: 1230, customers: 4100, region: 2500 },
  { year: 2023, revenue: 2100, expenses: 1410, customers: 3600, region: 2500 },
  { year: 2019, revenue: 980, expenses: 820, customers: 3300, region: 1500 },
  { year: 2020, revenue: 850, expenses: 790, customers: 1900, region: 1500 },
  { year: 2021, revenue: 1120, expenses: 910, customers: 4200, region: 1500 },
  { year: 2022, revenue: 1350, expenses: 1050, customers: 2200, region: 1500 },
  { year: 2023, revenue: 1620, expenses: 1210, customers: 3900, region: 1500 },
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
    expect(regressionResults).toContain('Multiple Linear Regression');
    expect(regressionResults).toContain('Dependent Variable: revenue');
    expect(regressionResults).toContain('**Linear Equation:**');
    expect(regressionResults).toContain('Coefficients');

    // Step 3: Generate visualization specifications.
    // A scatter plot is used because the trendline feature (includeTrendline) is
    // only rendered for scatter plots; it adds a Vega-Lite regression layer.
    const visualizationSpec = await dataVisualizationGenerator({
      data: SAMPLE_DATASET,
      visualizationType: 'scatter',
      variables: ['year', 'revenue', 'expenses'],
      title: 'Revenue and Expenses Trends (2019-2023)',
      includeTrendline: true
    });

    expect(visualizationSpec).toContain('Visualization Specification');
    expect(visualizationSpec).toContain('Scatter Plot');
    // includeTrendline adds a regression (trendline) layer to the Vega-Lite spec;
    // assert on the spec directly rather than prose, so this verifies the actual
    // trendline is emitted (the regression transform over the x/y variables).
    expect(visualizationSpec).toContain('"regression"');
    expect(visualizationSpec).toContain('firebrick');

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

    expect(hypothesisResults).toContain('Independent T-Test Results (Welch)');
    expect(hypothesisResults).toContain('P-Value');
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

    // An independent t-test needs two groups; a single group must be rejected
    await expect(
      hypothesisTesting('t_test_independent', [standardizedValues], undefined, 0.05, 'two-sided')
    ).rejects.toThrow(ValidationError);

    // Split the standardized values into two halves for a valid comparison
    const midpoint = Math.floor(standardizedValues.length / 2);
    const hypothesisResults = await hypothesisTesting(
      't_test_independent',
      [standardizedValues.slice(0, midpoint), standardizedValues.slice(midpoint)],
      undefined,
      0.05,
      'two-sided'
    );

    expect(hypothesisResults).toContain('Independent T-Test Results (Welch)');
    expect(hypothesisResults).toContain('Degrees of Freedom');

    // Standardization is an affine transform (subtract the mean, divide by the
    // standard deviation) applied uniformly to every value, so the two-sample
    // Welch t-statistic is invariant to it. Running the same test on the raw
    // revenue halves must therefore reproduce the same t-statistic as the
    // standardized halves — this is the correct behavior for the transformation,
    // not the (incorrect) expectation that standardizing shrinks the statistic.
    const rawRevenue = SAMPLE_DATASET.map((d) => d.revenue);
    const rawResults = await hypothesisTesting(
      't_test_independent',
      [rawRevenue.slice(0, midpoint), rawRevenue.slice(midpoint)],
      undefined,
      0.05,
      'two-sided'
    );

    const extractTStatistic = (report: string): number => {
      const match = report.match(/T-Statistic\s*\|\s*([+-]?([0-9]*[.])?[0-9]+)/);
      if (!match || !match[1]) {
        throw new Error('Failed to extract T-Statistic from hypothesis testing report');
      }
      return parseFloat(match[1]);
    };

    const standardizedTStatistic = extractTStatistic(hypothesisResults);
    const rawTStatistic = extractTStatistic(rawResults);

    // Equal to 3 decimals (the standardized values are read back from a 4-decimal
    // preview, so a tiny rounding difference is expected but the invariance holds).
    expect(standardizedTStatistic).toBeCloseTo(rawTStatistic, 3);
  });
});
