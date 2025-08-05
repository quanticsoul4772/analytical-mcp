/**
 * Tool Wrapper Utility
 *
 * Provides a higher-order function to wrap tool handlers with consistent error handling.
 * Updated to use latest MCP SDK patterns.
 */

import { Logger } from './logger.js';
import {
  AnalyticalError,
  ValidationError,
  ToolExecutionError,
  DataProcessingError,
} from './errors.js';
import { z } from 'zod';

/**
 * Type definition for MCP tool handler
 */
export type ToolHandler<TParams, TResult> = (params: TParams) => Promise<TResult>;

/**
 * Wraps a tool handler with consistent error handling and logging
 *
 * @param handler The tool handler function
 * @param schema Optional Zod schema for input validation
 * @param toolName Name of the tool for error context
 * @returns Wrapped handler function with error handling
 */
export function wrapToolHandler<TParams, TResult>(
  handler: ToolHandler<TParams, TResult>,
  schema?: z.ZodType<TParams>,
  toolName = 'unknown tool'
): ToolHandler<any, TResult> {
  return async (params: any): Promise<TResult> => {
    const startTime = Date.now();
    Logger.debug(`Executing tool: ${toolName}`, { params });

    try {
      // Validate input if schema is provided
      let validatedParams: TParams;

      if (schema) {
        try {
          validatedParams = schema.parse(params);
        } catch (error) {
          // Handle Zod validation errors
          if (error instanceof z.ZodError) {
            Logger.error(`Validation error in ${toolName}`, error, {
              issues: error.issues,
              params,
            });

            throw new ValidationError(
              'ERR_1001',
              `Invalid parameters for ${toolName}: ${error.message}`,
              { issues: error.issues, params }
            );
          }
          throw error;
        }
      } else {
        validatedParams = params as TParams;
      }

      // Execute the handler with validated params
      const result = await handler(validatedParams);

      // Log execution time for performance monitoring
      const executionTime = Date.now() - startTime;
      Logger.debug(`Tool ${toolName} executed successfully in ${executionTime}ms`);

      return result;
    } catch (error) {
      // Calculate execution time even for failures
      const executionTime = Date.now() - startTime;

      // Handle known error types
      if (error instanceof AnalyticalError) {
        // Already one of our custom errors, just log and re-throw
        Logger.error(`Error in ${toolName} after ${executionTime}ms`, error);
        throw error;
      }

      // Handle unknown errors
      Logger.error(
        `Unexpected error in ${toolName} after ${executionTime}ms`,
        error instanceof Error ? error : new Error(String(error)),
        { params }
      );

      // Convert to a ToolExecutionError for consistency
      const toolError = new ToolExecutionError(
        'ERR_1003',
        error instanceof Error ? error.message : String(error),
        toolName
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
export function wrapDataProcessor<TInput, TOutput>(
  processor: (data: TInput) => TOutput,
  processorName = 'data processor'
): (data: TInput) => TOutput {
  return (data: TInput): TOutput => {
    const startTime = Date.now();

    try {
      const result = processor(data);

      // Log execution time for performance monitoring
      const executionTime = Date.now() - startTime;
      Logger.debug(`Data processor ${processorName} completed in ${executionTime}ms`);

      return result;
    } catch (error) {
      // Calculate execution time even for failures
      const executionTime = Date.now() - startTime;

      Logger.error(
        `Error in data processor ${processorName} after ${executionTime}ms`,
        error instanceof Error ? error : new Error(String(error)),
        { dataType: typeof data }
      );

      throw new DataProcessingError(
        'ERR_1001',
        `Data processing failed in ${processorName}: ${error instanceof Error ? error.message : String(error)}`,
        { dataType: typeof data }
      );
    }
  };
}
