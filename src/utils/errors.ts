/**
 * Custom Error Types
 *
 * This module provides custom error classes for the Analytical MCP Server.
 * These help with error categorization, handling, and provide better context.
 */

/**
 * Base error class for all Analytical MCP Server errors
 */
export class AnalyticalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticalError';
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AnalyticalError.prototype);
  }
}

/**
 * Error class for API-related errors
 */
export class APIError extends AnalyticalError {
  public status: number | undefined;
  public retryable: boolean;
  public endpoint: string | undefined;

  constructor(message: string, status?: number, retryable = false, endpoint?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.retryable = retryable;
    this.endpoint = endpoint;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Error class for validation errors
 */
export class ValidationError extends AnalyticalError {
  public details: Record<string, any> | undefined;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error class for data processing errors
 */
export class DataProcessingError extends AnalyticalError {
  public data: any | undefined;

  constructor(message: string, data?: any) {
    super(message);
    this.name = 'DataProcessingError';
    this.data = data;
    Object.setPrototypeOf(this, DataProcessingError.prototype);
  }
}

/**
 * Error class for configuration errors
 */
export class ConfigurationError extends AnalyticalError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error class for tool execution errors
 */
export class ToolExecutionError extends AnalyticalError {
  public toolName: string;

  constructor(toolName: string, message: string) {
    super(`Error in ${toolName}: ${message}`);
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
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
