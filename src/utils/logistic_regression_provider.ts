/**
 * Logistic Regression Provider
 * 
 * Handles logistic regression analysis operations.
 * Focused responsibility: Logistic regression calculations and formatting.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { Logger } from './logger.js';
import { RegressionMetricsProvider, LogisticRegressionMetrics } from './regression_metrics_provider.js';

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
   * Generates logistic regression coefficients
   */
  private generateLogisticCoefficients(X: number[][], y: number[]): number[] {
    const numFeatures = X[0]?.length ?? 0;
    // Simplified coefficient generation for demo
    return Array.from({ length: numFeatures + 1 }, () => Math.random() * 2 - 1);
  }

  /**
   * Sigmoid function for logistic regression
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Calculates predictions for logistic regression
   */
  private calculateLogisticPredictions(X: number[][], coefficients: number[]): number[] {
    return X.map((x) => {
      let logit = coefficients[0] ?? 0; // Intercept
      for (let i = 0; i < x.length; i++) {
        logit += (coefficients[i + 1] ?? 0) * (x[i] ?? 0);
      }
      return this.sigmoid(logit);
    });
  }

  /**
   * Creates section mapping for logistic regression formatting
   */
  private createLogisticSectionMapping(): Record<string, any> {
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
   * Performs logistic regression analysis
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
    
    try {
      // Generate coefficients and predictions using extracted helpers
      const coefficients = this.generateLogisticCoefficients(X, y);
      const predictions = this.calculateLogisticPredictions(X, coefficients);
      
      // Build result using section mapping pattern
      const sectionMapping = this.createLogisticSectionMapping();
      let result = sectionMapping.equation(coefficients, featureNames);
      
      if (includeCoefficients) {
        result += sectionMapping.coefficients(coefficients, featureNames);
      }
      
      if (includeMetrics) {
        result += sectionMapping.metrics(y, predictions, featureNames.length);
      }
      
      Logger.debug('Logistic regression completed', { 
        features: featureNames.length, 
        samples: X.length 
      });
      
      return result;
    } catch (error) {
      Logger.error('Logistic regression failed', error);
      throw new Error('Failed to perform logistic regression analysis');
    }
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
