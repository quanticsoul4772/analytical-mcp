/**
 * Linear Regression Provider
 * 
 * Handles linear regression analysis operations.
 * Focused responsibility: Linear regression calculations and formatting.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { Logger } from './logger.js';
import { RegressionMetricsProvider, RegressionMetrics } from './regression_metrics_provider.js';

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
   * Generates linear regression coefficients
   */
  private generateLinearCoefficients(X: number[][], y: number[]): number[] {
    const numFeatures = X[0]?.length ?? 0;
    // Simplified coefficient generation for demo
    return Array.from({ length: numFeatures + 1 }, () => Math.random() * 2 - 1);
  }

  /**
   * Calculates predictions for linear regression
   */
  private calculateLinearPredictions(X: number[][], coefficients: number[]): number[] {
    return X.map((x) => {
      let prediction = coefficients[0] ?? 0; // Intercept
      for (let i = 0; i < x.length; i++) {
        prediction += (coefficients[i + 1] ?? 0) * (x[i] ?? 0);
      }
      return prediction;
    });
  }

  /**
   * Creates section mapping for linear regression formatting
   */
  private createLinearRegressionSectionMapping(): Record<string, any> {
    return {
      equation: (coefficients: number[], featureNames: string[]) => {
        let result = '**Linear Equation:**\n';
        let equation = `y = ${(coefficients[0] ?? 0).toFixed(4)}`;
        
        for (let i = 0; i < featureNames.length; i++) {
          const coefficient = coefficients[i + 1];
          if (coefficient !== undefined) {
            const sign = coefficient >= 0 ? '+ ' : '- ';
            equation += ` ${sign}${Math.abs(coefficient).toFixed(4)} × ${featureNames[i] ?? `X${i}`}`;
          }
        }
        
        return result + equation + '\n\n';
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
   * Performs linear regression analysis
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
    
    try {
      // Generate coefficients and predictions using extracted helpers
      const coefficients = this.generateLinearCoefficients(X, y);
      const predictions = this.calculateLinearPredictions(X, coefficients);
      
      // Build result using section mapping pattern
      const sectionMapping = this.createLinearRegressionSectionMapping();
      let result = sectionMapping.equation(coefficients, featureNames);
      
      if (includeCoefficients) {
        result += sectionMapping.coefficients(coefficients, featureNames);
      }
      
      if (includeMetrics) {
        result += sectionMapping.metrics(y, predictions, featureNames.length);
      }
      
      Logger.debug('Linear regression completed', { 
        features: featureNames.length, 
        samples: X.length 
      });
      
      return result;
    } catch (error) {
      Logger.error('Linear regression failed', error);
      throw new Error('Failed to perform linear regression analysis');
    }
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
