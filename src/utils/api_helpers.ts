/**
 * API Helper Utilities
 * Provides robust API handling capabilities for external service interaction
 */

import { APIError, ConfigurationError } from './errors.js';
import { Logger } from './logger.js';
import { config } from './config.js';

/**
 * Retries a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 300,
  maxDelay: number = 5000
): Promise<T> {
  let lastError: Error | null = null;
  let retryCount = 0;
  let delay = initialDelay;

  while (retryCount <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      // Log retry attempts
      Logger.debug(`Retry attempt ${retryCount + 1}/${maxRetries + 1} failed`, { error });

      // If this is the last attempt, remember the error to throw later
      if (retryCount === maxRetries) {
        lastError = error instanceof Error ? error : new Error(String(error));
        break;
      }

      // Calculate delay with exponential backoff and some jitter
      delay = Math.min(delay * 1.5 + Math.random() * 100, maxDelay);

      // Wait for the calculated delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      retryCount++;
    }
  }

  // If we got here, all retries failed
  const finalError = lastError || new Error('Operation failed after multiple retries');
  Logger.error('All retry attempts failed', finalError);
  throw finalError;
}

/**
 * HTTP Status codes that indicate a temporary error that might succeed on retry
 */
export const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Determines if an error is retryable
 * @param error Error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Already identified as retryable via our custom error
  if (error instanceof APIError && error.retryable) {
    return true;
  }

  // Network errors are usually retryable
  if (error.name === 'FetchError' || error.name === 'NetworkError') {
    return true;
  }

  // Check for retryable HTTP status codes
  if (error.status && RETRYABLE_STATUS_CODES.includes(error.status)) {
    return true;
  }

  // Rate limit errors are usually retryable
  if (
    error.message &&
    (error.message.toLowerCase().includes('rate limit') ||
      error.message.toLowerCase().includes('too many requests') ||
      error.message.toLowerCase().includes('timeout'))
  ) {
    return true;
  }

  // Connection errors are usually retryable
  if (
    error.message &&
    (error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('socket'))
  ) {
    return true;
  }

  return false;
}

/**
 * Validates that all required API keys are present in the environment
 * Throws ConfigurationError if any required keys are missing
 *
 * Note: API keys should be set in system environment variables.
 * .env files are only used for local development and should never contain actual API keys
 */
export function checkApiKeys(): void {
  const requiredKeys = {
    EXA_API_KEY: config.EXA_API_KEY,
    // Add other required API keys here as they are added to the system
  };

  const missingKeys = Object.entries(requiredKeys)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const errorMessage = `Missing required API key(s): ${missingKeys.join(', ')}. Ensure these are set in your system environment variables.`;
    Logger.error(errorMessage);
    throw new ConfigurationError(errorMessage);
  }

  Logger.debug('All required API keys validated successfully');
}

/**
 * Execute API request with retry logic for common failures
 * @param apiRequestFn Function to execute API request
 * @param options Options for retry behavior
 * @returns API response
 */
export async function executeApiRequest<T>(
  apiRequestFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    retryableCheck?: (error: any) => boolean;
    context?: string; // Added context parameter
    endpoint?: string; // Added endpoint parameter
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 300,
    maxDelay = 5000,
    retryableCheck = isRetryableError,
    context = 'API operation',
    endpoint,
  } = options;

  Logger.debug(`Executing API request: ${context}`, { endpoint });

  return withRetry(
    async () => {
      try {
        return await apiRequestFn();
      } catch (error) {
        // Create a properly structured API error
        let apiError: APIError;

        if (error instanceof APIError) {
          // Already an APIError, just update the endpoint if not set
          if (endpoint && !error.endpoint) {
            error.endpoint = endpoint;
          }
          apiError = error;
        } else {
          // Convert to APIError for consistency
          const status = (error as any).status || undefined;
          const isRetryable = retryableCheck(error);
          apiError = new APIError(
            `${context} failed: ${error instanceof Error ? error.message : String(error)}`,
            status,
            isRetryable,
            endpoint
          );

          // Copy stack trace if available
          if (error instanceof Error && error.stack) {
            apiError.stack = error.stack;
          }
        }

        // Log the error with context
        Logger.error(`API error in ${context}`, apiError, { endpoint });

        // Only retry if the error is determined to be retryable
        if (retryableCheck(apiError)) {
          Logger.debug(`Error is retryable, will attempt retry`, {
            context,
            endpoint,
            errorMessage: apiError.message,
          });
          throw apiError; // Will trigger retry
        } else {
          Logger.debug(`Error is not retryable, failing immediately`, {
            context,
            endpoint,
            errorMessage: apiError.message,
          });
          throw apiError; // Non-retryable error
        }
      }
    },
    maxRetries,
    initialDelay,
    maxDelay
  );
}
