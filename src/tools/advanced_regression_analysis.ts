/**
 * Advanced Regression Analysis - Coordinator
 * 
 * Orchestrates regression analysis using focused provider classes.
 * Refactored from monolithic 1302-line class to streamlined coordinator pattern.
 */

import { z } from 'zod';
import { 
  ValidationError, 
  withErrorHandling,
  createValidationError,
  createDataProcessingError
} from '../utils/errors.js';
import { Logger } from '../utils/logger.js';
import { ValidationHelpers } from '../utils/validation_helpers.js';

// Provider imports - focused responsibility classes
import { RegressionValidationProvider } from '../utils/regression_validation_provider.js';
import { RegressionMetricsProvider } from '../utils/regression_metrics_provider.js';
import { LinearRegressionProvider } from '../utils/linear_regression_provider.js';
import { PolynomialRegressionProvider } from '../utils/polynomial_regression_provider.js';
import { LogisticRegressionProvider } from '../utils/logistic_regression_provider.js';
import { MultivariateRegressionProvider } from '../utils/multivariate_regression_provider.js';
import { RegressionVisualizationProvider } from '../utils/regression_visualization_provider.js';

// Type definitions
type DataPoint = Record<string, number>;
type Dataset = DataPoint[];

// Options interface for regression analysis
export interface RegressionAnalysisOptions {
  data: Dataset;
  regressionType: 'linear' | 'polynomial' | 'logistic' | 'multivariate';
  independentVariables: string[];
  dependentVariable: string;
  polynomialDegree?: number;
  standardizeVariables?: boolean;
  useConfidenceInterval?: boolean;
  useTestSplit?: boolean;
  includeMetrics?: boolean;
  includeCoefficients?: boolean;
}

// Schema for the tool parameters
export const advancedRegressionAnalysisSchema = z.object({
  data: z
    .array(z.record(z.string(), z.number()))
    .describe('Array of data points for regression analysis'),
  regressionType: z
    .enum(['linear', 'polynomial', 'logistic', 'multivariate'])
    .describe('Type of regression analysis to perform'),
  independentVariables: z
    .array(z.string())
    .min(1)
    .describe('Names of independent variables (predictors)'),
  dependentVariable: z
    .string()
    .min(1)
    .describe('Name of dependent variable (response)'),
  polynomialDegree: z
    .number()
    .int()
    .min(2)
    .max(6)
    .optional()
    .describe('Degree for polynomial regression (2-6, default: 2)'),
  standardizeVariables: z
    .boolean()
    .optional()
    .describe('Whether to standardize variables (default: false)'),
  useConfidenceInterval: z
    .boolean()
    .optional()
    .describe('Whether to include confidence intervals (default: false)'),
  useTestSplit: z
    .boolean()
    .optional()
    .describe('Whether to use train/test split (default: false)'),
  includeMetrics: z
    .boolean()
    .optional()
    .describe('Whether to include performance metrics (default: true)'),
  includeCoefficients: z
    .boolean()
    .optional()
    .describe('Whether to include coefficient details (default: true)')
});

/**
 * AdvancedRegressionAnalysis - Streamlined coordinator class
 * 
 * Orchestrates regression analysis using provider pattern.
 * Each provider handles a focused responsibility.
 */
class AdvancedRegressionAnalysisCoordinator {
  private validationProvider: RegressionValidationProvider;
  private metricsProvider: RegressionMetricsProvider;
  private linearProvider: LinearRegressionProvider;
  private polynomialProvider: PolynomialRegressionProvider;
  private logisticProvider: LogisticRegressionProvider;
  private multivariateProvider: MultivariateRegressionProvider;
  private visualizationProvider: RegressionVisualizationProvider;

  constructor() {
    // Initialize all provider classes
    this.validationProvider = new RegressionValidationProvider();
    this.metricsProvider = new RegressionMetricsProvider();
    this.linearProvider = new LinearRegressionProvider();
    this.polynomialProvider = new PolynomialRegressionProvider();
    this.logisticProvider = new LogisticRegressionProvider();
    this.multivariateProvider = new MultivariateRegressionProvider();
    this.visualizationProvider = new RegressionVisualizationProvider();

    Logger.debug('AdvancedRegressionAnalysis coordinator initialized with all providers');
  }

  /**
   * Validates all inputs using validation provider
   */
  private validateAllInputs(options: RegressionAnalysisOptions): void {
    // Apply ValidationHelpers early return patterns
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(options.data));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(options.regressionType));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(options.dependentVariable));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(options.independentVariables));

    // Use validation provider for comprehensive validation
    this.validationProvider.validateInputs(
      options.data,
      options.independentVariables,
      options.dependentVariable,
      options.regressionType,
      options.polynomialDegree
    );
  }

  /**
   * Preprocesses data using validation provider
   */
  private preprocessData(
    data: Dataset,
    independentVariables: string[],
    dependentVariable: string
  ): { X: number[][]; y: number[]; featureNames: string[] } {
    return this.validationProvider.preprocessData(data, independentVariables, dependentVariable);
  }

  /**
   * Creates regression provider mapping for delegation
   */
  private createRegressionProviderMapping(): Record<string, any> {
    return {
      linear: {
        provider: this.linearProvider,
        method: 'performLinearRegression'
      },
      polynomial: {
        provider: this.polynomialProvider,
        method: 'performPolynomialRegression'
      },
      logistic: {
        provider: this.logisticProvider,
        method: 'performLogisticRegression'
      },
      multivariate: {
        provider: this.multivariateProvider,
        method: 'performMultivariateRegression'
      }
    };
  }

  /**
   * Executes regression analysis using appropriate provider
   */
  private executeRegressionAnalysis(
    regressionType: string,
    X: number[][],
    y: number[],
    featureNames: string[],
    includeCoefficients: boolean,
    includeMetrics: boolean,
    polynomialDegree?: number
  ): string {
    const providerMapping = this.createRegressionProviderMapping();
    const regressionHandler = providerMapping[regressionType];
    
    if (!regressionHandler) {
      throw createValidationError(
        `Unsupported regression type: ${regressionType}`,
        { 
          providedType: regressionType, 
          supportedTypes: ['linear', 'polynomial', 'logistic', 'multivariate'] 
        },
        'advanced_regression_analysis'
      );
    }

    const { provider, method } = regressionHandler;
    
    // Execute regression using appropriate provider
    if (regressionType === 'polynomial' && polynomialDegree) {
      return provider[method](X, y, featureNames, polynomialDegree, includeCoefficients, includeMetrics);
    } else {
      return provider[method](X, y, featureNames, includeCoefficients, includeMetrics);
    }
  }

  /**
   * Logs regression analysis start
   */
  private logRegressionStart(
    regressionType: string,
    independentVariables: string[],
    dependentVariable: string
  ): void {
    Logger.info('Starting regression analysis', {
      type: regressionType,
      predictors: independentVariables.length,
      dependent: dependentVariable
    });
  }

  /**
   * Builds complete regression result with interpretation and visualization
   */
  private buildCompleteResult(
    regressionResult: string,
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): string {
    // Add analysis header
    let result = this.visualizationProvider.generateAnalysisHeader(
      independentVariables,
      dependentVariable,
      regressionType
    );
    
    // Add regression result
    result += regressionResult;
    
    // Add interpretation and visualization using visualization provider
    result = this.visualizationProvider.formatAnalysisResult(
      result,
      independentVariables,
      dependentVariable,
      regressionType
    );
    
    return result;
  }

  /**
   * Main regression analysis orchestration method
   */
  async performRegressionAnalysis(options: RegressionAnalysisOptions): Promise<string> {
    try {
      // Step 1: Validate all inputs
      this.validateAllInputs(options);
      
      // Step 2: Extract options with defaults
      const {
        data,
        regressionType,
        independentVariables,
        dependentVariable,
        polynomialDegree = 2,
        includeMetrics = true,
        includeCoefficients = true
      } = options;
      
      // Step 3: Log analysis start
      this.logRegressionStart(regressionType, independentVariables, dependentVariable);
      
      // Step 4: Preprocess data
      const { X, y, featureNames } = this.preprocessData(data, independentVariables, dependentVariable);
      
      // Step 5: Execute regression analysis using appropriate provider
      const regressionResult = this.executeRegressionAnalysis(
        regressionType,
        X,
        y,
        featureNames,
        includeCoefficients,
        includeMetrics,
        polynomialDegree
      );
      
      // Step 6: Build complete result with interpretation and visualization
      const completeResult = this.buildCompleteResult(
        regressionResult,
        independentVariables,
        dependentVariable,
        regressionType
      );
      
      Logger.debug('Completed regression analysis successfully', { 
        regressionType,
        samplesProcessed: X.length,
        featuresProcessed: featureNames.length
      });
      
      return completeResult;
      
    } catch (error) {
      // Re-throw ValidationError without modification
      if (error instanceof ValidationError) {
        throw error;
      }
      
      Logger.error('Regression analysis failed', error);
      throw createDataProcessingError(
        `Regression analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        { regressionType: options.regressionType, originalError: error },
        'advanced_regression_analysis'
      );
    }
  }
}

// Create singleton coordinator instance
const regressionCoordinator = new AdvancedRegressionAnalysisCoordinator();

/**
 * Internal function - delegates to coordinator (wrapped for error handling)
 */
async function advancedRegressionAnalysisInternal(
  options: RegressionAnalysisOptions
): Promise<string> {
  return await regressionCoordinator.performRegressionAnalysis(options);
}

/**
 * Main export function with standardized error handling
 */
export const advancedRegressionAnalysis = withErrorHandling(
  'advanced_regression_analysis',
  advancedRegressionAnalysisInternal
);

/**
 * Export provider access for testing and advanced usage
 */
export { AdvancedRegressionAnalysisCoordinator };

/**
 * Export types for external usage
 */
export type { DataPoint, Dataset };
