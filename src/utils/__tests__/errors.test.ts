import { describe, it, expect } from '@jest/globals';
import {
  LegacyAnalyticalError,
  LegacyAPIError,
  LegacyValidationError,
  LegacyDataProcessingError,
  LegacyConfigurationError,
  LegacyToolExecutionError,
  isErrorType,
  // Import enhanced classes for comparison
  AnalyticalError,
  ValidationError,
  APIError,
  ErrorCodes
} from '../errors.js';

describe('Legacy Error Utilities (Backward Compatibility)', () => {
  describe('LegacyAnalyticalError', () => {
    it('should create a basic error with correct name', () => {
      const error = new LegacyAnalyticalError('Test error');

      expect(error.name).toBe('AnalyticalError');
      expect(error.message).toBe('Test error');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof LegacyAnalyticalError).toBe(true);
    });
  });

  describe('LegacyAPIError', () => {
    it('should create an API error with status and retryable flag', () => {
      const error = new LegacyAPIError('API test error', 429, true, 'test/endpoint');

      expect(error.name).toBe('APIError');
      expect(error.message).toBe('API test error');
      expect(error.status).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.endpoint).toBe('test/endpoint');
      expect(error instanceof LegacyAnalyticalError).toBe(true);
      expect(error instanceof LegacyAPIError).toBe(true);
    });

    it('should handle missing optional parameters', () => {
      const error = new LegacyAPIError('API test error');

      expect(error.status).toBeUndefined();
      expect(error.retryable).toBe(false);
      expect(error.endpoint).toBeUndefined();
    });
  });

  describe('LegacyValidationError', () => {
    it('should create a validation error with details', () => {
      const details = { field: 'name', issue: 'Required' };
      const error = new LegacyValidationError('Validation test error', details);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation test error');
      expect(error.details).toEqual(details);
      expect(error instanceof LegacyAnalyticalError).toBe(true);
      expect(error instanceof LegacyValidationError).toBe(true);
    });
  });

  describe('LegacyDataProcessingError', () => {
    it('should create a data processing error with data', () => {
      const data = { rows: 10, processed: 5 };
      const error = new LegacyDataProcessingError('Data processing test error', data);

      expect(error.name).toBe('DataProcessingError');
      expect(error.message).toBe('Data processing test error');
      expect(error.data).toEqual(data);
      expect(error instanceof LegacyAnalyticalError).toBe(true);
      expect(error instanceof LegacyDataProcessingError).toBe(true);
    });
  });

  describe('LegacyConfigurationError', () => {
    it('should create a configuration error', () => {
      const error = new LegacyConfigurationError('Configuration test error');

      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Configuration test error');
      expect(error instanceof LegacyAnalyticalError).toBe(true);
      expect(error instanceof LegacyConfigurationError).toBe(true);
    });
  });

  describe('LegacyToolExecutionError', () => {
    it('should create a tool execution error with tool name', () => {
      const error = new LegacyToolExecutionError('test_tool', 'Tool execution test error');

      expect(error.name).toBe('ToolExecutionError');
      expect(error.message).toBe('Error in test_tool: Tool execution test error');
      expect(error.toolName).toBe('test_tool');
      expect(error instanceof LegacyAnalyticalError).toBe(true);
      expect(error instanceof LegacyToolExecutionError).toBe(true);
    });
  });

  describe('isErrorType', () => {
    it('should correctly identify legacy error types', () => {
      const apiError = new LegacyAPIError('Test API error');
      const validationError = new LegacyValidationError('Test validation error');
      const genericError = new Error('Generic error');

      expect(isErrorType(apiError, LegacyAPIError)).toBe(true);
      expect(isErrorType(apiError, LegacyValidationError)).toBe(false);
      expect(isErrorType(validationError, LegacyValidationError)).toBe(true);
      expect(isErrorType(genericError, Error)).toBe(true);
      expect(isErrorType(genericError, LegacyAPIError)).toBe(false);
      expect(isErrorType('not an error', Error)).toBe(false);
      expect(isErrorType(null, Error)).toBe(false);
    });

    it('should work with enhanced error types', () => {
      const enhancedApiError = new APIError(ErrorCodes.API_TIMEOUT, 'Enhanced API error');
      const enhancedValidationError = new ValidationError(ErrorCodes.INVALID_INPUT, 'Enhanced validation error');

      expect(isErrorType(enhancedApiError, APIError)).toBe(true);
      expect(isErrorType(enhancedValidationError, ValidationError)).toBe(true);
      expect(isErrorType(enhancedApiError, ValidationError)).toBe(false);
    });
  });
});
