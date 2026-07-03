# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
does not yet follow strict SemVer (pre-1.0).

## [0.2.0] - 2026-07-03

First tagged release. `0.1.0` was an untagged, non-functional prototype —
the server crashed on startup (missing `capabilities` argument to the SDK's
`Server` constructor) and never registered a protocol handler. Everything
below was required to reach a working state.

### Breaking

- `decision_analysis` now requires a `scores` matrix (`number[][]`, one row
  per option, one 0–10 score per criterion). It previously scored options
  with `Math.random()`; callers must now supply real scores.

### Added

- Protocol-level testing: `npm run smoke` (real stdio JSON-RPC probe of the
  built server) and `src/__tests__/server_protocol.test.ts` (real MCP
  client↔server test over `InMemoryTransport`).
- CI: typecheck, lint, unit tests, and smoke test on Linux and Windows ×
  Node 20/22 (`.github/workflows/ci.yml`) — this project's first CI.
- `src/utils/statistics.ts`: log-gamma, incomplete beta/gamma, and t/F/
  chi-square CDFs backing real p-value computation.

### Changed

- Upgraded `@modelcontextprotocol/sdk` 1.18 → 1.29 and rewrote the server
  entry point / tool registration to use `McpServer.registerTool`.
- `advanced_regression_analysis`: replaced placeholder `Math.random()`
  coefficients and metrics with real OLS (normal equations, collinearity
  detection), polynomial design matrices, and IRLS logistic regression;
  real R²/adjusted R²/MSE/RMSE/MAE, Mann-Whitney AUC, log-loss, and VIF.
- `hypothesis_testing`: replaced a hardcoded 0.05/0.5 p-value with real
  Welch/paired/correlation t-tests, chi-square independence, and one-way
  ANOVA, computed via `src/utils/statistics.ts`.
- `verify_research` reports the true computed consistency score plus a
  `verified` boolean; a `Math.max(score, threshold)` floor previously made
  it impossible to report a score below the configured threshold.
- All logging routes to stderr (`dotenv.config({ quiet: true })`,
  `Logger` never writes to stdout) — stdout is reserved for the MCP
  stdio JSON-RPC channel; a single stray write corrupted the protocol.
- Replaced the native `spellchecker` dependency (does not compile on
  Node ≥22) with pure-JS `nspell` + `dictionary-en`.
- All documentation (`README.md`, `CLAUDE.md`, `docs/*.md`, `examples/`)
  rewritten against current source.

### Fixed

- Server crashed on startup and never registered a working protocol
  handler (`Cannot read properties of undefined (reading 'capabilities')`).
- `logical_fallacy_detector`'s MCP registration silently dropped the
  validated `categories`/`includeExplanations`/`includeExamples`
  parameters before they reached the tool implementation.
- Non-retryable API errors were retried until `maxRetries` instead of
  failing immediately; `isRetryableError` crashed on `null`.
- `cacheManager.preload()` reconstructed cache keys incorrectly, so
  preloaded entries could never be retrieved.
- POS tagging silently tagged every word `NN` (no tagger was wired up);
  lemmatization called its library incorrectly and always threw;
  `textSimilarity` could return negative values; NER preprocessing
  stripped `$`/`%` and lowercased text before entity extraction, making
  organization/money/person detection structurally impossible.
- 31 of 39 unit test suites were failing (ESM-incompatible `jest.mock()`
  calls, assertions against removed APIs) — all fixed; suite runs in ~5s
  with always-on leak diagnostics disabled (was hanging CI for 30+ minutes).
- Pinned Claude review workflows to a live model ID (`claude-sonnet-4-
  20250514` had been retired, so every review run failed at startup).

### Known issues

- `npm audit` reports 3 remaining vulnerabilities requiring major/breaking
  dependency bumps (not applied in this release, pending their own
  verification pass):
  - **`mathjs` (high, direct runtime dependency)** — prototype-pollution-
    style issue ([GHSA-29qv-4j9f-fjw5](https://github.com/advisories/GHSA-29qv-4j9f-fjw5)),
    fixed in mathjs 15 (this project pins 14.x).
  - `mongoose`/`underscore` (high, transitive via `natural`) — pulled in
    by `natural`'s dependency tree; not imported by this project's code.
- Test coverage is ~55% statements / 43% branches — adequate for the
  paths exercised by CI, not exhaustive.
- The Exa research integration (`perspective_shifter`, `verify_research`)
  requires `EXA_API_KEY`; without it those two tools are unavailable but
  the other 7 tools work normally.

[0.2.0]: https://github.com/quanticsoul4772/analytical-mcp/releases/tag/v0.2.0
