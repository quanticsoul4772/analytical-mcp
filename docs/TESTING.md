# Testing Guide

This document outlines the testing strategies, patterns, and requirements for the Analytical MCP Server project.

## Testing Philosophy

Our testing approach prioritizes:
- **Reliability**: All tools must work correctly under normal and edge conditions
- **Coverage**: Minimum 80% code coverage across the codebase
- **Performance**: Tests should run efficiently and not block development
- **Maintainability**: Tests should be clear, well-organized, and easy to update

## Test Structure

### Project Test Organization
```
src/
├── tools/__tests__/           # Tool-specific unit tests
├── utils/__tests__/           # Utility function tests
├── integration/               # Integration test suites
│   ├── data_processing_pipeline.test.ts
│   ├── logical_reasoning_tools.test.ts
│   ├── market_analysis_workflow.test.ts
│   └── research_api_integration.test.ts
└── setupTests.ts             # Global test configuration
```

### Test Categories

#### 1. Unit Tests (`src/tools/__tests__/`, `src/utils/__tests__/`)
- Test individual functions and tools in isolation
- Mock external dependencies
- Fast execution (< 1s per test)
- 80%+ code coverage requirement

#### 2. Integration Tests (`src/integration/`)
- Test complete workflows and tool interactions
- Use real dependencies where safe
- Test MCP protocol compliance
- Validate end-to-end functionality

#### 3. Edge Case Tests
- Error conditions and invalid inputs
- Boundary value testing
- Resource exhaustion scenarios
- API failure simulation

## Test Commands

### Basic Test Commands
```bash
# Run all tests
npm run test

# Run with coverage report
npm run test:coverage

# Run in watch mode during development
npm run test:watch

# Quick unit tests only (fastest)
npm run test:quick
```

### Specific Test Suites
```bash
# Unit tests only
npm run test:unit
npm run test:unit:coverage

# Integration tests only
npm run test:integration
npm run test:integration:coverage

# Integration tests without API dependencies
npm run test:integration:no-api
```

### Specialized Test Commands
```bash
# CI-optimized tests
npm run test:ci

# Memory-optimized tests
npm run test:optimized

# Debug mode (with inspector)
npm run test:debug

# Memory leak detection
npm run test:leak-detection
```

### Individual Test Suites
```bash
# Research API integration tests
npm run test:research

# Server functionality tests
npm run test:server

# API key validation tests
npm run test:api-keys

# Data processing pipeline tests
npm run test:data-pipeline

# Market analysis workflow tests
npm run test:market-analysis
```

## Writing Tests

### Test File Structure
```typescript
import { toolFunction } from '../tool_name.js';
import { jest } from '@jest/globals';

// Mock external dependencies
jest.mock('../utils/external_api.js');

describe('ToolName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validation', () => {
    it('should validate required parameters', () => {
      // Test parameter validation
    });

    it('should reject invalid input types', () => {
      // Test input validation
    });
  });

  describe('core functionality', () => {
    it('should perform expected analysis', async () => {
      // Test main functionality
      const result = await toolFunction(validInput);
      expect(result).toMatchObject({
        // Expected result structure
      });
    });

    it('should handle edge cases', async () => {
      // Test boundary conditions
    });
  });

  describe('error handling', () => {
    it('should handle API failures gracefully', async () => {
      // Test error conditions
    });

    it('should provide helpful error messages', async () => {
      // Test error messaging
    });
  });
});
```

### Tool Testing Patterns

#### Statistical Analysis Tools
```typescript
describe('StatisticalTool', () => {
  it('should calculate correct statistics', () => {
    const testData = [1, 2, 3, 4, 5];
    const result = calculateStats(testData);
    
    expect(result.mean).toBeCloseTo(3, 2);
    expect(result.median).toBe(3);
    expect(result.standardDeviation).toBeCloseTo(1.58, 2);
  });

  it('should handle empty datasets', () => {
    expect(() => calculateStats([])).toThrow('Dataset cannot be empty');
  });
});
```

#### Decision Analysis Tools
```typescript
describe('DecisionTool', () => {
  it('should rank options correctly', () => {
    const options = ['A', 'B', 'C'];
    const criteria = ['cost', 'quality'];
    const result = analyzeDecision({ options, criteria });
    
    expect(result.rankings).toHaveLength(3);
    expect(result.rankings[0].score).toBeGreaterThan(0);
  });
});
```

#### Research Tools
```typescript
describe('ResearchTool', () => {
  it('should verify research claims', async () => {
    // Mock API responses
    mockExaAPI.mockResolvedValue({ results: mockResults });
    
    const result = await verifyResearch('test claim');
    
    expect(result.consistency).toBeGreaterThan(0.7);
    expect(result.sources).toHaveLength(3);
  });

  it('should handle API failures', async () => {
    mockExaAPI.mockRejectedValue(new Error('API Error'));
    
    const result = await verifyResearch('test claim');
    
    expect(result.error).toBeDefined();
    expect(result.fallbackUsed).toBe(true);
  });
});
```

### Integration Test Patterns

#### Workflow Testing
```typescript
describe('MarketAnalysisWorkflow', () => {
  it('should complete full analysis pipeline', async () => {
    const pipeline = new DataProcessingPipeline();
    
    // Add test data
    await pipeline.addData(mockMarketData);
    
    // Process through multiple tools
    const regression = await pipeline.runRegression();
    const decision = await pipeline.runDecisionAnalysis();
    const visualization = await pipeline.generateVisualization();
    
    expect(regression.rSquared).toBeGreaterThan(0.8);
    expect(decision.rankings).toBeDefined();
    expect(visualization.spec).toMatchObject({
      mark: 'point',
      encoding: expect.any(Object)
    });
  });
});
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  
  // Coverage settings
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test projects for different suites
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/integration/**/*.test.ts'],
    }
  ]
};
```

### Environment Setup (`src/setupTests.ts`)
```typescript
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.EXA_API_KEY = 'test-key';

// Global mocks
global.fetch = jest.fn();
```

## Coverage Requirements

### Minimum Thresholds
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Coverage Exemptions
- Type definition files (`*.d.ts`)
- Test files themselves
- Configuration files
- Example scripts (in `examples/` directory)

### Viewing Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML report (opens in browser)
open coverage/lcov-report/index.html
```

## Continuous Integration

### GitHub Actions Test Pipeline
1. **Environment Setup**: Node.js 18.x, 20.x, 22.x matrix
2. **Dependency Installation**: `npm install`
3. **Build Verification**: `npm run build`
4. **Type Checking**: `npm run typecheck:src`
5. **Test Execution**: `npm run test:optimized`
6. **Coverage Reporting**: Automated coverage reports

### CI-Specific Considerations
- Tests run with `--maxWorkers=2` for resource efficiency
- Silent mode enabled to reduce log noise
- Coverage thresholds enforced
- API keys provided via GitHub secrets

## Mocking Strategies

### External API Mocking
```typescript
// Mock Exa API
jest.mock('../utils/exa_research.js', () => ({
  searchAndSummarize: jest.fn().mockResolvedValue({
    results: [{ title: 'Mock Result', summary: 'Mock content' }]
  })
}));

// Mock with different responses
const mockExa = jest.mocked(exaResearch.searchAndSummarize);
mockExa.mockResolvedValueOnce(successResponse);
mockExa.mockRejectedValueOnce(new Error('API Error'));
```

### File System Mocking
```typescript
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('mock file content'),
  writeFile: jest.fn().mockResolvedValue(undefined)
}));
```

## Performance Testing

### Load Testing
```typescript
describe('Performance', () => {
  it('should handle large datasets efficiently', async () => {
    const largeDataset = generateTestData(10000);
    const startTime = Date.now();
    
    const result = await analyzeDataset(largeDataset, 'stats');
    
    const executionTime = Date.now() - startTime;
    expect(executionTime).toBeLessThan(5000); // 5 second max
    expect(result).toBeDefined();
  });
});
```

### Memory Testing
```bash
# Run with memory leak detection
npm run test:leak-detection

# Monitor memory usage
npm run test:optimized -- --logHeapUsage
```

## Best Practices

### Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names that explain expected behavior
- One assertion per test when possible
- Test both success and failure paths

### Test Data Management
- Use factories or builders for test data creation
- Keep test data minimal but realistic
- Use constants for repeated test values
- Clean up resources in `afterEach`/`afterAll`

### Assertion Guidelines
- Prefer specific matchers (`toBeCloseTo` for floats)
- Use `toMatchObject` for partial object matching
- Test error messages, not just error occurrence
- Validate complete result structure for critical paths

### Maintenance
- Update tests when functionality changes
- Remove obsolete tests
- Refactor test code for clarity
- Keep test dependencies minimal

## Debugging Failed Tests

### Common Issues
1. **Async/Await**: Ensure async functions are properly awaited
2. **Mocking**: Verify mocks are reset between tests
3. **Timeouts**: Increase timeout for slow operations
4. **Environment**: Check environment variable setup

### Debug Commands
```bash
# Run specific test file
npm test -- analyze_dataset.test.ts

# Run with verbose output
npm test -- --verbose

# Run single test case
npm test -- --testNamePattern="should calculate mean"

# Debug mode with inspector
npm run test:debug -- --testNamePattern="failing test"
```

### Troubleshooting Steps
1. Check test setup and teardown
2. Verify mock configurations
3. Review error messages and stack traces
4. Run tests individually to isolate issues
5. Check for state pollution between tests

## Test Maintenance Workflow

### Adding New Tests
1. Write failing test first (TDD approach)
2. Implement functionality to make test pass
3. Refactor while keeping tests green
4. Update coverage if necessary

### Updating Existing Tests
1. Identify affected tests when changing code
2. Update test expectations to match new behavior
3. Add new test cases for new functionality
4. Remove obsolete test cases

### Periodic Maintenance
- Review and update outdated test data
- Refactor complex test setups
- Update mocks to match current API responses
- Audit coverage reports for gaps

This comprehensive testing approach ensures the Analytical MCP Server maintains high quality and reliability across all its analytical tools and workflows.