# API Testing Guide for Analytical MCP Server

This guide explains how to properly test the Analytical MCP Server with real API dependencies.

## Overview

The Analytical MCP Server relies on external API services for certain functionality. This guide provides best practices for running tests with these API dependencies.

## Running Tests with API Dependencies

### Standard Test Commands

```bash
# Run all tests with optimized settings
npm run test:optimized

# Run all tests with Windows-specific optimizations
npm run test:win

# Run tests with debugging enabled
npm run test:debug
```

### Specialized Test Scripts

For specific test cases that require API access, use the dedicated scripts:

**Windows:**
```
test-fallacy-detector.bat
```

**Unix/Linux/macOS:**
```bash
./run-tests-optimized.sh
```

## Configuration

### Environment Variables

All API keys are expected to be set in your system environment variables:

- `EXA_API_KEY` - Required for Exa research utility

No additional configuration is needed as long as these environment variables are properly set.

## Performance Optimizations

Several optimizations have been implemented to ensure tests run reliably:

1. **Memory Management**
   - Increased allocation with `--max-old-space-size=8192`
   - Garbage collection with `--expose-gc`

2. **Test Execution**
   - Sequential test execution with `--runInBand`
   - Increased timeouts for API operations
   - No-cache option for consistent results

3. **Code Optimizations**
   - Early validation in API-dependent functions
   - Efficient pattern matching with early returns
   - Reduced memory footprint with optimized algorithms

## Troubleshooting

### Common Issues

1. **Test Timeouts (Exit Code 143)**
   - Ensure you're using the optimized test scripts
   - Check that your API keys are valid and correctly set
   - Try increasing the timeout in setupTests.ts

2. **API Rate Limits**
   - Run tests with `--runInBand` to prevent concurrent API calls
   - Add delay between API requests if needed

3. **Memory Issues**
   - Increase memory allocation with `--max-old-space-size=8192`
   - Enable garbage collection with `--expose-gc`

## Best Practices

1. **Keep Tests Focused**
   - Test API-dependent functionality in isolation
   - Avoid unnecessary API calls in tests

2. **Efficient Resource Usage**
   - Use early returns and optimized algorithms
   - Pre-compute values when possible
   - Implement proper error handling

3. **CI/CD Integration**
   - Ensure CI environment has access to necessary API keys
   - Use optimized test settings in CI configuration

By following these guidelines, you can ensure reliable and efficient testing of API-dependent functionality in the Analytical MCP Server.
