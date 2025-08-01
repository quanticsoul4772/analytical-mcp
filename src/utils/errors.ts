/**
 * Enhanced Error Handling System
 *
 * This module provides a comprehensive error handling system for the Analytical MCP Server
 * with standardized error codes, recovery strategies, and automatic retry logic.
 */

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
  API_SERVICE_UNAVAILABLE = 'ERR_2004',
  API_INVALID_RESPONSE = 'ERR_2005',
  
  // Processing errors (3xxx)
  CALCULATION_FAILED = 'ERR_3001',
  MEMORY_LIMIT = 'ERR_3002',
  TIMEOUT = 'ERR_3003',
  INSUFFICIENT_DATA = 'ERR_3004',
  ALGORITHM_CONVERGENCE_FAILED = 'ERR_3005',
  
  // Configuration errors (4xxx)
  MISSING_CONFIG = 'ERR_4001',
  INVALID_CONFIG = 'ERR_4002',
  CONFIG_LOAD_FAILED = 'ERR_4003',
  
  // Tool execution errors (5xxx)
  TOOL_NOT_FOUND = 'ERR_5001',
  TOOL_EXECUTION_FAILED = 'ERR_5002',
  TOOL_DEPENDENCY_MISSING = 'ERR_5003'
}

/**
 * Error recovery strategy configuration
 */
export interface ErrorRecovery {
  retry?: {
    times: number;
    delay: number;
    backoff?: number; // Exponential backoff multiplier
  };
  fallback?: () => any;
  cache?: boolean;
}

/**
 * Recovery strategies for different error types
 */
export const errorRecoveryStrategies: Record<string, ErrorRecovery> = {
  [ErrorCodes.API_RATE_LIMIT]: {
    retry: { times: 3, delay: 1000, backoff: 2 },
    cache: true
  },
  [ErrorCodes.API_TIMEOUT]: {
    retry: { times: 2, delay: 500, backoff: 1.5 }
  },
  [ErrorCodes.API_SERVICE_UNAVAILABLE]: {
    retry: { times: 3, delay: 2000, backoff: 2 }
  },
  [ErrorCodes.CALCULATION_FAILED]: {
    retry: { times: 1, delay: 100 }
  },
  [ErrorCodes.TIMEOUT]: {
    retry: { times: 2, delay: 1000 }
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
    public recoverable = false
  ) {
    super(message);
    this.name = 'AnalyticalError';
    Object.setPrototypeOf(this, AnalyticalError.prototype);
  }
}

/**
 * Enhanced error classes with standardized codes
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

export class ToolExecutionError extends AnalyticalError {
  constructor(
    code: string,
    message: string,
    public toolName: string,
    context?: any,
    recoverable = false
  ) {
    super(code, `[${toolName}] ${message}`, context, recoverable);
    this.name = 'ToolExecutionError';
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

/**
 * Helper functions to create standardized errors with consistent formatting
 */
export function createValidationError(
  message: string,
  context?: any,
  toolName?: string
): ValidationError {
  const formattedMessage = toolName ? `[${toolName}] ${message}` : message;
  return new ValidationError(
    ErrorCodes.INVALID_INPUT,
    formattedMessage,
    { ...context, toolName },
    false
  );
}

export function createAPIError(
  message: string,
  code: string = ErrorCodes.API_SERVICE_UNAVAILABLE,
  context?: any,
  toolName?: string
): APIError {
  const formattedMessage = toolName ? `[${toolName}] ${message}` : message;
  return new APIError(
    code,
    formattedMessage,
    { ...context, toolName },
    true
  );
}

export function createDataProcessingError(
  message: string,
  context?: any,
  toolName?: string
): DataProcessingError {
  const formattedMessage = toolName ? `[${toolName}] ${message}` : message;
  return new DataProcessingError(
    ErrorCodes.CALCULATION_FAILED,
    formattedMessage,
    { ...context, toolName },
    false
  );
}

/**
 * Check if error is recoverable based on error code
 */
export function isRecoverable(error: any): boolean {
  if (error instanceof AnalyticalError) {
    return error.recoverable || errorRecoveryStrategies[error.code] !== undefined;
  }
  return false;
}

/**
 * Sleep utility for retry logic
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic based on error recovery strategies
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  errorCode?: string
): Promise<T> {
  let lastError: any;
  const strategy = errorCode ? errorRecoveryStrategies[errorCode] : undefined;
  const maxRetries = strategy?.retry?.times || 0;
  const baseDelay = strategy?.retry?.delay || 1000;
  const backoff = strategy?.retry?.backoff || 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !isRecoverable(error)) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(backoff, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Error handling wrapper for analytical tools
 */
export function withErrorHandling<T extends any[], R>(
  toolName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await executeWithRetry(async () => {
        return await fn(...args);
      });
    } catch (error: any) {
      // Transform generic errors into AnalyticalErrors with proper context
      if (!(error instanceof AnalyticalError)) {
        const context = { 
          toolName, 
          originalError: error.message || String(error),
          args: args.length <= 5 ? args : '[large args array]'
        };
        
        // Determine error type based on error characteristics
        if (error.message?.includes('validation') || error.message?.includes('invalid')) {
          throw createValidationError(error.message || 'Validation failed', context, toolName);
        } else if (error.message?.includes('API') || error.message?.includes('fetch')) {
          throw createAPIError(error.message || 'API request failed', ErrorCodes.API_SERVICE_UNAVAILABLE, context, toolName);
        } else {
          throw createDataProcessingError(error.message || 'Processing failed', context, toolName);
        }
      }
      
      // Re-throw AnalyticalErrors with tool name context if not already set
      if (!error.context?.toolName) {
        error.context = { ...error.context, toolName };
        error.message = `[${toolName}] ${error.message.replace(/^\[.*?\]\s*/, '')}`;
      }
      
      throw error;
    }
  };
}

/**
 * Legacy error classes for backward compatibility
 * These maintain the original API while new code should use enhanced classes
 */
export class LegacyAnalyticalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticalError';
    Object.setPrototypeOf(this, LegacyAnalyticalError.prototype);
  }
}

export class LegacyAPIError extends LegacyAnalyticalError {
  public status: number | undefined;
  public retryable: boolean;
  public endpoint: string | undefined;

  constructor(message: string, status?: number, retryable = false, endpoint?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.retryable = retryable;
    this.endpoint = endpoint;
    Object.setPrototypeOf(this, LegacyAPIError.prototype);
  }
}

export class LegacyValidationError extends LegacyAnalyticalError {
  public details: Record<string, any> | undefined;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, LegacyValidationError.prototype);
  }
}

export class LegacyDataProcessingError extends LegacyAnalyticalError {
  public data: any | undefined;

  constructor(message: string, data?: any) {
    super(message);
    this.name = 'DataProcessingError';
    this.data = data;
    Object.setPrototypeOf(this, LegacyDataProcessingError.prototype);
  }
}

export class LegacyConfigurationError extends LegacyAnalyticalError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, LegacyConfigurationError.prototype);
  }
}

export class LegacyToolExecutionError extends LegacyAnalyticalError {
  public toolName: string;

  constructor(toolName: string, message: string) {
    super(`Error in ${toolName}: ${message}`);
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    Object.setPrototypeOf(this, LegacyToolExecutionError.prototype);
  }
}

/**
 * Type-guard function to help with error handling
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorType: new (...args: any[]) => T
): error is T {
  return error instanceof errorType;
}

/**
 * Backward compatibility exports - existing code will continue to work
 */
export {
  LegacyAnalyticalError as AnalyticalError_Legacy,
  LegacyAPIError as APIError_Legacy,
  LegacyValidationError as ValidationError_Legacy,
  LegacyDataProcessingError as DataProcessingError_Legacy,
  LegacyConfigurationError as ConfigurationError_Legacy,
  LegacyToolExecutionError as ToolExecutionError_Legacy
};
