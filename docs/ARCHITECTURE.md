# Analytical MCP Server Architecture

## System Overview

The Analytical MCP Server implements the Model Context Protocol (MCP) to provide statistical
analysis, decision support, logical reasoning, data visualization, and research verification
tools. It runs as a single Node.js process communicating over stdio.

## Entry Flow

Source: `src/index.ts`.

1. `initializeServer()` creates an `McpServer` (`{ name: 'Analytical MCP Server', version: '0.1.0' }`)
   with `capabilities: { tools: {} }`.
2. `registerTools(server)` (`src/tools/index.ts`) registers all 12 tools (see below).
3. `initializeCache()` preloads the disk cache via `cacheManager.preload()` — but only if
   `ENABLE_RESEARCH_CACHE=true` (default `false`). A cache preload failure is logged and does not
   stop startup.
4. `initializeMetricsServer()` starts the metrics HTTP server via `metricsServer.start()` — but
   only if `METRICS_ENABLED=true`. `config.ts` defaults `METRICS_ENABLED` to `'false'`, so the
   unauthenticated metrics endpoint is off unless the operator explicitly enables it. Port is
   `METRICS_PORT` (default `9090`), host is `METRICS_HOST` (default `127.0.0.1`). A startup failure here is also
   non-fatal — logged and skipped.
5. A `StdioServerTransport` is created and `server.connect(transport)` starts serving MCP requests
   over stdio.
6. `SIGINT`/`SIGTERM`/`uncaughtException`/`unhandledRejection` handlers trigger
   `gracefulShutdown()`, which stops the metrics server if running.

## Tool Registration

Location: `src/tools/index.ts`, function `registerTools()`.

Twelve tools are registered, in this order, each with a Zod schema and an async handler:

1. `analyze_dataset`
2. `decision_analysis`
3. `advanced_regression_analysis`
4. `hypothesis_testing`
5. `data_visualization_generator`
6. `logical_argument_analyzer`
7. `logical_fallacy_detector`
8. `perspective_shifter`
9. `advanced_statistical_analysis`
10. `advanced_data_preprocessing`
11. `ml_model_evaluation`
12. `verify_research`

This exact list is asserted in `src/__tests__/server_protocol.test.ts`, which connects a real MCP
`Client` to the real `McpServer` over `InMemoryTransport` (no mocks, no subprocess) and checks
`client.listTools()`.

Each handler is wrapped so that any thrown error (`ValidationError`, `DataProcessingError`,
`APIError`, etc. from `src/utils/errors.ts`) is caught and returned as a normal tool result whose
text is `Error: <message>`, rather than propagating as a protocol-level failure. See
`docs/API_REFERENCE.md` for per-tool parameter and output detail, including a case
(`logical_fallacy_detector`) where the registered schema accepts fields the handler ignores.

## Provider Pattern

Several tools are thin coordinators that delegate to focused "provider" classes under
`src/utils/` (and, for `logical_argument_analyzer`, under `src/tools/` itself). This is a
deliberate refactor pattern in this codebase — e.g. `advanced_regression_analysis.ts` is
documented as "Refactored from monolithic 1302-line class to streamlined coordinator pattern."

Providers under `src/utils/` (from `ls src/utils`), grouped by area:

**Regression** (used by `advanced_regression_analysis.ts`):
- `linear_regression_provider.ts` — OLS linear regression; also exports the shared Gaussian
  elimination solver used by the other regression providers.
- `polynomial_regression_provider.ts` — polynomial regression.
- `logistic_regression_provider.ts` — logistic regression.
- `multivariate_regression_provider.ts` — multiple-predictor linear regression.
- `regression_validation_provider.ts` — input validation and data preprocessing (including column
  standardization) shared across regression types.
- `regression_metrics_provider.ts` — model fit metrics calculation and formatting.
- `regression_visualization_provider.ts` — result header generation, interpretation, and
  visualization suggestions appended to regression output.

**Data visualization** (used by `data_visualization_generator.ts`):
- `customization_provider.ts` — chart customization suggestions and alternative chart-type
  recommendations.
- `visualization_validation_provider.ts` — input validation/preprocessing shared across chart
  types.
- `output_formatting_provider.ts` — output formatting (headers, spec section, usage instructions,
  recommendations) for the visualization report.
- `visualization_detail_provider.ts` — chart type descriptions, capabilities, and metadata.
- `visualization_spec_provider.ts` — Vega-Lite specification generation per chart type.

**NLP / entity extraction / coreference** (used by research and NLP utilities, not directly by the
9 registered tools):
- `advanced_ner.ts` — coordinator that orchestrates the NER providers below.
- `natural_ner_provider.ts` — NER via the `natural` library.
- `rule_based_ner_provider.ts` — custom rule-based NER.
- `exa_ner_provider.ts` — NER assisted by Exa research results.
- `entity_extractor.ts` — specialized extraction (dates, money, URLs, emails, etc.).
- `entity_analysis_provider.ts` — entity type inference and noun phrase analysis for coreference.
- `coreference_resolver.ts` — coreference resolution coordinator.
- `mention_extraction_provider.ts` — extracts candidate mentions from text.
- `mention_clustering_provider.ts` — clusters mentions into coreference chains.
- `text_resolution_provider.ts` — generates resolved text with pronouns/nominals replaced.
- `text_preprocessing_provider.ts` / `text_processor.ts` — text preprocessing and normalization
  utilities for relationship/entity extraction.
- `sentence_processing_provider.ts` — sentence extraction and relationship-extraction coordination.
- `semantic_analysis_provider.ts` — apposition/possessive-pattern semantic relationship extraction.
- `verb_pattern_extractor.ts` — verb-based relationship pattern matching.
- `relationship_extractor.ts` — top-level relationship extraction module.
- `nlp_toolkit.ts` — shared NLP toolkit utilities.

**Research integration** (used by `perspective_shifter.ts` and `research_verification.ts` via
`src/utils/exa_research.ts`):
- `research_integration.ts` — coordinator delegating to the providers below.
- `data_enrichment_provider.ts` — analytical data enrichment via targeted research.
- `cross_domain_analogies_provider.ts` — cross-domain analogy research and solution generation.
- `confidence_calculation_provider.ts` — confidence scoring for research integration results.
- `research_insights_provider.ts` — extraction/processing of research insights from search results.
- `research_cache_provider.ts` — caching for research integration operations.
- `advanced_fact_extraction.ts` / `enhanced_fact_extraction.ts` — fact extraction from research
  content (`research_verification.ts` uses `enhancedFactExtractor` from the latter).

**Argument analysis** (used by `logical_argument_analyzer.ts`, under `src/tools/`, not
`src/utils/`): `argument_structure_provider.ts`, `logical_fallacy_provider.ts`,
`argument_validity_provider.ts`, `argument_strength_provider.ts`, `recommendation_provider.ts`.

## Resilience

- **`src/utils/api_helpers.ts`** — `withRetry()`, an exponential-backoff retry helper that
  takes an explicit `shouldRetry(error)` predicate; when the predicate returns `false` the error
  is rethrown immediately without further attempts.
- **`src/utils/rate_limit_manager.ts`** — API key rotation, per-endpoint throttling, and usage
  tracking so external API rate limits (e.g. Exa's 10 requests/minute search limit, configured in
  `exa_research.ts`) are respected.

## Caching

Three cache layers, all under `src/utils/`:

- **`cache_manager.ts`** — the base cache: file-based persistent storage, namespace isolation,
  TTL management, hit/miss/eviction statistics, async disk I/O. Persistence is controlled by
  `CACHE_PERSISTENT`/`CACHE_DIR` env vars (`config.ts`); entries are grouped by namespace (see
  `ResearchCacheNamespace` in `research_cache.ts`).
- **`enhanced_cache.ts`** — a hierarchical cache with semantic keys, priority-based eviction
  (`CachePriority`: LOW/MEDIUM/HIGH/CRITICAL), background refresh, and tag-based organization.
- **`research_cache.ts`** — a research-specific layer built on top of `cache_manager.ts`, with
  per-purpose TTLs read from `config.ts` (`CACHE_TTL_SEARCH`, `CACHE_TTL_FACTS`,
  `CACHE_TTL_VALIDATION`, `CACHE_TTL_CROSS_DOMAIN`).

Cache preloading from disk happens once at startup in `src/index.ts`, gated by
`ENABLE_RESEARCH_CACHE`.

## Statistics: real p-values

`src/utils/statistics.ts` implements the numerical special functions that back every p-value in
`hypothesis_testing.ts`:
- `logGamma()` — natural log of the gamma function via a Lanczos approximation (g=7, n=9
  coefficients), with the reflection formula for arguments < 0.5.
- A regularized incomplete beta function via a continued fraction (modified Lentz's method), built
  on `logGamma`.
- Student-t, F, and chi-square CDFs derived from the incomplete beta/gamma functions, exposed as
  `tTestPValue`, `fTestPValue`, `chiSquarePValue`, plus `studentTCdf`, `fCdf`, `chiSquareCdf`.

These are unit-tested against known critical values (e.g. `tTestPValue(2.086, 20)` ≈ 0.0499, the
classic df=20, alpha=0.05 two-tailed critical t-value) in
`src/tools/__tests__/hypothesis_testing.test.ts`.

## Observability

- **`src/utils/metrics_server.ts`** — `MetricsServer` class serving an HTTP endpoint. Config from
  env: `METRICS_PORT` (default 9090), `METRICS_HOST` (default `127.0.0.1`), `METRICS_ENABLED`,
  `METRICS_RATE_LIMIT` (default 60 req/window), `MAX_METRICS_BYTES` (default 1 MiB). Includes
  per-IP rate limiting.
- **`src/utils/metrics_collector.ts`** — aggregates cache and performance metrics, exposing
  both Prometheus-style and JSON output.
- **`src/utils/performance_monitor.ts`** — execution time and memory tracking utilities.
- **`src/utils/logger.ts`** — centralized `Logger`; all log output goes to stderr so stdout stays
  reserved for MCP JSON-RPC traffic.

## Configuration

Source: `src/utils/config.ts`. Loads `.env` via `dotenv` (`quiet: true` — required because
`dotenv` >= 17 otherwise prints a startup banner to stdout, which corrupts the MCP stdio channel).

Key environment variables actually read (not an exhaustive feature-flag simulation — this is what
`config.ts` reads today):
`NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL`, `EXA_API_KEY`, `ENABLE_RESEARCH_INTEGRATION`,
`ENABLE_ADVANCED_STATISTICS`, `ENABLE_PERSPECTIVE_GENERATION`, `ENABLE_RESEARCH_CACHE`,
`ENABLE_ADVANCED_NLP`, `CACHE_PERSISTENT`, `CACHE_DIR`, `CACHE_DEFAULT_TTL`,
`CACHE_CLEANUP_INTERVAL`, `CACHE_TTL_SEARCH`, `CACHE_TTL_FACTS`, `CACHE_TTL_VALIDATION`,
`CACHE_TTL_CROSS_DOMAIN`, `NLP_USE_EXA`, `NLP_COREFERENCE_ENABLED`, `NLP_RELATIONSHIP_ENABLED`,
`NLP_EXA_NUM_RESULTS`, `NLP_EXA_USE_WEB`, `NLP_EXA_USE_NEWS`, `METRICS_ENABLED`, `METRICS_PORT`,
`METRICS_HOST`.

`isFeatureEnabled('researchIntegration')` reads `ENABLE_RESEARCH_INTEGRATION` directly and
**bypasses** the per-environment `DEFAULT_FEATURE_FLAGS` table entirely — research integration is
off unless that env var is literally `'true'`, in any environment. This is why
`perspective_shifter` and `verify_research` need `ENABLE_RESEARCH_INTEGRATION=true` plus
`EXA_API_KEY` to function (see `docs/API_REFERENCE.md`); both tools are still registered and
listed by the server without them, they just return an error result when invoked.

## Testing

Configured in `jest.config.js` with two Jest `projects`:
- **`unit`** — `src/**/__tests__/**/*.test.ts`.
- **`integration`** — `src/integration/**/*.test.ts`, run with `maxWorkers: 1` (sequential).

`src/integration/` contains:
`data_processing_pipeline.test.ts`, `logical_reasoning_tools.test.ts`,
`market_analysis_workflow.test.ts`, `research_api_integration.test.ts`, plus a shared
`test-helper.ts`.

`src/__tests__/server_protocol.test.ts` is a protocol-level test: it wires a real
`@modelcontextprotocol/sdk` `Client` to the real `McpServer` over `InMemoryTransport` (no mocks,
no subprocess) and verifies `listTools()` returns all 12 registered tool names.

`npm run smoke` (`scripts/smoke.js`) is a separate, heavier check: it spawns the **built**
server (`build/index.js`) as a real child process, speaks MCP JSON-RPC over its stdio pipes, and
verifies it initializes, lists tools, and executes a tool call — with `METRICS_ENABLED=false` in
the spawned process's env so the probe doesn't bind an HTTP port. Exits 0/1 for CI use.

`npm test` runs the offline `unit` project (`node --experimental-vm-modules .../jest.js
--selectProjects unit`, ESM); useful variants include
`test:integration`, `test:integration:no-api` (skips `research_api_integration`),
`test:coverage`, `test:ci` (`--ci --coverage --maxWorkers=2 --silent`), and `test:debug`
(`--inspect-brk --runInBand`).

## CI

`.github/workflows/ci.yml`, job `verify`, matrix `os: [ubuntu-latest, windows-latest]` ×
`node-version: [20.x, 22.x]` (`fail-fast: false`). Steps, in order:
1. `actions/checkout@v7`
2. `actions/setup-node@v4` (with `cache: npm`)
3. `npm ci`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run test:unit` ("Unit tests (offline)")
7. `npm run smoke` ("Protocol smoke test")

Integration tests requiring live API keys (`research_api_integration.test.ts` etc.) are **not**
run in this workflow — only the offline unit project and the stdio smoke test run in CI.

Two other workflow files exist in `.github/workflows/`: `claude-code-review.yml` and `claude.yml`
(Claude Code GitHub Action integration, not covered further here).

## Technology Stack

Versions below are the resolved versions from `package-lock.json` (not just the `package.json`
semver ranges) as of this branch:

- TypeScript 5.9.3, Node.js >= 20 (`engines.node` in `package.json`), ES modules (`"type": "module"`).
- `@modelcontextprotocol/sdk` 1.29.0.
- `zod` 3.25.76 (schema validation and type inference).
- `mathjs` 14.3.0 (mathematical computation — mean/median/std/correlation/etc.; `statistics.ts`'s
  distribution functions are hand-implemented, not from `mathjs`).
- `natural` 6.12.0 (NLP tokenization/stemming), `wink-lemmatizer` 3.0.4,
  `pos` 0.4.2, `sentiment` 5.0.2, `nspell` 2.1.5 + `dictionary-en` 4.0.0
  (spell checking).
- `node-fetch` 3.3.2 (HTTP), `uuid` 14.0.0.
- Dev/test: `jest` 29.7.0, `ts-jest` 29.4.11, `nock` 13.5.1 (HTTP mocking), ESLint 8 +
  `@typescript-eslint` 8, Prettier 3.

Note: `compromise` and `spellchecker`, mentioned in older versions of this document, are not
dependencies of this project — `package.json` has no such entries. NLP/spell-checking here is
built on `wink-lemmatizer`/`pos`/`natural`/`sentiment`/`nspell`.

## Deployment

- **Direct**: `node build/index.js` (after `npm run build`). Requires Node.js >= 20; `EXA_API_KEY`
  and `ENABLE_RESEARCH_INTEGRATION=true` only if the research tools are needed.
- **`npx @modelcontextprotocol/inspector build/index.js`** (`npm run inspector`) for interactive
  protocol debugging.
- **Claude Desktop**: via `claude_desktop_config.json`, invoking the built server as a stdio MCP
  server (`bin.analytical-mcp-server` points at `build/index.js`).

## Security Considerations

- All processing is local; no external data storage beyond the optional disk cache under
  `CACHE_DIR`.
- API keys (`EXA_API_KEY`) are read from environment variables only — never hardcoded.
- Zod validates every tool's input at the MCP boundary before the handler runs.
- Logging is stderr-only; MCP stdout is reserved for protocol traffic so log output cannot corrupt
  a client's JSON-RPC stream.
