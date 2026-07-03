/**
 * Logistic Regression Provider
 *
 * Handles logistic regression analysis operations.
 * Focused responsibility: Logistic regression calculations and formatting.
 */

import { ValidationError } from './errors.js';
import { ValidationHelpers } from './validation_helpers.js';
import { Logger } from './logger.js';
import { RegressionMetricsProvider } from './regression_metrics_provider.js';
import { addInterceptColumn, solveLinearSystem } from './linear_regression_provider.js';

// Numerical constants for IRLS fitting
const IRLS_MAX_ITERATIONS = 100;
const IRLS_CONVERGENCE_TOLERANCE = 1e-8;
const IRLS_RIDGE = 1e-8;
const PROBABILITY_EPSILON = 1e-10;
const LOGIT_CLIP = 35;

interface LogisticFit {
  coefficients: number[];
  probabilities: number[];
}

/**
 * LogisticRegressionProvider - Focused class for logistic regression operations
 */
export class LogisticRegressionProvider {
  private metricsProvider: RegressionMetricsProvider;

  constructor() {
    this.metricsProvider = new RegressionMetricsProvider();
  }

  /**
   * Validates logistic regression inputs
   */
  private validateLogisticRegressionInputs(
    X: number[][],
    y: number[],
    featureNames: string[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));
  }

  /**
   * Validates that the dependent variable is binary (0/1) with both classes present
   */
  private validateBinaryOutcome(y: number[]): void {
    if (!y.every((value) => value === 0 || value === 1)) {
      throw new ValidationError(
        'ERR_1001',
        'Logistic regression requires a binary dependent variable with values 0 and 1.'
      );
    }
    const positives = y.filter((value) => value === 1).length;
    if (positives === 0 || positives === y.length) {
      throw new ValidationError(
        'ERR_1001',
        'Logistic regression requires both outcome classes (0 and 1) to be present in the data.'
      );
    }
  }

  /**
   * Numerically stable logistic (sigmoid) function with logit clipping
   */
  private sigmoid(x: number): number {
    const clipped = Math.max(-LOGIT_CLIP, Math.min(LOGIT_CLIP, x));
    return 1 / (1 + Math.exp(-clipped));
  }

  /**
   * Fits logistic regression via iteratively reweighted least squares (IRLS /
   * Newton-Raphson) with an iteration cap, convergence tolerance, and a small
   * ridge term for numerical stability (e.g. under perfect separation).
   */
  private fitLogisticRegression(X: number[][], y: number[]): LogisticFit {
    const design = addInterceptColumn(X);
    const numParams = design[0]?.length ?? 0;
    if (y.length <= numParams) {
      throw new ValidationError(
        'ERR_1001',
        `Not enough data points: fitting ${numParams} parameters requires at least ` +
          `${numParams + 1} observations, got ${y.length}.`
      );
    }

    let beta = new Array<number>(numParams).fill(0);

    const linearPredictor = (row: number[]): number =>
      row.reduce((sum, v, j) => sum + v * (beta[j] ?? 0), 0);

    for (let iteration = 0; iteration < IRLS_MAX_ITERATIONS; iteration++) {
      const probabilities = design.map((row) => this.sigmoid(linearPredictor(row)));
      const weights = probabilities.map((p) => Math.max(p * (1 - p), PROBABILITY_EPSILON));

      // XtWX with ridge regularization and Xt(y - p) gradient
      const XtWX: number[][] = Array.from({ length: numParams }, () =>
        new Array<number>(numParams).fill(0)
      );
      const gradient = new Array<number>(numParams).fill(0);
      for (let k = 0; k < design.length; k++) {
        const row = design[k] ?? [];
        const w = weights[k] ?? 0;
        const residual = (y[k] ?? 0) - (probabilities[k] ?? 0);
        for (let i = 0; i < numParams; i++) {
          gradient[i] = (gradient[i] ?? 0) + (row[i] ?? 0) * residual;
          const target = XtWX[i];
          if (!target) continue;
          for (let j = 0; j < numParams; j++) {
            target[j] = (target[j] ?? 0) + w * (row[i] ?? 0) * (row[j] ?? 0);
          }
        }
      }
      for (let j = 0; j < numParams; j++) {
        const diagRow = XtWX[j];
        if (diagRow) {
          diagRow[j] = (diagRow[j] ?? 0) + IRLS_RIDGE;
        }
      }

      const step = solveLinearSystem(XtWX, gradient);
      beta = beta.map((b, j) => b + (step[j] ?? 0));
      if (Math.max(...step.map(Math.abs)) < IRLS_CONVERGENCE_TOLERANCE) {
        break;
      }
    }

    const probabilities = design.map((row) => this.sigmoid(linearPredictor(row)));
    return { coefficients: beta, probabilities };
  }

  /**
   * Creates section mapping for logistic regression formatting
   */
  private createLogisticSectionMapping(): Record<string, (...args: any[]) => string> {
    return {
      equation: (coefficients: number[], featureNames: string[]) => {
        let result = '**Logistic Equation:**\n';
        let logit = `logit(p) = ${(coefficients[0] ?? 0).toFixed(4)}`;

        for (let i = 0; i < featureNames.length; i++) {
          const coefficient = coefficients[i + 1];
          if (coefficient !== undefined) {
            const sign = coefficient >= 0 ? '+ ' : '- ';
            logit += ` ${sign}${Math.abs(coefficient).toFixed(4)} × ${featureNames[i] ?? `X${i}`}`;
          }
        }

        result += logit + '\n';
        result += 'where p = probability of positive outcome\n\n';

        return result;
      },
      coefficients: (coefficients: number[], featureNames: string[]) => {
        return '**Coefficients:**\n\n' +
               this.metricsProvider.formatCoefficientsTable(coefficients, featureNames) + '\n';
      },
      metrics: (y: number[], predictions: number[], numFeatures: number) => {
        const metrics = this.metricsProvider.calculateLogisticRegressionMetrics(y, predictions, numFeatures);
        return '**Model Performance:**\n\n' + this.metricsProvider.formatLogisticMetricsTable(metrics);
      }
    };
  }

  /**
   * Performs logistic regression analysis on a binary dependent variable
   */
  performLogisticRegression(
    X: number[][],
    y: number[],
    featureNames: string[],
    includeCoefficients = true,
    includeMetrics = true
  ): string {
    // Apply ValidationHelpers early return patterns
    this.validateLogisticRegressionInputs(X, y, featureNames);
    this.validateBinaryOutcome(y);

    // Fit via iteratively reweighted least squares
    const { coefficients, probabilities } = this.fitLogisticRegression(X, y);

    // Build result using section mapping pattern
    const sectionMapping = this.createLogisticSectionMapping();
    let result = sectionMapping.equation?.(coefficients, featureNames) ?? '';

    if (includeCoefficients) {
      result += sectionMapping.coefficients?.(coefficients, featureNames) ?? '';
    }

    if (includeMetrics) {
      result += sectionMapping.metrics?.(y, probabilities, featureNames.length) ?? '';
    }

    Logger.debug('Logistic regression completed', {
      features: featureNames.length,
      samples: X.length
    });

    return result;
  }

  /**
   * Calculates odds ratios from coefficients
   */
  calculateOddsRatios(coefficients: number[], featureNames: string[]): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(coefficients));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    let result = '**Odds Ratios:**\n\n';
    result += '| Variable | Odds Ratio | Interpretation |\n';
    result += '|----------|------------|----------------|\n';

    // Skip intercept (first coefficient)
    for (let i = 1; i < coefficients.length && i - 1 < featureNames.length; i++) {
      const coefficient = coefficients[i] ?? 0;
      const oddsRatio = Math.exp(coefficient);
      const featureName = featureNames[i - 1] ?? `Feature${i}`;

      let interpretation: string;
      if (oddsRatio > 1.1) {
        interpretation = 'Increases odds';
      } else if (oddsRatio < 0.9) {
        interpretation = 'Decreases odds';
      } else {
        interpretation = 'Minimal effect';
      }

      result += `| ${featureName} | ${oddsRatio.toFixed(4)} | ${interpretation} |\n`;
    }

    return result + '\n';
  }

  /**
   * Validates binary target variable for logistic regression
   */
  validateBinaryTarget(y: number[]): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const uniqueValues = new Set(y);

    // Check for binary values
    if (uniqueValues.size !== 2) {
      warnings.push(`Target variable has ${uniqueValues.size} unique values, expected 2 for binary classification`);
    }

    // Check if values are 0/1 or need transformation
    const values = Array.from(uniqueValues).sort();
    if (values.length === 2 && (values[0] !== 0 || values[1] !== 1)) {
      warnings.push('Target values are not 0/1, consider transforming for better interpretation');
    }

    return {
      isValid: uniqueValues.size === 2,
      warnings
    };
  }

  /**
   * Calculates classification threshold optimization
   */
  optimizeClassificationThreshold(
    y: number[],
    predictions: number[]
  ): { optimalThreshold: number; metrics: any } {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(predictions));

    let bestThreshold = 0.5;
    let bestF1 = 0;
    const results = [];

    // Test different thresholds
    for (let threshold = 0.1; threshold <= 0.9; threshold += 0.1) {
      const binaryPredicted = predictions.map(p => p > threshold ? 1 : 0);
      const binaryActual = y.map(a => a > 0.5 ? 1 : 0);

      // Calculate F1 score
      const tp = binaryActual.reduce((sum, actual, i) =>
        sum + (actual === 1 && binaryPredicted[i] === 1 ? 1 : 0), 0);
      const fp = binaryActual.reduce((sum, actual, i) =>
        sum + (actual === 0 && binaryPredicted[i] === 1 ? 1 : 0), 0);
      const fn = binaryActual.reduce((sum, actual, i) =>
        sum + (actual === 1 && binaryPredicted[i] === 0 ? 1 : 0), 0);

      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      results.push({ threshold, f1Score, precision, recall });

      if (f1Score > bestF1) {
        bestF1 = f1Score;
        bestThreshold = threshold;
      }
    }

    Logger.debug('Classification threshold optimization completed', {
      optimalThreshold: bestThreshold,
      bestF1
    });

    return {
      optimalThreshold: bestThreshold,
      metrics: results.find(r => r.threshold === bestThreshold)
    };
  }
}
