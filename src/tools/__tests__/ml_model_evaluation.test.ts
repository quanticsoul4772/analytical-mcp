import { describe, it, expect } from '@jest/globals';
import { evaluateMLModel } from '../ml_model_evaluation.js';
import { ValidationError } from '../../utils/errors.js';

describe('evaluateMLModel — classification', () => {
  it('reports a perfect classifier as all metrics 1.0', async () => {
    const report = await evaluateMLModel(
      'classification',
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      ['accuracy', 'precision', 'recall', 'f1_score']
    );
    expect(report).toContain('**ACCURACY**: 1.0000');
    expect(report).toContain('**PRECISION**: 1.0000');
    expect(report).toContain('**RECALL**: 1.0000');
    expect(report).toContain('**F1 SCORE**: 1.0000');
  });

  it('computes a known confusion matrix correctly', async () => {
    // actual=[1,1,0,0], predicted=[1,0,0,0] -> TP=1, TN=2, FP=0, FN=1
    // accuracy 0.75, precision 1.0, recall 0.5, f1 = 2*(1*0.5)/1.5 = 0.6667
    const report = await evaluateMLModel(
      'classification',
      [1, 1, 0, 0],
      [1, 0, 0, 0],
      ['accuracy', 'precision', 'recall', 'f1_score']
    );
    expect(report).toContain('**ACCURACY**: 0.7500');
    expect(report).toContain('**PRECISION**: 1.0000');
    expect(report).toContain('**RECALL**: 0.5000');
    expect(report).toContain('**F1 SCORE**: 0.6667');
  });

  it('guards precision/recall/F1 to 0 when there are no positive predictions', async () => {
    // predicted all 0 -> TP=0, FP=0 -> precision/recall/f1 would be NaN without the guard
    const report = await evaluateMLModel(
      'classification',
      [1, 1, 0],
      [0, 0, 0],
      ['precision', 'recall', 'f1_score']
    );
    expect(report).toContain('**PRECISION**: 0.0000');
    expect(report).toContain('**RECALL**: 0.0000');
    expect(report).toContain('**F1 SCORE**: 0.0000');
    expect(report).not.toContain('NaN');
  });
});

describe('evaluateMLModel — regression', () => {
  it('reports exact predictions as MSE 0 and R² 1', async () => {
    // actual=[1,2,3], predicted=[1,2,3] -> MSE 0, totalSS 2, RSS 0, R² 1
    const report = await evaluateMLModel(
      'regression',
      [1, 2, 3],
      [1, 2, 3],
      ['mse', 'mae', 'rmse', 'r_squared']
    );
    expect(report).toContain('**MSE**: 0.0000');
    expect(report).toContain('**MAE**: 0.0000');
    expect(report).toContain('**RMSE**: 0.0000');
    expect(report).toContain('**R SQUARED**: 1.0000');
  });

  it('computes MAE and MSE on a known error pattern', async () => {
    // errors = [1, -1, 1] -> MAE 1, MSE 1, RMSE 1
    const report = await evaluateMLModel(
      'regression',
      [2, 2, 2],
      [3, 1, 3],
      ['mae', 'mse', 'rmse']
    );
    expect(report).toContain('**MAE**: 1.0000');
    expect(report).toContain('**MSE**: 1.0000');
    expect(report).toContain('**RMSE**: 1.0000');
  });

  it('guards R² against NaN when the actual values have zero variance', async () => {
    // Constant actuals -> totalSumOfSquares 0; exact match reports R² 1, not NaN
    const exact = await evaluateMLModel('regression', [5, 5, 5], [5, 5, 5], ['r_squared']);
    expect(exact).toContain('**R SQUARED**: 1.0000');
    expect(exact).not.toContain('NaN');

    // Constant actuals, wrong predictions -> R² 0, not NaN
    const wrong = await evaluateMLModel('regression', [5, 5, 5], [6, 6, 6], ['r_squared']);
    expect(wrong).toContain('**R SQUARED**: 0.0000');
    expect(wrong).not.toContain('NaN');
  });
});

describe('evaluateMLModel — input validation', () => {
  it('throws ValidationError on empty input', async () => {
    await expect(evaluateMLModel('classification', [], [])).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError on mismatched lengths', async () => {
    await expect(evaluateMLModel('regression', [1, 2, 3], [1, 2])).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError on an unsupported model type', async () => {
    await expect(evaluateMLModel('clustering', [1, 0], [1, 0])).rejects.toThrow(ValidationError);
  });
});
