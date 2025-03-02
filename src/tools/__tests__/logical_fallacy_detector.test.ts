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

describe('Logical Fallacy Detector', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect ad hominem fallacy', async () => {
    const text = "You're too young to understand climate policy, so your arguments are invalid.";
    const result = await logicalFallacyDetector(text);

    expect(result).toContain('Ad Hominem');
    expect(result).toContain('Attacking the person making the argument');
  });

  it('should detect appeal to authority fallacy', async () => {
    const text = 'The celebrity doctor says this diet works, so it must be true!';
    const result = await logicalFallacyDetector(text, 0.3);

    expect(result).toContain('Appeal to Authority');
    expect(result).toContain('Claiming something is true because an authority figure says so');
  });

  it('should return no fallacies for well-reasoned text', async () => {
    const text =
      'Based on multiple peer-reviewed studies, we can conclude that regular exercise contributes to better cardiovascular health.';
    const result = await logicalFallacyDetector(text);

    expect(result).toContain('No significant logical fallacies detected');
  });

  it('should respect confidence threshold', async () => {
    const text = 'An expert once told me that this theory is probably true.';
    const highConfidenceResult = await logicalFallacyDetector(text, 0.7);
    const lowConfidenceResult = await logicalFallacyDetector(text, 0.3);

    expect(highConfidenceResult).toContain('No significant logical fallacies detected');
    expect(lowConfidenceResult).toContain('Appeal to Authority');
  });

  it('should filter fallacies by category', async () => {
    const text = "Experts claim this diet works, and you're stupid if you don't believe them!";
    const relevanceResult = await logicalFallacyDetector(text, 0.3, ['relevance']);
    const informalResult = await logicalFallacyDetector(text, 0.5, ['relevance']);

    expect(relevanceResult).toContain('Appeal to Authority');
    expect(relevanceResult).toContain('Ad Hominem');

    expect(informalResult).toContain('Ad Hominem');
  });

  // Error handling test cases
  describe('Error Handling', () => {
    it('should throw ValidationError for empty text', async () => {
      await expect(logicalFallacyDetector('')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for null text', async () => {
      // @ts-ignore intentionally passing null for testing
      await expect(logicalFallacyDetector(null)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid categories', async () => {
      await expect(
        // @ts-ignore intentionally passing invalid categories for testing
        logicalFallacyDetector('Some text', 0.5, ['invalid_category'])
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid confidence threshold', async () => {
      await expect(
        // @ts-ignore intentionally passing invalid threshold for testing
        logicalFallacyDetector('Some text', 1.5)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle regex pattern errors gracefully', async () => {
      // Create a scenario that could potentially cause regex errors
      const extremelyLongText = 'a'.repeat(100000); // Very long text that might cause regex issues

      // Should still work without throwing pattern matching errors
      const result = await logicalFallacyDetector(extremelyLongText);
      expect(result).toContain('Logical Fallacy Analysis');
    });
  });
});
