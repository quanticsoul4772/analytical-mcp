/**
 * Tool Wrapper Utility
 * 
 * Provides a higher-order function to wrap tool handlers with consistent error handling.
 */

import { Logger } from './logger.js';
import { 
  AnalyticalError, 
  ValidationError, 
  ToolExecutionError, 
  DataProcessingError 
} from './errors.js';
import { z } from 'zod';

/**
 * Wraps a tool handler with consistent error handling
 * 
 * @param handler The tool handler function
 * @param schema Optional Zod schema for input validation
 * @param toolName Name of the tool for error context
 * @returns Wrapped handler function with error handling
 */
export function wrapToolHandler<T, U>(
  handler: (params: T) => Promise<U>,
  schema?: z.ZodType<T>,
  toolName = 'unknown tool'
): (params: any) => Promise<U> {
  return async (params: any): Promise<U> => {
    Logger.debug(`Executing tool: ${toolName}`, { params });
    
    try {
      // Validate input if schema is provided
      let validatedParams: T;
      
      if (schema) {
        try {
          validatedParams = schema.parse(params);
        } catch (error) {
          // Handle Zod validation errors
          if (error instanceof z.ZodError) {
            Logger.error(`Validation error in ${toolName}`, error, {
              issues: error.issues,
              params
            });
            
            throw new ValidationError(`Invalid parameters for ${toolName}: ${error.message}`, {
              issues: error.issues,
              params
            });
          }
          throw error;
        }
      } else {
        validatedParams = params as T;
      }
      
      // Execute the handler with validated params
      const result = await handler(validatedParams);
      Logger.debug(`Tool ${toolName} executed successfully`);
      return result;
    } catch (error) {
      // Handle known error types
      if (error instanceof AnalyticalError) {
        // Already one of our custom errors, just log and re-throw
        Logger.error(`Error in ${toolName}`, error);
        throw error;
      }
      
      // Handle unknown errors
      Logger.error(`Unexpected error in ${toolName}`, 
        error instanceof Error ? error : new Error(String(error)),
        { params }
      );
      
      // Convert to a ToolExecutionError for consistency
      const toolError = new ToolExecutionError(
        toolName,
        error instanceof Error ? error.message : String(error)
      );
      
      // Copy the stack trace if available
      if (error instanceof Error && error.stack) {
        toolError.stack = error.stack;
      }
      
      throw toolError;
    }
  };
}

/**
 * Wraps a data processing function with consistent error handling
 * 
 * @param processor The data processing function
 * @param processorName Name of the processor for error context
 * @returns Wrapped processor function with error handling
 */
export function wrapDataProcessor<T, U>(
  processor: (data: T) => U,
  processorName = 'data processor'
): (data: T) => U {
  return (data: T): U => {
    try {
      return processor(data);
    } catch (error) {
      Logger.error(`Error in data processor: ${processorName}`, 
        error instanceof Error ? error : new Error(String(error)),
        { dataType: typeof data }
      );
      
      throw new DataProcessingError(
        `Data processing failed in ${processorName}: ${error instanceof Error ? error.message : String(error)}`,
        { dataType: typeof data }
      );
    }
  };
}
