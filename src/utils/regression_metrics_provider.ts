/**
 * Regression Metrics Provider
 *
 * Handles metrics calculation and formatting for regression analysis.
 * Focused responsibility: Metrics calculation and result formatting.
 */

import { ValidationHelpers } from './validation_helpers.js';

// Numerical constants
const PERFECT_FIT_TOLERANCE = 1e-12;
const PROBABILITY_EPSILON = 1e-10;

// Define regression metrics interface
interface RegressionMetrics {
  rSquared: number;
  adjustedRSquared: number;
  mse: number;
  rmse: number;
  mae: number;
  fStatistic?: number;
}

// Logistic regression specific metrics
interface LogisticRegressionMetrics extends RegressionMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  logLoss: number;
}

/**
 * RegressionMetricsProvider - Focused class for regression metrics calculation and formatting
 */
export class RegressionMetricsProvider {
  /**
   * Calculates standard regression metrics (R², adjusted R², MSE, RMSE, MAE,
   * F-statistic) from actual and predicted values. numVariables is the number
   * of predictor variables in the model, excluding the intercept.
   */
  calculateRegressionMetrics(
    actual: number[],
    predicted: number[],
    numVariables: number
  ): RegressionMetrics {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(actual));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(predicted));

    const n = actual.length;
    const residuals = actual.map((val, i) => val - (predicted[i] ?? 0));
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const mse = ssRes / n;
    const rmse = Math.sqrt(mse);
    const mae = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;

    const actualMean = actual.reduce((sum, val) => sum + val, 0) / n;
    const ssTot = actual.reduce((sum, val) => {
      const deviation = val - actualMean;
      return sum + deviation * deviation;
    }, 0);

    const rSquared = ssTot === 0 ? (ssRes <= PERFECT_FIT_TOLERANCE ? 1 : 0) : 1 - ssRes / ssTot;

    const p = numVariables;
    const dfResidual = n - p - 1;
    const adjustedRSquared =
      dfResidual > 0 ? 1 - ((1 - rSquared) * (n - 1)) / dfResidual : rSquared;

    const metrics: RegressionMetrics = { rSquared, adjustedRSquared, mse, rmse, mae };
    if (dfResidual > 0 && ssRes > PERFECT_FIT_TOLERANCE && ssTot > 0) {
      metrics.fStatistic = (ssTot - ssRes) / p / (ssRes / dfResidual);
    }
    return metrics;
  }

  /**
   * Computes confusion-matrix counts at a 0.5 probability threshold
   */
  private computeConfusionCounts(
    actual: number[],
    probabilities: number[]
  ): { tp: number; fp: number; tn: number; fn: number } {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    for (let i = 0; i < actual.length; i++) {
      const predicted = (probabilities[i] ?? 0) >= 0.5 ? 1 : 0;
      if (actual[i] === 1) {
        if (predicted === 1) tp++;
        else fn++;
      } else {
        if (predicted === 1) fp++;
        else tn++;
      }
    }
    return { tp, fp, tn, fn };
  }

  /**
   * Computes AUC-ROC via the Mann-Whitney U statistic (pairwise comparison)
   */
  private computeAuc(actual: number[], probabilities: number[]): number {
    let concordant = 0;
    let ties = 0;
    let pairs = 0;
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== 1) continue;
      for (let j = 0; j < actual.length; j++) {
        if (actual[j] !== 0) continue;
        pairs++;
        const pi = probabilities[i] ?? 0;
        const pj = probabilities[j] ?? 0;
        if (pi > pj) concordant++;
        else if (pi === pj) ties++;
      }
    }
    return pairs === 0 ? 0.5 : (concordant + ties / 2) / pairs;
  }

  /**
   * Calculates logistic regression performance metrics from actual binary
   * outcomes and predicted probabilities. R² values are McFadden pseudo-R²
   * when both classes are present; MSE/RMSE/MAE are Brier-score based.
   */
  calculateLogisticRegressionMetrics(
    actual: number[],
    predicted: number[],
    numVariables: number
  ): LogisticRegressionMetrics {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(actual));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(predicted));

    const n = actual.length;
    const clipped = predicted.map((p) =>
      Math.min(Math.max(p ?? 0.5, PROBABILITY_EPSILON), 1 - PROBABILITY_EPSILON)
    );

    const logLoss =
      -clipped.reduce(
        (sum, p, i) => sum + ((actual[i] ?? 0) === 1 ? Math.log(p) : Math.log(1 - p)),
        0
      ) / n;

    const { tp, fp, tn, fn } = this.computeConfusionCounts(actual, predicted);
    const accuracy = (tp + tn) / n;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    // Brier score based error metrics
    const mse =
      predicted.reduce((sum, p, i) => {
        const error = (p ?? 0) - (actual[i] ?? 0);
        return sum + error * error;
      }, 0) / n;
    const rmse = Math.sqrt(mse);
    const mae = predicted.reduce((sum, p, i) => sum + Math.abs((p ?? 0) - (actual[i] ?? 0)), 0) / n;

    // McFadden pseudo-R² (requires both outcome classes to be present)
    const logLikelihood = -logLoss * n;
    const pBar = actual.reduce((sum, value) => sum + value, 0) / n;
    let rSquared: number;
    let adjustedRSquared: number;
    if (pBar > 0 && pBar < 1) {
      const nullLogLikelihood = n * (pBar * Math.log(pBar) + (1 - pBar) * Math.log(1 - pBar));
      rSquared = 1 - logLikelihood / nullLogLikelihood;
      adjustedRSquared = 1 - (logLikelihood - (numVariables + 1)) / nullLogLikelihood;
    } else {
      rSquared = 0;
      adjustedRSquared = 0;
    }

    const auc = this.computeAuc(actual, predicted);

    return {
      rSquared,
      adjustedRSquared,
      mse,
      rmse,
      mae,
      accuracy,
      precision,
      recall,
      f1Score,
      auc,
      logLoss,
    };
  }

  /**
   * Formats standard regression metrics as a table
   */
  formatMetricsTable(metrics: RegressionMetrics): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(Object.values(metrics)));

    return [
      '| Metric | Value |',
      '|--------|-------|',
      `| R² | ${metrics.rSquared.toFixed(4)} |`,
      `| Adjusted R² | ${metrics.adjustedRSquared.toFixed(4)} |`,
      `| MSE | ${metrics.mse.toFixed(4)} |`,
      `| RMSE | ${metrics.rmse.toFixed(4)} |`,
      `| MAE | ${metrics.mae.toFixed(4)} |`,
      ...(metrics.fStatistic !== undefined ? [`| F-statistic | ${metrics.fStatistic.toFixed(4)} |`] : []),
    ].join('\n') + '\n\n';
  }

  /**
   * Formats logistic regression metrics as a table
   */
  formatLogisticMetricsTable(metrics: LogisticRegressionMetrics): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(Object.values(metrics)));

    return [
      '**Classification Metrics:**\n',
      '| Metric | Value |',
      '|--------|-------|',
      `| Accuracy | ${metrics.accuracy.toFixed(4)} |`,
      `| Precision | ${metrics.precision.toFixed(4)} |`,
      `| Recall | ${metrics.recall.toFixed(4)} |`,
      `| F1-Score | ${metrics.f1Score.toFixed(4)} |`,
      `| AUC | ${metrics.auc.toFixed(4)} |`,
      `| Log Loss | ${metrics.logLoss.toFixed(4)} |`,
      '\n**Regression Metrics:**\n',
      '| Metric | Value |',
      '|--------|-------|',
      `| R² | ${metrics.rSquared.toFixed(4)} |`,
      `| MSE | ${metrics.mse.toFixed(4)} |`,
      `| RMSE | ${metrics.rmse.toFixed(4)} |`,
    ].join('\n') + '\n\n';
  }

  /**
   * Formats coefficients table for regression models
   */
  formatCoefficientsTable(
    coefficients: number[],
    featureNames: string[],
    includeIntercept = true
  ): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(coefficients));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    const rows = ['| Variable | Coefficient |', '|----------|-------------|'];

    if (includeIntercept && coefficients.length > 0) {
      rows.push(`| Intercept | ${(coefficients[0] ?? 0).toFixed(4)} |`);
    }

    const startIndex = includeIntercept ? 1 : 0;
    for (let i = startIndex; i < coefficients.length; i++) {
      const featureName = featureNames[i - startIndex] ?? `Feature${i}`;
      const coefficient = coefficients[i] ?? 0;
      rows.push(`| ${featureName} | ${coefficient.toFixed(4)} |`);
    }

    return rows.join('\n') + '\n\n';
  }

  /**
   * Formats polynomial coefficients with power notation
   */
  formatPolynomialCoefficients(
    coefficients: number[],
    featureName: string,
    degree: number
  ): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(coefficients));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(featureName));

    const rows = ['| Term | Coefficient |', '|------|-------------|'];

    for (let i = 0; i <= degree && i < coefficients.length; i++) {
      const coefficient = coefficients[i] ?? 0;
      let termName: string;

      if (i === 0) {
        termName = 'Intercept';
      } else if (i === 1) {
        termName = featureName;
      } else {
        termName = `${featureName}^${i}`;
      }

      rows.push(`| ${termName} | ${coefficient.toFixed(4)} |`);
    }

    return rows.join('\n') + '\n\n';
  }

  /**
   * Computes the Pearson correlation coefficient between two numeric series
   */
  pearsonCorrelation(a: number[], b: number[]): number {
    const n = a.length;
    const meanA = a.reduce((sum, v) => sum + v, 0) / n;
    const meanB = b.reduce((sum, v) => sum + v, 0) / n;
    let numerator = 0;
    let sumSqA = 0;
    let sumSqB = 0;
    for (let i = 0; i < n; i++) {
      const da = (a[i] ?? 0) - meanA;
      const db = (b[i] ?? 0) - meanB;
      numerator += da * db;
      sumSqA += da * da;
      sumSqB += db * db;
    }
    const denominator = Math.sqrt(sumSqA * sumSqB);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generates the Pearson correlation matrix of the given feature columns
   */
  generateCorrelationMatrix(X: number[][], featureNames: string[]): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    const columns = featureNames.map((_, j) => X.map((row) => row[j] ?? 0));

    let result = '**Feature Correlation Matrix:**\n\n';

    // Create header
    const header = ['Variables', ...featureNames].join(' | ');
    const separator = Array(featureNames.length + 1).fill('---').join(' | ');

    result += `| ${header} |\n`;
    result += `| ${separator} |\n`;

    for (let i = 0; i < featureNames.length; i++) {
      const rowName = featureNames[i] ?? `Feature${i}`;
      const correlations = featureNames.map((_, j) => {
        if (i === j) return '1.000';
        return this.pearsonCorrelation(columns[i] ?? [], columns[j] ?? []).toFixed(3);
      });

      result += `| ${rowName} | ${correlations.join(' | ')} |\n`;
    }

    return result + '\n';
  }
}

// Export types for use by other providers
export type { RegressionMetrics, LogisticRegressionMetrics };
