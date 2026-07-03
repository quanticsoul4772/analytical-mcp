import { describe, it, expect, jest, afterEach } from '@jest/globals';
import {
  withErrorHandling,
  ErrorCodes,
  createValidationError,
  createAPIError,
  createDataProcessingError
} from '../errors.js';

describe('Tool Integration with Enhanced Error Handling', () => {
  afterEach(() => {
    // Retry tests install fake timers; never leak them into the next test
    jest.useRealTimers();
  });

  describe('Sample Tool Migrations', () => {
    // Mock tool functions for testing
    const mockAnalyzeDatasetInternal = async (data: any[], analysisType: string) => {
      if (!Array.isArray(data) || data.length === 0) {
        throw createValidationError(
          'Data array is required and must not be empty',
          { data: typeof data, length: data?.length },
          'analyze_dataset'
        );
      }

      if (!['summary', 'stats'].includes(analysisType)) {
        throw createValidationError(
          `Invalid analysis type: ${analysisType}. Supported types are 'summary' and 'stats'`,
          { analysisType, supportedTypes: ['summary', 'stats'] },
          'analyze_dataset'
        );
      }

      // Simulate processing
      if (data.includes('fail')) {
        throw createDataProcessingError(
          'Failed to calculate statistics',
          { failedValue: 'fail' },
          'analyze_dataset'
        );
      }

      return `Analysis complete: ${analysisType} for ${data.length} items`;
    };

    const mockAPIToolInternal = async (endpoint: string, retries = 0) => {
      if (endpoint === '/rate-limited' && retries < 2) {
        throw createAPIError(
          'API rate limit exceeded',
          ErrorCodes.API_RATE_LIMIT,
          { endpoint, currentRetries: retries },
          'api_tool'
        );
      }

      if (endpoint === '/timeout') {
        throw createAPIError(
          'Request timed out',
          ErrorCodes.API_TIMEOUT,
          { endpoint },
          'api_tool'
        );
      }

      return `API call successful to ${endpoint}`;
    };

    // Wrap tools with error handling
    const analyzeDataset = withErrorHandling('analyze_dataset', mockAnalyzeDatasetInternal);
    const apiTool = withErrorHandling('api_tool', mockAPIToolInternal);

    describe('Enhanced analyzeDataset Tool', () => {
      it('should execute successfully with valid data', async () => {
        const result = await analyzeDataset([1, 2, 3, 4, 5], 'summary');
        expect(result).toBe('Analysis complete: summary for 5 items');
      });

      it('should throw ValidationError for empty data', async () => {
        await expect(analyzeDataset([], 'summary')).rejects.toMatchObject({
          name: 'ValidationError',
          code: ErrorCodes.INVALID_INPUT,
          message: '[analyze_dataset] Data array is required and must not be empty',
          context: expect.objectContaining({
            toolName: 'analyze_dataset',
            data: 'object',
            length: 0
          })
        });
      });

      it('should throw ValidationError for invalid analysis type', async () => {
        await expect(analyzeDataset([1, 2, 3], 'invalid')).rejects.toMatchObject({
          name: 'ValidationError',
          code: ErrorCodes.INVALID_INPUT,
          message: expect.stringContaining('[analyze_dataset] Invalid analysis type: invalid'),
          context: expect.objectContaining({
            toolName: 'analyze_dataset',
            analysisType: 'invalid',
            supportedTypes: ['summary', 'stats']
          })
        });
      });

      it('should throw DataProcessingError for processing failures', async () => {
        await expect(analyzeDataset([1, 2, 'fail', 4], 'summary')).rejects.toMatchObject({
          name: 'DataProcessingError',
          code: ErrorCodes.CALCULATION_FAILED,
          message: '[analyze_dataset] Failed to calculate statistics',
          context: expect.objectContaining({
            toolName: 'analyze_dataset',
            failedValue: 'fail'
          })
        });
      });

      it('should preserve error context from nested function calls', async () => {
        expect.assertions(2);
        try {
          await analyzeDataset(null as any, 'summary');
        } catch (error: any) {
          expect(error.context.toolName).toBe('analyze_dataset');
          expect(error.message).toContain('[analyze_dataset]');
        }
      });
    });

    describe('Enhanced API Tool with Retry Logic', () => {
      it('should execute successfully with valid endpoint', async () => {
        const result = await apiTool('/valid-endpoint');
        expect(result).toBe('API call successful to /valid-endpoint');
      });

      it('should retry and succeed for rate-limited endpoints', async () => {
        jest.useFakeTimers();

        let retryCount = 0;
        const mockAPIWithCounter = jest.fn(async (endpoint: string) => {
          retryCount++;
          if (endpoint === '/rate-limited' && retryCount <= 2) {
            throw createAPIError(
              'API rate limit exceeded',
              ErrorCodes.API_RATE_LIMIT,
              { endpoint, currentRetries: retryCount - 1 },
              'api_tool'
            );
          }
          return `API call successful to ${endpoint} after ${retryCount} attempts`;
        });

        const retryApiTool = withErrorHandling('api_tool', mockAPIWithCounter);

        const promise = retryApiTool('/rate-limited');

        // Advance timers to trigger retries (API_RATE_LIMIT: 1000ms delay, backoff 2)
        await jest.advanceTimersByTimeAsync(1000); // First retry
        await jest.advanceTimersByTimeAsync(2000); // Second retry (with backoff)

        const result = await promise;
        expect(result).toContain('API call successful to /rate-limited after 3 attempts');
        expect(mockAPIWithCounter).toHaveBeenCalledTimes(3);
      });

      it('should fail after maximum retries for persistent rate limiting', async () => {
        jest.useFakeTimers();

        const mockAPIAlwaysFail = jest.fn(async () => {
          throw createAPIError(
            'Persistent rate limit',
            ErrorCodes.API_RATE_LIMIT,
            { endpoint: '/always-limited' },
            'api_tool'
          );
        });
        const failingApiTool = withErrorHandling('api_tool', mockAPIAlwaysFail);

        const promise = failingApiTool('/always-limited');
        // Attach the rejection expectation before advancing timers so the
        // rejection is never unhandled
        const assertion = expect(promise).rejects.toMatchObject({
          name: 'APIError',
          code: ErrorCodes.API_RATE_LIMIT,
          message: '[api_tool] Persistent rate limit'
        });

        // Advance through all retry attempts (1000ms, 2000ms, 4000ms backoff)
        await jest.advanceTimersByTimeAsync(1000); // First retry
        await jest.advanceTimersByTimeAsync(2000); // Second retry
        await jest.advanceTimersByTimeAsync(4000); // Third retry

        await assertion;

        expect(mockAPIAlwaysFail).toHaveBeenCalledTimes(4); // Initial + 3 retries
      });

      it('should not retry API errors without a recovery strategy', async () => {
        const authError = createAPIError(
          'Authentication failed',
          ErrorCodes.API_AUTH_FAILED,
          { endpoint: '/secure' },
          'api_tool'
        );

        const mockAPIAuthFail = jest.fn(async () => {
          throw authError;
        });
        const authApiTool = withErrorHandling('api_tool', mockAPIAuthFail);

        await expect(authApiTool('/secure')).rejects.toMatchObject({
          name: 'APIError',
          code: ErrorCodes.API_AUTH_FAILED
        });

        expect(mockAPIAuthFail).toHaveBeenCalledTimes(1); // No retries
      });
    });

    describe('Error Context Preservation', () => {
      it('should preserve and enhance error context through tool wrapper', async () => {
        expect.assertions(2);
        const originalError = new Error('Generic processing error');
        const mockTool = jest.fn(async (..._args: any[]) => {
          throw originalError;
        });
        const wrappedTool = withErrorHandling('context_test_tool', mockTool);

        try {
          await wrappedTool('arg1', { key: 'value' }, [1, 2, 3]);
        } catch (error: any) {
          expect(error.context).toMatchObject({
            toolName: 'context_test_tool',
            originalError: 'Generic processing error',
            args: ['arg1', { key: 'value' }, [1, 2, 3]]
          });
          expect(error.message).toContain('[context_test_tool]');
        }
      });

      it('should handle large argument arrays gracefully', async () => {
        expect.assertions(2);
        const originalError = new Error('Large args error');
        const mockTool = jest.fn(async (..._args: any[]) => {
          throw originalError;
        });
        const wrappedTool = withErrorHandling('large_args_tool', mockTool);

        const largeArgs = new Array(10).fill('data');

        try {
          await wrappedTool(...largeArgs);
        } catch (error: any) {
          expect(error.context.args).toBe('[large args array]');
          expect(error.context.toolName).toBe('large_args_tool');
        }
      });
    });

    describe('Mixed Error Scenarios', () => {
      it('should handle tools that throw different error types', async () => {
        let callCount = 0;
        const mixedErrorTool = jest.fn(async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Generic validation error');
          } else if (callCount === 2) {
            // A specific API error whose code has no retry strategy, so it is
            // preserved and surfaced immediately
            throw createAPIError('API error', ErrorCodes.API_INVALID_RESPONSE);
          } else {
            return 'success';
          }
        });

        const wrappedMixedTool = withErrorHandling('mixed_error_tool', mixedErrorTool);

        // First call - generic error gets categorized as validation error
        await expect(wrappedMixedTool()).rejects.toMatchObject({
          name: 'ValidationError',
          message: '[mixed_error_tool] Generic validation error'
        });

        // Second call - specific API error is preserved
        await expect(wrappedMixedTool()).rejects.toMatchObject({
          name: 'APIError',
          code: ErrorCodes.API_INVALID_RESPONSE
        });

        // Third call - success
        const result = await wrappedMixedTool();
        expect(result).toBe('success');
      });
    });
  });

  describe('Real Tool Behavior Simulation', () => {
    // Simulate a complex analytical tool with multiple error scenarios
    const simulateComplexAnalyticalTool = async (
      data: any[],
      options: { algorithm?: string; threshold?: number } = {}
    ) => {
      // Input validation
      if (!Array.isArray(data)) {
        throw createValidationError(
          'Data must be an array',
          { received: typeof data },
          'complex_analytical_tool'
        );
      }

      if (data.length < 2) {
        throw createValidationError(
          'Insufficient data points for analysis',
          { dataLength: data.length, minimumRequired: 2 },
          'complex_analytical_tool'
        );
      }

      // Algorithm validation
      const supportedAlgorithms = ['linear', 'polynomial', 'exponential'];
      const algorithm = options.algorithm || 'linear';
      if (!supportedAlgorithms.includes(algorithm)) {
        throw createValidationError(
          `Unsupported algorithm: ${algorithm}`,
          { algorithm, supported: supportedAlgorithms },
          'complex_analytical_tool'
        );
      }

      // Simulate API call for data enrichment
      if (data.includes('api_error')) {
        throw createAPIError(
          'Failed to enrich data from external API',
          ErrorCodes.API_SERVICE_UNAVAILABLE,
          { endpoint: '/data-enrichment' },
          'complex_analytical_tool'
        );
      }

      // Simulate processing error
      if (data.includes('processing_error')) {
        throw createDataProcessingError(
          'Mathematical calculation failed',
          { algorithm, step: 'convergence_check' },
          'complex_analytical_tool'
        );
      }

      // Simulate successful processing
      return {
        algorithm,
        dataPoints: data.length,
        result: `Analysis completed using ${algorithm} algorithm`,
        metadata: {
          threshold: options.threshold || 0.05,
          processingTime: '125ms'
        }
      };
    };

    const complexTool = withErrorHandling('complex_analytical_tool', simulateComplexAnalyticalTool);

    it('should handle successful complex analysis', async () => {
      const result = await complexTool([1, 2, 3, 4, 5], { algorithm: 'polynomial', threshold: 0.01 });

      expect(result).toMatchObject({
        algorithm: 'polynomial',
        dataPoints: 5,
        result: 'Analysis completed using polynomial algorithm',
        metadata: {
          threshold: 0.01,
          processingTime: '125ms'
        }
      });
    });

    it('should validate inputs comprehensively', async () => {
      // Test non-array input
      await expect(complexTool('not an array' as any)).rejects.toMatchObject({
        name: 'ValidationError',
        code: ErrorCodes.INVALID_INPUT,
        message: '[complex_analytical_tool] Data must be an array'
      });

      // Test insufficient data
      await expect(complexTool([1])).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringContaining('Insufficient data points'),
        context: expect.objectContaining({
          dataLength: 1,
          minimumRequired: 2
        })
      });

      // Test invalid algorithm
      await expect(
        complexTool([1, 2, 3], { algorithm: 'quantum' })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringContaining('Unsupported algorithm: quantum'),
        context: expect.objectContaining({
          algorithm: 'quantum',
          supported: ['linear', 'polynomial', 'exponential']
        })
      });
    });

    it('should handle API errors with retry logic', async () => {
      jest.useFakeTimers();

      let attempt = 0;
      const retryingTool = jest.fn(async (data: any[]) => {
        attempt++;
        if (data.includes('api_error') && attempt <= 2) {
          throw createAPIError(
            'Temporary API failure',
            ErrorCodes.API_SERVICE_UNAVAILABLE,
            { attempt },
            'retry_test_tool'
          );
        }
        return `Success on attempt ${attempt}`;
      });

      const wrappedRetryingTool = withErrorHandling('retry_test_tool', retryingTool);

      const promise = wrappedRetryingTool(['api_error', 'other_data']);

      // Advance timers for retries (API_SERVICE_UNAVAILABLE: 2000ms delay, backoff 2)
      await jest.advanceTimersByTimeAsync(2000); // First retry
      await jest.advanceTimersByTimeAsync(4000); // Second retry with backoff

      const result = await promise;
      expect(result).toBe('Success on attempt 3');
      expect(retryingTool).toHaveBeenCalledTimes(3);
    });

    it('should preserve processing errors without retry', async () => {
      await expect(
        complexTool(['processing_error', 2, 3])
      ).rejects.toMatchObject({
        name: 'DataProcessingError',
        code: ErrorCodes.CALCULATION_FAILED,
        message: '[complex_analytical_tool] Mathematical calculation failed',
        context: expect.objectContaining({
          algorithm: 'linear',
          step: 'convergence_check'
        })
      });
    });
  });
});
