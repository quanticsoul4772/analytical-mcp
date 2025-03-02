# CLAUDE.md - Analytical MCP Server

## Build & Development Commands
- Build: `npm run build`
- Watch mode: `npm run watch`
- Lint: `npm run lint` or fix with `npm run lint:fix`
- Format: `npm run format` or check with `npm run format:check`
- Test: `npm run test` or with coverage `npm run test:coverage`
- Test single file: `npm test -- path/to/test.ts`
- Test specific test: `npm test -- -t "test name pattern"`
- TypeCheck: `npm run typecheck` (all), `npm run typecheck:src` (source only)
- Run server: `node build/index.js`
- Inspect server: `npx @modelcontextprotocol/inspector build/index.js`
- Cache commands: `npm run cache:stats`, `npm run cache:clear`, `npm run cache:preload`

## Code Style Guidelines
- Use TypeScript with strict typing and explicit function return types
- Format: 100 char line length, 2-space indentation, single quotes, trailing commas
- Imports: Use ES modules (import/export)
- Complexity: Functions should have max 50 lines and complexity score under 10
- Error handling: Use try/catch with descriptive messages and Zod for validation
- Naming: camelCase for variables/functions, descriptive of purpose
- Documentation: JSDoc comments for complex logic
- Architecture: Organize related functionality in modules within tools directory
- Styling: Follow Prettier configuration and ESLint rules
- Math: Use mathjs library conventions for mathematical operations