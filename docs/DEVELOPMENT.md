# Development Guide

## Prerequisites
- Node.js (v20+)
- npm
- EXA_API_KEY environment variable (for research features)

## Build & Development Commands

### Core Commands
- **Build**: `npm run build`
- **Watch mode**: `npm run watch`
- **Run server**: `node build/index.js`
- **Inspect server**: `npx @modelcontextprotocol/inspector build/index.js`

### Code Quality
- **Lint**: `npm run lint` or fix with `npm run lint:fix`
- **Format**: `npm run format` or check with `npm run format:check`
- **TypeCheck**: `npm run typecheck` (all), `npm run typecheck:src` (source only)

### Testing
- **Test**: `npm run test` or with coverage `npm run test:coverage`
- **Test single file**: `npm test -- path/to/test.ts`
- **Test specific test**: `npm test -- -t "test name pattern"`
- **Debug test**: `npm run test:debug`
- **API tests**: `npm run test:api` or `npm run test:integration`

### Cache Management
- **Cache stats**: `npm run cache:stats`
- **Clear cache**: `npm run cache:clear`
- **Preload cache**: `npm run cache:preload`

### Utility Scripts
- **API key validation**: `node tools/check-api-keys.js`
- **Cache management**: `node tools/cache-manager.js`
- All utility scripts use Logger integration for output formatting

## Code Style Guidelines

### TypeScript Standards
- Use TypeScript with strict typing and explicit function return types
- Organize related functionality in modules within tools directory
- Use Zod for input validation and type safety

### Formatting
- 100 character line length
- 2-space indentation
- Single quotes
- Trailing commas
- Use ES modules (import/export)

### Code Quality
- Functions should have max 50 lines
- Complexity score under 10
- CamelCase naming for variables/functions
- JSDoc comments for complex logic
- Error handling with try/catch and error messages
- Use Logger class for all output (no console.log statements)
- Utility scripts integrate with Logger system for consistent formatting

### Testing Standards
- Jest with 90s timeout for API calls
- Test setup in src/setupTests.ts
- 90%+ test coverage target

### Mathematical Operations
- Use mathjs library conventions for mathematical operations

## Development Workflow

### Setup
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and add your EXA_API_KEY

### Development Process
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `npm test`
4. Lint and format: `npm run lint && npm run format`
5. Build: `npm run build`

### Commit Guidelines
- Use commit messages that describe changes
- Follow conventional commit format
- Ensure all tests pass before committing

### Pull Request Process
1. Ensure code is documented
2. Update README.md if needed
3. Add tests for new features
4. Submit pull request with description

## Reporting Issues
- Use GitHub Issues
- Provide description
- Include reproduction steps
- Share relevant error logs

## Feature Requests
- Open an issue describing the proposed feature
- Explain the use case and potential implementation
- Discuss with maintainers before starting work

## Code of Conduct
- Be respectful and provide constructive feedback
- Collaborate openly and help others learn
- Follow the established coding standards and practices
