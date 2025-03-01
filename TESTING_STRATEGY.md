# Testing Strategy for Analytical MCP Server

This document outlines the testing strategy for the Analytical MCP Server, with a focus on properly handling external API dependencies.

## Testing Philosophy

Our testing philosophy emphasizes:

1. **Real-world behavior** - Tests should verify actual functionality with real API calls where possible
2. **Graceful degradation** - Tests should handle missing API keys by skipping API-dependent tests 
3. **CI/CD compatibility** - Tests should work in both local and CI environments

## Test Types

### Unit Tests

These test individual functions and components in isolation and typically don't require API access.

### Integration Tests

These verify that multiple components work together correctly. Some of these tests may require API access.

### API-Dependent Tests

These tests specifically verify integration with external APIs and require valid API keys.

## Testing with External API Dependencies

### Why Not Use Mocks?

While mocks can be useful in some situations, we've chosen to use real API calls in our tests because:

1. **Behavior verification** - Real API calls verify the actual behavior, not just our expectations
2. **Contract verification** - Tests will fail if APIs change their response structure
3. **End-to-end verification** - Ensures our code works with the actual services it will use in production

### How API Dependencies Are Handled

1. **Environment Variables** - API keys are provided via `.env.test`
2. **Conditional Execution** - Tests can skip API-dependent tests when keys aren't available
3. **Test Helpers** - Helper functions simplify working with API dependencies
4. **Extended Timeouts** - API tests get longer timeouts to account for network latency

## Running Tests

### Option 1: Run All Tests

```bash
npm test
```

This will attempt to run all tests, including API-dependent ones if API keys are available.

### Option 2: Skip API-Dependent Tests

```bash
npm run test:no-api
```

This will skip any tests that require API access.

### Option 3: Focus on API Tests

```bash
npm run test:api
```

This will verify API configuration and run all tests including API-dependent ones.

## CI/CD Integration

Our CI/CD pipeline has special handling for API tests:

- Regular commits: Skip API-dependent tests
- Commits with `[test-api]` in the message: Run API tests using secrets set in the CI environment

## Best Practices for Writing Tests

1. **Test Both Success and Failure Cases** - Verify your code handles both valid and error responses
2. **Handle Rate Limits** - Use retry logic for API calls
3. **Clean Separation** - Keep API-dependent code in specific modules for easier testing
4. **Targeted Testing** - Only test the API integration points, not every function that might use them
5. **Skip Gracefully** - Use the skip helpers rather than commenting out tests

## Additional Resources

For more detailed information on API testing specifically, see the [API_TESTING.md](./API_TESTING.md) document.
