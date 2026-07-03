/**
 * Regression Validation Provider
 * 
 * Handles input validation and data preprocessing for regression analysis.
 * Focused responsibility: Input validation and data preprocessing.
 */

import { ValidationError } from './errors.js';
import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';

// Type definitions
type DataPoint = Record<string, number>;
type Dataset = DataPoint[];

/**
 * RegressionValidationProvider - Focused class for regression input validation and preprocessing
 */
export class RegressionValidationProvider {

  /**
   * Validates independent variables array
   */
  validateIndependentVariables(independentVariables: string[]): void {
    if (!Array.isArray(independentVariables) || independentVariables.length === 0) {
      throw new ValidationError('ERR_1001', 'At least one independent variable must be provided.');
    }
  }

  /**
   * Validates regression type is supported
   */
  validateRegressionType(regressionType: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(regressionType));
    
    const supportedTypes = ['linear', 'polynomial', 'logistic', 'multivariate'];
    if (!supportedTypes.includes(regressionType)) {
      throw new ValidationError(
        'ERR_1001',
        `Invalid regression type: ${regressionType}. Supported types: ${supportedTypes.join(', ')}.`
      );
    }
  }

  /**
   * Validates polynomial degree for polynomial regression
   */
  validatePolynomialDegree(
    regressionType: string,
    polynomialDegree?: number
  ): void {
    if (regressionType === 'polynomial') {
      if (polynomialDegree === undefined || polynomialDegree < 1) {
        throw new ValidationError(
          'ERR_1001',
          'Polynomial degree must be provided and at least 1 for polynomial regression.'
        );
      }
    }
  }

  /**
   * Validates that specified variables exist in the dataset
   */
  validateVariablesExistInDataset(
    data: Dataset,
    independentVariables: string[],
    dependentVariable: string
  ): void {
    if (data.length === 0) {
      throw new ValidationError('ERR_1001', 'Dataset cannot be empty.');
    }

    const firstRow = data[0];
    if (!firstRow) {
      throw new ValidationError('ERR_1001', 'Dataset contains invalid data points.');
    }

    const availableColumns = Object.keys(firstRow);
    const allVariables = [...independentVariables, dependentVariable];

    for (const variable of allVariables) {
      if (!availableColumns.includes(variable)) {
        throw new ValidationError(
          'ERR_1001',
          `Variable '${variable}' not found in dataset. Available columns: ${availableColumns.join(', ')}.`
        );
      }
    }
  }

  /**
   * Comprehensive input validation
   */
  validateInputs(
    data: Dataset,
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string,
    polynomialDegree?: number
  ): void {
    // Early validation with typed errors
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError(
        'ERR_1001',
        'Invalid data format. Please provide a non-empty array of data points.'
      );
    }
    if (typeof dependentVariable !== 'string' || dependentVariable.length === 0) {
      throw new ValidationError('ERR_1001', 'A dependent variable name must be provided.');
    }

    // Validate each component
    this.validateIndependentVariables(independentVariables);
    this.validateRegressionType(regressionType);
    this.validatePolynomialDegree(regressionType, polynomialDegree);
    this.validateVariablesExistInDataset(data, independentVariables, dependentVariable);
  }

  /**
   * Preprocesses data for regression analysis
   */
  preprocessData(
    data: Dataset,
    independentVariables: string[],
    dependentVariable: string
  ): { X: number[][]; y: number[]; featureNames: string[] } {
    // Early validation using ValidationHelpers
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(independentVariables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(dependentVariable));

    try {
      // Extract feature matrix X and target vector y
      const X: number[][] = data.map(row => 
        independentVariables.map(variable => {
          const value = row[variable];
          return typeof value === 'number' ? value : 0;
        })
      );

      const y: number[] = data.map(row => {
        const value = row[dependentVariable];
        return typeof value === 'number' ? value : 0;
      });

      const featureNames = [...independentVariables];

      Logger.debug('Data preprocessing completed', { 
        samples: X.length, 
        features: featureNames.length,
        target: dependentVariable 
      });

      return { X, y, featureNames };
    } catch (error) {
      Logger.error('Data preprocessing failed', error);
      throw new ValidationError('ERR_1001', 'Failed to preprocess data for regression analysis.');
    }
  }

  /**
   * Z-score standardizes each column of X (mean 0, standard deviation 1).
   * When standardization is applied, fitted coefficients are in standardized
   * units: the expected change in y per one standard deviation of the predictor.
   */
  standardizeColumns(X: number[][]): number[][] {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));

    const n = X.length;
    const numCols = X[0]?.length ?? 0;
    const means: number[] = [];
    const stds: number[] = [];

    for (let j = 0; j < numCols; j++) {
      const column = X.map((row) => row[j] ?? 0);
      const mean = column.reduce((sum, v) => sum + v, 0) / n;
      const variance = column.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / n;
      const std = Math.sqrt(variance);
      if (std === 0) {
        throw new ValidationError(
          'ERR_1001',
          'Cannot standardize variables: at least one independent variable is constant (zero variance).'
        );
      }
      means.push(mean);
      stds.push(std);
    }

    return X.map((row) => row.map((v, j) => (v - (means[j] ?? 0)) / (stds[j] ?? 1)));
  }

  /**
   * Validates regression configuration options. Confidence intervals and
   * train/test splits must be enabled together.
   */
  validateRegressionConfiguration(
    useConfidenceInterval: boolean,
    useTestSplit: boolean
  ): void {
    if (!useConfidenceInterval && useTestSplit) {
      throw new ValidationError('ERR_1001', 'Invalid test size configuration.');
    }

    if (useConfidenceInterval && !useTestSplit) {
      throw new ValidationError('ERR_1001', 'Invalid confidence level configuration.');
    }

    if (useConfidenceInterval) {
      Logger.warn('Confidence intervals are reported at a fixed 90% level');
    }

    if (useTestSplit) {
      Logger.warn('Test/train split is reported at a fixed 30% test size');
    }
  }

  /**
   * Validates regression analysis input parameters for specific regression type
   */
  validateRegressionAnalysisInputs(
    regressionType: string,
    X: number[][],
    y: number[],
    featureNames: string[],
    independentVariables: string[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(X));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(y));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(featureNames));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(independentVariables));
    
    if (!regressionType) {
      throw new ValidationError('ERR_1001', 'Regression type is required');
    }
  }

  /**
   * Validates polynomial regression specific inputs
   */
  validatePolynomialRegressionInputs(
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
   * Validates header formatting parameters
   */
  validateHeaderParameters(
    regressionType: string,
    dependentVariable: string,
    independentVariables: string[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(regressionType));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(dependentVariable));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(independentVariables));
  }
}
