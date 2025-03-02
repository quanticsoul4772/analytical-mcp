import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { perspectiveShifter } from '../perspective_shifter.js';
import { ValidationError, APIError } from '../../utils/errors.js';

// Mock the exaResearch utility
jest.mock('../../utils/exa_research.js', () => {
  return {
    exaResearch: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          results: [
            { title: 'Test Result 1', contents: 'This is test content for perspective 1.' },
            { title: 'Test Result 2', contents: 'This is test content for perspective 2.' },
          ],
        });
      }),
      extractKeyFacts: jest
        .fn()
        .mockReturnValue([
          'Key fact 1 for testing perspectives.',
          'Key fact 2 for testing perspectives.',
        ]),
    },
  };
});

// Mock the Logger
jest.mock('../../utils/logger.js', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

// Main test suite - split into multiple describe blocks to reduce arrow function size
describe('Perspective Shifter - Basic Tests', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate perspectives for a given problem', async () => {
    const problem = 'How to improve customer retention?';
    const result = await perspectiveShifter(problem);

    // Check for expected sections in the output
    expect(result).toContain('Perspective Shifting Analysis');
    expect(result).toContain('Original Problem: How to improve customer retention?');
    expect(result).toContain('Key fact 1 for testing perspectives.');
    expect(result).toContain('Key fact 2 for testing perspectives.');
  });

  it('should respect the shiftType parameter', async () => {
    const problem = 'How to improve customer retention?';
    const result = await perspectiveShifter(problem, 'default', 'discipline');

    // Should contain discipline perspective
    expect(result).toContain('TECHNOLOGY Perspective');
  });
});

// Parameter behavior tests
describe('Perspective Shifter - Parameter Tests', () => {
  it('should include actionable insights when requested', async () => {
    const problem = 'How to improve customer retention?';
    const result = await perspectiveShifter(problem, 'default', 'stakeholder', 2, true);

    expect(result).toContain('Actionable Insights');
  });

  it('should not include actionable insights when not requested', async () => {
    const problem = 'How to improve customer retention?';
    const result = await perspectiveShifter(problem, 'default', 'stakeholder', 2, false);

    expect(result).not.toContain('Actionable Insights');
  });

  it('should respect the numberOfPerspectives parameter', async () => {
    const problem = 'How to improve customer retention?';
    const result = await perspectiveShifter(problem, 'default', 'stakeholder', 1);

    // Should only contain one perspective section
    const matches = result.match(/Perspective/g);
    expect(matches?.length).toBe(2); // 1 for title + 1 for the perspective
  });
});

// Error handling test cases
describe('Perspective Shifter - Error Tests', () => {
  it('should throw ValidationError for empty problem', async () => {
    await expect(perspectiveShifter('')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid shiftType', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(perspectiveShifter('Problem', 'default', 'invalid_type' as any)).rejects.toThrow(
      ValidationError
    );
  });

  it('should throw ValidationError for invalid numberOfPerspectives', async () => {
    await expect(perspectiveShifter('Problem', 'default', 'stakeholder', 0)).rejects.toThrow(
      ValidationError
    );
    await expect(perspectiveShifter('Problem', 'default', 'stakeholder', 11)).rejects.toThrow(
      ValidationError
    );
  });

  it('should handle API errors from exaResearch', async () => {
    // Mock exaResearch.search to throw an APIError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockExaResearch = jest.requireMock('../../utils/exa_research.js') as any;
    mockExaResearch.exaResearch.search.mockRejectedValueOnce(
      new APIError('API error', 429, true, 'test/endpoint')
    );

    await expect(perspectiveShifter('Problem')).rejects.toThrow(APIError);
  });
});
