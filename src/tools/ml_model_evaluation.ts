/**
 * ML Model Evaluation module
 *
 * This module provides tools for evaluating machine learning model performance
 * using various metrics for both classification and regression models.
 */

import { z } from 'zod';
import * as mathjs from 'mathjs';
import { ValidationError } from '../utils/errors.js';
import { MAX_DATA_POINTS } from './limits.js';

/**
 * ML Model Evaluation Schema
 * Defines the input parameters for ML model evaluation
 */
export const mlModelEvaluationSchema = z.object({
  modelType: z.enum(['classification', 'regression']).describe('Type of machine learning model'),

  // Prediction data
  actualValues: z
    .array(z.number())
    .max(MAX_DATA_POINTS)
    .describe('Ground-truth target values; for classification, binary labels encoded as 0 or 1.'),
  predictedValues: z
    .array(z.number())
    .max(MAX_DATA_POINTS)
    .describe(
      'Model predictions, same length/order as actualValues; for classification, 0 or 1.'
    ),

  // Optional parameters for more specific evaluations
  evaluationMetrics: z
    .array(
      z.enum([
        // Classification metrics
        'accuracy',
        'precision',
        'recall',
        'f1_score',

        // Regression metrics
        'mse',
        'mae',
        'rmse',
        'r_squared',
      ])
    )
    .optional()
    .default([
      'accuracy', // default for classification
      'mse', // default for regression
    ])
    .describe(
      "Metrics to report - classification: 'accuracy','precision','recall','f1_score'; regression: 'mse','mae','rmse','r_squared'. Only metrics matching modelType are computed (default ['accuracy','mse'])."
    ),
});

/**
 * Calculate performance metrics for classification models
 * @param actualValues Array of actual target values (ground truth)
 * @param predictedValues Array of model predictions
 * @returns Object containing classification metrics (accuracy, precision, recall, f1_score)
 */
function calculateClassificationMetrics(
  actualValues: number[],
  predictedValues: number[]
): Record<string, number> {
  if (actualValues.length !== predictedValues.length) {
    throw new Error('Actual and predicted values must have the same length');
  }

  // Assuming binary classification for simplicity
  const metrics: Record<string, number> = {};

  // Confusion Matrix components
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  actualValues.forEach((actual, index) => {
    const predicted = predictedValues[index];

    if (actual === 1 && predicted === 1) truePositive++;
    if (actual === 0 && predicted === 0) trueNegative++;
    if (actual === 0 && predicted === 1) falsePositive++;
    if (actual === 1 && predicted === 0) falseNegative++;
  });

  // Accuracy
  metrics.accuracy = (truePositive + trueNegative) / actualValues.length;

  // Precision, recall, and F1 default to 0 when their denominator is 0
  // (e.g. no positive predictions) rather than producing NaN.
  metrics.precision =
    truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);

  metrics.recall =
    truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);

  metrics.f1_score =
    metrics.precision + metrics.recall === 0
      ? 0
      : 2 * ((metrics.precision * metrics.recall) / (metrics.precision + metrics.recall));

  return metrics;
}

/**
 * Calculate performance metrics for regression models
 * @param actualValues Array of actual target values (ground truth)
 * @param predictedValues Array of model predictions
 * @returns Object containing regression metrics (mse, mae, rmse, r_squared)
 */
function calculateRegressionMetrics(
  actualValues: number[],
  predictedValues: number[]
): Record<string, number> {
  if (actualValues.length !== predictedValues.length) {
    throw new Error('Actual and predicted values must have the same length');
  }

  const metrics: Record<string, number> = {};

  // Mean Squared Error (MSE)
  const squaredErrors = actualValues.map((actual, index) =>
    Math.pow(actual - predictedValues[index], 2)
  );
  metrics.mse = mathjs.mean(squaredErrors);

  // Mean Absolute Error (MAE)
  const absoluteErrors = actualValues.map((actual, index) =>
    Math.abs(actual - predictedValues[index])
  );
  metrics.mae = mathjs.mean(absoluteErrors);

  // Root Mean Squared Error (RMSE)
  metrics.rmse = Math.sqrt(metrics.mse);

  // R-squared (Coefficient of Determination)
  const meanActual = mathjs.mean(actualValues);
  const totalSumOfSquares = actualValues.reduce(
    (sum, actual) => sum + Math.pow(actual - meanActual, 2),
    0
  );
  const residualSumOfSquares = actualValues.reduce(
    (sum, actual, index) => sum + Math.pow(actual - predictedValues[index], 2),
    0
  );
  // When the actual values have zero variance, R² is undefined; report a
  // perfect fit (1) if the model matches exactly, otherwise 0, rather than NaN.
  metrics.r_squared =
    totalSumOfSquares === 0 ? (residualSumOfSquares === 0 ? 1 : 0) : 1 - residualSumOfSquares / totalSumOfSquares;

  return metrics;
}

/**
 * Evaluate machine learning model performance using various metrics
 * @param modelType Type of model ("classification" or "regression")
 * @param actualValues Array of actual target values (ground truth)
 * @param predictedValues Array of model predictions
 * @param evaluationMetrics Optional array of specific metrics to calculate
 * @returns Formatted markdown report with evaluation results
 */
export async function evaluateMLModel(
  modelType: string,
  actualValues: number[],
  predictedValues: number[],
  evaluationMetrics?: string[]
): Promise<string> {
  // Validate inputs — throw so the MCP registration wrapper surfaces the failure
  // as an error result rather than a success-shaped report.
  if (actualValues.length === 0 || predictedValues.length === 0) {
    throw new ValidationError('ERR_1001', 'Input arrays cannot be empty', {
      actualLength: actualValues.length,
      predictedLength: predictedValues.length,
    });
  }
  if (actualValues.length !== predictedValues.length) {
    throw new ValidationError(
      'ERR_1001',
      'Actual and predicted values must have the same length',
      { actualLength: actualValues.length, predictedLength: predictedValues.length }
    );
  }
  if (modelType !== 'classification' && modelType !== 'regression') {
    throw new ValidationError('ERR_1001', `Unsupported model type: ${modelType}`, { modelType });
  }

  // Select metrics based on model type
  const metricsToCalculate =
    evaluationMetrics || (modelType === 'classification' ? ['accuracy'] : ['mse']);

  const metrics =
    modelType === 'classification'
      ? calculateClassificationMetrics(actualValues, predictedValues)
      : calculateRegressionMetrics(actualValues, predictedValues);

  // Filter metrics based on requested evaluation metrics
  const filteredMetrics = Object.fromEntries(
    Object.entries(metrics).filter(([key]) => metricsToCalculate.includes(key))
  );

  // Generate markdown report
  return `# ML Model Evaluation Report

## Model Type: ${modelType.toUpperCase()}

### Evaluation Metrics:
${Object.entries(filteredMetrics)
  .map(([metric, value]) => `- **${metric.replace('_', ' ').toUpperCase()}**: ${value.toFixed(4)}`)
  .join('\n')}

### Additional Insights:
- **Total Samples**: ${actualValues.length}
- **Metrics Calculated**: ${Object.keys(filteredMetrics).join(', ')}
`;
}
