import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { logicalFallacyDetector } from '../logical_fallacy_detector.js';
import { ValidationError } from '../../utils/errors.js';

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
});
