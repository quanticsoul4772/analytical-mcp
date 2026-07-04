# Development Guide

## Prerequisites
- Node.js >= 20.0.0 (see `engines` in `package.json`; CI runs 20.x and 22.x)
- npm
- `EXA_API_KEY` — only required for research features and the integration test
  suite. Not needed to build, lint, typecheck, or run unit tests.

## Build & Development Commands

### Core Commands
- **Build**: `npm run build` (`tsc`)
- **Watch mode**: `npm run watch` (`tsc --watch`)
- **Run server**: `node build/index.js`
- **Inspect server**: `npm run inspector` (`npx @modelcontextprotocol/inspector build/index.js`)
- **Protocol smoke test**: `npm run smoke` — builds, then spawns `build/index.js` as a
  real subprocess and speaks JSON-RPC over stdio (see `scripts/smoke.js` and
  [TESTING.md](./TESTING.md)).

### Code Quality
- **Lint**: `npm run lint` (`eslint src/**/*.ts`) or fix with `npm run lint:fix`
  (`eslint . --ext .ts --fix`)
- **Format**: `npm run format` (`prettier --write "src/**/*.ts"`) or check with
  `npm run format:check`
- **TypeCheck**: `npm run typecheck` (`tsc --noEmit`, whole repo including tests),
  `npm run typecheck:src` (`tsc --project tsconfig.test.json`, source only, excludes
  `src/**/__tests__/**`)

### Testing
See [TESTING.md](./TESTING.md) for the full picture (ESM mocking pattern, jest
project split, how `EXA_API_KEY` affects tests). Quick reference:
- **Unit tests (offline, the default)**: `npm test` (or the explicit `npm run test:unit`)
- **Integration tests**: `npm run test:integration` — prints a non-blocking heads-up
  without `EXA_API_KEY` and runs anyway (live-Exa cases self-skip)
- **Coverage**: `npm run test:coverage`
- **Single file**: `npm test -- path/to/test.ts` (unit files; for an integration file use
  `npm run test:integration`)
- **Single test name**: `npm test -- -t "test name pattern"`
- **Debug**: `npm run test:debug`

### Cache Management
- **Cache stats**: `npm run cache:stats` (`node tools/cache-manager.js stats`)
- **Clear cache**: `npm run cache:clear`
- **Preload cache**: `npm run cache:preload`

### Other Utility Scripts
- **API key validation**: `npm run check-api-keys` (`node tools/check-api-keys.js`) —
  exits non-zero if `EXA_API_KEY` is unset. The `--warn` variant runs automatically as
  the `pretest:integration` hook (heads-up only, does not block).
- **Shell test wrapper**: `tools/test-runner.sh [unit|integration|integration:no-api|all]`
  — a thin wrapper over the npm test scripts above.
- **Metrics smoke check**: `node tools/test_metrics.js` — starts the server with
  `METRICS_ENABLED=true` and probes the metrics HTTP endpoint.

## Code Style Guidelines

### TypeScript Standards
- Use TypeScript with strict typing and explicit function return types
- Organize related functionality in modules within the `tools` directory
- Use Zod for input validation and type safety
- ES modules only (`import`/`export`); `package.json` sets `"type": "module"`

### Formatting (`.prettierrc`)
- 100 character line length
- 2-space indentation
- Single quotes
- Trailing commas (ES5 style)
- Semicolons required

### Code Quality
- Functions should have max 50 lines
- Complexity score under 10
- camelCase naming for variables/functions
- JSDoc comments for complex logic
- Use the `Logger` class for all output — no `console.log`/`console.error` in
  source (`eslint` flags `no-console`; stray stdout writes corrupt the MCP
  stdio JSON-RPC channel, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md))

### Mathematical Operations
- Use `mathjs` library conventions for mathematical operations

## Development Workflow

### Setup
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and add your `EXA_API_KEY` if you plan to work
   on research/NLP features or run the integration suite

### Development Process
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run unit tests: `npm run test:unit`
4. Lint and format: `npm run lint && npm run format`
5. Typecheck: `npm run typecheck`
6. Build: `npm run build`

### Commit Guidelines
- Use commit messages that describe changes
- Follow conventional commit format
- Ensure `npm run typecheck`, `npm run lint`, and `npm run test:unit` pass before committing

### Pull Request Process
1. Ensure code is documented
2. Add tests for new features
3. Submit pull request with description — CI (`.github/workflows/ci.yml`) runs
   typecheck, lint, `test:unit`, and `smoke` on an ubuntu/windows × Node 20/22 matrix

## Reporting Issues
- Use GitHub Issues
- Provide description, reproduction steps, and relevant error logs

## Feature Requests
- Open an issue describing the proposed feature and use case
- Discuss with maintainers before starting work
