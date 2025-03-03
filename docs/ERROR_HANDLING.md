# Error Handling Guide for Analytical MCP Server

This document outlines the error handling patterns and best practices for the Analytical MCP Server project.

## Error Handling Architecture

The Analytical MCP Server uses a comprehensive error handling approach that includes:

1. **Specialized Error Types**: Custom error classes for different error categories
2. **Centralized Logging**: Consistent logging through a centralized Logger utility
3. **Error Propagation**: Clear patterns for error propagation and handling
4. **API Error Retry Mechanisms**: Intelligent retry logic for transient errors
5. **Global Error Handlers**: Server-level error interception and handling

## Error Types

### Base Error Types

- **`AnalyticalError`**: Base error class for all Analytical MCP Server errors
  - **`ValidationError`**: For input validation failures
  - **`APIError`**: For external API communication failures
  - **`DataProcessingError`**: For data transformation and processing errors
  - **`ConfigurationError`**: For system configuration issues
  - **`ToolExecutionError`**: For errors in tool execution

### Error Properties

Each error type can include additional contextual information:

```typescript
// Example of ValidationError
throw new ValidationError(
  'Invalid search query parameters',
  { 
    issues: zodError.issues,
    query: originalQuery
  }
);

// Example of APIError
throw new APIError(
  'API request failed',
  429, // HTTP status code
  true, // Is retryable
  'api/endpoint' // Endpoint identifier
);
```

## Error Handling Patterns

### Input Validation

Always validate inputs early to fail fast:

```typescript
// Validate with Zod
try {
  const validatedInput = mySchema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new ValidationError(
      `Invalid parameters: ${error.message}`,
      { issues: error.issues }
    );
  }
  throw error;
}
```

### API Error Handling

Use the `executeApiRequest` utility for external API calls:

```typescript
try {
  return await executeApiRequest(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new APIError(
        `API request failed: ${response.statusText}`,
        response.status,
        RETRYABLE_STATUS_CODES.includes(response.status),
        'service/endpoint'
      );
    }
    return await response.json();
  }, {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 10000,
    context: 'Descriptive context',
    endpoint: 'service/endpoint'
  });
} catch (error) {
  // Handle or propagate the error
}
```

### Tool Error Handling

Use the `wrapToolHandler` utility for MCP tools:

```typescript
const wrappedHandler = wrapToolHandler(
  originalHandler,
  validationSchema,
  'tool-name'
);
```

This wrapper will:
- Validate inputs using the provided schema
- Catch and log all errors
- Transform errors into appropriate error types
- Ensure consistent error handling

### Try-Catch Pattern

Always use try-catch blocks for error handling:

```typescript
try {
  // Operation that might fail
} catch (error) {
  // Specific error handling
  if (error instanceof ValidationError) {
    // Handle validation error
  } else if (error instanceof APIError) {
    // Handle API error
  } else {
    // Handle unknown errors
    Logger.error('Unexpected error', error);
    throw new AnalyticalError(
      `Operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

## Logging Best Practices

### Log Levels

- **DEBUG**: Detailed information for developers
- **INFO**: General operational information
- **WARN**: Warning conditions that don't cause failures
- **ERROR**: Error conditions that cause operations to fail

### Logging Context

Always provide context with logs:

```typescript
Logger.error('Failed to process data', error, {
  dataLength: data.length,
  operation: 'data-transformation',
  timestamp: new Date().toISOString()
});
```

### Performance Considerations

- Don't log sensitive information
- Don't log large objects or arrays in full
- Use debug level for high-volume logging
- Consider log sampling for high-frequency operations

## Testing Error Handling

Test both the happy path and error conditions:

```typescript
// Test happy path
it('should succeed with valid input', async () => {
  const result = await myFunction(validInput);
  expect(result).toBe(expectedOutput);
});

// Test error conditions
it('should throw ValidationError for invalid input', async () => {
  await expect(myFunction(invalidInput)).rejects.toThrow(ValidationError);
});

it('should handle API errors properly', async () => {
  // Mock API failure
  mockApiFunction.mockRejectedValue(new APIError('API failed', 500));
  
  // Test error handling
  await expect(myFunction(validInput)).rejects.toThrow(/API failed/);
});
```

## Global Error Handling

The server has global error handlers for uncaught exceptions:

```typescript
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
  // Don't exit immediately in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled rejection', 
    reason instanceof Error ? reason : new Error(String(reason))
  );
});
```

## Error Handling Checklist

When implementing error handling, ensure:

- [ ] Inputs are validated early
- [ ] Appropriate error types are used
- [ ] Errors include sufficient context
- [ ] Errors are properly logged
- [ ] API calls use retry mechanisms for transient errors
- [ ] Error handling is tested
- [ ] User-facing error messages are helpful but not too technical

By following these guidelines, the Analytical MCP Server maintains robust error handling practices that improve maintainability, debuggability, and user experience.
