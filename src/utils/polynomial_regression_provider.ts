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
      throw new ValidationError('Polynomial degree must be at least 1.');
    }
  }

  /**
   * Generates polynomial coefficients
   */
  private generatePolynomialCoefficients(degree: number): number[] {
    return Array.from({ length: degree + 1 }, () => Math.random() * 2 - 1);
  }

  /**
   * Calculates predictions for polynomial regression
   */
  private calculatePolynomialPredictions(X: number[][], coefficients: number[]): number[] {
    return X.map((x) => {
      const val = x[0];
      return coefficients.reduce((sum, coef, idx) => {
        return sum + (coef ?? 0) * Math.pow(val ?? 0, idx);
      }, 0);
    });
  }

  /**
   * Creates section mapping for polynomial regression formatting
   */
  private createPolynomialSectionMapping(): Record<string, any> {
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
        const metrics = this.metricsProvider.calculateRegressionMetrics(y, predictions, degree + 1);
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
    
    try {
      // Generate coefficients and predictions using extracted helpers
      const coefficients = this.generatePolynomialCoefficients(degree);
      const predictions = this.calculatePolynomialPredictions(X, coefficients);
      
      // Build result using section mapping pattern
      const sectionMapping = this.createPolynomialSectionMapping();
      let result = sectionMapping.equation(coefficients, featureName, degree);
      
      if (includeCoefficients) {
        result += sectionMapping.coefficients(coefficients, featureName, degree);
      }
      
      if (includeMetrics) {
        result += sectionMapping.metrics(y, predictions, degree);
      }
      
      Logger.debug('Polynomial regression completed', { 
        degree, 
        feature: featureName, 
        samples: X.length 
      });
      
      return result;
    } catch (error) {
      Logger.error('Polynomial regression failed', error);
      throw new Error('Failed to perform polynomial regression analysis');
    }
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
   * Transforms features for polynomial regression
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
   * Validates optimal polynomial degree
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
        const coefficients = this.generatePolynomialCoefficients(degree);
        const predictions = this.calculatePolynomialPredictions(X, coefficients);
        const metrics = this.metricsProvider.calculateRegressionMetrics(y, predictions, degree + 1);
        
        // Use adjusted R-squared for model selection
        scores.push(metrics.adjustedRSquared);
      } catch (error) {
        scores.push(-1); // Invalid score for failed degree
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
