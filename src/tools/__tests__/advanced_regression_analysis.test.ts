import { describe, it, expect } from '@jest/globals';
import { advancedRegressionAnalysis } from '../advanced_regression_analysis.js';
import { ValidationError, DataProcessingError } from '../../utils/errors.js';

// Sample data for testing - moved outside to reduce arrow function size.
// Note: z is deliberately NOT a linear function of x, otherwise the multiple
// regression design matrix would be singular.
const sampleData = [
  { x: 1, y: 2, z: 3 },
  { x: 2, y: 4, z: 5 },
  { x: 3, y: 5, z: 4 },
  { x: 4, y: 4, z: 9 },
  { x: 5, y: 5, z: 7 },
];

// Perfectly linear data: y = 2x + 1
const exactLinearData = [1, 2, 3, 4, 5].map((x) => ({ x, y: 2 * x + 1 }));

// Multivariate exact relationship: y = 1 + 2a + 3b (a and b not collinear)
const exactMultivariateData = [
  { a: 1, b: 2 },
  { a: 2, b: 1 },
  { a: 3, b: 4 },
  { a: 4, b: 3 },
  { a: 5, b: 6 },
  { a: 0, b: 1 },
].map((point) => ({ ...point, y: 1 + 2 * point.a + 3 * point.b }));

// Quadratic relationship: y = 1 + 2x + 3x^2
const exactQuadraticData = [-2, -1, 0, 1, 2, 3].map((x) => ({ x, y: 1 + 2 * x + 3 * x * x }));

// Linearly separable binary outcome
const separableLogisticData = [
  { x: -3, y: 0 },
  { x: -2, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
];

// Collinear predictors: x2 = 2 * x1
const collinearData = [1, 2, 3, 4, 5, 6].map((x) => ({ x1: x, x2: 2 * x, y: x + 1 }));

// Basic regression tests - moved outside to reduce arrow function size
describe('Basic Regression Tests', () => {
  it('should perform linear regression analysis', async () => {
    const result = await advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y'
    });
    expect(result).toContain('Linear Equation:');
    expect(result).toContain('linear regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Fit Statistics');
  });

  it('should perform multiple regression analysis', async () => {
    const result = await advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x', 'z'],
      dependentVariable: 'y'
    });
    expect(result).toContain('Linear Equation:');
    expect(result).toContain('Multiple Linear Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x, z');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Fit Statistics');
  });
});

// Numeric correctness tests for the real regression mathematics
describe('Numeric Correctness', () => {
  it('should recover slope 2 and intercept 1 with R² = 1 for y = 2x + 1', async () => {
    const result = await advancedRegressionAnalysis({
      data: exactLinearData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y'
    });
    expect(result).toContain('y = 1.0000 + 2.0000 × x');
    expect(result).toContain('| Intercept | 1.0000 |');
    expect(result).toContain('| x | 2.0000 |');
    expect(result).toContain('| R² | 1.0000 |');
    expect(result).toContain('| Adjusted R² | 1.0000 |');
    expect(result).toContain('| MSE | 0.0000 |');
    expect(result).toContain('| RMSE | 0.0000 |');
    expect(result).toContain('| MAE | 0.0000 |');
  });

  it('should match hand-computed OLS values for an imperfect fit', async () => {
    // x = 1..5, y = 2,4,5,4,5:
    // slope = Sxy/Sxx = 6/10 = 0.6, intercept = 4 - 0.6*3 = 2.2
    // ssRes = 2.4, ssTot = 6 => R² = 0.6, adjusted = 1 - 0.4*4/3 = 0.4667
    // MSE = 0.48, RMSE = 0.6928, MAE = 0.64, F = 3.6 / (2.4/3) = 4.5
    const result = await advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y'
    });
    expect(result).toContain('y = 2.2000 + 0.6000 × x');
    expect(result).toContain('| R² | 0.6000 |');
    expect(result).toContain('| Adjusted R² | 0.4667 |');
    expect(result).toContain('| MSE | 0.4800 |');
    expect(result).toContain('| RMSE | 0.6928 |');
    expect(result).toContain('| MAE | 0.6400 |');
    expect(result).toContain('| F-statistic | 4.5000 |');
  });

  it('should exactly recover multivariate coefficients for y = 1 + 2a + 3b', async () => {
    const result = await advancedRegressionAnalysis({
      data: exactMultivariateData,
      regressionType: 'multivariate',
      independentVariables: ['a', 'b'],
      dependentVariable: 'y'
    });
    expect(result).toContain('y = 1.0000 + 2.0000 × a + 3.0000 × b');
    expect(result).toContain('| Intercept | 1.0000 |');
    expect(result).toContain('| a | 2.0000 |');
    expect(result).toContain('| b | 3.0000 |');
    expect(result).toContain('| R² | 1.0000 |');
    expect(result).toContain('Correlation Matrix:');
  });

  it('should exactly recover quadratic coefficients for y = 1 + 2x + 3x²', async () => {
    const result = await advancedRegressionAnalysis({
      data: exactQuadraticData,
      regressionType: 'polynomial',
      independentVariables: ['x'],
      dependentVariable: 'y',
      polynomialDegree: 2
    });
    expect(result).toContain('y = 1.0000 + 2.0000 × x^1 + 3.0000 × x^2');
    expect(result).toContain('| Intercept | 1.0000 |');
    expect(result).toContain('| x | 2.0000 |');
    expect(result).toContain('| x^2 | 3.0000 |');
    expect(result).toContain('| R² | 1.0000 |');
  });

  it('should reach accuracy 1.0 on linearly separable logistic data', async () => {
    const result = await advancedRegressionAnalysis({
      data: separableLogisticData,
      regressionType: 'logistic',
      independentVariables: ['x'],
      dependentVariable: 'y'
    });
    expect(result).toContain('Logistic Equation:');
    expect(result).toContain('| Accuracy | 1.0000 |');
    expect(result).toContain('| Precision | 1.0000 |');
    expect(result).toContain('| Recall | 1.0000 |');
    expect(result).toContain('| F1-Score | 1.0000 |');
    expect(result).toContain('| AUC | 1.0000 |');
  });

  it('should report a collinearity error for linearly dependent predictors', async () => {
    await expect(advancedRegressionAnalysis({
      data: collinearData,
      regressionType: 'linear',
      independentVariables: ['x1', 'x2'],
      dependentVariable: 'y'
    })).rejects.toThrow(DataProcessingError);

    await expect(advancedRegressionAnalysis({
      data: collinearData,
      regressionType: 'linear',
      independentVariables: ['x1', 'x2'],
      dependentVariable: 'y'
    })).rejects.toThrow(/collinear/i);
  });

  it('should require at least k+2 observations for k predictors', async () => {
    await expect(advancedRegressionAnalysis({
      data: exactLinearData.slice(0, 2),
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y'
    })).rejects.toThrow(/Not enough data points/);
  });
});

// Advanced regression tests - moved outside to reduce arrow function size
describe('Advanced Regression Tests', () => {
  it('should perform polynomial regression analysis', async () => {
    const result = await advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'polynomial',
      independentVariables: ['x'],
      dependentVariable: 'y',
      polynomialDegree: 2
    });
    expect(result).toContain('Polynomial Equation:');
    expect(result).toContain('Polynomial Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Degree: 2');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Fit Statistics');
  });

  it('should perform logistic regression analysis', async () => {
    const result = await advancedRegressionAnalysis({
      data: separableLogisticData,
      regressionType: 'logistic',
      independentVariables: ['x'],
      dependentVariable: 'y'
    });
    expect(result).toContain('Logistic Equation:');
    expect(result).toContain('Logistic Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Performance');
  });

  it('should reject a non-binary dependent variable for logistic regression', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'logistic',
      independentVariables: ['x'],
      dependentVariable: 'y'
    })).rejects.toThrow(/binary dependent variable/);
  });

  it('should handle custom options', async () => {
    const result = await advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y',
      standardizeVariables: true,
      useConfidenceInterval: true,
      useTestSplit: true
    });
    expect(result).toContain('Linear Equation:');
    expect(result).toContain('Standardized Variables: Yes');
    expect(result).toContain('Confidence Level: 90%');
    expect(result).toContain('Test Size: 30%');
    // With z-scored x the intercept equals mean(y) = 4 and the slope is in
    // standard-deviation units: 0.6 * sqrt(2) = 0.8485
    expect(result).toContain('y = 4.0000 + 0.8485 × x');
  });
});

// Data validation errors - moved outside to reduce arrow function size
describe('Data Validation Errors', () => {
  it('should throw ValidationError for empty data', async () => {
    await expect(advancedRegressionAnalysis({
      data: [],
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y'
    })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid dependent variable', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'invalid'
    })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid independent variables', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['invalid'],
      dependentVariable: 'y'
    })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty independent variables', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: [],
      dependentVariable: 'y'
    })).rejects.toThrow(ValidationError);
  });
});

// Parameter validation errors - moved outside to reduce arrow function size
describe('Parameter Validation Errors', () => {
  it('should throw ValidationError for invalid regression type', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'invalid' as any,
      independentVariables: ['x'],
      dependentVariable: 'y'
    })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid polynomial degree', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'polynomial',
      independentVariables: ['x'],
      dependentVariable: 'y',
      polynomialDegree: 0
    })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid confidence level', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y',
      useConfidenceInterval: true,
      useTestSplit: false
    })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid test size', async () => {
    await expect(advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y',
      useConfidenceInterval: false,
      useTestSplit: true
    })).rejects.toThrow(ValidationError);
  });
});
