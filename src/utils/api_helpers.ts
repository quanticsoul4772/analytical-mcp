/**
 * API Helper Utilities
 * Provides robust API handling capabilities for external service interaction
 */

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
      // If this is the last attempt, remember the error to throw later
      if (retryCount === maxRetries) {
        lastError = error instanceof Error ? error : new Error(String(error));
        break;
      }

      // Calculate delay with exponential backoff and some jitter
      delay = Math.min(delay * 1.5 + Math.random() * 100, maxDelay);
      
      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    }
  }

  // If we got here, all retries failed
  throw new Error(`Operation failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
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
  504  // Gateway Timeout
];

/**
 * Determines if an error is retryable
 * @param error Error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors are usually retryable
  if (error.name === 'FetchError' || error.name === 'NetworkError') {
    return true;
  }

  // Check for retryable HTTP status codes
  if (error.status && RETRYABLE_STATUS_CODES.includes(error.status)) {
    return true;
  }

  // Rate limit errors are usually retryable
  if (error.message && (
    error.message.includes('rate limit') || 
    error.message.includes('too many requests')
  )) {
    return true;
  }

  return false;
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
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 300,
    maxDelay = 5000,
    retryableCheck = isRetryableError
  } = options;

  return withRetry(
    async () => {
      try {
        return await apiRequestFn();
      } catch (error) {
        // Only retry if the error is determined to be retryable
        if (retryableCheck(error)) {
          throw error; // Will trigger retry
        } else {
          // For non-retryable errors, don't retry
          throw new Error(`Non-retryable API error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    },
    maxRetries,
    initialDelay,
    maxDelay
  );
}
