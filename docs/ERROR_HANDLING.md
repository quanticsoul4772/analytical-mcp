# Error Handling Guide

This document provides comprehensive information about the error handling system implemented in the Analytical MCP Server following the major refactoring in PRs #10, #11, and #12.

## Overview

The Analytical MCP Server implements a robust error handling system with:
- Standardized error codes organized by category
- Automatic retry logic with exponential backoff
- Enhanced error context for debugging
- Tool-specific error handling patterns
- Graceful fallback mechanisms

## Error Code Reference

### 1xxx - Validation Errors
| Code | Description | Recoverable | Common Causes |
|------|-------------|-------------|---------------|
| ERR_1001 | Invalid Input | No | Malformed data, null values |
| ERR_1002 | Missing Required Parameter | No | Required fields not provided |
| ERR_1003 | Invalid Data Format | No | Wrong data type, format mismatch |
| ERR_1004 | Invalid Parameter Type | No | Type conversion failures |
| ERR_1005 | Parameter Out of Range | No | Values exceed allowed bounds |

### 2xxx - API Errors
| Code | Description | Recoverable | Retry Strategy |
|------|-------------|-------------|----------------|
| ERR_2001 | API Rate Limit | Yes | 3 retries, 1s delay, 2x backoff |
| ERR_2002 | API Authentication Failed | No | Check API keys |
| ERR_2003 | API Timeout | Yes | 2 retries, 500ms delay, 1.5x backoff |
| ERR_2004 | API Service Unavailable | Yes | 3 retries, 2s delay, 2x backoff |
| ERR_2005 | API Invalid Response | No | Check API endpoint |

### 3xxx - Processing Errors
| Code | Description | Recoverable | Action Required |
|------|-------------|-------------|-----------------|
| ERR_3001 | Calculation Failed | Partial | Retry with different parameters |
| ERR_3002 | Memory Limit | No | Reduce data size |
| ERR_3003 | Timeout | Yes | 2 retries, 1s delay |
| ERR_3004 | Insufficient Data | No | Provide more data points |
| ERR_3005 | Algorithm Convergence Failed | No | Adjust algorithm parameters |

### 4xxx - Configuration Errors
| Code | Description | Recoverable | Resolution |
|------|-------------|-------------|------------|
| ERR_4001 | Missing Configuration | No | Check environment variables |
| ERR_4002 | Invalid Configuration | No | Validate configuration format |
| ERR_4003 | Configuration Load Failed | No | Check file permissions |

### 5xxx - Tool Execution Errors
| Code | Description | Recoverable | Debug Steps |
|------|-------------|-------------|-------------|
| ERR_5001 | Tool Not Found | No | Verify tool registration |
| ERR_5002 | Tool Execution Failed | Partial | Check tool dependencies |
| ERR_5003 | Tool Dependency Missing | No | Install required dependencies |

## Recovery Strategies

### Automatic Retry Logic

The system implements intelligent retry strategies based on error types:

```typescript
// API rate limit example
errorRecoveryStrategies[ErrorCodes.API_RATE_LIMIT] = {
  retry: { times: 3, delay: 1000, backoff: 2 },
  cache: true
};
```

### Retry Patterns by Error Type

1. **Immediate Retry**: For transient failures (timeouts, temporary unavailability)
2. **Exponential Backoff**: For rate limits and overload situations
3. **No Retry**: For validation errors and permanent failures

### Fallback Mechanisms

- **Cache Fallback**: Use cached results when API calls fail
- **Degraded Mode**: Provide basic functionality when advanced features fail
- **Alternative Algorithms**: Switch to backup algorithms for processing failures

## Error Context Structure

All errors include rich context information:

```typescript
interface ErrorContext {
  toolName: string;           // Tool that generated the error
  timestamp: string;          // When error occurred
  parameters?: any;           // Input parameters (sanitized)
  recoveryAttempts?: number;  // Number of retry attempts
  originalError?: string;     // Original error message
  debugInfo?: any;           // Additional debug information
}
```

## Tool-Specific Error Handling

### Data Analysis Tools
- **analyze_dataset**: Validates data format, handles large datasets
- **advanced_regression_analysis**: Manages convergence failures
- **hypothesis_testing**: Checks statistical assumptions

### API-Dependent Tools  
- **exa_research**: Implements rate limiting and fallback caching
- **research_verification**: Handles multi-source verification failures

### Logic Tools
- **logical_fallacy_detector**: Manages text processing limits
- **logical_argument_analyzer**: Handles complex argument structures

## Migration Guide for Custom Tools

### Step 1: Wrap Tool Functions

Replace direct tool implementations with error-wrapped versions:

```typescript
// Before
export async function myTool(params: MyParams) {
  // tool implementation
}

// After  
import { withErrorHandling } from '../utils/errors';

export const myTool = withErrorHandling('myTool', async (params: MyParams) => {
  // tool implementation
});
```

### Step 2: Use Standardized Error Creation

Replace generic errors with standardized error types:

```typescript
// Before
throw new Error('Invalid input');

// After
import { createValidationError } from '../utils/errors';
throw createValidationError('Invalid input data format', { received: typeof data });
```

### Step 3: Add Error Recovery

Implement tool-specific recovery strategies:

```typescript
// Add retry logic for recoverable errors
import { executeWithRetry, ErrorCodes } from '../utils/errors';

const result = await executeWithRetry(
  () => riskyCOperation(),
  ErrorCodes.API_TIMEOUT
);
```

## Debugging with Enhanced Error Context

### Error Logging

All errors are logged with structured information:

```typescript
{
  "level": "error",
  "timestamp": "2025-08-01T16:42:00.000Z",
  "toolName": "analyze_dataset",
  "errorCode": "ERR_1003",
  "message": "Invalid data format",
  "context": {
    "dataType": "string",
    "expectedType": "number[]",
    "parameterName": "data"
  }
}
```

### Debug Mode

Enable debug mode for additional error information:

```bash
export NODE_ENV=debug
npm run start
```

### Error Tracking

Monitor error patterns:
- High-frequency errors indicate systematic issues
- Recovery success rates show system resilience
- Error context helps identify root causes

## Performance Impact

### Error Handling Overhead

- Validation: ~1-2ms per tool call
- Retry Logic: Variable based on failure rate
- Context Generation: ~0.5ms per error

### Optimization Strategies

1. **Early Validation**: Catch errors before expensive operations
2. **Caching**: Store successful results to avoid retries
3. **Circuit Breakers**: Temporarily disable failing external services

## Best Practices

### For Tool Developers

1. **Use Standard Error Types**: Always use predefined error classes
2. **Provide Rich Context**: Include relevant debugging information
3. **Test Error Paths**: Ensure error handling works correctly
4. **Document Error Conditions**: Clear documentation of possible errors

### For API Users

1. **Handle Specific Error Codes**: Different errors require different responses
2. **Implement Client-Side Retry**: For transient errors
3. **Log Error Context**: Use provided context for debugging
4. **Monitor Error Rates**: Track application health

## Testing Error Handling

### Unit Tests

```typescript
describe('Tool Error Handling', () => {
  it('should return ERR_1001 for invalid input', async () => {
    try {
      await myTool({ invalidParam: null });
    } catch (error) {
      expect(error.code).toBe('ERR_1001');
      expect(error.context.toolName).toBe('myTool');
    }
  });
});
```

### Integration Tests

Test error handling across tool boundaries and with external services.

### Performance Tests

Measure error handling overhead and recovery time.

## Monitoring and Alerting

### Key Metrics

- Error rate by tool and error code
- Recovery success rate
- Average retry attempts
- Error resolution time

### Alerting Thresholds

- Error rate > 5% for any tool
- Recovery rate < 80% for recoverable errors
- High frequency of configuration errors

## Troubleshooting Common Issues

### High Error Rates

1. Check recent configuration changes
2. Verify external service availability
3. Review recent code deployments
4. Monitor resource usage (memory, CPU)

### Recovery Failures

1. Check retry configuration 
2. Verify fallback mechanisms
3. Test with reduced load
4. Review error context for patterns

### Performance Issues

1. Check error handling overhead
2. Optimize validation logic
3. Review retry delays
4. Consider circuit breakers

## Future Enhancements

### Planned Features

- Error rate limiting to prevent cascade failures
- Machine learning-based error prediction
- Dynamic retry strategy adjustment
- Cross-tool error correlation

### Configuration Options

- Customizable retry strategies per tool
- Error sampling for high-volume scenarios  
- Integration with external monitoring systems

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Error responses for each tool
- [Testing Guide](./TESTING.md) - Error handling test patterns
- [Troubleshooting](./TROUBLESHOOTING.md) - Common error solutions
- [Development Guide](./DEVELOPMENT.md) - Implementation patterns

## Version History

- **v0.1.0**: Initial error handling implementation
- **Current**: Enhanced error codes and recovery strategies (PRs #10, #11, #12)