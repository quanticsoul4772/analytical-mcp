# Analytical MCP Server Source Code

This directory contains the source code for the Analytical MCP Server, which provides a set of tools for data analysis, logical reasoning, and research verification.

## Directory Structure

- **src/** - Main source code
  - **integration/** - Integration tests
  - **tools/** - Tool implementations
  - **utils/** - Utility functions and helpers
  - **__mocks__/** - Mocks for testing

## Testing Guide

### Testing with Mock API Keys

The tests use mocks to minimize reliance on external APIs during testing. To run tests with mock API keys:

1. Use the provided batch file:
   ```
   ./tools/run-tests-with-mock-keys.bat
   ```

2. Or set environment variables manually:
   ```
   export EXA_API_KEY=mock-exa-api-key-for-testing-only
   npm test
   ```

### Mock Configuration

Test mocks are available in the `src/__mocks__/` directory:

- `exa-research.ts` - Mock implementation of Exa research API
- `exa-research-mock.ts` - Mock data for Exa API responses
- `research-verification-mock.ts` - Mocks for the research verification tool
- `config-mock.ts` - Configuration mocks
- `logger-mock.ts` - Logger mocks
- `sdk-mock.ts` - MCP SDK mocks

### Writing Tests with Mocks

Use the test helpers in `src/integration/test-helper.ts` to:

1. Set up mock responses: `setupExaMocks()`
2. Reset mocks between tests: `resetAllMocks()`
3. Mock API keys: `mockApiKeys()`

### Running Specific Tests

We've added several scripts to run specific integration tests:

```bash
# Run all integration tests with detailed summary
./tools/run-all-integration-tests.sh

# Run individual test suites
./tools/run-exa-tests.sh
./tools/run-research-tests.sh
./tools/run-server-tests.sh
./tools/run-api-key-tests.sh
./tools/run-data-pipeline-tests.sh
./tools/run-market-analysis-tests.sh
```

For Windows users:
```batch
.\tools\run-all-integration-tests.bat
```

You can also use npm scripts directly:
```bash
npm run test:exa
npm run test:research
npm run test:server
npm run test:api-keys
npm run test:data-pipeline
npm run test:market-analysis
npm run test:config
```

Example test:

```typescript
import { exaResearch } from '../__mocks__/exa-research';
import { setupExaMocks, resetAllMocks, mockApiKeys } from './test-helper';

describe('API Test', () => {
  beforeEach(() => {
    resetAllMocks();
    mockApiKeys();
    setupExaMocks({});
  });

  it('should perform a search', async () => {
    const result = await exaResearch.search({
      query: 'test query',
      numResults: 3,
      useWebResults: true,
      useNewsResults: false,
      includeContents: true
    });
    
    expect(result).toBeDefined();
    expect(result.results.length).toBeGreaterThan(0);
  });
});
```