# CLAUDE.md - Analytical MCP Server

## Build & Development Commands
- Build: `npm run build`
- Watch mode: `npm run watch`
- Inspect server: `npx @modelcontextprotocol/inspector build/index.js`
- Run server: `node build/index.js`
- TypeCheck (all files): `npm run typecheck`
- TypeCheck (source only): `npm run typecheck:src`
- TypeCheck (skip lib check): `npm run typecheck:test`
- Test with TypeCheck: `npm run test:strict`
- Integration Tests: `npm run test:integration`
- Integration Tests with Coverage: `npm run test:integration:coverage`
- Integration Tests without TypeCheck: `npm run test:integration:no-typecheck`

## Code Style Guidelines
- Use TypeScript with strict typing
- Use ES modules (import/export)
- Error handling: Check inputs and use try/catch blocks with descriptive error messages
- Prefer async/await pattern for asynchronous operations
- Function names: camelCase, descriptive of operation (e.g., analyzeDataset)
- Variable names: camelCase, clear purpose
- Use Zod schemas for input validation
- Follow clean code principles with descriptive variable names
- Document functions with brief JSDoc comments for complex logic
- Organize related functionality in separate modules within the tools directory
- Follow mathjs library conventions for mathematical operations