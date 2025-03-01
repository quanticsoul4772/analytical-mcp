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

## Running Tests

### Standard Testing

```bash
# Run all tests
npm test

# Run tests with optimized memory settings
npm run test:optimized

# Run tests with coverage
npm run test:coverage
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
