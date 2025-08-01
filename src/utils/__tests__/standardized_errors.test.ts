/**
 * Tests for the standardized error handling system
 */

import {
  AnalyticalError,
  ValidationError,
  APIError,
  DataProcessingError,
  ErrorCodes,
  withErrorHandling,
  createValidationError,
  createAPIError,
  createDataProcessingError,
  createStandardizedError,
  isRecoverable,
  errorRecoveryStrategies,
} from '../errors.js';

describe('Standardized Error Handling System', () => {
  describe('Error Codes', () => {
    it('should have properly categorized error codes', () => {
      // Validation errors (1xxx)
      expect(ErrorCodes.INVALID_INPUT).toBe('ERR_1001');
      expect(ErrorCodes.MISSING_REQUIRED_PARAM).toBe('ERR_1002');
      
      // API errors (2xxx)
      expect(ErrorCodes.API_RATE_LIMIT).toBe('ERR_2001');
      expect(ErrorCodes.API_AUTH_FAILED).toBe('ERR_2002');
      
      // Processing errors (3xxx)
      expect(ErrorCodes.CALCULATION_FAILED).toBe('ERR_3001');
      expect(ErrorCodes.MEMORY_LIMIT).toBe('ERR_3002');
    });
  });

  describe('AnalyticalError', () => {
    it('should create error with all properties', () => {
      const error = new AnalyticalError(
        ErrorCodes.INVALID_INPUT,
        'Test error message',
        { testContext: 'value' },
        true,
        'test_tool'
      );

      expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
      expect(error.message).toBe('Test error message');
      expect(error.context).toEqual({ testContext: 'value' });
      expect(error.recoverable).toBe(true);
      expect(error.toolName).toBe('test_tool');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should format error message with tool name and code', () => {
      const error = new AnalyticalError(
        ErrorCodes.CALCULATION_FAILED,
        'Calculation error',
        undefined,
        false,
        'analyze_dataset'
      );

      const formatted = error.getFormattedMessage();
      expect(formatted).toBe('[analyze_dataset] ERR_3001: Calculation error');
    });

    it('should provide error details for logging', () => {
      const error = new AnalyticalError(
        ErrorCodes.API_TIMEOUT,
        'Request timed out',
        { endpoint: '/api/test' },
        true,
        'api_tool'
      );

      const details = error.getErrorDetails();
      expect(details).toMatchObject({
        code: ErrorCodes.API_TIMEOUT,
        message: 'Request timed out',
        toolName: 'api_tool',
        recoverable: true,
        context: { endpoint: '/api/test' },
      });
      expect(details.timestamp).toBeDefined();
    });
  });

  describe('Specialized Error Classes', () => {
    it('should create ValidationError with proper defaults', () => {
      const error = createValidationError(
        'Invalid input provided',
        { field: 'username' },
        'validation_tool'
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
      expect(error.recoverable).toBe(false);
      expect(error.toolName).toBe('validation_tool');
    });

    it('should create APIError with status-based error codes', () => {
      const rateLimitError = createAPIError(
        'Rate limit exceeded',
        429,
        '/api/search',
        'api_tool'
      );

      expect(rateLimitError).toBeInstanceOf(APIError);
      expect(rateLimitError.code).toBe(ErrorCodes.API_RATE_LIMIT);
      expect(rateLimitError.status).toBe(429);
      expect(rateLimitError.recoverable).toBe(true);
    });

    it('should create DataProcessingError with context-based codes', () => {
      const error = createDataProcessingError(
        'Insufficient data for analysis',
        { rowCount: 5, required: 10 },
        'analysis_tool'
      );

      expect(error).toBeInstanceOf(DataProcessingError);
      expect(error.code).toBe(ErrorCodes.INSUFFICIENT_DATA);
      expect(error.toolName).toBe('analysis_tool');
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should identify recoverable errors', () => {
      expect(isRecoverable({ code: ErrorCodes.API_RATE_LIMIT })).toBe(true);
      expect(isRecoverable({ code: ErrorCodes.API_TIMEOUT })).toBe(true);
      expect(isRecoverable({ code: ErrorCodes.INVALID_INPUT })).toBe(false);
    });

    it('should have retry strategies for API errors', () => {
      const rateLimitStrategy = errorRecoveryStrategies[ErrorCodes.API_RATE_LIMIT];
      expect(rateLimitStrategy.retry).toBeDefined();
      expect(rateLimitStrategy.retry?.times).toBe(3);
      expect(rateLimitStrategy.retry?.delay).toBe(1000);
      expect(rateLimitStrategy.cache).toBe(true);
    });
  });

  describe('withErrorHandling wrapper', () => {
    it('should wrap function and preserve successful results', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = withErrorHandling('test_tool', mockFunction);

      const result = await wrappedFunction('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should transform generic errors into AnalyticalErrors', async () => {
      const mockFunction = jest.fn().mockRejectedValue(new Error('Generic error'));
      const wrappedFunction = withErrorHandling('test_tool', mockFunction);

      await expect(wrappedFunction()).rejects.toThrow('Generic error');
      await expect(wrappedFunction()).rejects.toBeInstanceOf(AnalyticalError);
    });

    it('should preserve AnalyticalErrors and add tool name', async () => {
      const originalError = new ValidationError(
        ErrorCodes.INVALID_INPUT,
        'Validation failed'
      );
      const mockFunction = jest.fn().mockRejectedValue(originalError);
      const wrappedFunction = withErrorHandling('test_tool', mockFunction);

      await expect(wrappedFunction()).rejects.toThrow('Validation failed');
      expect(originalError.toolName).toBe('test_tool');
    });

    it('should implement retry logic for recoverable errors', async () => {
      const rateLimitError = new APIError(
        ErrorCodes.API_RATE_LIMIT,
        'Rate limit exceeded'
      );
      
      const mockFunction = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success after retry');

      const wrappedFunction = withErrorHandling('api_tool', mockFunction);

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
        cb();
        return 0 as any;
      });

      const result = await wrappedFunction();
      expect(result).toBe('success after retry');
      expect(mockFunction).toHaveBeenCalledTimes(3);

      jest.restoreAllMocks();
    });
  });

  describe('createStandardizedError utility', () => {
    it('should map common error types to appropriate codes', () => {
      const typeError = new TypeError('Invalid type');
      const standardized = createStandardizedError(typeError, 'test_tool');

      expect(standardized.code).toBe(ErrorCodes.INVALID_PARAMETER_TYPE);
      expect(standardized.toolName).toBe('test_tool');
    });

    it('should preserve AnalyticalErrors', () => {
      const originalError = new ValidationError(
        ErrorCodes.MISSING_REQUIRED_PARAM,
        'Missing parameter'
      );
      
      const result = createStandardizedError(originalError, 'test_tool');
      expect(result).toBe(originalError);
      expect(result.toolName).toBe('test_tool');
    });

    it('should map error messages to appropriate codes', () => {
      const timeoutError = new Error('Request timeout occurred');
      const standardized = createStandardizedError(timeoutError);

      expect(standardized.code).toBe(ErrorCodes.TIMEOUT);
    });
  });
});