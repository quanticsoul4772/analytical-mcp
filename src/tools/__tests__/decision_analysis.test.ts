import { describe, it, expect, beforeEach } from '@jest/globals';
import { decisionAnalysis } from '../decision_analysis.js';
import { ValidationError } from '../../utils/errors.js';

describe('Decision Analysis', () => {
  beforeEach(() => {
    // Test setup if needed
  });
});

// Split into multiple describe blocks to reduce arrow function size
describe('Decision Analysis - Basic Tests', () => {
  it('should analyze decision options with default weights', async () => {
    const options = ['Option A', 'Option B', 'Option C'];
    const criteria = ['Cost', 'Quality', 'Time'];

    const result = await decisionAnalysis(options, criteria);

    // Check for expected sections in the output
    expect(result).toContain('Decision Analysis Results');
    expect(result).toContain('Ranked Options');
    expect(result).toContain('Detailed Analysis');
    expect(result).toContain('Recommendation');

    // Check that all options are included
    options.forEach((option) => {
      expect(result).toContain(option);
    });

    // Check that all criteria are represented (indirectly through pros/cons)
    expect(result).toContain('Pros:');
    expect(result).toContain('Cons:');
  });

  it('should analyze decision options with custom weights', async () => {
    const options = ['Option A', 'Option B', 'Option C'];
    const criteria = ['Cost', 'Quality', 'Time'];
    const weights = [0.5, 0.3, 0.2];

    const result = await decisionAnalysis(options, criteria, weights);

    // Check for expected sections in the output
    expect(result).toContain('Decision Analysis Results');
    expect(result).toContain('Ranked Options');
    expect(result).toContain('Detailed Analysis');
    expect(result).toContain('Recommendation');

    // Check that all options are included
    options.forEach((option) => {
      expect(result).toContain(option);
    });
  });
});

describe('Decision Analysis - Edge Cases', () => {
  it('should handle a single option and criterion', async () => {
    const options = ['Single Option'];
    const criteria = ['Single Criterion'];

    const result = await decisionAnalysis(options, criteria);

    expect(result).toContain('Decision Analysis Results');
    expect(result).toContain('Single Option');
    expect(result).toContain('Single Criterion');
  });

  it('should handle many options and criteria', async () => {
    const options = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'];
    const criteria = ['Criterion 1', 'Criterion 2', 'Criterion 3', 'Criterion 4', 'Criterion 5'];

    const result = await decisionAnalysis(options, criteria);

    expect(result).toContain('Decision Analysis Results');

    // Check that all options are included
    options.forEach((option) => {
      expect(result).toContain(option);
    });
  });
});

// Error handling test cases - Split into multiple blocks to reduce function size
describe('Decision Analysis - Basic Error Handling', () => {
  it('should throw ValidationError for empty options array', async () => {
    await expect(decisionAnalysis([], ['Criterion'])).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty criteria array', async () => {
    await expect(decisionAnalysis(['Option'], [])).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for non-array options', async () => {
    await expect(
      decisionAnalysis('Not an array' as unknown as string[], ['Criterion'])
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for non-array criteria', async () => {
    await expect(
      decisionAnalysis(['Option'], 'Not an array' as unknown as string[])
    ).rejects.toThrow(ValidationError);
  });
});

describe('Decision Analysis - Input Validation', () => {
  it('should throw ValidationError for empty string in options', async () => {
    await expect(decisionAnalysis(['Option A', ''], ['Criterion'])).rejects.toThrow(
      ValidationError
    );
  });

  it('should throw ValidationError for empty string in criteria', async () => {
    await expect(decisionAnalysis(['Option'], ['Criterion', ''])).rejects.toThrow(ValidationError);
  });
});

describe('Decision Analysis - Weights Validation', () => {
  it('should throw ValidationError when weights length does not match criteria length', async () => {
    await expect(
      decisionAnalysis(['Option A', 'Option B'], ['Cost', 'Quality', 'Time'], [0.5, 0.5])
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid weights', async () => {
    await expect(
      decisionAnalysis(['Option A', 'Option B'], ['Cost', 'Quality'], [0, 0.5] as number[])
    ).rejects.toThrow(ValidationError);
  });

  it('should log a warning when weights do not sum to 1 or 100', async () => {
    const options = ['Option A', 'Option B'];
    const criteria = ['Cost', 'Quality'];
    const weights = [0.3, 0.4]; // Sum = 0.7, not 1

    await decisionAnalysis(options, criteria, weights);

    // Check that a warning was logged
    const logger = jest.requireMock('../../utils/logger') as {
      Logger: {
        debug: jest.Mock;
        info: jest.Mock;
        warn: jest.Mock;
        error: jest.Mock;
        log: jest.Mock;
      };
    };
    expect(logger.Logger.warn).toHaveBeenCalled();
  });
});
