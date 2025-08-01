# Testing Documentation

This document outlines the comprehensive testing strategy for the Analytical MCP Server, including how to run tests, write new tests, and understand our testing infrastructure.

## Testing Strategy

Our testing approach follows a multi-layered strategy:

### 1. Unit Tests (`test/unit/`)
- **Purpose**: Test individual functions and classes in isolation
- **Coverage Target**: 75% for tools, 70% for utilities
- **Execution Time**: < 100ms per test
- **Dependencies**: Fully mocked external dependencies

### 2. Integration Tests (`src/integration/`)
- **Purpose**: Test interactions between multiple modules
- **Coverage**: Cross-module functionality and API integrations
- **Execution Time**: < 5s per test
- **Dependencies**: May use real APIs with rate limiting

### 3. End-to-End Tests (`test/e2e/`)
- **Purpose**: Test complete user workflows
- **Coverage**: Full data analysis pipelines
- **Execution Time**: Up to 30s per test
- **Dependencies**: Realistic test environments

### 4. Performance Tests (`test/performance/`)
- **Purpose**: Benchmark critical performance paths
- **Coverage**: Cache operations, data processing, memory usage
- **Metrics**: Execution time, memory usage, throughput
- **Regression Testing**: Prevent performance degradation

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance benchmarks only

# Development modes
npm run test:watch        # Watch mode for development
npm run test:debug        # Debug mode with inspector
```

### Advanced Test Commands

```bash
# Integration tests without API calls
npm run test:integration:no-api

# API-specific tests
npm run test:exa          # Exa API integration tests
npm run test:research     # Research verification tests

# Performance and optimization
npm run test:optimized    # Memory-optimized test run
npm run test:handles      # Detect open handles
```

### CI/CD Commands

```bash
# Full test suite for CI
npm run test:strict       # Type check + tests
npm run typecheck         # TypeScript validation
npm run lint              # Code quality checks
npm run format:check      # Code formatting validation
```

## Test Structure

### Directory Organization

```
test/
├── unit/                 # Unit tests for individual modules
│   ├── server.test.ts           # Server initialization
│   ├── tools-registration.test.ts   # Tool registration system
│   └── ...
├── integration/          # Cross-module integration tests
├── e2e/                 # End-to-end workflow tests
│   ├── data-analysis-workflow.test.ts
│   └── ...
├── performance/         # Performance benchmarks
│   ├── cache-performance.test.ts
│   └── ...
├── fixtures/            # Test data and samples
│   ├── sample-data.ts          # Test datasets
│   └── ...
├── helpers/             # Test utilities
│   ├── test-utils.ts           # Common test helpers
│   └── ...
└── mocks/               # Mock implementations
    ├── mock-server.ts          # MCP server mocks
    ├── mock-apis.ts            # External API mocks
    └── ...
```

### Test File Naming

- Unit tests: `*.test.ts` in relevant directories
- Integration tests: `*.test.ts` in `src/integration/`
- End-to-end tests: `*.test.ts` in `test/e2e/`
- Performance tests: `*.test.ts` in `test/performance/`

## Writing Tests

### Test Structure Guidelines

Follow the **AAA pattern** (Arrange, Act, Assert):

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Component Under Test', () => {
  let component: ComponentType;

  beforeEach(() => {
    // Arrange: Set up test fixtures
    component = new ComponentType();
  });

  it('should behave as expected when given valid input', async () => {
    // Arrange: Prepare test data
    const input = { valid: 'data' };
    const expected = { expected: 'result' };

    // Act: Execute the functionality
    const result = await component.process(input);

    // Assert: Verify the outcome
    expect(result).toEqual(expected);
  });
});
```

### Using Test Utilities

```typescript
import { 
  expectWithTimeout, 
  createMockLogger, 
  createDataFactory 
} from '../helpers/test-utils.js';

describe('Async Operations', () => {
  it('should complete within timeout', async () => {
    const result = await expectWithTimeout(
      () => slowAsyncOperation(),
      5000 // 5 second timeout
    );
    
    expect(result).toBeDefined();
  });
});
```

### Mock Usage

```typescript
import { MockExaAPI, setupMockFetch } from '../mocks/mock-apis.js';

describe('API Integration', () => {
  const mockFetch = setupMockFetch();

  beforeEach(() => {
    mockFetch.reset();
  });

  it('should handle API responses', async () => {
    mockFetch.mockResponse({ data: 'test' });
    
    const result = await apiCall();
    
    expect(result.data).toBe('test');
  });
});
```

### Data Factories

```typescript
import { sampleDatasets } from '../fixtures/sample-data.js';
import { createDataFactory } from '../helpers/test-utils.js';

const createTestUser = createDataFactory({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
});

describe('User Operations', () => {
  it('should process user data', () => {
    const user = createTestUser({ name: 'Custom Name' });
    
    expect(user.name).toBe('Custom Name');
    expect(user.email).toBe('test@example.com'); // Default value
  });
});
```

## Coverage Requirements

### Global Coverage Targets

- **Overall**: 70% minimum
- **Tools module**: 75% minimum  
- **Utils module**: 70% minimum
- **New code**: 80% minimum

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Exclusions

The following are excluded from coverage:
- Type definition files (`*.d.ts`)
- Test files (`*.test.ts`)
- Mock implementations
- Build artifacts

## Performance Testing

### Benchmark Guidelines

Performance tests should verify:

1. **Execution Time**: Operations complete within expected timeframes
2. **Memory Usage**: No memory leaks or excessive consumption
3. **Throughput**: Handle expected load efficiently
4. **Scalability**: Performance doesn't degrade significantly with data size

### Example Performance Test

```typescript
it('should demonstrate cache performance', async () => {
  const start = performance.now();
  
  // Perform operation
  const result = await cacheOperation();
  
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(10); // < 10ms
  expect(result).toBeDefined();
});
```

## Continuous Integration

### GitHub Actions Workflow

Our CI pipeline runs on macOS with Node.js versions 18, 20, and 22:

1. **Code Quality**: ESLint, Prettier, TypeScript checks
2. **Security**: npm audit, dependency verification
3. **Testing**: Unit, integration, and performance tests
4. **Build**: Verify successful compilation
5. **Docker**: Container build verification

### Coverage Reporting

Coverage reports are automatically uploaded to Codecov on successful test runs.

## Troubleshooting

### Common Issues

#### Tests Timing Out

```bash
# Increase timeout for specific tests
npm run test -- --testTimeout=30000

# Run with debugging
npm run test:debug
```

#### Memory Issues

```bash
# Run with increased memory
npm run test:optimized

# Check for memory leaks
npm run test:handles
```

#### API Rate Limits

```bash
# Run tests without external API calls
npm run test:integration:no-api

# Use test-specific API keys
NODE_ENV=test npm test
```

### Environment Setup

Ensure you have:
- Node.js 18+ installed
- Environment variables configured (see `.env.example`)
- Dependencies installed (`npm ci`)

### Debugging Failed Tests

1. **Use descriptive test names** that explain what's being tested
2. **Check test isolation** - tests should not depend on each other
3. **Verify mock setup** - ensure external dependencies are properly mocked
4. **Check async handling** - use proper async/await patterns
5. **Review error messages** - Jest provides detailed failure information

## Best Practices

### Do's ✅

- Write descriptive test names
- Use proper async/await patterns
- Mock external dependencies
- Clean up resources in afterEach/afterAll
- Use factories for consistent test data
- Test both success and error paths
- Keep tests focused and atomic

### Don'ts ❌

- Don't write tests that depend on external services
- Don't share state between tests
- Don't test implementation details
- Don't ignore failing tests
- Don't commit tests that are consistently flaky
- Don't use real API keys in tests

## Contributing

When adding new features:

1. **Write tests first** (TDD approach recommended)
2. **Ensure coverage** meets minimum thresholds
3. **Add performance tests** for critical paths
4. **Update documentation** as needed
5. **Run full test suite** before submitting PR

For questions or issues with testing, please check:
- This documentation
- Existing test examples
- GitHub Issues for known problems