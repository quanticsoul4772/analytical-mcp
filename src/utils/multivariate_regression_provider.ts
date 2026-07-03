/**
 * Multivariate Regression Provider
 *
 * Handles multivariate regression analysis operations.
 * Focused responsibility: Multiple variable regression calculations and formatting.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { Logger } from './logger.js';
import { RegressionMetricsProvider } from './regression_metrics_provider.js';
import { fitOls } from './linear_regression_provider.js';
import { DataProcessingError } from './errors.js';

/**
 * MultivariateRegressionProvider - Focused class for multivariate regression operations
 */
export class MultivariateRegressionProvider {
  private metricsProvider: RegressionMetricsProvider;

  constructor() {
    this.metricsProvider = new RegressionMetricsProvider();
  }

  /**
   * Validates multivariate regression inputs
   */
  private validateMultivariateRegressionInputs(
    X: number[][],
    y: number[],
    featureNames: string[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    if (X.length !== y.length) {
      throw new Error('Input matrix X and target vector y must have the same number of samples');
    }

    if (X.length > 0 && X[0]?.length !== featureNames.length) {
      throw new Error('Number of features in X must match the length of featureNames');
    }
  }

  /**
   * Generates the Pearson correlation matrix of all variables (predictors and Y)
   */
  generateCorrelationMatrix(X: number[][], y: number[], featureNames: string[]): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    const columns = featureNames.map((_, j) => X.map((row) => row[j] ?? 0));
    columns.push(y);
    const allVars = [...featureNames, 'Y'];

    let matrix = `**Correlation Matrix:**\n\n`;
    matrix += `| Variable | ${featureNames.join(' | ')} | Y |\n`;
    matrix += `| -------- | ${featureNames.map(() => '------- |').join(' ')} ------- |\n`;

    for (let i = 0; i < allVars.length; i++) {
      matrix += `| ${allVars[i]} |`;
      for (let j = 0; j < allVars.length; j++) {
        if (i === j) {
          matrix += ` 1.000 |`;
        } else {
          const corr = this.metricsProvider.pearsonCorrelation(columns[i] ?? [], columns[j] ?? []);
          matrix += ` ${corr.toFixed(3)} |`;
        }
      }
      matrix += '\n';
    }

    return matrix + '\n';
  }

  /**
   * Formats the multivariate equation section
   */
  private formatMultivariateEquationSection(
    featureNames: string[],
    coefficients: number[]
  ): string {
    let result = `**Multivariate Equation:**\n`;
    let equation = `y = ${(coefficients[0] ?? 0).toFixed(4)}`;

    for (let i = 0; i < featureNames.length; i++) {
      const coefficient = coefficients[i + 1];
      if (coefficient !== undefined) {
        const sign = coefficient >= 0 ? '+ ' : '- ';
        equation += ` ${sign}${Math.abs(coefficient).toFixed(4)} × ${featureNames[i] ?? `X${i}`}`;
      }
    }

    result += equation + '\n\n';
    return result;
  }

  /**
   * Formats the multivariate coefficients section
   */
  private formatMultivariateCoefficientsSection(
    coefficients: number[],
    featureNames: string[]
  ): string {
    return '**Coefficients:**\n\n' +
           this.metricsProvider.formatCoefficientsTable(coefficients, featureNames) + '\n';
  }

  /**
   * Formats the multivariate metrics section
   */
  private formatMultivariateMetricsSection(
    y: number[],
    predictions: number[],
    numFeatures: number
  ): string {
    const metrics = this.metricsProvider.calculateRegressionMetrics(y, predictions, numFeatures);
    return '**Model Fit Statistics:**\n\n' +
           this.metricsProvider.formatMetricsTable(metrics);
  }

  /**
   * Performs multivariate regression analysis: OLS fit plus a correlation matrix
   */
  performMultivariateRegression(
    X: number[][],
    y: number[],
    featureNames: string[],
    includeCoefficients = true,
    includeMetrics = true
  ): string {
    // Apply ValidationHelpers early return patterns
    this.validateMultivariateRegressionInputs(X, y, featureNames);

    // Fit via ordinary least squares (shared numerical core)
    const { coefficients, predictions } = fitOls(X, y);

    let result = '';
    result += this.generateCorrelationMatrix(X, y, featureNames);
    result += this.formatMultivariateEquationSection(featureNames, coefficients);

    if (includeCoefficients) {
      result += this.formatMultivariateCoefficientsSection(coefficients, featureNames);
    }

    if (includeMetrics) {
      result += this.formatMultivariateMetricsSection(y, predictions, featureNames.length);
    }

    Logger.debug('Multivariate regression completed', {
      features: featureNames.length,
      samples: X.length
    });

    return result;
  }

  /**
   * Calculates feature importance scores
   */
  calculateFeatureImportance(
    coefficients: number[],
    featureNames: string[]
  ): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(coefficients));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    let result = '**Feature Importance:**\n\n';
    result += '| Feature | Coefficient | Abs Importance | Relative Importance |\n';
    result += '|---------|-------------|----------------|--------------------|\n';

    // Skip intercept (first coefficient)
    const featureCoefficients = coefficients.slice(1);
    const absSum = featureCoefficients.reduce((sum, coef) => sum + Math.abs(coef), 0);

    for (let i = 0; i < featureNames.length && i < featureCoefficients.length; i++) {
      const coefficient = featureCoefficients[i] ?? 0;
      const absImportance = Math.abs(coefficient);
      const relativeImportance = absSum > 0 ? (absImportance / absSum * 100).toFixed(1) : '0.0';
      const featureName = featureNames[i] ?? `Feature${i + 1}`;

      result += `| ${featureName} | ${coefficient.toFixed(4)} | ${absImportance.toFixed(4)} | ${relativeImportance}% |\n`;
    }

    return result + '\n';
  }

  /**
   * Computes the variance inflation factor for one feature by regressing it on
   * the remaining features: VIF = 1 / (1 - R²). Returns Infinity when the
   * feature is perfectly collinear with the others.
   */
  private computeVifForFeature(X: number[][], featureIndex: number): number {
    const numFeatures = X[0]?.length ?? 0;
    if (numFeatures < 2) {
      return 1;
    }

    const target = X.map((row) => row[featureIndex] ?? 0);
    const others = X.map((row) => row.filter((_, j) => j !== featureIndex));

    try {
      const { predictions } = fitOls(others, target);
      const metrics = this.metricsProvider.calculateRegressionMetrics(
        target,
        predictions,
        numFeatures - 1
      );
      const rSquared = Math.min(metrics.rSquared, 1);
      return rSquared >= 1 ? Infinity : 1 / (1 - rSquared);
    } catch (error) {
      if (error instanceof DataProcessingError) {
        // Singular design: the remaining features are themselves collinear
        return Infinity;
      }
      throw error;
    }
  }

  /**
   * Generates variance inflation factor (VIF) analysis from the actual data
   */
  calculateVarianceInflationFactors(
    X: number[][],
    featureNames: string[]
  ): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));

    let result = '**Variance Inflation Factors (VIF):**\n\n';
    result += '| Feature | VIF | Interpretation |\n';
    result += '|---------|-----|----------------|\n';

    for (let i = 0; i < featureNames.length; i++) {
      const vif = this.computeVifForFeature(X, i);
      const featureName = featureNames[i] ?? `Feature${i + 1}`;

      let interpretation: string;
      if (vif < 2) {
        interpretation = 'Low multicollinearity';
      } else if (vif < 5) {
        interpretation = 'Moderate multicollinearity';
      } else {
        interpretation = 'High multicollinearity';
      }

      const vifDisplay = Number.isFinite(vif) ? vif.toFixed(2) : 'Inf';
      result += `| ${featureName} | ${vifDisplay} | ${interpretation} |\n`;
    }

    result += '\n**VIF Interpretation:**\n';
    result += '- VIF < 2: Low multicollinearity\n';
    result += '- VIF 2-5: Moderate multicollinearity\n';
    result += '- VIF > 5: High multicollinearity (consider feature selection)\n\n';

    return result;
  }

  /**
   * Validates multivariate model assumptions
   */
  validateModelAssumptions(
    X: number[][],
    y: number[],
    predictions: number[]
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check sample size adequacy
    const samplesPerFeature = X.length / (X[0]?.length ?? 1);
    if (samplesPerFeature < 10) {
      warnings.push('Sample size may be insufficient (recommended: 10+ observations per feature)');
    }

    // Check for perfect multicollinearity (simplified check)
    if (X.length > 0 && X[0]?.length !== undefined) {
      const numFeatures = X[0].length;
      if (numFeatures >= X.length) {
        warnings.push('Number of features approaches or exceeds sample size (risk of overfitting)');
      }
    }

    // Check residual patterns (simplified)
    const residuals = y.map((actual, i) => actual - (predictions[i] ?? 0));
    const meanResidual = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;

    if (Math.abs(meanResidual) > 0.1) {
      warnings.push('Residuals may not be centered around zero (check model specification)');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Generates multivariate regression diagnostic report
   */
  generateDiagnosticReport(
    X: number[][],
    y: number[],
    featureNames: string[],
    coefficients: number[],
    predictions: number[]
  ): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));

    let result = '## Multivariate Regression Diagnostics\n\n';

    // Feature importance
    result += this.calculateFeatureImportance(coefficients, featureNames);

    // VIF analysis
    result += this.calculateVarianceInflationFactors(X, featureNames);

    // Model assumptions validation
    const assumptions = this.validateModelAssumptions(X, y, predictions);
    result += '**Model Assumption Checks:**\n\n';

    if (assumptions.isValid) {
      result += 'All model assumptions appear to be satisfied.\n\n';
    } else {
      result += 'The following issues were detected:\n';
      for (const warning of assumptions.warnings) {
        result += `- ${warning}\n`;
      }
      result += '\n';
    }

    Logger.debug('Generated multivariate regression diagnostic report', {
      features: featureNames.length,
      samples: X.length,
      warnings: assumptions.warnings.length
    });

    return result;
  }
}
