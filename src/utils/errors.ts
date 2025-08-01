/**
 * Enhanced Error Handling System for Analytical MCP Server
 * Provides standardized error codes, recovery strategies, and error handling wrapper
 */

/**
 * Standardized error codes organized by category
 */
export enum ErrorCodes {
  // Validation errors (1xxx)
  INVALID_INPUT = 'ERR_1001',
  MISSING_REQUIRED_PARAM = 'ERR_1002',
  INVALID_DATA_FORMAT = 'ERR_1003',
  INVALID_TYPE = 'ERR_1004',
  INVALID_RANGE = 'ERR_1005',
  
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
  PARSING_ERROR = 'ERR_3004',
  INSUFFICIENT_DATA = 'ERR_3005',
  
  // Configuration errors (4xxx)
  MISSING_CONFIG = 'ERR_4001',
  INVALID_CONFIG = 'ERR_4002',
  CONFIG_LOAD_FAILED = 'ERR_4003',
  
  // Tool execution errors (5xxx)
  TOOL_EXECUTION_FAILED = 'ERR_5001',
  TOOL_NOT_FOUND = 'ERR_5002',
  TOOL_INITIALIZATION_FAILED = 'ERR_5003',
}

/**
 * Enhanced base error class with error codes and context
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
 * Specific error types extending AnalyticalError
 */
export class EnhancedValidationError extends AnalyticalError {
  constructor(code: string, message: string, context?: any) {
    super(code, message, context, false);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, EnhancedValidationError.prototype);
  }
}

export class EnhancedAPIError extends AnalyticalError {
  constructor(code: string, message: string, context?: any, recoverable = true) {
    super(code, message, context, recoverable);
    this.name = 'APIError';
    Object.setPrototypeOf(this, EnhancedAPIError.prototype);
  }
}

export class EnhancedDataProcessingError extends AnalyticalError {
  constructor(code: string, message: string, context?: any, recoverable = false) {
    super(code, message, context, recoverable);
    this.name = 'DataProcessingError';
    Object.setPrototypeOf(this, EnhancedDataProcessingError.prototype);
  }
}

export class EnhancedConfigurationError extends AnalyticalError {
  constructor(code: string, message: string, context?: any) {
    super(code, message, context, false);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, EnhancedConfigurationError.prototype);
  }
}

export class EnhancedToolExecutionError extends AnalyticalError {
  constructor(code: string, message: string, context?: any, recoverable = false) {
    super(code, message, context, recoverable);
    this.name = 'ToolExecutionError';
    Object.setPrototypeOf(this, EnhancedToolExecutionError.prototype);
  }
}

/**
 * Error recovery configuration interface
 */
interface ErrorRecovery {
  retry?: { times: number; delay: number; backoff?: number };
  fallback?: () => any;
  cache?: boolean;
}

/**
 * Error recovery strategies for different error codes
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
    retry: { times: 3, delay: 2000, backoff: 2 }
  },
  [ErrorCodes.CALCULATION_FAILED]: { 
    retry: { times: 1, delay: 100 }
  },
  [ErrorCodes.MEMORY_LIMIT]: { 
    retry: { times: 1, delay: 1000 }
  },
  [ErrorCodes.PARSING_ERROR]: { 
    retry: { times: 1, delay: 100 }
  },
};

/**
 * Helper function to create validation errors with consistent format
 */
export function createValidationError(
  message: string, 
  context?: any, 
  toolName?: string
): EnhancedValidationError {
  const enhancedMessage = toolName ? `[${toolName}] ${message}` : message;
  return new EnhancedValidationError(ErrorCodes.INVALID_INPUT, enhancedMessage, context);
}

/**
 * Helper function to create data processing errors with consistent format
 */
export function createDataProcessingError(
  message: string, 
  context?: any, 
  toolName?: string
): EnhancedDataProcessingError {
  const enhancedMessage = toolName ? `[${toolName}] ${message}` : message;
  return new EnhancedDataProcessingError(ErrorCodes.CALCULATION_FAILED, enhancedMessage, context);
}

/**
 * Helper function to create API errors with consistent format
 */
export function createAPIError(
  message: string, 
  context?: any, 
  toolName?: string,
  recoverable = true
): EnhancedAPIError {
  const enhancedMessage = toolName ? `[${toolName}] ${message}` : message;
  return new EnhancedAPIError(ErrorCodes.API_UNAVAILABLE, enhancedMessage, context, recoverable);
}

/**
 * Helper function to create tool execution errors with consistent format
 */
export function createToolExecutionError(
  message: string, 
  context?: any, 
  toolName?: string
): EnhancedToolExecutionError {
  const enhancedMessage = toolName ? `[${toolName}] ${message}` : message;
  return new EnhancedToolExecutionError(ErrorCodes.TOOL_EXECUTION_FAILED, enhancedMessage, context);
}

/**
 * Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced error handling wrapper with automatic retry and recovery
 */
export function withErrorHandling<T>(
  toolName: string,
  fn: (...args: any[]) => Promise<T>
) {
  return async (...args: any[]): Promise<T> => {
    let lastError: Error;
    
    // Determine retry strategy if any
    const maxAttempts = 1; // Default: no retry unless error has recovery strategy
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        
        // Convert to AnalyticalError if not already
        let analyticalError: AnalyticalError;
        if (error instanceof AnalyticalError) {
          analyticalError = error;
        } else {
          analyticalError = new AnalyticalError(
            'ERR_UNKNOWN',
            `[${toolName}] ${error instanceof Error ? error.message : String(error)}`,
            { toolName, originalError: error, args },
            false
          );
        }
        
        // Check if error has recovery strategy
        const recovery = errorRecoveryStrategies[analyticalError.code];
        if (recovery?.retry && attempt < (recovery.retry.times + 1)) {
          const delay = recovery.retry.delay * Math.pow(recovery.retry.backoff || 1, attempt - 1);
          await sleep(delay);
          continue;
        }
        
        // No more retries, throw the error
        throw analyticalError;
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw lastError!;
  };
}

/**
 * Check if an error is recoverable
 */
export function isRecoverable(error: unknown): boolean {
  if (error instanceof AnalyticalError) {
    return error.recoverable || !!errorRecoveryStrategies[error.code];
  }
  return false;
}

/**
 * Type guard functions for error handling
 */
export function isValidationError(error: unknown): error is EnhancedValidationError {
  return error instanceof EnhancedValidationError;
}

export function isAPIError(error: unknown): error is EnhancedAPIError {
  return error instanceof EnhancedAPIError;
}

export function isDataProcessingError(error: unknown): error is EnhancedDataProcessingError {
  return error instanceof EnhancedDataProcessingError;
}

export function isConfigurationError(error: unknown): error is EnhancedConfigurationError {
  return error instanceof EnhancedConfigurationError;
}

export function isToolExecutionError(error: unknown): error is EnhancedToolExecutionError {
  return error instanceof EnhancedToolExecutionError;
}

/**
 * Legacy error classes for backward compatibility
 */
export class LegacyValidationError extends Error {
  public details: Record<string, any> | undefined;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, LegacyValidationError.prototype);
  }
}

export class LegacyDataProcessingError extends Error {
  public data: any | undefined;

  constructor(message: string, data?: any) {
    super(message);
    this.name = 'DataProcessingError';
    this.data = data;
    Object.setPrototypeOf(this, LegacyDataProcessingError.prototype);
  }
}

export class LegacyAPIError extends Error {
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

export class LegacyConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, LegacyConfigurationError.prototype);
  }
}

export class LegacyToolExecutionError extends Error {
  public toolName: string;

  constructor(toolName: string, message: string) {
    super(`Error in ${toolName}: ${message}`);
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    Object.setPrototypeOf(this, LegacyToolExecutionError.prototype);
  }
}

// Export legacy types for backward compatibility (override the enhanced ones)
export { 
  LegacyValidationError as ValidationError,
  LegacyDataProcessingError as DataProcessingError,
  LegacyAPIError as APIError,
  LegacyConfigurationError as ConfigurationError,
  LegacyToolExecutionError as ToolExecutionError
};