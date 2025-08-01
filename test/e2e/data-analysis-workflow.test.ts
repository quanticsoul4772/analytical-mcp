import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { sampleDatasets } from '../fixtures/sample-data.js';
import { expectWithTimeout } from '../helpers/test-utils.js';

// Mock external dependencies for E2E tests
jest.mock('../../src/utils/logger.js', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('End-to-End Data Analysis Workflow', () => {
  let analyzeDataset: any;
  let advancedRegressionAnalysis: any;
  let dataVisualizationGenerator: any;
  let hypothesisTesting: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import actual implementations for E2E testing
    const analyzeModule = await import('../../src/tools/analyze_dataset.js');
    const regressionModule = await import('../../src/tools/advanced_regression_analysis.js');
    const visualizationModule = await import('../../src/tools/data_visualization_generator.js');
    const hypothesisModule = await import('../../src/tools/hypothesis_testing.js');
    
    analyzeDataset = analyzeModule.analyzeDataset;
    advancedRegressionAnalysis = regressionModule.advancedRegressionAnalysis;
    dataVisualizationGenerator = visualizationModule.dataVisualizationGenerator;
    hypothesisTesting = hypothesisModule.hypothesisTesting;
  });

  it('should complete a full statistical analysis workflow', async () => {
    const testData = sampleDatasets.simple.data;
    
    // Step 1: Basic dataset analysis
    const analysisResult = await expectWithTimeout(async () => {
      return await analyzeDataset({
        data: testData,
        analysisType: 'comprehensive',
        includeDescriptive: true,
        includeCorrelation: true,
      });
    });

    expect(analysisResult).toMatchObject({
      summary: expect.any(String),
      statistics: expect.objectContaining({
        count: testData.length,
        mean: expect.any(Object),
      }),
    });

    // Step 2: Advanced regression analysis
    const regressionResult = await expectWithTimeout(async () => {
      return await advancedRegressionAnalysis({
        data: testData.map(d => ({ x: d.x, y: d.y })),
        dependentVariable: 'y',
        independentVariables: ['x'],
        analysisType: 'linear',
        includeResidualAnalysis: true,
        confidenceLevel: 0.95,
      });
    });

    expect(regressionResult).toMatchObject({
      modelType: 'linear',
      coefficients: expect.any(Object),
      statistics: expect.objectContaining({
        rSquared: expect.any(Number),
        adjustedRSquared: expect.any(Number),
      }),
    });

    // Step 3: Generate visualizations
    const visualizationResult = await expectWithTimeout(async () => {
      return await dataVisualizationGenerator({
        data: testData,
        chartType: 'scatter',
        xAxis: 'x',
        yAxis: 'y',
        title: 'E2E Test Scatter Plot',
        includeRegression: true,
      });
    });

    expect(visualizationResult).toMatchObject({
      chartType: 'scatter',
      specification: expect.any(Object),
      insights: expect.any(String),
    });

    // Step 4: Hypothesis testing
    const hypothesisResult = await expectWithTimeout(async () => {
      return await hypothesisTesting({
        data: testData,
        testType: 'correlation',
        variables: ['x', 'y'],
        alpha: 0.05,
        hypothesis: 'There is a significant correlation between x and y',
      });
    });

    expect(hypothesisResult).toMatchObject({
      testType: 'correlation',
      result: expect.objectContaining({
        statistic: expect.any(Number),
        pValue: expect.any(Number),
        significant: expect.any(Boolean),
      }),
    });
  }, 30000);

  it('should handle complex multivariate analysis workflow', async () => {
    const complexData = sampleDatasets.complex.data;
    
    // Step 1: Analyze complex dataset
    const analysisResult = await expectWithTimeout(async () => {
      return await analyzeDataset({
        data: complexData,
        analysisType: 'comprehensive',
        includeDescriptive: true,
        groupBy: 'metadata.source',
      });
    });

    expect(analysisResult).toMatchObject({
      summary: expect.any(String),
      statistics: expect.any(Object),
      groupAnalysis: expect.any(Object),
    });

    // Step 2: Time series or trend analysis
    const timeSeriesData = complexData.map(d => ({
      timestamp: d.timestamp,
      value: d.value,
    }));

    const trendResult = await expectWithTimeout(async () => {
      return await advancedRegressionAnalysis({
        data: timeSeriesData,
        dependentVariable: 'value',
        independentVariables: ['timestamp'],
        analysisType: 'polynomial',
        polynomialDegree: 2,
      });
    });

    expect(trendResult).toMatchObject({
      modelType: 'polynomial',
      coefficients: expect.any(Object),
    });

    // Step 3: Generate comprehensive visualization
    const multiVizResult = await expectWithTimeout(async () => {
      return await dataVisualizationGenerator({
        data: complexData,
        chartType: 'line',
        xAxis: 'timestamp',
        yAxis: 'value',
        colorBy: 'metadata.source',
        title: 'Complex Data Analysis',
        includeTrendline: true,
      });
    });

    expect(multiVizResult).toMatchObject({
      chartType: 'line',
      specification: expect.any(Object),
    });
  }, 45000);

  it('should handle workflow with missing or invalid data gracefully', async () => {
    // Test with empty dataset
    const emptyResult = await expectWithTimeout(async () => {
      return await analyzeDataset({
        data: [],
        analysisType: 'descriptive',
      });
    });

    expect(emptyResult).toMatchObject({
      summary: expect.stringContaining('empty'),
      statistics: expect.any(Object),
    });

    // Test with invalid data structure
    const invalidData = [
      { invalid: 'structure' },
      { different: 'fields' },
    ];

    const invalidResult = await expectWithTimeout(async () => {
      return await analyzeDataset({
        data: invalidData,
        analysisType: 'descriptive',
      });
    });

    expect(invalidResult).toMatchObject({
      summary: expect.any(String),
      warnings: expect.arrayContaining([
        expect.stringContaining('inconsistent'),
      ]),
    });
  }, 20000);

  it('should maintain data integrity throughout workflow', async () => {
    const originalData = JSON.parse(JSON.stringify(sampleDatasets.simple.data));
    
    // Run multiple analysis steps
    await analyzeDataset({
      data: originalData,
      analysisType: 'comprehensive',
    });

    await advancedRegressionAnalysis({
      data: originalData.map(d => ({ x: d.x, y: d.y })),
      dependentVariable: 'y',
      independentVariables: ['x'],
      analysisType: 'linear',
    });

    // Verify original data hasn't been mutated
    expect(originalData).toEqual(sampleDatasets.simple.data);
  });

  it('should provide consistent results across multiple runs', async () => {
    const testData = sampleDatasets.regression.linear;
    
    const results = await Promise.all([
      advancedRegressionAnalysis({
        data: testData.x.map((x, i) => ({ x, y: testData.y[i] })),
        dependentVariable: 'y',
        independentVariables: ['x'],
        analysisType: 'linear',
      }),
      advancedRegressionAnalysis({
        data: testData.x.map((x, i) => ({ x, y: testData.y[i] })),
        dependentVariable: 'y',
        independentVariables: ['x'],
        analysisType: 'linear',
      }),
    ]);

    // Results should be identical (deterministic)
    expect(results[0]).toEqual(results[1]);
  });
});