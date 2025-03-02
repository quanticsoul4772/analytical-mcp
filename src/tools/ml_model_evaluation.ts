/**
 * ML Model Evaluation module
 *
 * This module provides tools for evaluating machine learning model performance
 * using various metrics for both classification and regression models.
 */

import { z } from 'zod';
import * as mathjs from 'mathjs';

/**
 * ML Model Evaluation Schema
 * Defines the input parameters for ML model evaluation
 */
export const mlModelEvaluationSchema = z.object({
  modelType: z.enum(['classification', 'regression']).describe('Type of machine learning model'),

  // Prediction data
  actualValues: z.array(z.number()).describe('Actual target values'),
  predictedValues: z.array(z.number()).describe("Model's predicted values"),

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
    ]),
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

  // Precision (Positive Predictive Value)
  metrics.precision = truePositive / (truePositive + falsePositive);

  // Recall (True Positive Rate)
  metrics.recall = truePositive / (truePositive + falseNegative);

  // F1 Score (Harmonic mean of Precision and Recall)
  metrics.f1_score =
    2 * ((metrics.precision * metrics.recall) / (metrics.precision + metrics.recall));

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
  metrics.r_squared = 1 - residualSumOfSquares / totalSumOfSquares;

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
  try {
    // Validate inputs
    if (actualValues.length === 0 || predictedValues.length === 0) {
      throw new Error('Input arrays cannot be empty');
    }

    // Select metrics based on model type
    const metricsToCalculate =
      evaluationMetrics || (modelType === 'classification' ? ['accuracy'] : ['mse']);

    let metrics: Record<string, number>;
    if (modelType === 'classification') {
      metrics = calculateClassificationMetrics(actualValues, predictedValues);
    } else if (modelType === 'regression') {
      metrics = calculateRegressionMetrics(actualValues, predictedValues);
    } else {
      throw new Error(`Unsupported model type: ${modelType}`);
    }

    // Filter metrics based on requested evaluation metrics
    const filteredMetrics = Object.fromEntries(
      Object.entries(metrics).filter(([key]) => metricsToCalculate.includes(key))
    );

    // Generate markdown report
    const report = `# ML Model Evaluation Report

## Model Type: ${modelType.toUpperCase()}

### Evaluation Metrics:
${Object.entries(filteredMetrics)
  .map(([metric, value]) => `- **${metric.replace('_', ' ').toUpperCase()}**: ${value.toFixed(4)}`)
  .join('\n')}

### Additional Insights:
- **Total Samples**: ${actualValues.length}
- **Metrics Calculated**: ${Object.keys(filteredMetrics).join(', ')}
`;

    return report;
  } catch (error) {
    return `## Error in ML Model Evaluation
- **Error Message**: ${error instanceof Error ? error.message : 'Unknown error'}
- **Model Type**: ${modelType}
- **Number of Actual Values**: ${actualValues.length}
- **Number of Predicted Values**: ${predictedValues.length}
`;
  }
}

/**
 * Tool definition for MCP server registration
 * Exports the ML model evaluation tool with its schema and execution function
 */
export const mlModelEvaluationTool = {
  name: 'ml_model_evaluation',
  description: 'Evaluate machine learning model performance using various metrics',
  schema: mlModelEvaluationSchema,
  execute: async (
    modelType: string,
    actualValues: number[],
    predictedValues: number[],
    evaluationMetrics?: string[]
  ) => await evaluateMLModel(modelType, actualValues, predictedValues, evaluationMetrics),
};
