/**
 * Enhanced Error Handling System for Analytical MCP Server
 *
 * This module provides standardized error handling with error codes,
 * recovery strategies, and context preservation across all analytical tools.
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
  INVALID_PARAMETER_TYPE = 'ERR_1004',
  PARAMETER_OUT_OF_RANGE = 'ERR_1005',

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
  DATA_CORRUPTION = 'ERR_3004',
  INSUFFICIENT_DATA = 'ERR_3005',

  // Configuration errors (4xxx)
  MISSING_CONFIG = 'ERR_4001',
  INVALID_CONFIG = 'ERR_4002',
  CONFIG_FILE_ERROR = 'ERR_4003',

  // Tool execution errors (5xxx)
  TOOL_UNAVAILABLE = 'ERR_5001',
  TOOL_EXECUTION_FAILED = 'ERR_5002',
  DEPENDENCY_ERROR = 'ERR_5003',
}

/**
 * Base error class for all Analytical MCP Server errors with enhanced context
 */
export class AnalyticalError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: any,
    public recoverable = false
  ) {
    super(message);
    this.name = 'AnalyticalError';
    Object.setPrototypeOf(this, AnalyticalError.prototype);
  }
}

/**
 * Error class for validation errors
 */
export class ValidationError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    recoverable = false
  ) {
    super(code, message, context, recoverable);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error class for API-related errors
 */
export class APIError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    recoverable = true
  ) {
    super(code, message, context, recoverable);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Error class for data processing errors
 */
export class DataProcessingError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    recoverable = false
  ) {
    super(code, message, context, recoverable);
    this.name = 'DataProcessingError';
    Object.setPrototypeOf(this, DataProcessingError.prototype);
  }
}

/**
 * Error class for configuration errors
 */
export class ConfigurationError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    recoverable = false
  ) {
    super(code, message, context, recoverable);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error class for tool execution errors
 */
export class ToolExecutionError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    context?: any,
    recoverable = false
  ) {
    super(code, message, context, recoverable);
    this.name = 'ToolExecutionError';
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

/**
 * Error recovery configuration
 */
export interface ErrorRecovery {
  retry?: { times: number; delay: number; backoff?: number };
  fallback?: () => any;
  cache?: boolean;
}

/**
 * Recovery strategies for different error codes
 */
export const errorRecoveryStrategies: Record<string, ErrorRecovery> = {
  [ErrorCodes.API_RATE_LIMIT]: {
    retry: { times: 3, delay: 1000, backoff: 2 },
    cache: true
  },
  [ErrorCodes.API_TIMEOUT]: {
    retry: { times: 2, delay: 500, backoff: 1.5 }
  },
  [ErrorCodes.API_UNAVAILABLE]: {
    retry: { times: 2, delay: 2000, backoff: 2 }
  },
  [ErrorCodes.CALCULATION_FAILED]: {
    retry: { times: 1, delay: 100 }
  },
  [ErrorCodes.MEMORY_LIMIT]: {
    retry: { times: 1, delay: 1000 }
  }
};

/**
 * Check if an error is recoverable
 */
function isRecoverable(error: any): boolean {
  if (error instanceof AnalyticalError) {
    return error.recoverable;
  }
  // Default recovery check for unknown errors
  return false;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced error handler wrapper with retry logic and context preservation
 */
export function withErrorHandling<T>(
  toolName: string,
  fn: (...args: any[]) => Promise<T>
) {
  return async (...args: any[]): Promise<T> => {
    const executeWithRetry = async (attempt: number = 1): Promise<T> => {
      try {
        return await fn(...args);
      } catch (error) {
        const errorCode = (error as any).code || 'ERR_UNKNOWN';
        const recoveryStrategy = errorRecoveryStrategies[errorCode];
        
        // Log the error with context
        Logger.error(`[${toolName}] Error occurred`, {
          code: errorCode,
          message: error instanceof Error ? error.message : String(error),
          attempt,
          context: (error as any).context,
          args
        });

        // Check if we should retry
        if (recoveryStrategy?.retry && attempt <= recoveryStrategy.retry.times) {
          const delay = recoveryStrategy.retry.delay * Math.pow(recoveryStrategy.retry.backoff || 1, attempt - 1);
          Logger.info(`[${toolName}] Retrying in ${delay}ms (attempt ${attempt}/${recoveryStrategy.retry.times})`);
          
          await sleep(delay);
          return executeWithRetry(attempt + 1);
        }

        // If error is already an AnalyticalError, enhance it with tool context
        if (error instanceof AnalyticalError) {
          throw new AnalyticalError(
            error.code,
            `[${toolName}] ${error.message}`,
            { 
              toolName, 
              originalError: error, 
              args,
              ...error.context 
            },
            error.recoverable
          );
        }

        // Wrap unknown errors
        throw new AnalyticalError(
          errorCode,
          `[${toolName}] ${error instanceof Error ? error.message : String(error)}`,
          { toolName, originalError: error, args },
          isRecoverable(error)
        );
      }
    };

    return executeWithRetry();
  };
}

/**
 * Helper functions to create specific error types with consistent formatting
 */

export function createValidationError(
  message: string,
  context?: any,
  toolName?: string
): ValidationError {
  const fullMessage = toolName ? `[${toolName}] ${message}` : message;
  return new ValidationError(
    ErrorCodes.INVALID_INPUT,
    fullMessage,
    { toolName, ...context }
  );
}

export function createDataProcessingError(
  message: string,
  context?: any,
  toolName?: string
): DataProcessingError {
  const fullMessage = toolName ? `[${toolName}] ${message}` : message;
  return new DataProcessingError(
    ErrorCodes.CALCULATION_FAILED,
    fullMessage,
    { toolName, ...context }
  );
}

export function createAPIError(
  message: string,
  context?: any,
  toolName?: string
): APIError {
  const fullMessage = toolName ? `[${toolName}] ${message}` : message;
  return new APIError(
    ErrorCodes.API_RESPONSE_ERROR,
    fullMessage,
    { toolName, ...context },
    true // API errors are generally recoverable
  );
}

export function createConfigurationError(
  message: string,
  context?: any,
  toolName?: string
): ConfigurationError {
  const fullMessage = toolName ? `[${toolName}] ${message}` : message;
  return new ConfigurationError(
    ErrorCodes.INVALID_CONFIG,
    fullMessage,
    { toolName, ...context }
  );
}

export function createToolExecutionError(
  message: string,
  context?: any,
  toolName?: string
): ToolExecutionError {
  const fullMessage = toolName ? `[${toolName}] ${message}` : message;
  return new ToolExecutionError(
    ErrorCodes.TOOL_EXECUTION_FAILED,
    fullMessage,
    { toolName, ...context }
  );
}

/**
 * Check if an error is a specific type
 * This is a type-guard function to help with error handling
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorType: new (...args: any[]) => T
): error is T {
  return error instanceof errorType;
}
