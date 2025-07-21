import { describe, it, expect, beforeEach } from '@jest/globals';
import { advancedRegressionAnalysis, RegressionAnalysisOptions } from '../advanced_regression_analysis.js';
import { ValidationError } from '../../utils/errors.js';

// Sample data for testing - moved outside to reduce arrow function size
const sampleData = [
  { x: 1, y: 2, z: 3 },
  { x: 2, y: 4, z: 5 },
  { x: 3, y: 5, z: 7 },
  { x: 4, y: 4, z: 9 },
  { x: 5, y: 5, z: 11 },
];

// Main test suite - removed empty describe block

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
    expect(result).toContain('Linear Equation:');
    expect(result).toContain('Polynomial Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Degree: 2');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Fit Statistics');
  });

  it('should perform logistic regression analysis', async () => {
    const result = await advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'logistic',
      independentVariables: ['x'],
      dependentVariable: 'y'
    });
    expect(result).toContain('Linear Equation:');
    expect(result).toContain('Logistic Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Performance');
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
