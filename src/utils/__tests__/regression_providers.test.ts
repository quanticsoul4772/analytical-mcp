import { describe, it, expect } from '@jest/globals';
import {
  fitOls,
  solveLinearSystem,
  LinearRegressionProvider,
} from '../linear_regression_provider.js';
import { PolynomialRegressionProvider } from '../polynomial_regression_provider.js';
import { LogisticRegressionProvider } from '../logistic_regression_provider.js';
import { MultivariateRegressionProvider } from '../multivariate_regression_provider.js';
import { RegressionMetricsProvider } from '../regression_metrics_provider.js';
import { RegressionValidationProvider } from '../regression_validation_provider.js';
import { ValidationError, DataProcessingError } from '../errors.js';

describe('OLS numerical core', () => {
  it('solves a linear system exactly', () => {
    // 2a + b = 5, a + 3b = 10 => a = 1, b = 3
    const x = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10]
    );
    expect(x[0]).toBeCloseTo(1, 10);
    expect(x[1]).toBeCloseTo(3, 10);
  });

  it('throws DataProcessingError for a singular system', () => {
    expect(() =>
      solveLinearSystem(
        [
          [1, 2],
          [2, 4],
        ],
        [3, 6]
      )
    ).toThrow(DataProcessingError);
  });

  it('recovers exact coefficients for y = 2x + 1', () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [3, 5, 7, 9, 11];
    const { coefficients, predictions } = fitOls(X, y);
    expect(coefficients[0]).toBeCloseTo(1, 8);
    expect(coefficients[1]).toBeCloseTo(2, 8);
    predictions.forEach((p, i) => expect(p).toBeCloseTo(y[i] ?? 0, 8));
  });

  it('requires at least k+2 observations for k predictors', () => {
    expect(() => fitOls([[1], [2]], [3, 5])).toThrow(ValidationError);
  });

  it('throws DataProcessingError for collinear predictors', () => {
    const X = [
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 8],
    ];
    expect(() => fitOls(X, [1, 2, 3, 4])).toThrow(DataProcessingError);
  });

  it('solves a well-conditioned system despite a huge column-scale gap', () => {
    // Diagonal system with entries 1e12 and 1e-6 — not collinear, but pre-fix the
    // global scale (1e12) inflated the tolerance to 100 and wrongly rejected the
    // 1e-6 pivot as singular. Equilibration makes the singularity test scale-invariant.
    const x = solveLinearSystem(
      [
        [1e12, 0],
        [0, 1e-6],
      ],
      [1e12, 1e-6]
    );
    expect(x[0]).toBeCloseTo(1, 10);
    expect(x[1]).toBeCloseTo(1, 10);
  });

  it('recovers coefficients when predictors differ by ~1e6 in scale', () => {
    // y = 10 + 2*x1 + 0.001*x2 with x1 ~ 1..12 and x2 ~ 1e6, genuinely independent.
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 12; i++) {
      const x1 = i + 1;
      const x2 = 1_000_000 + ((i * 37) % 11) * 90_000;
      X.push([x1, x2]);
      y.push(10 + 2 * x1 + 0.001 * x2);
    }
    const { coefficients } = fitOls(X, y);
    expect(coefficients[0]).toBeCloseTo(10, 4);
    expect(coefficients[1]).toBeCloseTo(2, 4);
    expect(coefficients[2]).toBeCloseTo(0.001, 6);
  });
});

describe('RegressionMetricsProvider', () => {
  const provider = new RegressionMetricsProvider();

  it('computes hand-checked metrics for an imperfect fit', () => {
    // actual = 2,4,5,4,5 vs OLS predictions of y on x=1..5
    const actual = [2, 4, 5, 4, 5];
    const predicted = [2.8, 3.4, 4, 4.6, 5.2];
    const metrics = provider.calculateRegressionMetrics(actual, predicted, 1);
    expect(metrics.rSquared).toBeCloseTo(0.6, 10);
    expect(metrics.adjustedRSquared).toBeCloseTo(1 - (0.4 * 4) / 3, 10);
    expect(metrics.mse).toBeCloseTo(0.48, 10);
    expect(metrics.rmse).toBeCloseTo(Math.sqrt(0.48), 10);
    expect(metrics.mae).toBeCloseTo(0.64, 10);
    expect(metrics.fStatistic).toBeCloseTo(4.5, 10);
  });

  it('reports R² = 1 and no F-statistic for a perfect fit', () => {
    const values = [1, 2, 3, 4, 5];
    const metrics = provider.calculateRegressionMetrics(values, [...values], 1);
    expect(metrics.rSquared).toBe(1);
    expect(metrics.adjustedRSquared).toBe(1);
    expect(metrics.mse).toBe(0);
    expect(metrics.fStatistic).toBeUndefined();
  });

  it('computes real classification metrics and AUC', () => {
    const actual = [0, 0, 1, 1];
    const predicted = [0.1, 0.4, 0.6, 0.9];
    const metrics = provider.calculateLogisticRegressionMetrics(actual, predicted, 1);
    expect(metrics.accuracy).toBe(1);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.f1Score).toBe(1);
    expect(metrics.auc).toBe(1);
    // log loss = -(ln 0.9 + ln 0.6 + ln 0.6 + ln 0.9) / 4
    const expectedLogLoss = -(Math.log(0.9) + Math.log(0.6) + Math.log(0.6) + Math.log(0.9)) / 4;
    expect(metrics.logLoss).toBeCloseTo(expectedLogLoss, 10);
    // Brier MSE = (0.01 + 0.16 + 0.16 + 0.01) / 4
    expect(metrics.mse).toBeCloseTo(0.085, 10);
  });

  it('generates a real correlation matrix from data', () => {
    const X = [
      [1, 5],
      [2, 4],
      [3, 3],
      [4, 2],
      [5, 1],
    ];
    const result = provider.generateCorrelationMatrix(X, ['a', 'b']);
    // a and b are perfectly negatively correlated
    expect(result).toContain('| a | 1.000 | -1.000 |');
    expect(result).toContain('| b | -1.000 | 1.000 |');
  });

  it('computes Pearson correlation exactly', () => {
    expect(provider.pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
    expect(provider.pearsonCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10);
    expect(provider.pearsonCorrelation([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});

describe('LinearRegressionProvider', () => {
  const provider = new LinearRegressionProvider();

  it('reports exact coefficients in the formatted output', () => {
    const result = provider.performLinearRegression(
      [[1], [2], [3], [4], [5]],
      [3, 5, 7, 9, 11],
      ['x']
    );
    expect(result).toContain('y = 1.0000 + 2.0000 × x');
    expect(result).toContain('| R² | 1.0000 |');
  });
});

describe('PolynomialRegressionProvider', () => {
  const provider = new PolynomialRegressionProvider();
  const X = [[-2], [-1], [0], [1], [2], [3]];
  const y = X.map((row) => {
    const x = row[0] ?? 0;
    return 1 + 2 * x + 3 * x * x;
  });

  it('recovers exact quadratic coefficients', () => {
    const result = provider.performPolynomialRegression(X, y, 'x', 2);
    expect(result).toContain('y = 1.0000 + 2.0000 × x^1 + 3.0000 × x^2');
    expect(result).toContain('| R² | 1.0000 |');
  });

  it('selects degree 2 as optimal for quadratic data', () => {
    const { optimalDegree } = provider.findOptimalDegree(X, y, 3);
    expect(optimalDegree).toBe(2);
  });
});

describe('LogisticRegressionProvider', () => {
  const provider = new LogisticRegressionProvider();

  it('separates linearly separable classes with accuracy 1', () => {
    const X = [[-3], [-2], [-1], [1], [2], [3]];
    const y = [0, 0, 0, 1, 1, 1];
    const result = provider.performLogisticRegression(X, y, ['x']);
    expect(result).toContain('| Accuracy | 1.0000 |');
    expect(result).toContain('| AUC | 1.0000 |');
  });

  it('fits a separable dataset when a predictor is on a ~1e3 scale', () => {
    // IRLS also routes through solveLinearSystem; a large-scale predictor could
    // trigger the same false singular rejection. x2 is ~1e3, class-separating.
    const X = [
      [-3, -3000],
      [-2, -2000],
      [-1, -1000],
      [1, 1000],
      [2, 2000],
      [3, 3000],
    ];
    const y = [0, 0, 0, 1, 1, 1];
    const result = provider.performLogisticRegression(X, y, ['x1', 'x2']);
    expect(result).toContain('| Accuracy | 1.0000 |');
    expect(result).toContain('| AUC | 1.0000 |');
  });

  it('rejects non-binary outcomes', () => {
    expect(() =>
      provider.performLogisticRegression([[1], [2], [3]], [0, 1, 2], ['x'])
    ).toThrow(ValidationError);
  });

  it('rejects single-class outcomes', () => {
    expect(() =>
      provider.performLogisticRegression([[1], [2], [3]], [1, 1, 1], ['x'])
    ).toThrow(ValidationError);
  });
});

describe('MultivariateRegressionProvider', () => {
  const provider = new MultivariateRegressionProvider();

  it('reports infinite VIF for perfectly collinear features', () => {
    // b is exactly 2a => infinite VIF for both
    const X = [
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 8],
      [5, 10],
      [6, 12],
    ];
    const result = provider.calculateVarianceInflationFactors(X, ['a', 'b']);
    expect(result).toContain('| a | Inf | High multicollinearity |');
    expect(result).toContain('| b | Inf | High multicollinearity |');
  });

  it('reports finite VIF for weakly related features', () => {
    const X = [
      [1, 5],
      [2, 3],
      [3, 8],
      [4, 1],
      [5, 9],
      [6, 2],
    ];
    const result = provider.calculateVarianceInflationFactors(X, ['a', 'b']);
    expect(result).not.toContain('| Inf |');
    const vifMatch = result.match(/\| a \| ([\d.]+) \|/);
    expect(vifMatch).not.toBeNull();
    const vif = Number(vifMatch?.[1]);
    expect(vif).toBeGreaterThanOrEqual(1);
    expect(vif).toBeLessThan(2);
  });

  it('reports VIF of 1 for a single feature', () => {
    const result = provider.calculateVarianceInflationFactors([[1], [2], [3]], ['a']);
    expect(result).toContain('| a | 1.00 | Low multicollinearity |');
  });
});

describe('RegressionValidationProvider', () => {
  const provider = new RegressionValidationProvider();

  it('z-score standardizes columns', () => {
    const standardized = provider.standardizeColumns([[1], [2], [3], [4], [5]]);
    const column = standardized.map((row) => row[0] ?? 0);
    const mean = column.reduce((sum, v) => sum + v, 0) / column.length;
    const variance = column.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / column.length;
    expect(mean).toBeCloseTo(0, 10);
    expect(variance).toBeCloseTo(1, 10);
  });

  it('rejects standardization of constant columns', () => {
    expect(() => provider.standardizeColumns([[1], [1], [1]])).toThrow(ValidationError);
  });

  it('rejects mismatched confidence/test-split configuration', () => {
    expect(() => provider.validateRegressionConfiguration(true, false)).toThrow(ValidationError);
    expect(() => provider.validateRegressionConfiguration(false, true)).toThrow(ValidationError);
    expect(() => provider.validateRegressionConfiguration(false, false)).not.toThrow();
    expect(() => provider.validateRegressionConfiguration(true, true)).not.toThrow();
  });
});
