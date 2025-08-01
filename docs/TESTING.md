# Testing Guide

This document provides comprehensive guidance for testing the Analytical MCP Server, including running tests, writing new tests, and understanding the test infrastructure improvements implemented in PRs #6 and #7.

## Overview

The project uses Jest as the primary testing framework with comprehensive test coverage across:
- Unit tests for individual tools and utilities
- Integration tests for end-to-end workflows  
- Error handling and edge case validation
- Performance and load testing

## Test Structure

```
src/
├── tools/__tests__/          # Tool-specific unit tests
├── utils/__tests__/          # Utility function tests
├── integration/              # Integration test suites
└── setupTests.ts             # Global test configuration
```

## Running Tests

### Prerequisites

```bash
npm install                   # Install dependencies
export NODE_ENV=test         # Set test environment
```

### Basic Test Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test suites
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests only
```

### Advanced Test Commands

```bash
# CI-optimized test run
npm run test:ci

# Performance optimized
npm run test:optimized

# Debug mode
npm run test:debug

# Memory leak detection
npm run test:leak-detection

# Quick test run (unit tests only)
npm run test:quick
```

### Specialized Test Suites

```bash
# Test specific components
npm run test:api-keys        # API key validation
npm run test:server          # Server functionality
npm run test:research        # Research tools
npm run test:data-pipeline   # Data processing
npm run test:market-analysis # Market analysis workflow
```

## Test Coverage Requirements

### Current Coverage (63%)

The project maintains test coverage with the following targets:
- **Unit Tests**: >80% line coverage
- **Integration Tests**: >70% functionality coverage
- **Critical Paths**: 100% coverage (error handling, API interactions)

### Coverage Reports

```bash
# Generate detailed coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Writing Tests for New Tools

### Unit Test Template

```typescript
import { myNewTool } from '../my_new_tool';
import { ErrorCodes } from '../../utils/errors';

describe('myNewTool', () => {
  describe('Success Cases', () => {
    it('should process valid input correctly', async () => {
      const input = { /* valid input */ };
      const result = await myNewTool(input);
      
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      // Add specific assertions
    });
  });

  describe('Error Handling', () => {
    it('should throw ERR_1001 for invalid input', async () => {
      const invalidInput = null;
      
      await expect(myNewTool(invalidInput))
        .rejects
        .toThrow(expect.objectContaining({
          code: ErrorCodes.INVALID_INPUT
        }));
    });

    it('should include tool context in errors', async () => {
      try {
        await myNewTool({ invalid: 'data' });
      } catch (error) {
        expect(error.context.toolName).toBe('myNewTool');
        expect(error.context.timestamp).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', async () => {
      const result = await myNewTool({ data: [] });
      expect(result.warnings).toContain('Empty dataset provided');
    });
  });
});
```

### Integration Test Template

```typescript
import { analyzeDataset } from '../../tools/analyze_dataset';
import { advancedRegressionAnalysis } from '../../tools/advanced_regression_analysis';

describe('Data Analysis Workflow Integration', () => {
  const sampleData = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 }
  ];

  it('should complete end-to-end analysis workflow', async () => {
    // Step 1: Basic analysis
    const basicAnalysis = await analyzeDataset(sampleData, 'stats');
    expect(basicAnalysis.mean).toBeDefined();

    // Step 2: Advanced regression
    const regressionResult = await advancedRegressionAnalysis({
      data: sampleData,
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y'
    });
    
    expect(regressionResult.rSquared).toBeGreaterThan(0.9);
  });
});
```

## Error Handling Tests

### Required Error Test Patterns

Every tool must test:

1. **Validation Errors** (ERR_1xxx)
```typescript
it('should validate input parameters', async () => {
  await expect(tool(null)).rejects.toThrow('ERR_1001');
  await expect(tool({})).rejects.toThrow('ERR_1002');
  await expect(tool({ invalid: 'type' })).rejects.toThrow('ERR_1004');
});
```

2. **API Error Handling** (ERR_2xxx)
```typescript
it('should handle API failures gracefully', async () => {
  // Mock API failure
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
  
  await expect(apiDependentTool(validInput))
    .rejects
    .toThrow(expect.objectContaining({
      code: 'ERR_2003'
    }));
});
```

3. **Recovery Testing**
```typescript
it('should retry on recoverable errors', async () => {
  const mockFn = jest.fn()
    .mockRejectedValueOnce(new Error('Temporary failure'))
    .mockResolvedValue('Success');
  
  const result = await toolWithRetry(mockFn);
  expect(mockFn).toHaveBeenCalledTimes(2);
  expect(result).toBe('Success');
});
```

## Performance Testing

### Benchmark Tests

```typescript
describe('Performance Tests', () => {
  it('should process large datasets efficiently', async () => {
    const largeDataset = Array.from({length: 10000}, (_, i) => ({
      x: i,
      y: Math.random() * 100
    }));

    const startTime = Date.now();
    await analyzeDataset(largeDataset, 'stats');
    const executionTime = Date.now() - startTime;

    expect(executionTime).toBeLessThan(5000); // 5 second limit
  });
});
```

### Memory Usage Tests

```typescript
describe('Memory Tests', () => {
  it('should not leak memory with repeated calls', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    for (let i = 0; i < 100; i++) {
      await analyzeDataset([1, 2, 3, 4, 5], 'summary');
    }
    
    global.gc?.(); // Force garbage collection if available
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB limit
  });
});
```

## Mocking and Test Doubles

### External API Mocking

```typescript
import { jest } from '@jest/globals';

beforeEach(() => {
  // Mock Exa API
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes('exa.ai')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          results: [{ title: 'Test Result', url: 'http://example.com' }]
        })
      });
    }
    return Promise.reject(new Error('Unmocked URL: ' + url));
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### Utility Mocking

```typescript
import { Logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  }
}));
```

## Test Configuration

### Jest Configuration (jest.config.js)

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['<rootDir>/src/integration/']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/integration/**/*.test.ts']
    }
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/integration/**'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Environment Variables for Testing

```bash
# Test environment configuration
NODE_ENV=test
LOG_LEVEL=error
DISABLE_API_CALLS=true
TEST_TIMEOUT=30000

# Optional: Test-specific API keys (use test/mock endpoints)
EXA_API_KEY=test_key_mock_responses
```

## Continuous Integration

### GitHub Actions Test Workflow

The project includes automated testing in CI/CD:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run typecheck
      - run: npm run lint
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:quick && npm run typecheck"
    }
  }
}
```

## Debugging Tests

### Debug Configuration

```bash
# Run tests with Node.js inspector
npm run test:debug

# Debug specific test
npm run test:debug -- --testNamePattern="specific test name"

# Debug with verbose output
npm run test -- --verbose --no-cache
```

### Common Debug Scenarios

1. **Async Test Issues**
```typescript
// Use proper async/await
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Or return promises
it('should handle promises', () => {
  return asyncFunction().then(result => {
    expect(result).toBeDefined();
  });
});
```

2. **Timeout Issues**
```typescript
// Increase timeout for slow tests
it('should handle slow operations', async () => {
  // Test implementation
}, 10000); // 10 second timeout
```

3. **Mock Issues**
```typescript
// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
```

## Test Data Management

### Test Fixtures

```typescript
// tests/fixtures/sample-data.ts
export const sampleDatasets = {
  small: [1, 2, 3, 4, 5],
  medium: Array.from({length: 100}, (_, i) => i),
  large: Array.from({length: 10000}, (_, i) => ({
    id: i,
    value: Math.random()
  })),
  invalid: [null, undefined, 'string', {}]
};
```

### Test Utilities

```typescript
// tests/utils/test-helpers.ts
export function createMockDataset(size: number) {
  return Array.from({length: size}, (_, i) => ({
    x: i,
    y: Math.random() * 100
  }));
}

export function expectValidErrorResponse(error: any, expectedCode: string) {
  expect(error.code).toBe(expectedCode);
  expect(error.context).toBeDefined();
  expect(error.context.toolName).toBeDefined();
  expect(error.context.timestamp).toBeDefined();
}
```

## Test Best Practices

### Do's
- ✅ Test both success and failure paths
- ✅ Use descriptive test names
- ✅ Test error codes and context
- ✅ Mock external dependencies
- ✅ Use appropriate timeouts
- ✅ Clean up after tests
- ✅ Test edge cases and boundary conditions

### Don'ts
- ❌ Don't test implementation details
- ❌ Don't use real API keys in tests
- ❌ Don't write flaky tests
- ❌ Don't ignore test failures
- ❌ Don't test multiple concerns in one test
- ❌ Don't use hardcoded delays

## Troubleshooting Test Issues

### Common Problems

1. **Tests timing out**
   - Check for unresolved promises
   - Increase timeout limits
   - Verify mock responses

2. **Flaky tests**
   - Remove time-dependent assertions
   - Use deterministic test data
   - Proper cleanup between tests

3. **Coverage issues**
   - Check for untested branches
   - Add edge case tests
   - Test error conditions

4. **Memory leaks**
   - Clear timers and intervals
   - Remove event listeners
   - Close database connections

## Future Enhancements

### Planned Testing Improvements

- Automated performance regression detection
- Visual regression testing for data visualizations
- Property-based testing for statistical functions
- Load testing for high-volume scenarios
- Cross-browser compatibility testing (for web integration)

## Related Documentation

- [Error Handling Guide](./ERROR_HANDLING.md) - Error code testing patterns
- [Development Guide](./DEVELOPMENT.md) - Development workflow with testing
- [CI/CD Guide](./CI_CD.md) - Automated testing pipeline
- [API Reference](./API_REFERENCE.md) - Tool specifications for testing

## Quick Reference

### Essential Commands
```bash
npm test                      # Run all tests
npm run test:coverage        # Coverage report
npm run test:watch          # Watch mode
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:debug          # Debug mode
```

### Test File Naming
- Unit tests: `*.test.ts` in `__tests__` directories
- Integration tests: `*.test.ts` in `integration/` directory
- Test utilities: `test-helper.ts`, `fixtures.ts`

### Coverage Thresholds
- Lines: 80%
- Functions: 80%
- Branches: 70%
- Statements: 80%