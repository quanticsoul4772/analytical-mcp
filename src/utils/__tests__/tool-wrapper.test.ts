import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { wrapToolHandler, wrapDataProcessor } from '../tool-wrapper.js';
import { ValidationError, ToolExecutionError, DataProcessingError } from '../errors.js';
import { z } from 'zod';

// Mock the Logger
jest.mock('../logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

describe('Tool Wrapper', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('wrapToolHandler', () => {
    // Test schema for validation
    const testSchema = z.object({
      name: z.string(),
      value: z.number().positive(),
    });

    it('should execute the handler with valid parameters', async () => {
      // Create mock handler
      const mockHandler = jest.fn<(params: any) => Promise<string>>().mockResolvedValue('success');

      // Wrap the handler
      const wrappedHandler = wrapToolHandler(mockHandler, testSchema, 'test-tool');

      // Call with valid parameters
      const result = await wrappedHandler({ name: 'test', value: 42 });

      // Verify handler was called with correct parameters
      expect(mockHandler).toHaveBeenCalledWith({ name: 'test', value: 42 });
      expect(result).toBe('success');
    });

    it('should throw ValidationError for invalid parameters', async () => {
      // Create mock handler that should not be called
      const mockHandler = jest.fn<(params: any) => Promise<string>>().mockResolvedValue('success');

      // Wrap the handler with schema validation
      const wrappedHandler = wrapToolHandler(mockHandler, testSchema, 'test-tool');

      // Call with invalid parameters (negative value)
      await expect(wrappedHandler({ name: 'test', value: -1 })).rejects.toThrow(ValidationError);

      // Verify handler was not called
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should wrap non-analytical errors in ToolExecutionError', async () => {
      // Create mock handler that throws a regular Error
      const mockHandler = jest.fn<(params: any) => Promise<string>>().mockImplementation(() => {
        throw new Error('Something went wrong');
      });

      // Wrap the handler
      const wrappedHandler = wrapToolHandler(mockHandler, testSchema, 'test-tool');

      // Call with valid parameters
      await expect(wrappedHandler({ name: 'test', value: 42 })).rejects.toThrow(ToolExecutionError);
    });

    it('should pass through analytical errors without wrapping', async () => {
      // Create mock handler that throws an AnalyticalError
      const mockHandler = jest.fn<(params: any) => Promise<string>>().mockImplementation(() => {
        throw new ValidationError('Validation failed');
      });

      // Wrap the handler
      const wrappedHandler = wrapToolHandler(mockHandler, testSchema, 'test-tool');

      // Call with valid parameters
      await expect(wrappedHandler({ name: 'test', value: 42 })).rejects.toThrow(ValidationError);
    });
  });

  describe('wrapDataProcessor', () => {
    it('should execute the processor with valid data', () => {
      // Create mock processor
      const mockProcessor = jest.fn().mockReturnValue('processed data');

      // Wrap the processor
      const wrappedProcessor = wrapDataProcessor(mockProcessor, 'test-processor');

      // Call with valid data
      const result = wrappedProcessor('test data');

      // Verify processor was called with correct data
      expect(mockProcessor).toHaveBeenCalledWith('test data');
      expect(result).toBe('processed data');
    });

    it('should wrap errors in DataProcessingError', () => {
      // Create mock processor that throws an error
      const mockProcessor = jest.fn().mockImplementation(() => {
        throw new Error('Processing error');
      });

      // Wrap the processor
      const wrappedProcessor = wrapDataProcessor(mockProcessor, 'test-processor');

      // Call and verify error is wrapped
      expect(() => wrappedProcessor('test data')).toThrow(DataProcessingError);
    });
  });
});
