# Testing Infrastructure

This directory contains organized test suites for the Analytical MCP Server.

## Directory Structure

```
test/
├── unit/           # Unit tests for individual modules
├── integration/    # Integration tests for cross-module functionality  
├── e2e/           # End-to-end tests for complete workflows
├── fixtures/      # Test data and mock fixtures
├── helpers/       # Test utility functions and helpers
├── mocks/         # Mock implementations
└── performance/   # Performance benchmarks and load tests
```

## Test Categories

### Unit Tests (`test/unit/`)
- Test individual functions and classes in isolation
- Fast execution (< 100ms per test)
- Use mocks for external dependencies
- High code coverage target (75%+)

### Integration Tests (`test/integration/`)
- Test interaction between multiple modules
- Medium execution time (< 5s per test)
- May use real APIs with rate limiting
- Focus on data flow and module contracts

### End-to-End Tests (`test/e2e/`)
- Test complete user workflows
- Slower execution (up to 30s per test)
- Use real or realistic test environments
- Focus on user experience and system behavior

### Performance Tests (`test/performance/`)
- Benchmark critical performance paths
- Load testing for high-throughput scenarios
- Memory usage and leak detection
- Regression testing for performance

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# E2E tests only
npm run test:e2e

# Performance tests only
npm run test:performance

# With coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Writing Tests

### Best Practices
1. Use descriptive test names that explain the behavior being tested
2. Follow the AAA pattern: Arrange, Act, Assert
3. Use meaningful assertions with clear error messages
4. Mock external dependencies appropriately
5. Clean up resources in afterEach/afterAll hooks
6. Use factories for test data generation

### Test Utilities
- Use helpers from `test/helpers/` for common test operations
- Use fixtures from `test/fixtures/` for consistent test data
- Use mocks from `test/mocks/` for external dependencies

### Coverage Requirements
- Global coverage target: 70%
- Tools module target: 75%
- Utils module target: 70%
- New code should have 80%+ coverage