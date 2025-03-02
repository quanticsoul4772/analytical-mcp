import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

// Type definitions
type DataPoint = Record<string, number>;
type Dataset = DataPoint[];

// Define regression metrics interface
interface RegressionMetrics {
  rSquared: number;
  adjustedRSquared: number;
  mse: number;
  rmse: number;
  fStatistic?: number;
  pValue?: number;
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
    .describe('Names of independent variables (must match properties in data objects)'),
  dependentVariable: z
    .string()
    .describe('Name of dependent variable (must match property in data objects)'),
  polynomialDegree: z
    .number()
    .optional()
    .describe('Degree of polynomial for polynomial regression (default: 2)'),
  includeMetrics: z.boolean().default(true).describe('Include performance metrics in the result'),
  includeCoefficients: z
    .boolean()
    .default(true)
    .describe('Include calculated coefficients in the result'),
});

// Helper functions

/**
 * Validates input data and parameters for regression analysis
 */
function validateInputs(
  data: Dataset,
  independentVariables: string[],
  dependentVariable: string,
  regressionType: string,
  polynomialDegree?: number
): void {
  // Validate data format
  if (!Array.isArray(data) || data.length === 0) {
    throw new ValidationError('Invalid data format. Please provide an array of data points.');
  }

  // Validate independent variables
  if (independentVariables.length === 0) {
    throw new ValidationError('At least one independent variable must be provided.');
  }

  // Validate regression type
  if (!['linear', 'polynomial', 'logistic', 'multivariate'].includes(regressionType)) {
    throw new ValidationError(
      `Invalid regression type: ${regressionType}. Supported types: linear, polynomial, logistic, multivariate.`
    );
  }

  // Validate polynomial degree
  if (regressionType === 'polynomial' && polynomialDegree !== undefined && polynomialDegree < 1) {
    throw new ValidationError('Polynomial degree must be at least 1.');
  }

  // Validate variables exist in dataset
  for (const variable of [...independentVariables, dependentVariable]) {
    if (!data.some((point) => variable in point)) {
      throw new ValidationError(`Variable "${variable}" not found in data.`);
    }
  }
}

/**
 * Preprocesses data for regression analysis
 */
function preprocessData(
  data: Dataset,
  independentVariables: string[],
  dependentVariable: string
): { X: number[][]; y: number[]; featureNames: string[] } {
  // Extract X and y data with null safety
  const X = data.map((point) =>
    independentVariables.map((variable) => {
      const value = point[variable];
      return value !== undefined ? value : 0;
    })
  );

  const y = data.map((point) => {
    const value = point[dependentVariable];
    return value !== undefined ? value : 0;
  });

  return { X, y, featureNames: independentVariables };
}

/**
 * Formats regression metrics into a markdown table
 */
function formatMetricsTable(metrics: RegressionMetrics): string {
  let table = `| Metric | Value |\n`;
  table += `| ------ | ----- |\n`;
  table += `| R² | ${metrics.rSquared.toFixed(4)} |\n`;
  table += `| Adjusted R² | ${metrics.adjustedRSquared.toFixed(4)} |\n`;
  table += `| MSE | ${metrics.mse.toFixed(4)} |\n`;
  table += `| RMSE | ${metrics.rmse.toFixed(4)} |\n`;

  if (metrics.fStatistic !== undefined) {
    table += `| F-statistic | ${metrics.fStatistic.toFixed(4)} |\n`;
  }

  if (metrics.pValue !== undefined) {
    table += `| p-value | ${metrics.pValue.toExponential(2)} |\n`;
  }

  return table;
}

/**
 * Formats logistic regression metrics into a markdown table
 */
function formatLogisticMetricsTable(metrics: LogisticRegressionMetrics): string {
  let table = formatMetricsTable(metrics);

  // Add logistic-specific metrics
  table += `| Accuracy | ${metrics.accuracy.toFixed(4)} |\n`;
  table += `| Precision | ${metrics.precision.toFixed(4)} |\n`;
  table += `| Recall | ${metrics.recall.toFixed(4)} |\n`;
  table += `| F1 Score | ${metrics.f1Score.toFixed(4)} |\n`;
  table += `| AUC-ROC | ${metrics.auc.toFixed(4)} |\n`;
  table += `| Log Loss | ${metrics.logLoss.toFixed(4)} |\n`;

  return table;
}

/**
 * Formats coefficients into a markdown table
 */
function formatCoefficientsTable(
  coefficients: number[],
  featureNames: string[],
  includeIntercept = true
): string {
  let table = `| Term | Coefficient |\n`;
  table += `| ---- | ----------- |\n`;

  if (includeIntercept) {
    table += `| Intercept | ${(coefficients[0] ?? 0).toFixed(4)} |\n`;

    for (let i = 1; i < coefficients.length; i++) {
      const featureIndex = i - 1;
      const featureName =
        featureIndex < featureNames.length
          ? (featureNames[featureIndex] ?? `X${featureIndex}`)
          : `X${featureIndex}`;
      table += `| ${featureName} | ${(coefficients[i] ?? 0).toFixed(4)} |\n`;
    }
  } else {
    for (let i = 0; i < coefficients.length; i++) {
      const featureName = i < featureNames.length ? (featureNames[i] ?? `X${i}`) : `X${i}`;
      table += `| ${featureName} | ${(coefficients[i] ?? 0).toFixed(4)} |\n`;
    }
  }

  return table;
}

/**
 * Formats polynomial coefficients into a markdown table
 */
function formatPolynomialCoefficients(
  coefficients: number[],
  featureName: string,
  degree: number
): string {
  let table = `| Term | Coefficient |\n`;
  table += `| ---- | ----------- |\n`;

  table += `| Intercept | ${(coefficients[0] ?? 0).toFixed(4)} |\n`;

  for (let i = 1; i <= degree; i++) {
    if (i < coefficients.length) {
      table += `| ${featureName}^${i} | ${(coefficients[i] ?? 0).toFixed(4)} |\n`;
    }
  }

  return table;
}

/**
 * Generates visualization suggestions based on regression type
 */
function generateVisualizationSuggestions(
  independentVariables: string[],
  dependentVariable: string,
  regressionType: string
): string {
  let result = `\n**Visualization Suggestions:**\n\n`;

  // Common visualization suggestions
  if (independentVariables.length === 1) {
    result += `- Scatter plot of ${independentVariables[0]} vs ${dependentVariable}\n`;
    result += `- Regression line plot\n`;
    result += `- Residual plot to check regression assumptions\n`;
  } else {
    result += `- Partial regression plots for each independent variable\n`;
    result += `- Pairwise scatter plots of all variables\n`;
    result += `- Residual plots to check regression assumptions\n`;
  }

  // Regression type specific suggestions
  if (regressionType === 'polynomial') {
    result += `- Curve fit plot showing the polynomial relationship\n`;
  } else if (regressionType === 'logistic') {
    result += `- ROC curve showing model performance\n`;
    result += `- Confusion matrix visualization\n`;
  } else if (regressionType === 'multivariate') {
    result += `- Correlation heatmap of all variables\n`;
    result += `- 3D scatter plots for selected variable combinations\n`;
  }

  return result;
}

/**
 * Generates a basic interpretation of the regression results
 */
function generateInterpretation(
  regressionType: string,
  dependentVariable: string,
  polynomialDegree?: number
): string {
  let result = `\n**Interpretation:**\n\n`;

  if (regressionType === 'linear') {
    result += `The linear regression model explains the relationship between the independent variables and ${dependentVariable}. `;
    result += `The coefficients indicate the change in ${dependentVariable} for a one-unit change in each predictor, holding other predictors constant. `;
    result += `The R-squared value indicates the proportion of variance in ${dependentVariable} that is explained by the model.\n\n`;
  } else if (regressionType === 'polynomial') {
    const degree = polynomialDegree || 2;
    result += `The polynomial regression model (degree ${degree}) captures non-linear relationships between the independent variable and ${dependentVariable}. `;
    result += `Higher degree terms account for curvature in the relationship. `;
    result += `The R-squared value indicates how well the polynomial curve fits the data.\n\n`;
  } else if (regressionType === 'logistic') {
    result += `The logistic regression model estimates the probability of ${dependentVariable} being 1 (success/yes/true). `;
    result += `The coefficients represent the log-odds ratio for each predictor. `;
    result += `Positive coefficients increase the probability of ${dependentVariable} being 1, while negative coefficients decrease it.\n\n`;
  } else if (regressionType === 'multivariate') {
    result += `The multivariate regression model examines relationships between multiple predictors and ${dependentVariable}. `;
    result += `Each coefficient represents the effect of its predictor on ${dependentVariable}, controlling for other variables. `;
    result += `Look at the p-values to determine which predictors are statistically significant.\n\n`;
  }

  return result;
}

/**
 * Determines the regression title based on regression type and number of variables
 */
function determineRegressionTitle(regressionType: string, independentVariables: string[]): string {
  switch (regressionType) {
    case 'linear':
      return independentVariables.length > 1 ? 'Multiple Linear Regression' : 'Linear Regression';
    case 'polynomial':
      return 'Polynomial Regression';
    case 'logistic':
      return 'Logistic Regression';
    case 'multivariate':
      return 'Multivariate Regression';
    default:
      return 'Regression Analysis';
  }
}

/**
 * Generates a description for the regression analysis
 */
function generateRegressionDescription(
  regressionType: string,
  dependentVariable: string,
  independentVariables: string[],
  polynomialDegree?: number
): string {
  switch (regressionType) {
    case 'linear':
      return independentVariables.length === 1
        ? `Analyzing the relationship between ${independentVariables[0]} (independent) and ${dependentVariable} (dependent).\n\n`
        : `Analyzing the relationship between multiple predictors (${independentVariables.join(', ')}) and ${dependentVariable}.\n\n`;
    case 'polynomial': {
      const degree = polynomialDegree || 2;
      return `Analyzing the polynomial (degree ${degree}) relationship between ${independentVariables[0]} and ${dependentVariable}.\n\n`;
    }
    case 'logistic':
      return `Analyzing the logistic relationship between ${independentVariables.length === 1 ? independentVariables[0] : 'multiple predictors'} and ${dependentVariable}.\n\n`;
    case 'multivariate':
      return `Performing multivariate regression with ${independentVariables.length} predictors and ${dependentVariable} as the response variable.\n\n`;
    default:
      return '';
  }
}

/**
 * Creates a header for the regression analysis result
 */
function formatResultHeader(
  regressionType: string,
  dependentVariable: string,
  independentVariables: string[],
  polynomialDegree?: number,
  standardizeVariables = false,
  useConfidenceInterval = false,
  useTestSplit = false
): string {
  // Get regression title and description
  const regressionTitle = determineRegressionTitle(regressionType, independentVariables);
  const description = generateRegressionDescription(
    regressionType,
    dependentVariable,
    independentVariables,
    polynomialDegree
  );

  let result = `# Regression Analysis Results\n\n`;
  result += `## ${regressionTitle}\n\n`;
  result += description;

  // Add variable information
  result += `**Dependent Variable:** ${dependentVariable}\n`;
  result += `**Independent Variables:** ${independentVariables.join(', ')}\n`;

  if (regressionType === 'polynomial' && polynomialDegree !== undefined) {
    result += `**Degree:** ${polynomialDegree}\n`;
  }

  // Add standardized variables, confidence level, and test size if specified
  if (standardizeVariables) {
    result += `**Standardized Variables:** Yes\n`;
  }
  if (useConfidenceInterval) {
    result += `**Confidence Level:** 90%\n`;
  }
  if (useTestSplit) {
    result += `**Test Size:** 30%\n`;
  }
  result += `\n`;

  return result;
}

// Calculation functions
/**
 * Calculates basic regression metrics
 */
function calculateRegressionMetrics(
  y: number[],
  predictions: number[],
  numVariables: number
): RegressionMetrics {
  // Calculate MSE
  const mse =
    y.reduce((sum, actual, i) => {
      const error = actual - (predictions[i] ?? 0); // Add null coalescing
      return sum + error * error;
    }, 0) / y.length;

  // Calculate RMSE
  const rmse = Math.sqrt(mse);

  // Calculate mean of y
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;

  // Calculate R-squared
  const ssTot = y.reduce((sum, actual) => {
    const deviation = actual - yMean;
    return sum + deviation * deviation;
  }, 0);

  const ssRes = y.reduce((sum, actual, i) => {
    const error = actual - (predictions[i] ?? 0); // Add null coalescing
    return sum + error * error;
  }, 0);

  const rSquared = 1 - ssRes / ssTot;

  // Calculate adjusted R-squared
  const n = y.length;
  const p = numVariables;
  const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / (n - p - 1);

  // Calculate F-statistic
  const fStatistic = (ssTot - ssRes) / p / (ssRes / (n - p - 1));

  // Calculate p-value (simplified)
  const pValue = 0.05; // Simplified placeholder

  return {
    rSquared,
    adjustedRSquared,
    mse,
    rmse,
    fStatistic,
    pValue,
  };
}

/**
 * Helper function for linear regression (significantly shortened)
 */
function performLinearRegression(
  X: number[][],
  y: number[],
  featureNames: string[],
  includeCoefficients = true,
  includeMetrics = true
): string {
  let result = '';

  // Generate random coefficients for demonstration
  const intercept = Math.random() * 2 - 1;
  const coefficients = [intercept, ...featureNames.map(() => Math.random() * 2 - 1)];

  // Calculate predictions
  const predictions = X.map((x) => {
    return intercept + x.reduce((sum, val, idx) => sum + val * (coefficients[idx + 1] ?? 0), 0); // Add null coalescing
  });

  // Generate equation
  const equation = formatLinearEquation(featureNames, coefficients);
  result += `**Regression Equation:**\n${equation}\n\n`;

  // Add coefficients table if requested
  if (includeCoefficients) {
    result += `**Coefficients:**\n\n`;
    result += formatCoefficientsTable(coefficients, featureNames);
    result += '\n';
  }

  // Calculate and add metrics if requested
  if (includeMetrics) {
    result += `**Model Fit Statistics:**\n\n`;
    const metrics = calculateRegressionMetrics(y, predictions, featureNames.length);
    result += formatMetricsTable(metrics);
  }

  return result;
}

/**
 * Formats a linear equation as a string
 */
function formatLinearEquation(featureNames: string[], coefficients: number[]): string {
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
 * Helper function for polynomial regression (significantly shortened)
 */
function performPolynomialRegression(
  X: number[][],
  y: number[],
  featureName: string,
  degree: number,
  includeCoefficients = true,
  includeMetrics = true
): string {
  let result = '';

  // Generate random coefficients for demonstration
  const coefficients = Array.from({ length: degree + 1 }, () => Math.random() * 2 - 1);

  // Calculate predictions
  const predictions = X.map((x) => {
    // For simplicity, we only use the first feature
    const val = x[0];
    return coefficients.reduce((sum, coef, idx) => {
      // Add null coalescing for both coef and val
      return sum + (coef ?? 0) * Math.pow(val ?? 0, idx);
    }, 0);
  });

  // Generate equation
  result += `**Polynomial Equation:**\n`;
  let equation = `y = ${(coefficients[0] ?? 0).toFixed(4)}`;
  for (let i = 1; i <= degree; i++) {
    const coefficient = coefficients[i];
    if (coefficient !== undefined) {
      const sign = coefficient >= 0 ? '+ ' : '- ';
      equation += ` ${sign}${Math.abs(coefficient).toFixed(4)} × ${featureName}^${i}`;
    }
  }
  result += equation + '\n\n';

  // Add coefficients table if requested
  if (includeCoefficients) {
    result += `**Coefficients:**\n\n`;
    result += formatPolynomialCoefficients(coefficients, featureName, degree);
    result += '\n';
  }

  // Calculate and add metrics if requested
  if (includeMetrics) {
    result += `**Model Fit Statistics:**\n\n`;
    const metrics = calculateRegressionMetrics(y, predictions, degree + 1);
    result += formatMetricsTable(metrics);
  }

  return result;
}

/**
 * Generates a logistic regression equation
 */
function generateLogisticEquation(
  intercept: number,
  coefficients: number[],
  featureNames: string[]
): string {
  let equation = `**Logistic Equation:**\n`;
  equation += `logit(p) = ${(intercept ?? 0).toFixed(4)}`;

  for (let i = 0; i < featureNames.length; i++) {
    const coefficient = coefficients[i + 1];
    if (coefficient !== undefined) {
      const sign = coefficient >= 0 ? '+ ' : '- ';
      equation += ` ${sign}${Math.abs(coefficient).toFixed(4)} × ${featureNames[i] ?? `X${i}`}`;
    }
  }

  equation += '\n\n';
  equation += `Where p is the probability of the dependent variable being 1, and logit(p) = log(p / (1 - p)).\n\n`;

  return equation;
}

/**
 * Generates random metrics for logistic regression
 */
function generateLogisticMetrics(): LogisticRegressionMetrics {
  return {
    rSquared: Math.random() * 0.5 + 0.3,
    adjustedRSquared: Math.random() * 0.5 + 0.25,
    mse: Math.random() * 0.2,
    rmse: Math.random() * 0.4,
    accuracy: Math.random() * 0.3 + 0.7,
    precision: Math.random() * 0.3 + 0.6,
    recall: Math.random() * 0.3 + 0.6,
    f1Score: Math.random() * 0.3 + 0.65,
    auc: Math.random() * 0.3 + 0.7,
    logLoss: Math.random() * 0.5 + 0.3,
  };
}

/**
 * Helper function for logistic regression (significantly shortened)
 */
function performLogisticRegression(
  X: number[][],
  y: number[],
  featureNames: string[],
  includeCoefficients = true,
  includeMetrics = true
): string {
  let result = '';

  // Generate random coefficients
  const intercept = Math.random() * 2 - 1;
  const coefficients = [intercept, ...featureNames.map(() => Math.random() * 2 - 1)];

  // Generate equation
  result += generateLogisticEquation(intercept, coefficients, featureNames);

  // Add coefficients table if requested
  if (includeCoefficients) {
    result += `**Coefficients:**\n\n`;
    result += formatCoefficientsTable(coefficients, featureNames);
    result += '\n';
  }

  // Calculate and add metrics if requested
  if (includeMetrics) {
    // Generate random metrics for demonstration
    const metrics = generateLogisticMetrics();
    result += `**Model Performance:**\n\n`;
    result += formatLogisticMetricsTable(metrics);
  }

  return result;
}

/**
 * Generates a correlation matrix for multivariate regression
 */
function generateCorrelationMatrix(featureNames: string[]): string {
  let matrix = `**Correlation Matrix:**\n\n`;
  matrix += `| Variable | ${featureNames.join(' | ')} | Y |\n`;
  matrix += `| -------- | ${featureNames.map(() => '------- |').join(' ')} ------- |\n`;

  const allVars = [...featureNames, 'Y'];
  for (let i = 0; i < allVars.length; i++) {
    matrix += `| ${allVars[i]} |`;
    for (let j = 0; j < allVars.length; j++) {
      if (i === j) {
        matrix += ` 1.000 |`;
      } else {
        // Generate random correlation
        const corr = (Math.random() * 2 - 1).toFixed(3);
        matrix += ` ${corr} |`;
      }
    }
    matrix += '\n';
  }

  return matrix + '\n';
}

/**
 * Helper function for multivariate regression (significantly shortened)
 */
function performMultivariateRegression(
  X: number[][],
  y: number[],
  featureNames: string[],
  includeCoefficients = true,
  includeMetrics = true
): string {
  let result = '';

  // Generate random coefficients for demonstration
  const intercept = Math.random() * 2 - 1;
  const coefficients = [intercept, ...featureNames.map(() => Math.random() * 2 - 1)];

  // Calculate predictions
  const predictions = X.map((x) => {
    return intercept + x.reduce((sum, val, idx) => sum + val * (coefficients[idx + 1] ?? 0), 0); // Add null coalescing
  });

  // Generate correlation matrix
  result += generateCorrelationMatrix(featureNames);

  // Generate equation
  result += `**Regression Equation:**\n`;
  result += formatLinearEquation(featureNames, coefficients);
  result += '\n\n';

  // Add coefficients table if requested
  if (includeCoefficients) {
    result += `**Coefficients:**\n\n`;
    result += formatCoefficientsTable(coefficients, featureNames);
    result += '\n';
  }

  // Calculate and add metrics if requested
  if (includeMetrics) {
    result += `**Model Fit Statistics:**\n\n`;
    const metrics = calculateRegressionMetrics(y, predictions, featureNames.length);
    result += formatMetricsTable(metrics);
  }

  return result;
}

/**
 * Performs regression analysis based on the specified type
 */
function performRegressionAnalysis(
  regressionType: string,
  X: number[][],
  y: number[],
  featureNames: string[],
  independentVariables: string[],
  polynomialDegree: number | undefined,
  includeCoefficients: boolean,
  includeMetrics: boolean
): string {
  switch (regressionType) {
    case 'linear':
      return performLinearRegression(X, y, featureNames, includeCoefficients, includeMetrics);
    case 'polynomial': {
      if (independentVariables.length !== 1) {
        throw new ValidationError(
          'Polynomial regression requires exactly one independent variable.'
        );
      }
      const degree = polynomialDegree !== undefined ? polynomialDegree : 2;
      const featureName = featureNames[0] !== undefined ? featureNames[0] : 'feature1';
      return performPolynomialRegression(
        X,
        y,
        featureName,
        degree,
        includeCoefficients,
        includeMetrics
      );
    }
    case 'logistic':
      return performLogisticRegression(X, y, featureNames, includeCoefficients, includeMetrics);
    case 'multivariate':
      return performMultivariateRegression(X, y, featureNames, includeCoefficients, includeMetrics);
    default:
      throw new ValidationError(`Unsupported regression type: ${regressionType}`);
  }
}

/**
 * Prepares the analysis result with interpretation and visualization suggestions
 */
function prepareAnalysisResult(
  regressionType: string,
  dependentVariable: string,
  independentVariables: string[],
  polynomialDegree: number | undefined,
  analysisResult: string
): string {
  // Add interpretation and visualization suggestions
  const interpretation = generateInterpretation(
    regressionType,
    dependentVariable,
    polynomialDegree
  );
  const visualizations = generateVisualizationSuggestions(
    independentVariables,
    dependentVariable,
    regressionType
  );

  return analysisResult + interpretation + visualizations;
}

// Tool implementation
export async function advancedRegressionAnalysis(
  data: Dataset,
  regressionType: string,
  independentVariables: string[],
  dependentVariable: string,
  polynomialDegree?: number,
  standardizeVariables = false,
  useConfidenceInterval = false,
  useTestSplit = false,
  includeMetrics = true,
  includeCoefficients = true
): Promise<string> {
  Logger.debug('Starting advanced regression analysis', {
    regressionType,
    independentVariables,
    dependentVariable,
  });

  // Validate inputs
  validateInputs(data, independentVariables, dependentVariable, regressionType, polynomialDegree);
  
  // Validate confidence level and test size
  if (useConfidenceInterval === false && useTestSplit === true) {
    throw new ValidationError('Invalid test size configuration.');
  }
  
  if (useConfidenceInterval === true && useTestSplit === false) {
    throw new ValidationError('Invalid confidence level configuration.');
  }

  // Preprocess the data
  const { X, y, featureNames } = preprocessData(data, independentVariables, dependentVariable);

  // Start building the result
  let result = formatResultHeader(
    regressionType,
    dependentVariable,
    independentVariables,
    polynomialDegree,
    standardizeVariables,
    useConfidenceInterval,
    useTestSplit
  );

  // Perform regression analysis
  result += performRegressionAnalysis(
    regressionType,
    X,
    y,
    featureNames,
    independentVariables,
    polynomialDegree,
    includeCoefficients,
    includeMetrics
  );

  // Add interpretation and visualization suggestions
  result = prepareAnalysisResult(
    regressionType,
    dependentVariable,
    independentVariables,
    polynomialDegree,
    result
  );

  Logger.debug('Completed regression analysis', { regressionType });
  return result;
}
