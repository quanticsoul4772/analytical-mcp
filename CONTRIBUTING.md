# Contributing to Analytical MCP Server

Thank you for your interest in contributing to the Analytical MCP Server! This guide will help you get started with development and contributing to the project.

## Quick Start for New Contributors

### Prerequisites
- Node.js >= 20.0.0
- Git
- A code editor (VS Code recommended)
- EXA API key (for research features) - get one at [Exa](https://exa.ai/)

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/analytical-mcp.git
   cd analytical-mcp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env to add your EXA_API_KEY
   ```

4. **Build and Test**
   ```bash
   npm run build
   npm run test:quick  # Quick test to verify setup
   ```

5. **Start Development**
   ```bash
   npm run watch  # Auto-rebuild on changes
   ```

**Time to contribute: ~10 minutes** ⏱️

## Development Workflow

### Code Style Guidelines

- **TypeScript**: All code must be written in TypeScript
- **ESLint**: Follow configured ESLint rules (`npm run lint`)
- **Prettier**: Code formatting is enforced (`npm run format`)
- **Imports**: Use ES modules with `.js` extensions for TypeScript imports
- **Error Handling**: Use structured error handling with proper types

### Code Organization

```
src/
├── tools/           # MCP tool implementations
│   ├── __tests__/   # Tool-specific tests
│   └── types.ts     # Shared types
├── utils/           # Utility functions and helpers
│   ├── __tests__/   # Utility tests
│   └── logger.ts    # Centralized logging
├── integration/     # Integration tests
└── index.ts         # Server entry point
```

### Adding New Analytical Tools

1. **Create Tool File** (`src/tools/your_tool.ts`)
   ```typescript
   import { z } from 'zod';
   
   // Define parameter schema
   export const yourToolSchema = z.object({
     input: z.string().describe('Input parameter'),
     options: z.object({}).optional()
   });
   
   // Implement tool function
   export async function yourTool(params: z.infer<typeof yourToolSchema>) {
     // Implementation here
     return { result: 'your analysis' };
   }
   ```

2. **Add Tests** (`src/tools/__tests__/your_tool.test.ts`)
   ```typescript
   import { yourTool } from '../your_tool.js';
   
   describe('yourTool', () => {
     it('should handle basic input', async () => {
       const result = await yourTool({ input: 'test' });
       expect(result).toBeDefined();
     });
   });
   ```

3. **Register Tool** (in `src/tools/index.ts`)
   ```typescript
   import { yourTool, yourToolSchema } from './your_tool.js';
   
   // Add to toolRegistrations array
   {
     name: 'your_tool',
     description: 'Description of what your tool does',
     schema: yourToolSchema,
     handler: async (params) => yourTool(params),
   }
   ```

4. **Document Tool** (update `docs/API_REFERENCE.md`)

## Testing Requirements

### Minimum Coverage
- **Unit Tests**: 80% code coverage minimum
- **Integration Tests**: All tool workflows must have integration tests
- **Edge Cases**: Test error conditions and edge cases

### Test Types
- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- **Full Test Suite**: `npm run test`
- **Coverage Report**: `npm run test:coverage`

### Writing Tests

```typescript
// Example test structure
describe('ToolName', () => {
  describe('validation', () => {
    it('should validate required parameters', () => {
      // Parameter validation tests
    });
  });

  describe('functionality', () => {
    it('should perform expected analysis', async () => {
      // Core functionality tests
    });
  });

  describe('error handling', () => {
    it('should handle invalid input gracefully', async () => {
      // Error condition tests
    });
  });
});
```

### Test Commands
```bash
npm run test:quick        # Fast unit tests only
npm run test:unit         # All unit tests
npm run test:integration  # Integration tests
npm run test:coverage     # Full test suite with coverage
npm run test:watch        # Watch mode for development
```

## Pull Request Process

### Before Submitting

1. **Code Quality Checks**
   ```bash
   npm run lint           # ESLint check
   npm run typecheck      # TypeScript check
   npm run format:check   # Prettier check
   npm run test:coverage  # Full test suite
   ```

2. **Documentation Updates**
   - Update `docs/API_REFERENCE.md` for new tools
   - Add examples to README if applicable
   - Update CHANGELOG if significant changes

### PR Guidelines

- **Title**: Use conventional commit format: `feat:`, `fix:`, `docs:`, `test:`
- **Description**: Clearly describe changes and their impact
- **Tests**: Include tests for new functionality
- **Documentation**: Update relevant documentation
- **Size**: Keep PRs focused and reasonably sized

### PR Template
```markdown
## Summary
Brief description of changes

## Changes Made
- [ ] Added new tool: `tool_name`
- [ ] Updated documentation
- [ ] Added tests with X% coverage

## Testing
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Integration tests updated if needed

## Documentation
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] JSDoc comments added
```

### Review Process
1. Automated CI checks must pass
2. Code review by maintainers
3. All conversations resolved
4. Squash and merge (maintainers will handle)

## Architecture Guidelines

### Tool Design Principles
- **Single Responsibility**: Each tool should have a clear, focused purpose
- **Type Safety**: Full TypeScript typing with Zod schemas
- **Error Handling**: Graceful error handling with informative messages
- **Performance**: Efficient algorithms and resource usage
- **Testability**: Code should be easily testable

### Integration Patterns
- **External APIs**: Use rate limiting and error handling
- **Caching**: Implement caching for expensive operations
- **Logging**: Use centralized Logger class, never console.log
- **Configuration**: Environment-based configuration

### Security Considerations
- **Input Validation**: Always validate inputs with Zod schemas
- **API Keys**: Never log or expose API keys
- **Data Privacy**: Process data locally when possible
- **Dependencies**: Keep dependencies minimal and audited

## Common Development Tasks

### Running Examples
```bash
# Run specific examples
node examples/housing_market_analysis.js
node examples/market_strategy_analysis.js

# Run all examples
node examples/run_integration_examples.js
```

### Cache Management
```bash
npm run cache:stats   # View cache statistics
npm run cache:clear   # Clear all caches
```

### Debugging
```bash
npm run inspector    # MCP protocol inspector
npm run test:debug   # Debug test execution
```

## Getting Help

### Resources
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Project Documentation](./docs/)
- [API Reference](./docs/API_REFERENCE.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

### Community
- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: All PRs receive thorough code review

### Maintainer Response Time
- **Bug Reports**: 24-48 hours
- **Feature Requests**: 1-2 weeks
- **Pull Reviews**: 2-3 business days

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project README acknowledgments

Thank you for contributing to making analytical reasoning more accessible through MCP! 🚀