/**
 * Enhanced Error Handling System
 *
 * This module provides comprehensive error handling infrastructure for the Analytical MCP Server.
 * Features include standardized error codes, recovery strategies, and monitoring.
 */

import { Logger } from './logger.js';

/**
 * Standardized error codes organized by category
 */
export enum ErrorCodes {
  // Validation errors (1xxx)
  INVALID_INPUT = 'ERR_1001',
  MISSING_REQUIRED_PARAM = 'ERR_1002',
  INVALID_DATA_FORMAT = 'ERR_1003',
  VALIDATION_FAILED = 'ERR_1004',
  SCHEMA_VALIDATION_ERROR = 'ERR_1005',

  // API errors (2xxx)
  API_RATE_LIMIT = 'ERR_2001',
  API_AUTH_FAILED = 'ERR_2002',
  API_TIMEOUT = 'ERR_2003',
  API_UNAVAILABLE = 'ERR_2004',
  API_RESPONSE_ERROR = 'ERR_2005',

  // Processing errors (3xxx)
  CALCULATION_FAILED = 'ERR_3001',
  MEMORY_LIMIT = 'ERR_3002',
  TIMEOUT = 'ERR_3003',
  DATA_PROCESSING_ERROR = 'ERR_3004',
  COMPUTATION_ERROR = 'ERR_3005',

  // Configuration errors (4xxx)
  CONFIG_MISSING = 'ERR_4001',
  CONFIG_INVALID = 'ERR_4002',
  FEATURE_DISABLED = 'ERR_4003',

  // Tool execution errors (5xxx)
  TOOL_EXECUTION_FAILED = 'ERR_5001',
  TOOL_NOT_FOUND = 'ERR_5002',
  TOOL_DEPENDENCY_ERROR = 'ERR_5003',
}

/**
 * Recovery strategies for different error types
 */
interface ErrorRecovery {
  retry?: { times: number; delay: number; backoff?: number };
  fallback?: () => any;
  cache?: boolean;
}

export const errorRecoveryStrategies: Record<string, ErrorRecovery> = {
  [ErrorCodes.API_RATE_LIMIT]: { 
    retry: { times: 3, delay: 1000, backoff: 2 },
    cache: true 
  },
  [ErrorCodes.API_TIMEOUT]: { 
    retry: { times: 2, delay: 500 }
  },
  [ErrorCodes.API_UNAVAILABLE]: {
    retry: { times: 3, delay: 2000, backoff: 1.5 }
  },
  [ErrorCodes.CALCULATION_FAILED]: {
    retry: { times: 1, delay: 100 }
  },
  [ErrorCodes.DATA_PROCESSING_ERROR]: {
    retry: { times: 2, delay: 200 }
  }
};

/**
 * Enhanced base error class for all Analytical MCP Server errors
 */
export class AnalyticalError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: any,
    public recoverable = false,
    public toolName?: string
  ) {
    super(toolName ? `[${toolName}] ${message}` : message);
    this.name = 'AnalyticalError';
    Object.setPrototypeOf(this, AnalyticalError.prototype);
  }
}

/**
 * Enhanced API error class
 */
export class APIError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    public status?: number,
    public endpoint?: string,
    context?: any,
    toolName?: string
  ) {
    super(code, message, { ...context, status, endpoint }, true, toolName);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Enhanced validation error class
 */
export class ValidationError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    toolName?: string
  ) {
    super(code, message, context, false, toolName);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Enhanced data processing error class
 */
export class DataProcessingError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    toolName?: string
  ) {
    super(code, message, context, true, toolName);
    this.name = 'DataProcessingError';
    Object.setPrototypeOf(this, DataProcessingError.prototype);
  }
}

/**
 * Enhanced configuration error class
 */
export class ConfigurationError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    toolName?: string
  ) {
    super(code, message, context, false, toolName);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Enhanced tool execution error class
 */
export class ToolExecutionError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    toolName?: string
  ) {
    super(code, message, context, true, toolName);
    this.name = 'ToolExecutionError';
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

/**
 * Convenient error creation functions
 */
export function createValidationError(
  message: string,
  context?: any,
  toolName?: string
): ValidationError {
  return new ValidationError(ErrorCodes.INVALID_INPUT, message, context, toolName);
}

export function createAPIError(
  message: string,
  status?: number,
  endpoint?: string,
  context?: any,
  toolName?: string
): APIError {
  const code = status === 429 ? ErrorCodes.API_RATE_LIMIT : 
               status === 401 ? ErrorCodes.API_AUTH_FAILED :
               status === 408 ? ErrorCodes.API_TIMEOUT :
               ErrorCodes.API_RESPONSE_ERROR;
  return new APIError(code, message, status, endpoint, context, toolName);
}

export function createDataProcessingError(
  message: string,
  context?: any,
  toolName?: string
): DataProcessingError {
  return new DataProcessingError(ErrorCodes.DATA_PROCESSING_ERROR, message, context, toolName);
}

export function createConfigurationError(
  message: string,
  context?: any,
  toolName?: string
): ConfigurationError {
  return new ConfigurationError(ErrorCodes.CONFIG_INVALID, message, context, toolName);
}

export function createToolExecutionError(
  message: string,
  context?: any,
  toolName?: string
): ToolExecutionError {
  return new ToolExecutionError(ErrorCodes.TOOL_EXECUTION_FAILED, message, context, toolName);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced error handling wrapper with retry logic, recovery, and performance monitoring
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  toolName: string,
  fn: T
): T {
  return (async (...args: any[]): Promise<Awaited<ReturnType<T>>> => {
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: Error;
    let errorCount = 0;
    let retryCount = 0;

    // Import performance metrics dynamically to avoid circular imports
    let performanceMetrics: any;
    try {
      const metricsModule = await import('./performance_metrics.js');
      performanceMetrics = metricsModule.performanceMetrics;
    } catch (importError) {
      // Performance metrics not available, continue without metrics
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn(...args);
        const executionTime = Date.now() - startTime;

        // Record successful execution metrics
        if (performanceMetrics) {
          const inputSize = JSON.stringify(args).length;
          const outputSize = typeof result === 'string' ? result.length : 
                            typeof result === 'object' ? JSON.stringify(result).length : 0;

          performanceMetrics.recordMetrics(toolName, {
            executionTime,
            inputSize,
            outputSize,
            errorCount,
            retryCount
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        errorCount = 1;
        
        // Transform error to standardized format if not already
        if (!(error instanceof AnalyticalError)) {
          if (error instanceof Error) {
            lastError = createToolExecutionError(
              error.message,
              { originalError: error, args, attempt },
              toolName
            );
          } else {
            lastError = createToolExecutionError(
              'Unknown error occurred',
              { originalError: error, args, attempt },
              toolName
            );
          }
        }

        const analyticalError = lastError as AnalyticalError;
        
        // Check if error is recoverable and has retry strategy
        if (analyticalError.recoverable && attempt < maxRetries) {
          const strategy = errorRecoveryStrategies[analyticalError.code];
          
          if (strategy?.retry) {
            const { times, delay, backoff = 1 } = strategy.retry;
            
            if (attempt < times) {
              retryCount++;
              const retryDelay = delay * Math.pow(backoff, attempt);
              Logger.warn(`[${toolName}] Retrying after error (attempt ${attempt + 1}/${times + 1})`, {
                error: analyticalError.message,
                code: analyticalError.code,
                delay: retryDelay
              });
              
              await sleep(retryDelay);
              continue;
            }
          }
        }

        // Log final error and record error metrics
        const executionTime = Date.now() - startTime;
        
        Logger.error(`[${toolName}] Operation failed`, {
          error: analyticalError.message,
          code: analyticalError.code,
          context: analyticalError.context,
          attempts: attempt + 1,
          executionTime
        });

        // Record error metrics
        if (performanceMetrics) {
          performanceMetrics.recordMetrics(toolName, {
            executionTime,
            errorCount,
            retryCount
          });
        }

        throw lastError;
      }
    }

    throw lastError!;
  }) as T;
}

/**
 * Check if an error is a specific type
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorType: new (...args: any[]) => T
): error is T {
  return error instanceof errorType;
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): error is AnalyticalError {
  return error instanceof AnalyticalError && error.recoverable;
}
