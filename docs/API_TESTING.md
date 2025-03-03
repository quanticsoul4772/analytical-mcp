# API Testing Guide for Analytical MCP Server

This guide explains how to properly test the Analytical MCP Server with real API dependencies instead of using mocks.

## API Dependencies Overview

The Analytical MCP Server relies on the following external APIs:

1. **Exa API** - Used for research utilities and web search
   - Required for: Research integration, cross-domain knowledge synthesis
   - API key environment variable: `EXA_API_KEY`

## Setting Up API Testing

### 1. Environment Configuration

Create a `.env.test` file in the project root with your test API keys:

```
# Test environment configuration
EXA_API_KEY=your_test_api_key_here

# Optional testing settings
RESEARCH_DEFAULT_RESULTS=2
RESEARCH_MAX_TIME_RANGE=3
```

**Important:** Never commit real API keys to version control.

### 2. Running Tests with API Access

#### Option 1: Using the provided scripts

Run all tests with API access:

**Linux/macOS:**
```bash
# Make the script executable
chmod +x run-tests-with-api.sh

# Run all tests with API access
./run-tests-with-api.sh
```

**Windows:**
```
run-tests-with-api.bat
```

#### Option 2: Using environment variables

```bash
# Set environment variables directly
VERIFY_API_CONFIG=true SKIP_API_TESTS=false npm test
```

### 3. Conditional API Testing

By default, tests will attempt to use real API connections. If you want to skip tests that require API access:

```bash
SKIP_API_TESTS=true npm test
```

## CI/CD Integration

The CI pipeline is configured to handle API testing in two ways:

1. **Regular builds:** Skip API-dependent tests by default
2. **API testing builds:** Include `[test-api]` in your commit message to run tests with API access

For API testing in GitHub Actions, you need to add your API keys as repository secrets:

- `EXA_API_KEY` - Your Exa API test key

## Adding New API-Dependent Tests

When writing tests that depend on external APIs:

1. Use the skip helper in your test files:

```typescript
// Check if we should skip tests requiring API access
const skipIfNoApiAccess = (global as any).shouldSkipApiTests 
  ? (global as any).shouldSkipApiTests() 
  : false;

// In your test
it('should perform API-dependent operation', async () => {
  if (skipIfNoApiAccess) {
    console.log('Skipping API test');
    return;
  }
  
  // Test with real API
});
```

2. Handle API rate limits with retries:

```typescript
import { executeApiRequest } from '../utils/api_helpers';

// Use the retry utility
const result = await executeApiRequest(
  () => myApiCall(),
  { maxRetries: 3 }
);
```

## Best Practices

1. **Use .env.test file** - Keep test API keys separate from development keys
2. **Implement graceful degradation** - Tests should report skipping, not failing, when API keys aren't available
3. **Minimize API calls** - Design tests to minimize the number of API calls needed
4. **Handle rate limits** - Use the retry utilities to handle rate limiting
5. **Use test-specific timeouts** - API calls might need longer timeouts than unit tests

## Troubleshooting

If you encounter issues with API testing:

1. **API Key Validation**: Ensure your API keys are correctly set in the `.env.test` file
2. **Rate Limiting**: Some APIs have strict rate limits for test accounts
3. **Test Timeouts**: Increase the timeout in `setupTests.ts` if needed
4. **Network Issues**: Check your network connectivity and ensure APIs are accessible
