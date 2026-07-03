import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  AnalyticalError,
  ValidationError,
  APIError,
  DataProcessingError,
  ConfigurationError,
  ToolExecutionError,
  ErrorCodes,
  createValidationError,
  createAPIError,
  createDataProcessingError,
  isRecoverable,
  executeWithRetry,
  withErrorHandling,
  errorRecoveryStrategies,
  sleep
} from '../errors.js';

// Mock setTimeout for testing
jest.useFakeTimers();

describe('Enhanced Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('ErrorCodes', () => {
    it('should have standardized error codes organized by category', () => {
      // Validation errors (1xxx)
      expect(ErrorCodes.INVALID_INPUT).toBe('ERR_1001');
      expect(ErrorCodes.MISSING_REQUIRED_PARAM).toBe('ERR_1002');
      expect(ErrorCodes.INVALID_DATA_FORMAT).toBe('ERR_1003');
      expect(ErrorCodes.INVALID_PARAMETER_TYPE).toBe('ERR_1004');
      expect(ErrorCodes.PARAMETER_OUT_OF_RANGE).toBe('ERR_1005');

      // API errors (2xxx)
      expect(ErrorCodes.API_RATE_LIMIT).toBe('ERR_2001');
      expect(ErrorCodes.API_AUTH_FAILED).toBe('ERR_2002');
      expect(ErrorCodes.API_TIMEOUT).toBe('ERR_2003');
      expect(ErrorCodes.API_SERVICE_UNAVAILABLE).toBe('ERR_2004');
      expect(ErrorCodes.API_INVALID_RESPONSE).toBe('ERR_2005');

      // Processing errors (3xxx)
      expect(ErrorCodes.CALCULATION_FAILED).toBe('ERR_3001');
      expect(ErrorCodes.MEMORY_LIMIT).toBe('ERR_3002');
      expect(ErrorCodes.TIMEOUT).toBe('ERR_3003');
      expect(ErrorCodes.INSUFFICIENT_DATA).toBe('ERR_3004');
      expect(ErrorCodes.ALGORITHM_CONVERGENCE_FAILED).toBe('ERR_3005');

      // Configuration errors (4xxx)
      expect(ErrorCodes.MISSING_CONFIG).toBe('ERR_4001');
      expect(ErrorCodes.INVALID_CONFIG).toBe('ERR_4002');
      expect(ErrorCodes.CONFIG_LOAD_FAILED).toBe('ERR_4003');

      // Tool execution errors (5xxx)
      expect(ErrorCodes.TOOL_NOT_FOUND).toBe('ERR_5001');
      expect(ErrorCodes.TOOL_EXECUTION_FAILED).toBe('ERR_5002');
      expect(ErrorCodes.TOOL_DEPENDENCY_MISSING).toBe('ERR_5003');
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should have retry strategies for recoverable errors', () => {
      expect(errorRecoveryStrategies[ErrorCodes.API_RATE_LIMIT]).toEqual({
        retry: { times: 3, delay: 1000, backoff: 2 },
        cache: true
      });

      expect(errorRecoveryStrategies[ErrorCodes.API_TIMEOUT]).toEqual({
        retry: { times: 2, delay: 500, backoff: 1.5 }
      });

      expect(errorRecoveryStrategies[ErrorCodes.API_SERVICE_UNAVAILABLE]).toEqual({
        retry: { times: 3, delay: 2000, backoff: 2 }
      });
    });
  });

  describe('Enhanced Error Classes', () => {
    describe('AnalyticalError', () => {
      it('should create error with code, message, context, and recoverable flag', () => {
        const context = { data: 'test' };
        const error = new AnalyticalError('ERR_TEST', 'Test error', context, true);

        expect(error.name).toBe('AnalyticalError');
        expect(error.code).toBe('ERR_TEST');
        expect(error.message).toBe('Test error');
        expect(error.context).toEqual(context);
        expect(error.recoverable).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });

    describe('ValidationError', () => {
      it('should create validation error with proper inheritance', () => {
        const context = { field: 'name', value: 'invalid' };
        const error = new ValidationError(ErrorCodes.INVALID_INPUT, 'Invalid input', context);

        expect(error.name).toBe('ValidationError');
        expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
        expect(error.message).toBe('Invalid input');
        expect(error.context).toEqual(context);
        expect(error.recoverable).toBe(false);
        expect(error instanceof AnalyticalError).toBe(true);
        expect(error instanceof ValidationError).toBe(true);
      });
    });

    describe('APIError', () => {
      it('should create API error with default recoverable flag', () => {
        const error = new APIError(ErrorCodes.API_TIMEOUT, 'Request timed out');

        expect(error.name).toBe('APIError');
        expect(error.code).toBe(ErrorCodes.API_TIMEOUT);
        expect(error.recoverable).toBe(true); // Default for API errors
        expect(error instanceof AnalyticalError).toBe(true);
        expect(error instanceof APIError).toBe(true);
      });
    });

    describe('ToolExecutionError', () => {
      it('should create tool error with tool name in message', () => {
        const toolName = 'test_tool';
        const error = new ToolExecutionError(ErrorCodes.TOOL_EXECUTION_FAILED, 'Execution failed', toolName);

        expect(error.name).toBe('ToolExecutionError');
        expect(error.toolName).toBe(toolName);
        expect(error.message).toBe('[test_tool] Execution failed');
        expect(error instanceof AnalyticalError).toBe(true);
      });
    });
  });

  describe('Error Helper Functions', () => {
    describe('createValidationError', () => {
      it('should create validation error with tool name formatting', () => {
        const error = createValidationError('Invalid data', { field: 'test' }, 'analyze_dataset');

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
        expect(error.message).toBe('[analyze_dataset] Invalid data');
        expect(error.context.toolName).toBe('analyze_dataset');
        expect(error.context.field).toBe('test');
      });

      it('should create validation error without tool name', () => {
        const error = createValidationError('Invalid data', { field: 'test' });

        expect(error.message).toBe('Invalid data');
        expect(error.context.toolName).toBeUndefined();
      });
    });

    describe('createAPIError', () => {
      it('should create API error with custom code', () => {
        const error = createAPIError('Rate limited', ErrorCodes.API_RATE_LIMIT, { retry: true }, 'research_tool');

        expect(error).toBeInstanceOf(APIError);
        expect(error.code).toBe(ErrorCodes.API_RATE_LIMIT);
        expect(error.message).toBe('[research_tool] Rate limited');
        expect(error.recoverable).toBe(true);
      });
    });

    describe('isRecoverable', () => {
      it('should identify recoverable errors', () => {
        const recoverableError = new APIError(ErrorCodes.API_TIMEOUT, 'Timeout', {}, true);
        const nonRecoverableError = new ValidationError(ErrorCodes.INVALID_INPUT, 'Invalid', {}, false);
        const errorWithStrategy = new AnalyticalError(ErrorCodes.API_RATE_LIMIT, 'Rate limit', {}, false);

        expect(isRecoverable(recoverableError)).toBe(true);
        expect(isRecoverable(nonRecoverableError)).toBe(false);
        expect(isRecoverable(errorWithStrategy)).toBe(true); // Has recovery strategy
        expect(isRecoverable(new Error('Generic error'))).toBe(false);
      });
    });
  });

  describe('Sleep Function', () => {
    it('should resolve after specified time', async () => {
      expect(jest.getTimerCount()).toBe(0);

      const promise = sleep(1000);

      // A timer must be scheduled for the requested duration
      expect(jest.getTimerCount()).toBe(1);

      // Advancing less than the requested time must not resolve the promise
      await jest.advanceTimersByTimeAsync(999);
      expect(jest.getTimerCount()).toBe(1);

      await jest.advanceTimersByTimeAsync(1);
      await expect(promise).resolves.toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    describe('executeWithRetry', () => {
      it('should execute successfully on first attempt', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        
        const result = await executeWithRetry(mockFn);
        
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
      });

      it('should retry based on error recovery strategy', async () => {
        const mockFn = jest.fn()
          .mockRejectedValueOnce(new APIError(ErrorCodes.API_RATE_LIMIT, 'Rate limited', {}, true))
          .mockRejectedValueOnce(new APIError(ErrorCodes.API_RATE_LIMIT, 'Rate limited', {}, true))
          .mockResolvedValue('success');

        const promise = executeWithRetry(mockFn, ErrorCodes.API_RATE_LIMIT);

        // Advance timers for retries (async variant flushes the promise chain
        // between timer ticks so the retry sleep actually gets scheduled)
        await jest.advanceTimersByTimeAsync(1000); // First retry
        await jest.advanceTimersByTimeAsync(2000); // Second retry (with backoff)

        const result = await promise;

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retries', async () => {
        const mockError = new APIError(ErrorCodes.API_RATE_LIMIT, 'Rate limited', {}, true);
        const mockFn = jest.fn().mockRejectedValue(mockError);

        const promise = executeWithRetry(mockFn, ErrorCodes.API_RATE_LIMIT);
        // Attach a handler immediately so the eventual rejection is not
        // reported as unhandled while we advance the timers
        const outcome = promise.catch((error) => error);

        // Advance through all retry attempts (delays: 1000, 2000, 4000 with backoff 2)
        await jest.advanceTimersByTimeAsync(1000); // First retry
        await jest.advanceTimersByTimeAsync(2000); // Second retry
        await jest.advanceTimersByTimeAsync(4000); // Third retry

        await expect(outcome).resolves.toBe(mockError);
        expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
      });

      it('should not retry non-recoverable errors', async () => {
        const mockError = new ValidationError(ErrorCodes.INVALID_INPUT, 'Invalid data', {}, false);
        const mockFn = jest.fn().mockRejectedValue(mockError);

        await expect(executeWithRetry(mockFn)).rejects.toBe(mockError);
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('withErrorHandling Wrapper', () => {
    it('should execute function successfully', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const wrappedFn = withErrorHandling('test_tool', mockFn);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should transform generic errors into AnalyticalErrors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Generic validation error'));
      const wrappedFn = withErrorHandling('test_tool', mockFn);

      await expect(wrappedFn('test')).rejects.toMatchObject({
        name: 'ValidationError',
        code: ErrorCodes.INVALID_INPUT,
        message: '[test_tool] Generic validation error',
        context: expect.objectContaining({
          toolName: 'test_tool',
          originalError: 'Generic validation error'
        })
      });
    });

    it('should categorize errors based on message content', async () => {
      const apiError = new Error('API request failed');
      const mockFn = jest.fn().mockRejectedValue(apiError);
      const wrappedFn = withErrorHandling('api_tool', mockFn);

      // The transformed APIError is recoverable, so withErrorHandling applies
      // the ERR_2004 strategy (3 retries, 2000ms delay, backoff 2) before failing
      const outcome = wrappedFn().catch((error) => error);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);
      await jest.advanceTimersByTimeAsync(8000);

      await expect(outcome).resolves.toMatchObject({
        name: 'APIError',
        code: ErrorCodes.API_SERVICE_UNAVAILABLE,
        message: '[api_tool] API request failed'
      });
      expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should preserve AnalyticalErrors with added context', async () => {
      const originalError = new ValidationError(ErrorCodes.INVALID_DATA_FORMAT, 'Data format error');
      const mockFn = jest.fn().mockRejectedValue(originalError);
      const wrappedFn = withErrorHandling('test_tool', mockFn);

      await expect(wrappedFn()).rejects.toMatchObject({
        name: 'ValidationError',
        code: ErrorCodes.INVALID_DATA_FORMAT,
        message: '[test_tool] Data format error',
        context: expect.objectContaining({
          toolName: 'test_tool'
        })
      });
    });

    it('should handle functions with different argument patterns', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = withErrorHandling('multi_arg_tool', mockFn);

      await wrappedFn(1, 'string', { obj: true }, [1, 2, 3]);

      expect(mockFn).toHaveBeenCalledWith(1, 'string', { obj: true }, [1, 2, 3]);
    });

    it('should truncate large argument arrays in error context', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = withErrorHandling('test_tool', mockFn);
      const largeArgs = new Array(10).fill('arg');

      await expect(wrappedFn(...largeArgs)).rejects.toMatchObject({
        context: expect.objectContaining({
          args: '[large args array]'
        })
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work with retry and error transformation together', async () => {
      // A flaky operation that fails twice with a recoverable API error, then succeeds
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new APIError(ErrorCodes.API_TIMEOUT, 'API timeout occurred', {}, true);
        }
        return 'success';
      });

      // Compose the retry strategy (API_TIMEOUT: 2 retries, 500ms delay, 1.5 backoff)
      // with the error handling wrapper
      const wrappedFn = withErrorHandling('integration_tool', () =>
        executeWithRetry(mockFn, ErrorCodes.API_TIMEOUT)
      );

      const promise = wrappedFn();

      await jest.advanceTimersByTimeAsync(500); // First retry
      await jest.advanceTimersByTimeAsync(750); // Second retry (backoff 1.5)

      const result = await promise;
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-recoverable transformed errors', async () => {
      // Generic processing errors are transformed into non-recoverable
      // DataProcessingErrors, so the tool is attempted exactly once
      const mockFn = jest.fn().mockRejectedValue(new Error('Calculation exploded'));
      const wrappedFn = withErrorHandling('integration_tool', mockFn);

      await expect(wrappedFn()).rejects.toMatchObject({
        name: 'DataProcessingError',
        code: ErrorCodes.CALCULATION_FAILED,
        message: '[integration_tool] Calculation exploded',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});