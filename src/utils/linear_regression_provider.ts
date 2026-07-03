/**
 * Linear Regression Provider
 *
 * Handles linear regression analysis operations.
 * Focused responsibility: Linear regression calculations and formatting.
 *
 * Also exports the shared ordinary-least-squares numerical core (Gaussian
 * elimination with partial pivoting, collinearity detection) reused by the
 * polynomial, logistic, and multivariate regression providers.
 */

import { ValidationError, DataProcessingError } from './errors.js';
import { ValidationHelpers } from './validation_helpers.js';
import { Logger } from './logger.js';
import { RegressionMetricsProvider } from './regression_metrics_provider.js';

// Numerical constants shared by the regression providers
export const SINGULARITY_TOLERANCE = 1e-10;

export interface OlsFit {
  coefficients: number[];
  predictions: number[];
}

/**
 * Prepends an intercept column of ones to the feature matrix
 */
export function addInterceptColumn(X: number[][]): number[][] {
  return X.map((row) => [1, ...row]);
}

/**
 * Solves the linear system Ax = b via Gaussian elimination with partial pivoting.
 * Throws DataProcessingError when the matrix is singular (e.g. collinear inputs).
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  const scale = Math.max(1e-300, ...A.map((row) => Math.max(...row.map(Math.abs))));

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]?.[col] ?? 0) > Math.abs(M[pivotRow]?.[col] ?? 0)) {
        pivotRow = r;
      }
    }
    const pivot = M[pivotRow]?.[col] ?? 0;
    if (Math.abs(pivot) < scale * SINGULARITY_TOLERANCE) {
      throw new DataProcessingError(
        'ERR_3001',
        'Design matrix is singular or nearly singular. The independent variables are collinear ' +
          '(linearly dependent); remove redundant predictors and try again.'
      );
    }
    const tmp = M[col] ?? [];
    M[col] = M[pivotRow] ?? [];
    M[pivotRow] = tmp;
    for (let r = col + 1; r < n; r++) {
      const factor = (M[r]?.[col] ?? 0) / (M[col]?.[col] ?? 1);
      for (let c = col; c <= n; c++) {
        const targetRow = M[r];
        if (targetRow) {
          targetRow[c] = (targetRow[c] ?? 0) - factor * (M[col]?.[c] ?? 0);
        }
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i]?.[n] ?? 0;
    for (let j = i + 1; j < n; j++) {
      sum -= (M[i]?.[j] ?? 0) * (x[j] ?? 0);
    }
    x[i] = sum / (M[i]?.[i] ?? 1);
  }
  return x;
}

/**
 * Multiplies the transpose of the design matrix with another matrix: X' * B
 */
function transposeMultiplyMatrix(X: number[][], B: number[][]): number[][] {
  const rows = X[0]?.length ?? 0;
  const cols = B[0]?.length ?? 0;
  const result: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let k = 0; k < X.length; k++) {
    const xRow = X[k] ?? [];
    const bRow = B[k] ?? [];
    for (let i = 0; i < rows; i++) {
      const xVal = xRow[i] ?? 0;
      const target = result[i];
      if (xVal === 0 || !target) continue;
      for (let j = 0; j < cols; j++) {
        target[j] = (target[j] ?? 0) + xVal * (bRow[j] ?? 0);
      }
    }
  }
  return result;
}

/**
 * Multiplies the transpose of the design matrix with a vector: X' * v
 */
function transposeMultiplyVector(X: number[][], v: number[]): number[] {
  const rows = X[0]?.length ?? 0;
  const result = new Array<number>(rows).fill(0);
  for (let k = 0; k < X.length; k++) {
    const xRow = X[k] ?? [];
    const vVal = v[k] ?? 0;
    for (let i = 0; i < rows; i++) {
      result[i] = (result[i] ?? 0) + (xRow[i] ?? 0) * vVal;
    }
  }
  return result;
}

/**
 * Ordinary least squares via the normal equations: beta = (X'X)^-1 X'y.
 * The returned coefficient vector starts with the intercept.
 */
export function fitOls(X: number[][], y: number[]): OlsFit {
  const design = addInterceptColumn(X);
  const numParams = design[0]?.length ?? 0;
  if (y.length <= numParams) {
    throw new ValidationError(
      'ERR_1001',
      `Not enough data points: fitting ${numParams} parameters requires at least ` +
        `${numParams + 1} observations, got ${y.length}.`
    );
  }

  const XtX = transposeMultiplyMatrix(design, design);
  const Xty = transposeMultiplyVector(design, y);
  const coefficients = solveLinearSystem(XtX, Xty);

  const predictions = design.map((row) =>
    row.reduce((sum, v, idx) => sum + v * (coefficients[idx] ?? 0), 0)
  );
  return { coefficients, predictions };
}

/**
 * LinearRegressionProvider - Focused class for linear regression operations
 */
export class LinearRegressionProvider {
  private metricsProvider: RegressionMetricsProvider;

  constructor() {
    this.metricsProvider = new RegressionMetricsProvider();
  }

  /**
   * Validates linear regression inputs
   */
  private validateLinearRegressionInputs(
    X: number[][],
    y: number[],
    featureNames: string[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));
  }

  /**
   * Creates section mapping for linear regression formatting
   */
  private createLinearRegressionSectionMapping(): Record<
    string,
    (...args: any[]) => string
  > {
    return {
      equation: (coefficients: number[], featureNames: string[]) => {
        return '**Linear Equation:**\n' + this.formatLinearEquation(coefficients, featureNames) + '\n\n';
      },
      coefficients: (coefficients: number[], featureNames: string[]) => {
        return '**Coefficients:**\n\n' +
               this.metricsProvider.formatCoefficientsTable(coefficients, featureNames) + '\n';
      },
      metrics: (y: number[], predictions: number[], numFeatures: number) => {
        const metrics = this.metricsProvider.calculateRegressionMetrics(y, predictions, numFeatures);
        return '**Model Fit Statistics:**\n\n' + this.metricsProvider.formatMetricsTable(metrics);
      }
    };
  }

  /**
   * Performs linear regression analysis via ordinary least squares
   */
  performLinearRegression(
    X: number[][],
    y: number[],
    featureNames: string[],
    includeCoefficients = true,
    includeMetrics = true
  ): string {
    // Apply ValidationHelpers early return patterns
    this.validateLinearRegressionInputs(X, y, featureNames);

    // Fit via ordinary least squares (normal equations + Gaussian elimination)
    const { coefficients, predictions } = fitOls(X, y);

    // Build result using section mapping pattern
    const sectionMapping = this.createLinearRegressionSectionMapping();
    let result = sectionMapping.equation?.(coefficients, featureNames) ?? '';

    if (includeCoefficients) {
      result += sectionMapping.coefficients?.(coefficients, featureNames) ?? '';
    }

    if (includeMetrics) {
      result += sectionMapping.metrics?.(y, predictions, featureNames.length) ?? '';
    }

    Logger.debug('Linear regression completed', {
      features: featureNames.length,
      samples: X.length
    });

    return result;
  }

  /**
   * Formats linear equation from coefficients
   */
  formatLinearEquation(coefficients: number[], featureNames: string[]): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(coefficients));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    // Start with dependent variable = intercept
    let equation = `y = ${(coefficients[0] ?? 0).toFixed(4)}`;

    // Add each term
    for (let i = 0; i < featureNames.length; i++) {
      const coefficient = coefficients[i + 1];
      if (coefficient !== undefined) {
        const sign = coefficient >= 0 ? '+ ' : '- ';
        equation += ` ${sign}${Math.abs(coefficient).toFixed(4)} × ${featureNames[i] ?? `X${i}`}`;
      }
    }

    return equation;
  }

  /**
   * Validates if data is suitable for linear regression
   */
  validateLinearAssumptions(X: number[][], y: number[]): {
    valid: boolean;
    warnings: string[]
  } {
    const warnings: string[] = [];

    // Check for minimum sample size
    if (X.length < 20) {
      warnings.push('Small sample size may affect reliability of results');
    }

    // Check for missing values
    const hasNaN = X.some(row => row.some(val => isNaN(val))) || y.some(val => isNaN(val));
    if (hasNaN) {
      warnings.push('Dataset contains missing or invalid values');
    }

    // Check for constant variables
    const numFeatures = X[0]?.length ?? 0;
    for (let i = 0; i < numFeatures; i++) {
      const values = X.map(row => row[i] ?? 0);
      const unique = new Set(values);
      if (unique.size === 1) {
        warnings.push(`Feature ${i + 1} has constant values`);
      }
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}
