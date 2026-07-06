# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
does not yet follow strict SemVer (pre-1.0).

## [Unreleased]

### Added

- Per-call **audit logging** to stderr (gated by `ENABLE_AUDIT_LOG`, default on,
  independent of `LOG_LEVEL`): one structured record per tool invocation —
  `{event, tool, ok, durationMs, argBytes, argHash, exaCalls}` (plus the error
  message on failure). It logs argument *size* and a sha256 fingerprint only,
  never raw argument content, so an operator can spot oversized/injection-shaped
  inputs and reconstruct activity without any content leakage. `exaCalls` is the
  number of outbound Exa requests the call issued (via `AsyncLocalStorage`), so
  external fan-out is attributable to the invocation that caused it.

### Changed

- **Input-size caps** across all 12 tools (robustness): every data array and
  free-text field now has a `.max()` bound, and the two super-linear paths are
  guarded — regression predictors (O(n³)) and the statistics numeric-column count
  (O(cols²×rows)). A single call can no longer submit an unbounded input that
  stalls or OOMs the server. Limits are generous for real use and tunable.

### Documentation

- Documented an `EXA_API_KEY` rotation and emergency-revocation procedure in `SECURITY.md`
  (restart-based; the key is read once at startup and only ever sent to Exa in an
  `Authorization: Bearer` header). Corrected the Supported-versions table to `0.3.x`.
- Documented per-call audit logging and `ENABLE_AUDIT_LOG` in the README's Observability section,
  and corrected the stale `serverInfo` version (`0.1.0` → `0.3.0`) in `docs/ARCHITECTURE.md`.

### Fixed

- Research-output quality: the enhanced fact extractor no longer emits the whole page as one
  document-level "sentiment" fact (which produced giant blobs and drove spurious cross-source
  "conflicts"); the conflict detector now skips oversized (>300-char) facts; navigation/social/
  credit boilerplate is filtered via a shared, anchored `SITE_CHROME_PATTERNS` on both the
  `verify_research` and `perspective_shifter` paths; and `perspective_shifter`'s actionable line is
  now derived from the top extracted fact (and states plainly when no evidence was retrieved)
  instead of a hardcoded template.
- The Exa client never retrieved page text: the `/search` request sent non-existent params
  (`useWebResults`/`useNewsResults`/`includeContents`) instead of Exa's `contents: { text }`
  object, and the response's `text` field was never mapped to `contents`. So every fact-extraction
  consumer saw only titles — `verify_research` scored 0 and `perspective_shifter` returned empty
  perspective bodies. The request now asks for `contents.text` and results are normalized so
  `contents` is populated (with `text`/`highlights` preserved for the NER path).

### Security

- Bounded the rule-based NER ORGANIZATION regex (`{1,6}` leading words instead of `+`),
  making its worst case linear instead of O(n²) on a long run of capitalized, space-separated
  words with no organization suffix. This path runs only on Exa-fetched research content, so it
  was not an exploitable ReDoS, but the quadratic backtracking is removed.
- The optional metrics HTTP server (unauthenticated) is now **off by default**:
  `config.METRICS_ENABLED` defaulted to `'true'` while the server singleton was off
  unless the env var was explicitly `'true'` — the two disagreed, and a refactor
  unifying on the config value could have silently bound the endpoint. Both now
  default off; enabling it is a deliberate `METRICS_ENABLED=true` opt-in.
- `verify_research` now caps `verificationQueries` at 5 and bounds outbound Exa
  requests to at most 3 in flight. Previously an uncapped query list was fanned
  out with `Promise.all`, so untrusted content reaching the tool's arguments
  (indirect prompt injection) could drive an unbounded number of simultaneous
  third-party requests billed to `EXA_API_KEY` and inflate the O(facts²)
  cross-source consistency matrix. Over-long lists now reject with a
  `ValidationError` before any search runs.

## [0.3.0] - 2026-07-05

Published to the Glama MCP directory at a 100% profile with an **A** quality
score (all 12 tools rated A). This release folds in every change since 0.2.0:
the full 12-tool surface, a `mathjs` security bump, real bug fixes, dead-code
removal, and a complete tool-definition overhaul.

### Added

- Registered three previously-unexposed analytical tools (9 → 12):
  `advanced_statistical_analysis` (descriptive stats + cross-variable Pearson
  correlation), `advanced_data_preprocessing` (normalization, standardization,
  missing-value handling, IQR outlier detection), and `ml_model_evaluation`
  (classification and regression metrics). Two had been registered in the
  original codebase and were dropped during an earlier rewrite; all three are
  real-math implementations.
- `npm run smoke` now validates **all 12 tools** over real stdio JSON-RPC —
  each with a known-good call asserting a computed value plus an empty-input
  edge case asserting a clean error (previously it spot-checked one tool). This
  is the regression net that catches protocol-level breakage unit tests miss.
- Community-health files (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, issue/PR templates); private vulnerability reporting enabled.
- Glama score badge in the README.

### Changed

- Overhauled all 12 tool definitions: every `description` rewritten (purpose,
  output, when-to-use vs. sibling tools, and requirements) and a `.describe()`
  added to every input parameter — improving agent tool selection and Glama
  Tool-Definition-Quality (graded A).
- The tool registration wrapper now returns `isError: true` when a handler
  throws, so a schema-valid input that fails inside a tool surfaces as an MCP
  error result rather than a success-shaped text block.
- `serverInfo.version` now tracks `package.json` (it had been hardcoded and
  understated the version in the MCP handshake).
- Refreshed the README and removed a vestigial port-3000 reference across
  config and Docker.

### Removed

- Dead code: the unused `data_resource_management` tool (code-execution smell),
  unwired resilience/wrapper modules, the circuit-breaker metrics surface, and
  unused dependencies.

### Fixed

- `verify_research` crashed with "Cannot calculate the mean of an empty array"
  on every query when fact extraction yielded no facts; it now returns an
  unverified, zero-confidence result.
- Docker build failed, blocking Glama deployment: the production `tsc` build
  compiled test infrastructure (`src/setupTests.ts`, which imports
  `@jest/globals`) that does not resolve under a strict pnpm `node_modules`;
  test infrastructure is now excluded from the build. The repository
  Dockerfile's `npm ci` was also fixed (the lockfile had been `.dockerignore`d,
  and the `prepare` hook rebuilt during install).
- `advanced_regression_analysis` solver falsely rejected well-conditioned,
  multi-scale data as singular (added symmetric Jacobi equilibration).
- `data_visualization_generator` emitted `[object Object]` instead of
  formatted values.
- The 9 pre-existing failing integration tests, and an inverted
  `npm test` / `EXA_API_KEY` gate that selected the wrong test project.
- `ml_model_evaluation` now throws a `ValidationError` on empty input,
  mismatched array lengths, or an unknown model type (previously it returned a
  success-shaped error report), and guards precision/recall/F1/R² against
  `NaN` on degenerate input.
- `advanced_data_preprocessing` now accepts a flat `number[]` (its schema
  permitted it, but the flattening logic produced an empty series and crashed),
  and rejects empty input with a `ValidationError`.
- Broken `lint:fix` script and spurious `no-console` lint warnings.

### Security

- Bumped `mathjs` 14 → 15.2.0, clearing the prototype-pollution advisory
  ([GHSA-29qv-4j9f-fjw5](https://github.com/advisories/GHSA-29qv-4j9f-fjw5))
  that 0.2.0 listed as a known issue.

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

[Unreleased]: https://github.com/quanticsoul4772/analytical-mcp/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/quanticsoul4772/analytical-mcp/releases/tag/v0.3.0
[0.2.0]: https://github.com/quanticsoul4772/analytical-mcp/releases/tag/v0.2.0
