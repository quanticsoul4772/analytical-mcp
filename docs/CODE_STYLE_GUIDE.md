# Code Style Guide

This document outlines the coding standards and style guidelines for the Analytical MCP Server project. Following these guidelines ensures consistency, readability, and maintainability across the codebase.

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Guidelines](#typescript-guidelines)
3. [Code Organization](#code-organization)
4. [Naming Conventions](#naming-conventions)
5. [Comments and Documentation](#comments-and-documentation)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Linting and Formatting](#linting-and-formatting)

## General Principles

### Code Quality

- Write code that is clear, readable, and maintainable
- Favor readability over cleverness or brevity
- Follow the DRY (Don't Repeat Yourself) principle
- Follow the SOLID design principles
- Keep functions and methods small and focused
- Aim for high test coverage

### Performance

- Balance readability with performance considerations
- Optimize for performance when it matters
- Document performance-critical sections
- Include appropriate error handling

## TypeScript Guidelines

### Type Definitions

- Use TypeScript's static typing features consistently
- Define interfaces and types for all data structures
- Prefer interfaces for object types
- Use explicit return types for functions
- Leverage type inference when appropriate
- Avoid `any` type unless absolutely necessary

```typescript
// Bad
function processData(data: any): any {
  // ...
}

// Good
interface DataInput {
  name: string;
  value: number;
}

interface ProcessedResult {
  id: string;
  normalizedValue: number;
  timestamp: Date;
}

function processData(data: DataInput): ProcessedResult {
  // ...
}
```

### Schema Validation

- Use Zod for runtime validation of inputs
- Define schemas alongside types when possible
- Use schema validation at API boundaries
- Include descriptive error messages in validation

```typescript
import { z } from 'zod';

// Define schema with descriptive error messages
const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(0, "Age must be positive").optional(),
  email: z.string().email("Invalid email format")
});

// Use with type inference
type User = z.infer<typeof userSchema>;
```

## Code Organization

### File Structure

- Organize files by feature or domain
- Keep related code together
- Follow a consistent project structure:
  - `/src` - Source code
  - `/src/tools` - Tool implementations
  - `/src/utils` - Utility functions
  - `/src/types` - Type definitions
  - `/tests` - Test files
  - `/docs` - Documentation

### Module Organization

- Each tool should be in its own module
- Export only what's necessary from modules
- Group related functions together
- Follow a consistent structure within modules:
  1. Imports
  2. Type definitions
  3. Constants
  4. Schema definitions
  5. Helper functions
  6. Main functionality
  7. Exports

```typescript
// Imports
import { z } from 'zod';
import { Logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

// Type definitions
interface AnalysisResult {
  // ...
}

// Constants
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

// Schema definitions
const inputSchema = z.object({
  // ...
});

// Helper functions
function calculateScore(input: number): number {
  // ...
}

// Main functionality
export async function analyzeTool(params: z.infer<typeof inputSchema>): Promise<AnalysisResult> {
  // ...
}

// Exports
export { inputSchema as analyzeToolSchema };
```

## Naming Conventions

### General Guidelines

- Use meaningful, descriptive names
- Avoid abbreviations unless widely understood
- Be consistent in naming style
- Choose names that reflect purpose or behavior

### Specific Conventions

- `camelCase` for variables, functions, methods, and instances
- `PascalCase` for classes, interfaces, types, and enums
- `UPPER_SNAKE_CASE` for constants
- Use verbs for function names (e.g., `calculateTotal`, `validateInput`)
- Use nouns for variables, parameters, and properties (e.g., `userData`, `totalAmount`)
- Prefix booleans with "is", "has", "should", etc. (e.g., `isValid`, `hasPermission`)
- Prefix private class members with underscore (e.g., `_privateProperty`)

```typescript
// Constants
const MAX_RETRY_ATTEMPTS = 3;

// Interfaces and types
interface UserProfile {
  username: string;
  isActive: boolean;
}

// Functions
function validateInput(data: unknown): boolean {
  // ...
}

// Classes
class DataProcessor {
  private _processCount: number = 0;
  
  processData(input: string): string {
    this._processCount++;
    // ...
  }
}
```

## Comments and Documentation

### Code Comments

- Write self-documenting code where possible
- Comment on "why", not "what" or "how"
- Use comments for complex logic, non-obvious behavior, or workarounds
- Maintain comments alongside code changes

### JSDoc

- Use JSDoc for all public APIs and interfaces
- Include descriptions, parameter types, return types, and examples
- Document exceptions and errors that can be thrown
- Include parameter descriptions

```typescript
/**
 * Analyzes text for logical fallacies.
 * 
 * @param text - Text to analyze for logical fallacies
 * @param confidenceThreshold - Minimum confidence level to report a fallacy (0-1)
 * @param categories - Fallacy categories to check
 * @returns A report of detected fallacies with confidence scores
 * @throws {ValidationError} When input parameters are invalid
 * @throws {ProcessingError} When analysis fails
 * 
 * @example
 * ```typescript
 * const result = await detectFallacies("Text to analyze", 0.5, ["informal"]);
 * ```
 */
function detectFallacies(
  text: string,
  confidenceThreshold: number = 0.5,
  categories: string[] = ['all']
): Promise<FallacyReport> {
  // Implementation
}
```

### README and Documentation

- Maintain comprehensive README files
- Document setup, installation, and usage
- Include examples for common use cases
- Keep documentation in sync with code changes
- Use Markdown for all documentation files

## Error Handling

### Error Types

- Use custom error classes for different error scenarios
- Extend from a base error class for consistency
- Include contextual information in errors
- Use descriptive error messages

```typescript
// Base error class
export class AnalyticalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticalError';
    Object.setPrototypeOf(this, AnalyticalError.prototype);
  }
}

// Specific error types
export class ValidationError extends AnalyticalError {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
```

### Error Propagation

- Catch errors at appropriate levels
- Transform and enrich errors with context
- Log errors with sufficient detail
- Return meaningful error responses

```typescript
try {
  // Operation that might fail
} catch (error) {
  // Add context and rethrow
  Logger.error(`Failed during processing: ${error.message}`, error);
  
  if (error instanceof ValidationError) {
    // Handle validation errors specifically
    throw error;
  }
  
  // Wrap unknown errors
  throw new ProcessingError(`Processing failed: ${error.message}`, {
    originalError: error,
    context: { /* Additional context */ }
  });
}
```

### Async Error Handling

- Use async/await with try/catch
- Always handle promise rejections
- Avoid mixing promises and callbacks
- Consider using helper functions for repetitive error handling

```typescript
// Helper for consistent error handling
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    Logger.error(`Error in ${context}: ${error.message}`, error);
    throw error instanceof AnalyticalError 
      ? error 
      : new ProcessingError(`${context} failed: ${error.message}`);
  }
}

// Usage
const result = await withErrorHandling(
  () => processSensitiveData(input),
  'sensitive data processing'
);
```

## Testing

### Test Organization

- Mirror the source code structure in tests
- Name test files with `.test.ts` or `.spec.ts` suffix
- Group tests logically with describe blocks
- Write clear test descriptions

```typescript
// src/tools/fallacy-detector.ts -> src/tools/__tests__/fallacy-detector.test.ts

describe('Fallacy Detector', () => {
  describe('detectFallacies', () => {
    it('should detect appeal to authority fallacy', () => {
      // Test implementation
    });
    
    it('should ignore fallacies below confidence threshold', () => {
      // Test implementation
    });
  });
});
```

### Test Structure

- Follow the Arrange-Act-Assert pattern
- Use descriptive test names
- Test both success and failure paths
- Include edge cases and boundary conditions

```typescript
it('should reject values outside valid range', () => {
  // Arrange
  const invalidInput = { value: -5, threshold: 0.5 };
  const schema = inputValidationSchema;
  
  // Act & Assert
  expect(() => schema.parse(invalidInput)).toThrow();
});
```

### Mocking and Stubs

- Use Jest's mocking capabilities
- Create reusable mock factories
- Reset mocks between tests
- Mock external dependencies

```typescript
// Mock API client
jest.mock('../utils/api-client', () => ({
  fetchData: jest.fn()
}));

import { fetchData } from '../utils/api-client';

beforeEach(() => {
  jest.resetAllMocks();
});

it('should handle API errors gracefully', async () => {
  // Arrange
  const mockError = new Error('API unavailable');
  (fetchData as jest.Mock).mockRejectedValue(mockError);
  
  // Act & Assert
  await expect(processWithApi()).rejects.toThrow('Processing failed');
});
```

## Linting and Formatting

### ESLint

- Follow the project's ESLint configuration
- Address all linting errors and warnings
- Use appropriate ESLint plugins for TypeScript
- Consider using custom rules for project-specific standards

### Prettier

- Use Prettier for consistent code formatting
- Don't mix formatting styles
- Run Prettier before committing code
- Configure Prettier to match project style

### Pre-commit Hooks

- Use pre-commit hooks to enforce linting and formatting
- Run tests before committing when feasible
- Include type checking in verification

## Version Control

### Commit Messages

- Write clear, descriptive commit messages
- Use the imperative mood (e.g., "Add feature" not "Added feature")
- Include the context or reason for changes when necessary
- Reference issue numbers where applicable

```
feat: implement logical fallacy detector

- Add pattern matching for common fallacies
- Implement confidence scoring system
- Create structured report generation

Closes #123
```

### Branching Strategy

- Use feature branches for new developments
- Use bugfix branches for fixes
- Create pull requests for review
- Keep branches short-lived and focused

### Code Reviews

- Review all code before merging
- Check for adherence to style guidelines
- Verify test coverage
- Look for potential bugs and edge cases

## Conclusion

Following these guidelines will help maintain a consistent, high-quality codebase that is easy to understand, modify, and extend. Remember that these guidelines are meant to serve the team, not constrain it - there may be justified exceptions to these rules in specific cases.
