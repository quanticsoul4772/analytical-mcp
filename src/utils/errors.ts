/**
 * Standardized Error Handling System
 *
 * This module provides custom error classes with standardized error codes,
 * recovery strategies, and error handling utilities for the Analytical MCP Server.
 * These help with error categorization, handling, debugging, and recovery.
 */

import { Logger } from './logger.js';

/**
 * Standardized error codes for the Analytical MCP Server
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
  API_QUOTA_EXCEEDED = 'ERR_2005',
  
  // Processing errors (3xxx)
  CALCULATION_FAILED = 'ERR_3001',
  MEMORY_LIMIT = 'ERR_3002',
  TIMEOUT = 'ERR_3003',
  INSUFFICIENT_DATA = 'ERR_3004',
  COMPUTATION_ERROR = 'ERR_3005',
  
  // Configuration errors (4xxx)
  MISSING_CONFIG = 'ERR_4001',
  INVALID_CONFIG = 'ERR_4002',
  CONFIG_PARSE_ERROR = 'ERR_4003',
  
  // Tool execution errors (5xxx)
  TOOL_NOT_FOUND = 'ERR_5001',
  TOOL_EXECUTION_FAILED = 'ERR_5002',
  TOOL_INITIALIZATION_FAILED = 'ERR_5003',
  
  // Unknown/Generic errors (9xxx)
  UNKNOWN_ERROR = 'ERR_9001',
  INTERNAL_ERROR = 'ERR_9002',
}

/**
 * Error recovery strategy configuration
 */
export interface ErrorRecovery {
  retry?: { times: number; delay: number; backoff?: number };
  fallback?: () => any;
  cache?: boolean;
  skipOnFailure?: boolean;
}

/**
 * Error recovery strategies mapped by error code
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
    skipOnFailure: true
  },
  [ErrorCodes.TIMEOUT]: {
    retry: { times: 1, delay: 1000 }
  },
};

/**
 * Check if an error is recoverable based on its error code
 */
export function isRecoverable(error: any): boolean {
  const errorCode = error?.code || ErrorCodes.UNKNOWN_ERROR;
  const strategy = errorRecoveryStrategies[errorCode];
  return !!(strategy?.retry || strategy?.fallback || strategy?.skipOnFailure);
}

/**
 * Base error class for all Analytical MCP Server errors
 * Now includes standardized error codes, context, and recovery information
 */
export class AnalyticalError extends Error {
  public code: string;
  public context?: any;
  public recoverable: boolean;
  public timestamp: Date;
  public toolName?: string;

  constructor(
    code: string = ErrorCodes.UNKNOWN_ERROR,
    message: string,
    context?: any,
    recoverable = false,
    toolName?: string
  ) {
    super(message);
    this.name = 'AnalyticalError';
    this.code = code;
    this.context = context;
    this.recoverable = recoverable || isRecoverable({ code });
    this.timestamp = new Date();
    this.toolName = toolName;
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AnalyticalError.prototype);
  }

  /**
   * Get a formatted error message with tool name and error code
   */
  getFormattedMessage(): string {
    const toolPrefix = this.toolName ? `[${this.toolName}] ` : '';
    return `${toolPrefix}${this.code}: ${this.message}`;
  }

  /**
   * Get error details for logging and debugging
   */
  getErrorDetails(): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      toolName: this.toolName,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}

/**
 * Error class for API-related errors
 * Maintains backward compatibility with original constructor
 */
export class APIError extends AnalyticalError {
  public status: number | undefined;
  public endpoint: string | undefined;
  public retryable: boolean;

  constructor(
    messageOrCode: string,
    statusOrMessage?: number | string,
    retryableOrContext?: boolean | any,
    endpointOrStatus?: string | number,
    toolNameOrEndpoint?: string,
    toolName?: string
  ) {
    // Handle both old and new constructor patterns
    if (messageOrCode.startsWith('ERR_')) {
      // New pattern: (code, message, context, status, endpoint, toolName)
      const status = endpointOrStatus as number;
      const endpoint = toolNameOrEndpoint as string;
      const recoverable = status ? (status >= 500 || status === 429) : true;
      super(messageOrCode, statusOrMessage as string, retryableOrContext, recoverable, toolName);
      this.status = status;
      this.endpoint = endpoint;
      this.retryable = recoverable;
    } else {
      // Old pattern: (message, status, retryable, endpoint)
      const status = statusOrMessage as number;
      const retryable = retryableOrContext as boolean;
      const endpoint = endpointOrStatus as string;
      const recoverable = status ? (status >= 500 || status === 429) : (retryable || true);
      super(ErrorCodes.API_UNAVAILABLE, messageOrCode, { status, endpoint }, recoverable, toolNameOrEndpoint);
      this.status = status;
      this.endpoint = endpoint;
      this.retryable = retryable || recoverable;
    }
    
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Error class for validation errors
 * Maintains backward compatibility with original constructor
 */
export class ValidationError extends AnalyticalError {
  public details: Record<string, any> | undefined;

  constructor(
    messageOrCode: string,
    detailsOrMessage?: Record<string, any> | string,
    contextOrToolName?: any,
    toolName?: string
  ) {
    // Handle both old and new constructor patterns
    if (messageOrCode.startsWith('ERR_')) {
      // New pattern: (code, message, context, toolName)
      super(messageOrCode, detailsOrMessage as string, contextOrToolName, false, toolName);
      this.details = contextOrToolName;
    } else {
      // Old pattern: (message, details)
      super(ErrorCodes.INVALID_INPUT, messageOrCode, detailsOrMessage, false, contextOrToolName);
      this.details = detailsOrMessage as Record<string, any>;
    }
    
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error class for data processing errors
 * Maintains backward compatibility with original constructor
 */
export class DataProcessingError extends AnalyticalError {
  public data: any | undefined;

  constructor(
    messageOrCode: string,
    dataOrMessage?: any,
    contextOrToolName?: any,
    toolName?: string
  ) {
    // Handle both old and new constructor patterns
    if (messageOrCode.startsWith('ERR_')) {
      // New pattern: (code, message, context, toolName)
      super(messageOrCode, dataOrMessage as string, contextOrToolName, true, toolName);
      this.data = contextOrToolName;
    } else {
      // Old pattern: (message, data)
      super(ErrorCodes.CALCULATION_FAILED, messageOrCode, dataOrMessage, true, contextOrToolName);
      this.data = dataOrMessage;
    }
    
    this.name = 'DataProcessingError';
    Object.setPrototypeOf(this, DataProcessingError.prototype);
  }
}

/**
 * Error class for configuration errors
 * Maintains backward compatibility with original constructor
 */
export class ConfigurationError extends AnalyticalError {
  constructor(
    messageOrCode: string,
    contextOrToolName?: any,
    toolName?: string
  ) {
    // Handle both old and new constructor patterns
    if (messageOrCode.startsWith('ERR_')) {
      // New pattern: (code, message, context, toolName) - but we only have message in old pattern
      // This is a simplification since old pattern only had message
      super(messageOrCode, contextOrToolName as string, undefined, false, toolName);
    } else {
      // Old pattern: (message)
      super(ErrorCodes.MISSING_CONFIG, messageOrCode, undefined, false, contextOrToolName);
    }
    
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error class for tool execution errors
 * Maintains backward compatibility with original constructor
 */
export class ToolExecutionError extends AnalyticalError {
  constructor(
    toolName: string,
    messageOrCode: string,
    contextOrMessage?: any,
    context?: any
  ) {
    // Handle both old and new constructor patterns
    if (messageOrCode.startsWith('ERR_')) {
      // New pattern: (toolName, code, message, context)
      super(messageOrCode, contextOrMessage as string, context, true, toolName);
    } else {
      // Old pattern: (toolName, message)
      super(ErrorCodes.TOOL_EXECUTION_FAILED, messageOrCode, contextOrMessage, true, toolName);
    }
    
    this.name = 'ToolExecutionError';
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
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

/**
 * Error handler wrapper that standardizes error handling across all tools
 * Provides retry logic, error transformation, and recovery strategies
 */
export function withErrorHandling<T extends any[], R>(
  toolName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error: any) {
        lastError = error;
        
        // If it's already an AnalyticalError, preserve it but add tool context
        if (error instanceof AnalyticalError) {
          if (!error.toolName) {
            error.toolName = toolName;
          }
          
          // Check if we should retry
          const strategy = errorRecoveryStrategies[error.code];
          if (strategy?.retry && attempt < maxRetries) {
            const delay = strategy.retry.delay * Math.pow(strategy.retry.backoff || 1, attempt - 1);
            Logger.warn(`Retrying ${toolName} (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`, {
              error: error.getFormattedMessage(),
              code: error.code
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // Transform generic errors into AnalyticalErrors
          const analyticalError = new ToolExecutionError(
            toolName,
            ErrorCodes.TOOL_EXECUTION_FAILED,
            error.message || 'Unknown error occurred',
            { originalError: error, args }
          );

          // Check if we should retry based on error type
          if (attempt < maxRetries && isRecoverable(analyticalError)) {
            Logger.warn(`Retrying ${toolName} (attempt ${attempt + 1}/${maxRetries}) after generic error`, {
              error: analyticalError.getFormattedMessage()
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          lastError = analyticalError;
        }

        // If we reach here, we've exhausted retries or error is not recoverable
        break;
      }
    }

    // Log the final error
    if (lastError instanceof AnalyticalError) {
      Logger.error(`Tool ${toolName} failed after all attempts`, lastError.getErrorDetails());
    } else {
      Logger.error(`Tool ${toolName} failed with unhandled error`, { error: lastError });
    }

    throw lastError;
  };
}

/**
 * Handle errors with fallback strategies
 * Attempts to apply fallback functions if available
 */
export async function handleErrorWithFallback<T>(
  error: AnalyticalError,
  fallbackValue?: T
): Promise<T> {
  const strategy = errorRecoveryStrategies[error.code];
  
  if (strategy?.fallback) {
    try {
      Logger.info(`Applying fallback strategy for error ${error.code}`);
      return await strategy.fallback();
    } catch (fallbackError) {
      Logger.error('Fallback strategy failed', { originalError: error.code, fallbackError });
      throw error; // Throw original error if fallback fails
    }
  }

  if (strategy?.skipOnFailure && fallbackValue !== undefined) {
    Logger.info(`Skipping on failure for error ${error.code}, using fallback value`);
    return fallbackValue;
  }

  throw error;
}

/**
 * Create a standardized error from a generic error
 * Useful for transforming caught errors into our error system
 */
export function createStandardizedError(
  error: any,
  toolName?: string,
  defaultCode: string = ErrorCodes.UNKNOWN_ERROR
): AnalyticalError {
  if (error instanceof AnalyticalError) {
    if (toolName && !error.toolName) {
      error.toolName = toolName;
    }
    return error;
  }

  // Map common error patterns to specific error codes
  let errorCode = defaultCode;
  let message = error.message || 'Unknown error occurred';

  if (error.name === 'ValidationError' || message.includes('validation')) {
    errorCode = ErrorCodes.INVALID_INPUT;
  } else if (error.name === 'TypeError' || message.includes('type')) {
    errorCode = ErrorCodes.INVALID_PARAMETER_TYPE;
  } else if (error.name === 'RangeError' || message.includes('range')) {
    errorCode = ErrorCodes.PARAMETER_OUT_OF_RANGE;
  } else if (message.includes('timeout')) {
    errorCode = ErrorCodes.TIMEOUT;
  } else if (message.includes('memory')) {
    errorCode = ErrorCodes.MEMORY_LIMIT;
  } else if (message.includes('calculation') || message.includes('compute')) {
    errorCode = ErrorCodes.CALCULATION_FAILED;
  }

  return new AnalyticalError(
    errorCode,
    message,
    { originalError: error },
    isRecoverable({ code: errorCode }),
    toolName
  );
}

/**
 * Utility function to create validation errors with standard codes
 */
export function createValidationError(
  message: string,
  details?: any,
  toolName?: string
): ValidationError {
  let code = ErrorCodes.INVALID_INPUT;
  
  if (message.includes('required') || message.includes('missing')) {
    code = ErrorCodes.MISSING_REQUIRED_PARAM;
  } else if (message.includes('format') || message.includes('parse')) {
    code = ErrorCodes.INVALID_DATA_FORMAT;
  } else if (message.includes('type')) {
    code = ErrorCodes.INVALID_PARAMETER_TYPE;
  } else if (message.includes('range') || message.includes('limit')) {
    code = ErrorCodes.PARAMETER_OUT_OF_RANGE;
  }

  return new ValidationError(code, message, details, toolName);
}

/**
 * Utility function to create API errors with standard codes
 */
export function createAPIError(
  message: string,
  status?: number,
  endpoint?: string,
  toolName?: string
): APIError {
  let code = ErrorCodes.API_UNAVAILABLE;
  
  if (status === 401 || status === 403) {
    code = ErrorCodes.API_AUTH_FAILED;
  } else if (status === 429) {
    code = ErrorCodes.API_RATE_LIMIT;
  } else if (status === 408 || message.includes('timeout')) {
    code = ErrorCodes.API_TIMEOUT;
  } else if (status === 402 || message.includes('quota') || message.includes('limit')) {
    code = ErrorCodes.API_QUOTA_EXCEEDED;
  }

  return new APIError(code, message, { status, endpoint }, status, endpoint, toolName);
}

/**
 * Utility function to create data processing errors with standard codes
 */
export function createDataProcessingError(
  message: string,
  data?: any,
  toolName?: string
): DataProcessingError {
  let code = ErrorCodes.CALCULATION_FAILED;
  
  if (message.includes('insufficient') || message.includes('not enough')) {
    code = ErrorCodes.INSUFFICIENT_DATA;
  } else if (message.includes('memory')) {
    code = ErrorCodes.MEMORY_LIMIT;
  } else if (message.includes('timeout')) {
    code = ErrorCodes.TIMEOUT;
  } else if (message.includes('computation') || message.includes('compute')) {
    code = ErrorCodes.COMPUTATION_ERROR;
  }

  return new DataProcessingError(code, message, data, toolName);
}
