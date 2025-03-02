import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { advancedRegressionAnalysis } from '../advanced_regression_analysis.js';
import { ValidationError } from '../../utils/errors.js';

// Mock the Logger
jest.mock('../../utils/logger.js', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

// Sample data for testing - moved outside to reduce arrow function size
const sampleData = [
  { x: 1, y: 2, z: 3 },
  { x: 2, y: 4, z: 5 },
  { x: 3, y: 5, z: 7 },
  { x: 4, y: 4, z: 9 },
  { x: 5, y: 5, z: 11 },
];

// Main test suite
describe('Advanced Regression Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
});

// Basic regression tests - moved outside to reduce arrow function size
describe('Basic Regression Tests', () => {
  it('should perform linear regression analysis', async () => {
    const result = await advancedRegressionAnalysis(sampleData, 'linear', ['x'], 'y');
    expect(result).toContain('Regression Analysis Results');
    expect(result).toContain('Linear Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Fit Statistics');
  });

  it('should perform multiple regression analysis', async () => {
    const result = await advancedRegressionAnalysis(sampleData, 'linear', ['x', 'z'], 'y');
    expect(result).toContain('Regression Analysis Results');
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
    const result = await advancedRegressionAnalysis(sampleData, 'polynomial', ['x'], 'y', 2);
    expect(result).toContain('Regression Analysis Results');
    expect(result).toContain('Polynomial Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Degree: 2');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Fit Statistics');
  });

  it('should perform logistic regression analysis', async () => {
    const result = await advancedRegressionAnalysis(sampleData, 'logistic', ['x'], 'y');
    expect(result).toContain('Regression Analysis Results');
    expect(result).toContain('Logistic Regression');
    expect(result).toContain('Dependent Variable: y');
    expect(result).toContain('Independent Variables: x');
    expect(result).toContain('Coefficients');
    expect(result).toContain('Model Performance');
  });

  it('should handle custom options', async () => {
    const result = await advancedRegressionAnalysis(
      sampleData,
      'linear',
      ['x'],
      'y',
      undefined,
      true,
      true
    );
    expect(result).toContain('Regression Analysis Results');
    expect(result).toContain('Standardized Variables: Yes');
    expect(result).toContain('Confidence Level: 90%');
    expect(result).toContain('Test Size: 30%');
  });
});

// Data validation errors - moved outside to reduce arrow function size
describe('Data Validation Errors', () => {
  it('should throw ValidationError for empty data', async () => {
    await expect(advancedRegressionAnalysis([], 'linear', ['x'], 'y')).rejects.toThrow(
      ValidationError
    );
  });

  it('should throw ValidationError for invalid dependent variable', async () => {
    await expect(
      advancedRegressionAnalysis(sampleData, 'linear', ['x'], 'invalid')
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid independent variables', async () => {
    await expect(
      advancedRegressionAnalysis(sampleData, 'linear', ['invalid'], 'y')
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty independent variables', async () => {
    await expect(advancedRegressionAnalysis(sampleData, 'linear', [], 'y')).rejects.toThrow(
      ValidationError
    );
  });
});

// Parameter validation errors - moved outside to reduce arrow function size
describe('Parameter Validation Errors', () => {
  it('should throw ValidationError for invalid regression type', async () => {
    await expect(
      advancedRegressionAnalysis(sampleData, 'invalid' as unknown as string, ['x'], 'y')
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid polynomial degree', async () => {
    await expect(
      advancedRegressionAnalysis(sampleData, 'polynomial', ['x'], 'y', 0)
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid confidence level', async () => {
    await expect(
      advancedRegressionAnalysis(sampleData, 'linear', ['x'], 'y', undefined, true, false)
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid test size', async () => {
    await expect(
      advancedRegressionAnalysis(sampleData, 'linear', ['x'], 'y', undefined, false, true)
    ).rejects.toThrow(ValidationError);
  });
});
