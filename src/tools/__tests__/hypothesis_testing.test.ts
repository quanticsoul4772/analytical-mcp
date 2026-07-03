import { describe, it, expect } from '@jest/globals';
import { hypothesisTesting } from '../hypothesis_testing.js';
import { ValidationError } from '../../utils/errors.js';
import {
  tTestPValue,
  chiSquarePValue,
  fTestPValue,
  studentTCdf,
  fCdf,
  chiSquareCdf,
} from '../../utils/statistics.js';

describe('Statistical distribution functions - known values', () => {
  it('computes the two-tailed t-test p-value for t=2.086, df=20', () => {
    expect(tTestPValue(2.086, 20)).toBeCloseTo(0.0499, 3);
  });

  it('computes the correlation significance p-value for r=0.632, n=10', () => {
    const r = 0.632;
    const n = 10;
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    expect(tTestPValue(t, n - 2)).toBeCloseTo(0.05, 3);
  });

  it('computes the chi-square p-value for chi2=3.841, df=1', () => {
    expect(chiSquarePValue(3.841, 1)).toBeCloseTo(0.05, 3);
  });

  it('computes the F-test p-value for F=4.96, df=(1,10)', () => {
    expect(fTestPValue(4.96, 1, 10)).toBeCloseTo(0.05, 3);
  });

  it('produces symmetric and bounded CDF values', () => {
    expect(studentTCdf(0, 10)).toBeCloseTo(0.5, 10);
    expect(studentTCdf(-2, 15) + studentTCdf(2, 15)).toBeCloseTo(1, 10);
    expect(fCdf(0, 3, 10)).toBe(0);
    expect(chiSquareCdf(0, 2)).toBe(0);
    expect(chiSquareCdf(1000, 3)).toBeCloseTo(1, 10);
  });

  it('supports one-sided t-test tails', () => {
    const twoSided = tTestPValue(2.086, 20, 'two-sided');
    const greater = tTestPValue(2.086, 20, 'greater');
    const less = tTestPValue(2.086, 20, 'less');
    expect(greater).toBeCloseTo(twoSided / 2, 10);
    expect(greater + less).toBeCloseTo(1, 10);
  });
});

describe('Hypothesis Testing - independent t-test (Welch)', () => {
  it('rejects the null hypothesis for clearly separated groups', async () => {
    const result = await hypothesisTesting('t_test_independent', [
      [5.1, 4.9, 5.3, 5.2, 4.8],
      [4.2, 4.0, 4.4, 4.1, 4.3],
    ]);

    expect(result).toContain('Hypothesis Testing Report');
    expect(result).toContain('Independent T-Test Results (Welch)');
    expect(result).toContain('Reject null hypothesis');
  });

  it('fails to reject for identical groups (t = 0, p = 1)', async () => {
    const result = await hypothesisTesting('t_test_independent', [
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ]);

    expect(result).toContain('T-Statistic | 0.0000');
    expect(result).toContain('P-Value (two-sided) | 1.0000');
    expect(result).toContain('Fail to reject null hypothesis');
  });

  it('honors the alpha parameter in the conclusion', async () => {
    // t = -2.5, df = 8 -> two-tailed p ~ 0.0369: significant at 0.05, not at 0.01
    const data = [
      [1, 2, 3, 4, 5],
      [3.5, 4.5, 5.5, 6.5, 7.5],
    ];

    const atFive = await hypothesisTesting('t_test_independent', data, undefined, 0.05);
    const atOne = await hypothesisTesting('t_test_independent', data, undefined, 0.01);

    expect(atFive).toContain('P-Value (two-sided) | 0.0369');
    expect(atFive).toContain('Reject null hypothesis at alpha = 0.05');
    expect(atOne).toContain('Fail to reject null hypothesis at alpha = 0.01');
  });

  it('rejects groups with fewer than 2 observations', async () => {
    await expect(hypothesisTesting('t_test_independent', [[1], [2, 3]])).rejects.toThrow(
      ValidationError
    );
  });
});

describe('Hypothesis Testing - paired t-test', () => {
  it('computes the paired test on the differences', async () => {
    // diffs = [-2, -1, -1, -2, -2], mean -1.6, t ~ -6.53, df 4, p ~ 0.0028
    const result = await hypothesisTesting('t_test_paired', [
      [10, 12, 14, 16, 18],
      [12, 13, 15, 18, 20],
    ]);

    expect(result).toContain('Paired T-Test Results');
    expect(result).toContain('Mean Difference | -1.6000');
    expect(result).toContain('Degrees of Freedom | 4');
    expect(result).toContain('P-Value (two-sided) | 0.0028');
    expect(result).toContain('Reject null hypothesis');
  });

  it('rejects unequal-length groups', async () => {
    await expect(
      hypothesisTesting('t_test_paired', [
        [1, 2, 3],
        [1, 2],
      ])
    ).rejects.toThrow(ValidationError);
  });
});

describe('Hypothesis Testing - correlation', () => {
  it('tests significance with t = r*sqrt((n-2)/(1-r^2)), df = n-2', async () => {
    // Perfectly linear with noise-free slope: r = 1 -> p = 0
    const records = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => ({ x, y: 2 * x + 1 }));
    const result = await hypothesisTesting('correlation', [records], ['x', 'y']);

    expect(result).toContain('Correlation Analysis');
    expect(result).toContain("Pearson's r | 1.0000");
    expect(result).toContain('Degrees of Freedom | 8');
    expect(result).toContain('P-Value (two-sided) | 0.0000');
    expect(result).toContain('Reject null hypothesis');
  });

  it('accepts two numeric arrays and reports a non-significant weak correlation', async () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = [3, 1, 4, 1, 5, 9, 2, 6];
    const result = await hypothesisTesting('correlation', [x, y]);

    expect(result).toContain('Correlation Analysis');
    expect(result).toContain('Degrees of Freedom | 6');
    expect(result).toContain('Fail to reject null hypothesis');
  });

  it('rejects samples with fewer than 3 observations', async () => {
    await expect(
      hypothesisTesting('correlation', [
        [1, 2],
        [3, 4],
      ])
    ).rejects.toThrow(ValidationError);
  });
});

describe('Hypothesis Testing - chi-square', () => {
  it('computes the test of independence on a contingency table', async () => {
    // Expected counts all 15; chi2 = 4 * 25/15 = 6.6667, df = 1, p ~ 0.0098
    const result = await hypothesisTesting('chi_square', [
      [10, 20],
      [20, 10],
    ]);

    expect(result).toContain('Chi-Square Test of Independence');
    expect(result).toContain('Chi-Square | 6.6667');
    expect(result).toContain('Degrees of Freedom | 1');
    expect(result).toContain('P-Value | 0.0098');
    expect(result).toContain('Reject null hypothesis');
  });

  it('rejects tables smaller than 2x2', async () => {
    await expect(hypothesisTesting('chi_square', [[5, 5]])).rejects.toThrow(ValidationError);
  });

  it('rejects negative counts', async () => {
    await expect(
      hypothesisTesting('chi_square', [
        [10, -5],
        [5, 10],
      ])
    ).rejects.toThrow(ValidationError);
  });
});

describe('Hypothesis Testing - one-way ANOVA', () => {
  it('rejects the null when one group mean clearly differs', async () => {
    const result = await hypothesisTesting('anova', [
      [1, 2, 3],
      [2, 3, 4],
      [10, 11, 12],
    ]);

    expect(result).toContain('One-Way ANOVA Results');
    expect(result).toContain('Degrees of Freedom | (2, 6)');
    expect(result).toContain('Reject null hypothesis');
  });

  it('fails to reject for near-identical groups', async () => {
    const result = await hypothesisTesting('anova', [
      [1, 2, 3, 4],
      [2, 1, 4, 3],
      [3, 4, 1, 2],
    ]);

    expect(result).toContain('F-Statistic | 0.0000');
    expect(result).toContain('Fail to reject null hypothesis');
  });

  it('rejects a single group', async () => {
    await expect(hypothesisTesting('anova', [[1, 2, 3]])).rejects.toThrow(ValidationError);
  });
});

describe('Hypothesis Testing - input validation', () => {
  it('rejects unsupported test types via schema validation', async () => {
    await expect(
      hypothesisTesting('z_test', [
        [1, 2, 3],
        [4, 5, 6],
      ])
    ).rejects.toThrow(ValidationError);
  });

  it('rejects alpha outside the allowed range', async () => {
    await expect(
      hypothesisTesting(
        't_test_independent',
        [
          [1, 2, 3],
          [4, 5, 6],
        ],
        undefined,
        0.5
      )
    ).rejects.toThrow(ValidationError);
  });
});
