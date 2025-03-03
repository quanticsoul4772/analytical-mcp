# Testing Guide for Analytical MCP Server

This guide provides information about testing strategies and optimizations for the Analytical MCP server.

## Test Optimization Improvements

We've made several optimizations to address test timeout issues:

1. **Increased Jest Timeout Limits**
   - Default timeout increased to 30 seconds in `jest.config.js`
   - This helps prevent premature test termination

2. **Memory Allocation Optimization**
   - Added `test:optimized` script with increased Node.js memory allocation
   - Uses `--max-old-space-size=4096` to provide 4GB of memory to the Node process

3. **Test Isolation Scripts**
   - `run-fallacy-test.sh` (Linux/macOS) and `run-fallacy-test.bat` (Windows)
   - Allow running just the logical fallacy detector test with optimized settings

4. **Mock Implementations**
   - Created mocks for external API calls in `src/__mocks__/`
   - Eliminates network dependencies during tests
   - Speeds up test execution

5. **Jest Configuration Improvements**
   - Added setup file support (`setupTests.ts`)
   - Configured global timeout and environment variables
   - Explicit mock declarations

6. **TypeScript Type Checking**
   - Added separate type checking commands for source code vs. tests
   - Created a custom `tsconfig.test.json` to exclude test files from type checking
   - Added `test:strict` command that runs type checking followed by tests
   - Source code now passes type checking with `npm run typecheck:src`
   - Test files still contain TypeScript errors that need to be fixed in a separate task

## Running Tests

### Standard Testing

```bash
# Run all tests
npm test

# Run tests with optimized memory settings
npm run test:optimized

# Run tests with coverage
npm run test:coverage

# Run tests with type checking of source files
npm run test:strict

# Run only integration tests
npm run test:integration

# Run integration tests with coverage
npm run test:integration:coverage

# Run integration tests without API-dependent tests
npm run test:integration:no-api

# Run integration tests without type checking
npm run test:integration:no-typecheck
```

### Type Checking

```bash
# Check all TypeScript files (including tests)
npm run typecheck

# Check only source files (exclude test files)
npm run typecheck:src

# Check files with less strict library checking
npm run typecheck:test
```

### Isolated Testing

To run only the logical fallacy detector test:

**Linux/macOS:**
```bash
# Make the script executable
chmod +x run-fallacy-test.sh

# Run the test
./run-fallacy-test.sh
```

**Windows:**
```bash
run-fallacy-test.bat
```

## Continuous Integration

The GitHub Actions workflow in `ci.yml` has been updated to:
- Use Node.js 18.x and 20.x
- Run tests with optimized memory settings
- Apply proper environment variables

## Advanced Testing Techniques

### Performance Testing

To identify slow-running tests:

```bash
npm test -- --verbose
```

This will display execution times for each test.

### Debug Testing

For detailed debugging:

```bash
npm test -- --runInBand --detectOpenHandles
```

This runs tests sequentially and helps identify resource leaks.

## Integration Tests

Integration tests have been added to test real-world scenarios and workflows that involve multiple components working together. These tests are located in the `src/integration/` directory and can be run using the `npm run test:integration` command.

### Integration Test Categories

1. **Market Analysis Workflow**
   - Tests the complete workflow from research to decision-making
   - Verifies data flows correctly between tools
   - Tests error handling and graceful degradation

2. **Data Processing Pipeline**
   - Tests the complete data analysis pipeline
   - Verifies data transformations between preprocessing, analysis, and visualization
   - Tests validation across the entire pipeline

3. **Research API Integration**
   - Tests integration with external research APIs
   - Verifies retry logic and error handling for API calls
   - Tests proper API authentication and request formatting

4. **Logical Reasoning Tools Integration**
   - Tests the integration between argument analysis and fallacy detection
   - Verifies perspective shifting based on analytical results
   - Tests complex reasoning workflows

5. **Feature Configuration**
   - Tests feature flags and environment-based configuration
   - Verifies application behavior under different configuration scenarios
   - Tests logging and error handling based on configuration

### When to Add Integration Tests

Add integration tests when:
- Implementing new workflows that span multiple tools
- Adding features that depend on external services
- Creating tools that build on or extend other tools
- Making changes that could affect data flow between components

### Integration Test Status and Next Steps

The integration tests have been created but require additional work to become functional. The current issues are:

1. TypeScript Type Errors:
   - Function parameter types (many functions expect different parameter shapes than provided)
   - Mock function return types not matching expected types
   - Object structure mismatches (e.g., arrays vs objects with array properties)

2. Implementation Mismatches:
   - Some tool implementations expect different parameter structures than documented
   - API response structures need to be properly typed and mocked

To make these integration tests functional, the following steps are needed:

1. Review tool function signatures and make sure integration tests match them
2. Update mock objects to match expected types
3. Fix the logical OR conditions with proper Jest matchers (use .toMatch or regex)
4. Add proper type definitions for mock functions and variables

Once these issues are resolved, the integration tests will provide valuable coverage for:
- Data flows between multiple tools
- API error handling and retries
- Feature configuration behaviors
- Cross-component interactions

These tests serve as a template for real-world scenario testing and will be completed in an upcoming task.

## Best Practices for Adding New Tests

1. **Create Mocks for External Services**
   - Place mocks in `src/__mocks__/`
   - Match the file structure of the original module

2. **Use Descriptive Test Names**
   - Follow the pattern: "should [expected behavior] when [condition]"

3. **Isolate Test Dependencies**
   - Avoid relying on external services
   - Mock database connections and API calls

4. **Test Edge Cases**
   - Include tests for error handling
   - Test boundary conditions
   
5. **TypeScript Type Safety**
   - Use `@ts-ignore` or explicit type casts only when necessary for testing edge cases
   - When testing invalid inputs, add a comment explaining why the typechecking is being bypassed
   - Use proper typings for Jest mocks when possible
   - Run `npm run typecheck:src` to ensure source code remains type-safe

6. **Integration Test Organization**
   - Group related tests in appropriate integration test files
   - Mock external dependencies for deterministic results
   - Structure tests to follow realistic user workflows

## API Key Validation

The system includes automatic validation of required API keys. This validation helps catch configuration issues early and provides clear error messages when required API keys are missing.

### Implementation Status

✅ New `checkApiKeys()` function added to `src/utils/api_helpers.ts`
✅ Added to `setupTests.ts` to enforce API key presence during tests
✅ Tests created in `src/utils/__tests__/api_helpers.test.ts`
⚠️ Currently experiencing module resolution issues in Jest tests - work in progress

### API Key Requirements

The following API keys are required for various features:

1. **EXA_API_KEY**: Required for research integration functions
   - Used for web search and research capabilities
   - Tests and features that use research functionality will fail without this key

### How API Key Validation Works

1. **Environment Configuration**
   - API keys are stored in environment variables
   - Use a `.env` file to configure keys in development (see `.env.example` for a template)
   - The system validates keys automatically at startup and during tests

2. **Validation Process**
   - The `checkApiKeys()` function in `src/utils/api_helpers.js` checks for the presence of required keys
   - It throws a `ConfigurationError` with a descriptive message when keys are missing
   - This function is called during application startup and in the test setup

3. **Feature Integration**
   - Feature flags check for API key presence (e.g., `isFeatureEnabled('researchIntegration')`)
   - This ensures features gracefully degrade when keys are unavailable

### Testing with API Keys

1. **Setting up API Keys for Tests**
   - Create a `.env.test` file with test API keys (never commit real API keys)
   - For CI environments, set secrets in your CI configuration

2. **Running Tests That Require API Keys**
   - Tests that depend on API keys will automatically check for them
   - If keys are missing, tests will fail with clear error messages

3. **Mocking API Keys for Unit Tests**
   - Unit tests mock the config module to simulate the presence or absence of API keys
   - See examples in `src/utils/__tests__/api_helpers.test.js`

4. **Skipping API Tests**
   - When real API keys aren't available, use `npm run test:integration:no-api` to skip tests that require API access
   - Use `npm run test:integration:no-typecheck` to skip TypeScript type checking
   - You can combine these approaches for faster feedback during development

### Adding New API Keys

When implementing features that require new API keys:

1. Add the new key to the environment schema in `src/utils/config.ts`
2. Add the key to the `checkApiKeys()` function in `src/utils/api_helpers.ts`
3. Update the `.env.example` file with the new key (with placeholder value)
4. Add appropriate feature flag checks if the feature should be conditionally enabled
5. Document the new key requirement in code and documentation

### Troubleshooting

If you encounter issues with API key detection:

1. Check that your API keys are defined in the appropriate `.env` file
2. Verify that API key validation is not being bypassed in your tests
3. Debug by setting `LOG_LEVEL=DEBUG` in your environment
4. Review the API key validation logic in `src/utils/api_helpers.ts`

There is currently a known issue with Jest module resolution in the API key validation tests. This will be addressed in an upcoming fix.
