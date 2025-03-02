import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { logicalFallacyDetector } from '../logical_fallacy_detector.js';
import { ValidationError, DataProcessingError } from '../../utils/errors.js';

// Mock the Logger
jest.mock('../../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

describe('Logical Fallacy Detector Error Handling', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw ValidationError for empty input', async () => {
    await expect(logicalFallacyDetector('')).rejects.toThrow(ValidationError);
    await expect(logicalFallacyDetector('  ')).rejects.toThrow(ValidationError);
    await expect(logicalFallacyDetector(null as any)).rejects.toThrow(ValidationError);
    await expect(logicalFallacyDetector(undefined as any)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid confidence threshold', async () => {
    await expect(logicalFallacyDetector('test text', -0.1)).rejects.toThrow(ValidationError);
    await expect(logicalFallacyDetector('test text', 1.5)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid categories', async () => {
    await expect(
      logicalFallacyDetector('test text', 0.5, ['invalid_category'] as any)
    ).rejects.toThrow(ValidationError);
  });

  it('should handle and propagate errors from pattern matching', async () => {
    // Create a RegExp that will throw an error when used
    const badRegExp = /a/;
    badRegExp.test = jest.fn<(string: string) => boolean>().mockImplementation(() => {
      throw new Error('Simulated RegExp error');
    });

    // Patch getFallacyDefinitions to include our bad RegExp
    const originalGetFallacyDefinitions = (logicalFallacyDetector as any).__proto__.constructor
      .getFallacyDefinitions;
    (logicalFallacyDetector as any).__proto__.constructor.getFallacyDefinitions = jest
      .fn()
      .mockReturnValue([
        {
          name: 'Test Fallacy',
          category: 'test',
          description: 'Test description',
          signals: [badRegExp],
          confidence: 0.7,
          examples: { bad: 'Bad example', good: 'Good example' },
        },
      ]);

    // Run the test and verify it throws a DataProcessingError
    await expect(logicalFallacyDetector('Test text')).rejects.toThrow(DataProcessingError);

    // Restore the original function
    (logicalFallacyDetector as any).__proto__.constructor.getFallacyDefinitions =
      originalGetFallacyDefinitions;
  });

  it('should handle and wrap unexpected errors', async () => {
    // Force an unexpected error during processing
    const mockZodParse = jest.fn().mockImplementation(() => {
      throw new Error('Unexpected test error');
    });

    // Save original parse function
    const originalParse = (logicalFallacyDetector as any).__proto__.constructor
      .logicalFallacyDetectorSchemaDefinition.parse;

    // Replace with mock
    (
      logicalFallacyDetector as any
    ).__proto__.constructor.logicalFallacyDetectorSchemaDefinition.parse = mockZodParse;

    // Test
    await expect(logicalFallacyDetector('Test text')).rejects.toThrow(DataProcessingError);

    // Restore
    (
      logicalFallacyDetector as any
    ).__proto__.constructor.logicalFallacyDetectorSchemaDefinition.parse = originalParse;
  });
});
