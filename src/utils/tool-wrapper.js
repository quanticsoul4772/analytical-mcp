/**
 * Tool Wrapper Utility (JavaScript version to avoid TypeScript errors)
 *
 * Provides a higher-order function to wrap tool handlers with consistent error handling.
 */

import { Logger } from './logger.js';

/**
 * Wraps a tool handler with consistent error handling and logging
 *
 * @param {Function} handler The tool handler function
 * @param {Object} schema Optional Zod schema for input validation
 * @param {string} toolName Name of the tool for error context
 * @returns {Function} Wrapped handler function with error handling
 */
export function wrapToolHandler(handler, schema, toolName = 'unknown tool') {
  return async function(params) {
    const startTime = Date.now();
    Logger.debug(`Executing tool: ${toolName}`, { params });

    try {
      // Validate input if schema is provided
      let validatedParams = params;

      if (schema) {
        try {
          validatedParams = schema.parse(params);
        } catch (error) {
          // Handle Zod validation errors
          Logger.error(`Validation error in ${toolName}`, error, {
            issues: error.issues || [],
            params,
          });

          throw new Error(`Invalid parameters for ${toolName}: ${error.message}`);
        }
      }

      // Execute the handler with validated params
      let result = await handler(validatedParams);

      // Log execution time for performance monitoring
      const executionTime = Date.now() - startTime;
      Logger.debug(`Tool ${toolName} executed successfully in ${executionTime}ms`);

      return result;
    } catch (error) {
      // Calculate execution time even for failures
      const executionTime = Date.now() - startTime;

      // Log the error
      Logger.error(
        `Error in ${toolName} after ${executionTime}ms`,
        error,
        { params }
      );

      // Rethrow with better context
      throw new Error(`Error in ${toolName}: ${error.message}`);
    }
  };
}
