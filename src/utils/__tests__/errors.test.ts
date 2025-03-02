import { describe, it, expect } from '@jest/globals';
import { 
  AnalyticalError, 
  APIError, 
  ValidationError, 
  DataProcessingError, 
  ConfigurationError,
  ToolExecutionError,
  isErrorType
} from '../errors.js';

describe('Error Utilities', () => {
  describe('AnalyticalError', () => {
    it('should create a basic error with correct name', () => {
      const error = new AnalyticalError('Test error');
      
      expect(error.name).toBe('AnalyticalError');
      expect(error.message).toBe('Test error');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AnalyticalError).toBe(true);
    });
  });

  describe('APIError', () => {
    it('should create an API error with status and retryable flag', () => {
      const error = new APIError('API test error', 429, true, 'test/endpoint');
      
      expect(error.name).toBe('APIError');
      expect(error.message).toBe('API test error');
      expect(error.status).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.endpoint).toBe('test/endpoint');
      expect(error instanceof AnalyticalError).toBe(true);
      expect(error instanceof APIError).toBe(true);
    });
    
    it('should handle missing optional parameters', () => {
      const error = new APIError('API test error');
      
      expect(error.status).toBeUndefined();
      expect(error.retryable).toBe(false);
      expect(error.endpoint).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with details', () => {
      const details = { field: 'name', issue: 'Required' };
      const error = new ValidationError('Validation test error', details);
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation test error');
      expect(error.details).toEqual(details);
      expect(error instanceof AnalyticalError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });
  });

  describe('DataProcessingError', () => {
    it('should create a data processing error with data', () => {
      const data = { rows: 10, processed: 5 };
      const error = new DataProcessingError('Data processing test error', data);
      
      expect(error.name).toBe('DataProcessingError');
      expect(error.message).toBe('Data processing test error');
      expect(error.data).toEqual(data);
      expect(error instanceof AnalyticalError).toBe(true);
      expect(error instanceof DataProcessingError).toBe(true);
    });
  });

  describe('ConfigurationError', () => {
    it('should create a configuration error', () => {
      const error = new ConfigurationError('Configuration test error');
      
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Configuration test error');
      expect(error instanceof AnalyticalError).toBe(true);
      expect(error instanceof ConfigurationError).toBe(true);
    });
  });

  describe('ToolExecutionError', () => {
    it('should create a tool execution error with tool name', () => {
      const error = new ToolExecutionError('test_tool', 'Tool execution test error');
      
      expect(error.name).toBe('ToolExecutionError');
      expect(error.message).toBe('Error in test_tool: Tool execution test error');
      expect(error.toolName).toBe('test_tool');
      expect(error instanceof AnalyticalError).toBe(true);
      expect(error instanceof ToolExecutionError).toBe(true);
    });
  });

  describe('isErrorType', () => {
    it('should correctly identify error types', () => {
      const apiError = new APIError('Test API error');
      const validationError = new ValidationError('Test validation error');
      const genericError = new Error('Generic error');
      
      expect(isErrorType(apiError, APIError)).toBe(true);
      expect(isErrorType(apiError, ValidationError)).toBe(false);
      expect(isErrorType(validationError, ValidationError)).toBe(true);
      expect(isErrorType(genericError, Error)).toBe(true);
      expect(isErrorType(genericError, APIError)).toBe(false);
      expect(isErrorType("not an error", Error)).toBe(false);
      expect(isErrorType(null, Error)).toBe(false);
    });
  });
});
