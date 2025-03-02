// Common type definitions for tools
export type DataPoint = Record<string, number | string>;
export type NumericDataPoint = Record<string, number>;
export type Dataset = DataPoint[];
export type NumericDataset = NumericDataPoint[];

// Regression metrics
export interface RegressionMetrics {
  rSquared: number;
  adjustedRSquared: number;
  mse: number;
  rmse: number;
  fStatistic?: number;
  pValue?: number;
}

// Logistic regression specific metrics
export interface LogisticRegressionMetrics extends RegressionMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  logLoss: number;
}

// Enhanced type definition for numeric types
export type MathNumericType = number | Record<string, number>;