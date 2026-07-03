/**
 * Polynomial Regression Provider
 *
 * Handles polynomial regression analysis operations.
 * Focused responsibility: Polynomial regression calculations and formatting.
 */

import { ValidationError } from './errors.js';
import { ValidationHelpers } from './validation_helpers.js';
import { Logger } from './logger.js';
import { RegressionMetricsProvider } from './regression_metrics_provider.js';
import { fitOls, OlsFit } from './linear_regression_provider.js';

/**
 * PolynomialRegressionProvider - Focused class for polynomial regression operations
 */
export class PolynomialRegressionProvider {
  private metricsProvider: RegressionMetricsProvider;

  constructor() {
    this.metricsProvider = new RegressionMetricsProvider();
  }

  /**
   * Validates polynomial regression inputs
   */
  private validatePolynomialRegressionInputs(
    X: number[][],
    y: number[],
    featureName: string,
    degree: number
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(featureName));

    if (degree < 1) {
      throw new ValidationError('ERR_1001', 'Polynomial degree must be at least 1.');
    }
  }

  /**
   * Builds the polynomial design matrix [x, x^2, ..., x^degree] from a single
   * feature. The intercept column is added by the shared OLS core.
   */
  private buildPolynomialDesign(X: number[][], degree: number): number[][] {
    return X.map((row) => {
      const x = row[0] ?? 0;
      return Array.from({ length: degree }, (_, i) => Math.pow(x, i + 1));
    });
  }

  /**
   * Fits polynomial regression by expanding the design matrix to powers of x
   * and reusing ordinary least squares
   */
  private fitPolynomial(X: number[][], y: number[], degree: number): OlsFit {
    const polyX = this.buildPolynomialDesign(X, degree);
    return fitOls(polyX, y);
  }

  /**
   * Creates section mapping for polynomial regression formatting
   */
  private createPolynomialSectionMapping(): Record<string, (...args: any[]) => string> {
    return {
      equation: (coefficients: number[], featureName: string, degree: number) => {
        let result = '**Polynomial Equation:**\n';
        let equation = `y = ${(coefficients[0] ?? 0).toFixed(4)}`;
        for (let i = 1; i <= degree; i++) {
          const coefficient = coefficients[i];
          if (coefficient !== undefined) {
            const sign = coefficient >= 0 ? '+ ' : '- ';
            equation += ` ${sign}${Math.abs(coefficient).toFixed(4)} × ${featureName}^${i}`;
          }
        }
        return result + equation + '\n\n';
      },
      coefficients: (coefficients: number[], featureName: string, degree: number) => {
        return '**Coefficients:**\n\n' +
               this.metricsProvider.formatPolynomialCoefficients(coefficients, featureName, degree) + '\n';
      },
      metrics: (y: number[], predictions: number[], degree: number) => {
        const metrics = this.metricsProvider.calculateRegressionMetrics(y, predictions, degree);
        return '**Model Fit Statistics:**\n\n' + this.metricsProvider.formatMetricsTable(metrics);
      },
    };
  }

  /**
   * Performs polynomial regression analysis
   */
  performPolynomialRegression(
    X: number[][],
    y: number[],
    featureName: string,
    degree: number,
    includeCoefficients = true,
    includeMetrics = true
  ): string {
    // Apply ValidationHelpers early return patterns
    this.validatePolynomialRegressionInputs(X, y, featureName, degree);

    // Fit via ordinary least squares on the polynomial design matrix
    const { coefficients, predictions } = this.fitPolynomial(X, y, degree);

    // Build result using section mapping pattern
    const sectionMapping = this.createPolynomialSectionMapping();
    let result = sectionMapping.equation?.(coefficients, featureName, degree) ?? '';

    if (includeCoefficients) {
      result += sectionMapping.coefficients?.(coefficients, featureName, degree) ?? '';
    }

    if (includeMetrics) {
      result += sectionMapping.metrics?.(y, predictions, degree) ?? '';
    }

    Logger.debug('Polynomial regression completed', {
      degree,
      feature: featureName,
      samples: X.length
    });

    return result;
  }

  /**
   * Handles polynomial regression logic with validation
   */
  handlePolynomialRegression(
    X: number[][],
    y: number[],
    featureNames: string[],
    independentVariables: string[],
    polynomialDegree: number | undefined,
    includeCoefficients: boolean,
    includeMetrics: boolean
  ): string {
    if (independentVariables.length !== 1) {
      throw new ValidationError(
        'ERR_1001',
        'Polynomial regression requires exactly one independent variable.'
      );
    }

    const degree = polynomialDegree !== undefined ? polynomialDegree : 2;
    const featureName = featureNames[0] !== undefined ? featureNames[0] : 'feature1';

    return this.performPolynomialRegression(
      X,
      y,
      featureName,
      degree,
      includeCoefficients,
      includeMetrics
    );
  }

  /**
   * Transforms features for polynomial regression (includes the x^0 intercept column)
   */
  transformPolynomialFeatures(X: number[][], degree: number): number[][] {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));

    return X.map(row => {
      const transformed: number[] = [];
      for (let d = 0; d <= degree; d++) {
        transformed.push(Math.pow(row[0] ?? 0, d));
      }
      return transformed;
    });
  }

  /**
   * Searches for the polynomial degree with the best adjusted R²
   */
  findOptimalDegree(
    X: number[][],
    y: number[],
    maxDegree = 5
  ): { optimalDegree: number; scores: number[] } {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));

    const scores: number[] = [];

    for (let degree = 1; degree <= maxDegree; degree++) {
      try {
        const { predictions } = this.fitPolynomial(X, y, degree);
        const metrics = this.metricsProvider.calculateRegressionMetrics(y, predictions, degree);

        // Use adjusted R-squared for model selection
        scores.push(metrics.adjustedRSquared);
      } catch (error) {
        // Degree not fittable for this dataset (too few observations or singular design)
        scores.push(-Infinity);
      }
    }

    const optimalDegree = scores.indexOf(Math.max(...scores)) + 1;

    Logger.debug('Optimal degree search completed', {
      optimalDegree,
      maxScore: Math.max(...scores)
    });

    return { optimalDegree, scores };
  }

  /**
   * Checks for overfitting in polynomial regression
   */
  checkOverfitting(
    X: number[][],
    y: number[],
    degree: number
  ): { isOverfitted: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isOverfitted = false;

    // Check if degree is too high relative to sample size
    const sampleSize = X.length;
    const parameters = degree + 1;

    if (parameters > sampleSize / 10) {
      warnings.push('High degree relative to sample size may cause overfitting');
      isOverfitted = true;
    }

    if (degree > 6) {
      warnings.push('Very high polynomial degrees are prone to overfitting');
      isOverfitted = true;
    }

    return { isOverfitted, warnings };
  }
}
