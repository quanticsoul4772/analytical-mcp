# Analytical MCP Server Source Code

This directory contains the source code for the Analytical MCP Server, which provides tools for statistical analysis, decision support, logical reasoning, and research verification, served over the Model Context Protocol.

## Directory Structure

- **src/**
  - **tools/** — Tool implementations. Each MCP-registered tool exports a zod schema + async handler; some tools (e.g. `logical_argument_analyzer`, `data_visualization_generator`, `advanced_regression_analysis`) delegate to provider classes that live alongside them in `tools/` or in `utils/`. Registration happens in `tools/index.ts` — a tool isn't exposed to clients until it's added to the `toolRegistrations` array there. `tools/__tests__/` holds tool-level unit tests.
  - **utils/** — Infrastructure and provider logic: statistics (`statistics.ts`), regression providers (`linear_regression_provider.ts`, `polynomial_regression_provider.ts`, `logistic_regression_provider.ts`, `multivariate_regression_provider.ts`, `regression_metrics_provider.ts`), NLP/NER providers, caching (`cache_manager.ts`, `enhanced_cache.ts`, `research_cache.ts`), resilience (`api_resilience.ts` circuit breakers, `rate_limit_manager.ts`), metrics (`metrics_collector.ts`, `metrics_server.ts`), and config (`config.ts`). `utils/__tests__/` holds unit tests for this layer.
  - **integration/** — Integration tests that exercise multiple modules together. Some (`research_api_integration.test.ts`, `market_analysis_workflow.test.ts`) call the live Exa API and skip themselves when `EXA_API_KEY` isn't set; others (`data_processing_pipeline.test.ts`, `logical_reasoning_tools.test.ts`, `api_resilience.integration.test.ts`) run offline. `test-helper.ts` provides `setupExaMocks()`, `resetAllMocks()`, and `mockApiKeys()` helpers for tests that stub the Exa HTTP boundary via `node-fetch`.
  - **__tests__/** — Server-level test: `server_protocol.test.ts` drives a real client↔server exchange over an in-memory MCP transport (`InMemoryTransport`) and should be extended whenever a tool is added or its schema changes.
  - **types/** — Ambient type declarations for untyped dependencies (`nspell.d.ts`, `pos.d.ts`, `wink-lemmatizer.d.ts`, `wink-pos-tagger.d.ts`).
  - **index.ts** — Server entry point: builds the `McpServer`, calls `registerTools()`, optionally preloads the cache and starts the metrics HTTP server, then connects over stdio.
  - **setupTests.ts** — Jest global setup (`setupFilesAfterEnv`): configures timeouts and warns if `EXA_API_KEY` is missing for suites that need it.

There is no `src/__mocks__/` directory — Jest runs in ESM mode, where the classic `__mocks__` auto-mocking convention and `jest.mock()` don't work. Mocking is done per-file instead (see below).

## Testing Guide

### Running tests

```bash
# Unit tests only — offline, no API key required
npm run test:unit

# Integration tests — some suites require EXA_API_KEY, others run offline
npm run test:integration
npm run test:integration:no-api   # skips the live-API suite

# Everything
npm test

# Or via the thin wrapper script
./tools/test-runner.sh unit
./tools/test-runner.sh integration
./tools/test-runner.sh integration:no-api
```

Jest is configured with a `projects` split in `jest.config.js`: `unit` matches `src/**/__tests__/**/*.test.ts`, `integration` matches `src/integration/**/*.test.ts`. Select one with `--selectProjects unit|integration`.

### Mocking (ESM, no `jest.mock()`)

Under ESM, `jest.mock()` is not available. Mock a module boundary with `unstable_mockModule` on the Jest instance bound to the test file (via `import.meta.jest`), called *before* a dynamic `await import()` of the module under test:

```typescript
import { jest } from '@jest/globals';

const searchMock = jest.fn();
const jestEsm = (import.meta as any).jest as typeof jest;

jestEsm.unstable_mockModule('../../utils/exa_research.js', () => ({
  exaResearch: { search: searchMock, extractKeyFacts: jest.fn(), validateData: jest.fn() },
  registerExaResearch: jest.fn(),
}));

const { researchVerification } = await import('../research_verification.js');
```

See `src/tools/__tests__/research_verification.test.ts` for a full example. Pure-math tools (statistics, regression) generally need no mocks at all.

For integration tests that stub the Exa HTTP boundary directly (rather than mocking the module), use the helpers in `src/integration/test-helper.ts`:

```typescript
import { setupExaMocks, resetAllMocks, mockApiKeys } from './test-helper';

describe('API Test', () => {
  beforeEach(() => {
    resetAllMocks();
    mockApiKeys();
    setupExaMocks({});
  });
  // ...
});
```
