# Testing Guide

## Test Layout

Jest (`jest.config.js`) defines two named projects:

| Project | `testMatch` | Notes |
|---|---|---|
| `unit` | `src/**/__tests__/**/*.test.ts` | Offline, no network, no API key required |
| `integration` | `src/integration/**/*.test.ts` | `maxWorkers: 1` (sequential); several suites need `EXA_API_KEY` |

Both projects share `preset: ts-jest/presets/default-esm`, ESM transform settings, and
`setupFilesAfterEnv: src/setupTests.ts`.

There is also `src/__tests__/server_protocol.test.ts` (in the `unit` project — it lives
under `src/__tests__/`, which matches the unit `testMatch` glob), which connects a real
`@modelcontextprotocol/sdk` `Client` to the real `McpServer` over an `InMemoryTransport`.
No mocks, no subprocess — it registers the actual tools (`registerTools` from
`src/tools/index.ts`) and calls them through the real MCP protocol layer, asserting all 12
tools are listed with valid input schemas and that `analyze_dataset` /
`hypothesis_testing` / `ml_model_evaluation` return correct results end-to-end.

## Running Tests

- `npm test` — runs the full jest suite (both projects). This goes through npm's
  `pretest` lifecycle hook first, which runs `tools/check-api-keys.js` and **exits
  non-zero if `EXA_API_KEY` is not set** — so bare `npm test` will refuse to run at
  all without the key, even though most of the suite doesn't need it.
- `npm run test:unit` — runs only the `unit` project directly via
  `--selectProjects unit`. This does **not** go through `pretest` (npm only chains
  `pre<name>` for the exact script name `test`), so it runs fine with no
  `EXA_API_KEY` set. This is what CI runs.
- `npm run test:integration` — runs only the `integration` project
  (`--selectProjects integration`).
- `npm run test:integration:no-api` — runs the `integration` project but excludes
  `research_api_integration` via `--testPathIgnorePatterns`, for running the
  integration suite without live Exa API calls.
- `npm run test:coverage` — full suite with coverage (`collectCoverageFrom` excludes
  `src/integration/**` and `*.d.ts`).
- `npm run test:watch` — watch mode.
- `npm run test:ci` — `--ci --coverage --maxWorkers=2 --silent`.
- `npm run test:debug` — `--inspect-brk --expose-gc --runInBand`, for attaching a debugger.
- `npm run test:optimized` — `--max-old-space-size=4096 --expose-gc --runInBand`.
- `npm run test:leak-detection` — adds `--detectOpenHandles --detectLeaks
  --logHeapUsage` on top of a larger heap. **Not run by default** — see below.
- `npm run test:strict` — `typecheck:src` then `test`.
- Single file: `npm test -- path/to/file.test.ts`
- Single test name: `npm test -- -t "test name pattern"`
- Shell wrapper: `tools/test-runner.sh [unit|integration|integration:no-api|all]`

## Leak diagnostics are off by default

`jest.config.js` sets `detectOpenHandles: false`, `detectLeaks: false`,
`logHeapUsage: false`, and `forceExit: true`. These were previously on by default and
hung CI for 30+ minutes — `detectLeaks`/`detectOpenHandles` multiply runtime and don't
play well with this codebase's interval timers (cache cleanup, rate limiter). `forceExit`
is required because those interval timers keep the Node process alive after tests
finish. Run diagnostics on demand with `npm run test:leak-detection` when actually
chasing a leak, not routinely.

Test timeout: `jest.config.js` sets `testTimeout: 30000` (30s) at the top level, but
`src/setupTests.ts` calls `jest.setTimeout(60000)`, and both `unit` and `integration`
projects load that file via `setupFilesAfterEnv` — so the effective per-test timeout is
60s everywhere.

## `EXA_API_KEY` and tests

- `npm test` (bare) is blocked entirely without the key, via `pretest`.
- `npm run test:unit` is unaffected — no unit test requires the key.
- Integration test files that call the live Exa API check
  `process.env.EXA_API_KEY` themselves and skip (with `Logger.warn('Skipping test:
  EXA_API_KEY not found in environment')`) rather than fail, e.g.
  `src/integration/market_analysis_workflow.test.ts` and
  `src/integration/research_api_integration.test.ts`.
- `src/setupTests.ts` also loads `.env.test` (gitignored — put your local key there)
  via `dotenv`'s `config({ path: '.env.test' })`, and calls `checkApiKeys()` in a
  `beforeAll`, but only logs a warning on failure — it does not fail the run.

Net effect: only `npm test` and `npm run test:integration` (for the Exa-dependent
suites) actually require `EXA_API_KEY`. `npm run test:unit`, `typecheck`, `lint`,
`build`, and `smoke` do not.

## Mocking modules under ESM: `jest.mock()` does not work here

This project runs Jest against native ESM (`"type": "module"` +
`ts-jest/presets/default-esm`, launched with `node --experimental-vm-modules`).
Under ESM, `jest.mock()` (the CommonJS-era API) is a silent no-op — the module is
imported unmocked and the test passes or fails against the real implementation with no
error pointing at the mock. If a test's `jest.mock()` call appears to do nothing, that
is this issue, not a bug in the test itself.

The working pattern is `import.meta.jest.unstable_mockModule(...)`, called **before** a
dynamic `await import(...)` of the module under test. Two real examples from this repo:

`src/utils/__tests__/config.test.ts`:
```ts
import.meta.jest.unstable_mockModule('dotenv', () => {
  const configFn = jest.fn(() => ({ parsed: {} }));
  return {
    default: { config: configFn },
    config: configFn,
  };
});

// ... later, inside a helper used by each test:
async function freshConfig(): Promise<typeof import('../config.js')> {
  jest.resetModules();
  return import('../config.js');
}
```

`src/tools/__tests__/research_verification.test.ts`:
```ts
const searchMock = jest.fn<(query: unknown) => Promise<SearchResponse>>();

// import.meta.jest is bound to this file, so relative specifiers resolve from
// this directory's `src/tools/__tests__/`.
const jestEsm = (import.meta as any).jest as typeof jest;

jestEsm.unstable_mockModule('../../utils/exa_research.js', () => ({
  exaResearch: {
    search: searchMock,
    extractKeyFacts: jest.fn(),
    validateData: jest.fn(),
  },
  registerExaResearch: jest.fn(),
}));

const { researchVerification } = await import('../research_verification.js');
```

Key points:
- Register the mock with `import.meta.jest.unstable_mockModule(specifier, factory)`
  (or via `(import.meta as any).jest`) — a relative specifier resolves from the test
  file's own directory.
- Only *after* that, `await import(...)` the module under test (top-level await, or
  inside a `beforeEach`/helper combined with `jest.resetModules()` if you need a fresh
  module instance per test, as `config.test.ts` does).
- Other real examples of this pattern: `src/utils/__tests__/metrics_server_content_limit.test.ts`,
  `src/utils/__tests__/tool-wrapper.test.ts`, `src/utils/__tests__/advanced_ner.test.ts`,
  `src/utils/__tests__/api_helpers.edge.test.ts`, `src/utils/__tests__/api_helpers.test.ts`,
  `src/utils/__tests__/api_resilience.test.ts`.

## Protocol smoke test (`npm run smoke`)

`npm run smoke` runs `npm run build` and then `node scripts/smoke.js`. Unlike the jest
suite, this spawns the actual built server (`build/index.js`) as a **real child
process** and speaks real JSON-RPC 2.0 over its stdio, the same way an MCP client
(e.g. Claude Desktop) would. It:

1. Sends `initialize` and asserts a valid response with `serverInfo.name`.
2. Sends `tools/list` and asserts at least 12 tools are returned.
3. Calls `tools/call` for `analyze_dataset` with a known dataset and asserts the
   response text contains `Mean: 5.00`.
4. Calls `tools/call` for `analyze_dataset` with invalid input (`data: 'not an
   array'`) and asserts it's rejected cleanly (an error or `isError: true`), not a
   crash.
5. Fails loudly if any stdout line from the server isn't valid JSON — this is a
   regression check for the dotenv-banner-corrupts-stdio bug (see
   [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)).

The server is spawned with `METRICS_ENABLED: 'false'` so the smoke test doesn't bind
the metrics HTTP port as a side effect. `smoke` is also the last step of CI
(`.github/workflows/ci.yml`), after typecheck, lint, and `test:unit`.

## CI

`.github/workflows/ci.yml` runs on push/PR to `main`, on a matrix of
`{ubuntu-latest, windows-latest} × {Node 20.x, 22.x}`. Steps: `npm ci`, `npm run
typecheck`, `npm run lint`, `npm run test:unit`, `npm run smoke`. It does not run
`test:integration` (no `EXA_API_KEY` is configured in CI).
