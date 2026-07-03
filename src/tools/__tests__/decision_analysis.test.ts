import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { decisionAnalysis } from '../decision_analysis.js';
import { ValidationError } from '../../utils/errors.js';
import { Logger } from '../../utils/logger.js';

// Clear mocks before each test (applies to all describe blocks in this file)
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Decision Analysis - Deterministic Ranking', () => {
  it('ranks options by weighted score with explicit weights', async () => {
    const options = ['Option A', 'Option B'];
    const criteria = ['Cost', 'Quality'];
    const scores = [
      [10, 0], // A: strong on Cost
      [0, 10], // B: strong on Quality
    ];
    const weights = [0.8, 0.2]; // Cost dominates

    const result = await decisionAnalysis({ options, criteria, scores, weights });

    // A = 10*0.8 = 8.00, B = 10*0.2 = 2.00
    expect(result).toContain('**1. Option A** (Score: 8.00)');
    expect(result).toContain('**2. Option B** (Score: 2.00)');
    expect(result).toContain('**Option A** ranks first');
  });

  it('uses equal weights when none are provided', async () => {
    const options = ['Balanced', 'Spiky'];
    const criteria = ['C1', 'C2'];
    const scores = [
      [6, 6], // Balanced = 6.00
      [9, 1], // Spiky = 5.00
    ];

    const result = await decisionAnalysis({ options, criteria, scores });

    expect(result).toContain('**1. Balanced** (Score: 6.00)');
    expect(result).toContain('**2. Spiky** (Score: 5.00)');
  });

  it('normalizes weights that do not sum to 1', async () => {
    const options = ['Option A', 'Option B'];
    const criteria = ['Cost', 'Quality'];
    const scores = [
      [8, 4],
      [4, 8],
    ];
    // 2:2 normalizes to 0.5:0.5 -> both options score 6.00
    const warnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => {});
    try {
      const result = await decisionAnalysis({ options, criteria, scores, weights: [2, 2] });
      expect(result).toContain('(Score: 6.00)');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('reports per-criterion contributions', async () => {
    const options = ['Option A'];
    const criteria = ['Cost', 'Quality'];
    const scores = [[8, 4]];
    const weights = [0.5, 0.5];

    const result = await decisionAnalysis({ options, criteria, scores, weights });

    expect(result).toContain('| Criterion | Score | Weight | Contribution |');
    expect(result).toContain('| Cost | 8 | 0.500 | 4.00 |');
    expect(result).toContain('| Quality | 4 | 0.500 | 2.00 |');
  });

  it('derives strengths and weaknesses from the scores', async () => {
    const options = ['Mixed'];
    const criteria = ['Good Criterion', 'Bad Criterion'];
    const scores = [[9, 2]];

    const result = await decisionAnalysis({ options, criteria, scores });

    expect(result).toContain('Strong in "Good Criterion" (score 9)');
    expect(result).toContain('Weak in "Bad Criterion" (score 2)');
  });

  it('is deterministic: identical input yields identical output', async () => {
    const params = {
      options: ['Option A', 'Option B', 'Option C'],
      criteria: ['Cost', 'Quality', 'Time'],
      scores: [
        [5, 7, 3],
        [8, 2, 6],
        [4, 9, 5],
      ],
      weights: [0.5, 0.3, 0.2],
    };

    const first = await decisionAnalysis(params);
    const second = await decisionAnalysis(params);
    expect(first).toBe(second);
  });

  it('supports positional parameters', async () => {
    const result = await decisionAnalysis(
      ['Option A', 'Option B'],
      ['Cost'],
      [[9], [3]],
      undefined
    );

    expect(result).toContain('**1. Option A** (Score: 9.00)');
    expect(result).toContain('**2. Option B** (Score: 3.00)');
  });
});

describe('Decision Analysis - Output Structure', () => {
  it('includes all report sections and mentions the runner-up', async () => {
    const options = ['Option A', 'Option B', 'Option C'];
    const criteria = ['Cost', 'Quality', 'Time'];
    const scores = [
      [9, 8, 7],
      [5, 5, 5],
      [2, 3, 1],
    ];

    const result = await decisionAnalysis({ options, criteria, scores });

    expect(result).toContain('Decision Analysis Results');
    expect(result).toContain('Ranked Options');
    expect(result).toContain('Detailed Analysis');
    expect(result).toContain('Recommendation');
    expect(result).toContain('second-ranked option is **Option B**');
    options.forEach((option) => expect(result).toContain(option));
    criteria.forEach((criterion) => expect(result).toContain(criterion));
  });

  it('handles a single option and criterion', async () => {
    const result = await decisionAnalysis({
      options: ['Single Option'],
      criteria: ['Single Criterion'],
      scores: [[8]],
    });

    expect(result).toContain('**1. Single Option** (Score: 8.00)');
    expect(result).toContain('Strong in "Single Criterion" (score 8)');
    expect(result).not.toContain('second-ranked');
  });
});

describe('Decision Analysis - Scores Validation', () => {
  it('throws ValidationError when scores are missing', async () => {
    await expect(
      decisionAnalysis(['Option A'], ['Cost'], undefined as unknown as number[][])
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when the row count does not match the options', async () => {
    await expect(
      decisionAnalysis({
        options: ['Option A', 'Option B'],
        criteria: ['Cost'],
        scores: [[5]],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when a row length does not match the criteria', async () => {
    await expect(
      decisionAnalysis({
        options: ['Option A'],
        criteria: ['Cost', 'Quality'],
        scores: [[5]],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for scores outside 0-10', async () => {
    await expect(
      decisionAnalysis({ options: ['Option A'], criteria: ['Cost'], scores: [[11]] })
    ).rejects.toThrow(ValidationError);
    await expect(
      decisionAnalysis({ options: ['Option A'], criteria: ['Cost'], scores: [[-1]] })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for non-numeric scores', async () => {
    await expect(
      decisionAnalysis({
        options: ['Option A'],
        criteria: ['Cost'],
        scores: [[Number.NaN]],
      })
    ).rejects.toThrow(ValidationError);
  });
});

describe('Decision Analysis - Basic Error Handling', () => {
  it('throws ValidationError for empty options array', async () => {
    await expect(decisionAnalysis([], ['Criterion'], [])).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for empty criteria array', async () => {
    await expect(decisionAnalysis(['Option'], [], [[5]])).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for non-array options', async () => {
    await expect(
      decisionAnalysis({
        options: 'Not an array' as unknown as string[],
        criteria: ['Criterion'],
        scores: [[5]],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for non-array criteria', async () => {
    await expect(
      decisionAnalysis({
        options: ['Option'],
        criteria: 'Not an array' as unknown as string[],
        scores: [[5]],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for empty string in options', async () => {
    await expect(
      decisionAnalysis(['Option A', ''], ['Criterion'], [[5], [5]])
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for empty string in criteria', async () => {
    await expect(
      decisionAnalysis(['Option'], ['Criterion', ''], [[5, 5]])
    ).rejects.toThrow(ValidationError);
  });
});

describe('Decision Analysis - Weights Validation', () => {
  it('throws ValidationError when weights length does not match criteria length', async () => {
    await expect(
      decisionAnalysis({
        options: ['Option A', 'Option B'],
        criteria: ['Cost', 'Quality', 'Time'],
        scores: [
          [5, 5, 5],
          [5, 5, 5],
        ],
        weights: [0.5, 0.5],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid weights', async () => {
    await expect(
      decisionAnalysis({
        options: ['Option A', 'Option B'],
        criteria: ['Cost', 'Quality'],
        scores: [
          [5, 5],
          [5, 5],
        ],
        weights: [Number.NaN, 0.5],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for negative weights', async () => {
    await expect(
      decisionAnalysis({
        options: ['Option A'],
        criteria: ['Cost', 'Quality'],
        scores: [[5, 5]],
        weights: [-0.5, 1.5],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('logs a warning when weights do not sum to 1 or 100', async () => {
    const warnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => {});

    try {
      await decisionAnalysis({
        options: ['Option A', 'Option B'],
        criteria: ['Cost', 'Quality'],
        scores: [
          [5, 5],
          [5, 5],
        ],
        weights: [0.3, 0.4], // Sum = 0.7, not 1
      });

      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
