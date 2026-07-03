# Analytical MCP Server

Model Context Protocol server providing statistical analysis, decision support, logical reasoning, and research verification tools for Claude.

## Setup

### Prerequisites
- Node.js >= 20.0.0
- EXA_API_KEY environment variable (required for `verify_research` and `perspective_shifter`, both of which call the Exa search API on every invocation)

### Installation

#### Option 1: Direct Installation
```bash
npm install
npm run build
```

#### Option 2: Docker
```bash
# Build the Docker image
docker build -t analytical-mcp .

# Run with environment variables
docker run -d \
  --name analytical-mcp \
  -e EXA_API_KEY=your_api_key_here \
  -v $(pwd)/cache:/app/cache \
  analytical-mcp

# Or use docker-compose
cp .env.example .env
# Edit .env with your API key
docker-compose up -d
```

### Configuration

#### Direct Installation Configuration
1. Copy `.env.example` to `.env`
2. Add your EXA_API_KEY to `.env`
3. Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "analytical": {
      "command": "node",
      "args": ["/path/to/analytical-mcp/build/index.js"],
      "env": {
        "EXA_API_KEY": "your-exa-api-key-here"
      }
    }
  }
}
```

#### Docker Configuration
1. Copy `.env.example` to `.env`
2. Add your EXA_API_KEY to `.env`
3. Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "analytical": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--env-file", ".env",
        "-v", "$(pwd)/cache:/app/cache",
        "analytical-mcp"
      ]
    }
  }
}
```

## Available Tools

The server registers 9 tools on startup, unconditionally (registration does not depend on `EXA_API_KEY`; the two research-backed tools below will error at call time if the key is missing). See `src/tools/index.ts` for the authoritative list.

### Statistical Analysis
- **`analyze_dataset`** — Descriptive statistics for a numeric or record-array dataset (summary/stats).
- **`advanced_regression_analysis`** — Linear, polynomial, logistic, and multivariate regression, backed by dedicated provider modules with real OLS/logistic math (not mocked).
- **`hypothesis_testing`** — Real statistical hypothesis tests: Welch's independent t-test, paired t-test, correlation, chi-square, and ANOVA, using exact p-value computation (see `src/utils/statistics.ts`).
- **`data_visualization_generator`** — Generate chart specifications (scatter, line, bar, histogram, box, heatmap, pie, violin, correlation).

### Decision Analysis
- **`decision_analysis`** — Multi-criteria weighted decision ranking. **Requires a `scores` matrix** (`options.length` rows × `criteria.length` columns, each value 0-10) in addition to `options` and `criteria`; `weights` is optional and defaults to equal weighting. This is a breaking requirement versus older docs that only described `options`/`criteria`/`weights`.

### Logical Reasoning
- **`logical_argument_analyzer`** — Analyze argument structure, fallacies, validity, and strength (via dedicated provider classes).
- **`logical_fallacy_detector`** — Detect and explain logical fallacies in text with confidence scoring.
- **`perspective_shifter`** — Generate alternative perspectives (stakeholder, discipline, contrarian, optimistic, pessimistic) on a problem. Requires `EXA_API_KEY`: it runs an Exa search per perspective domain to ground each perspective.

### Research Verification
- **`verify_research`** — Cross-verify research claims from multiple sources. Requires `EXA_API_KEY`. Returns `confidence.score` (the actual computed consistency/confidence value, 0-1) and `confidence.verified` (boolean: whether `confidence.score` met `minConsistencyThreshold`) — the threshold is a pass/fail cutoff, never a floor applied to the reported score.

## Observability & Metrics

The Analytical MCP Server includes a built-in Prometheus-style metrics HTTP server (`src/utils/metrics_server.ts`) for monitoring circuit breakers and cache performance.

### Metrics Endpoint

When enabled, the server exposes metrics via HTTP on port 9090 (configurable):

- **`http://localhost:9090/metrics`** - Prometheus-style metrics
- **`http://localhost:9090/metrics?format=json`** - JSON format metrics
- **`http://localhost:9090/health`** - Health check endpoint
- **`http://localhost:9090/`** - Metrics server status page

### Available Metrics

#### Circuit Breaker Metrics
- `analytical_mcp_circuit_breaker_state` - Current state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
- `analytical_mcp_circuit_breaker_total_calls_total` - Total calls through circuit breaker
- `analytical_mcp_circuit_breaker_rejected_calls_total` - Rejected calls by circuit breaker
- `analytical_mcp_circuit_breaker_failure_count` - Current failure count
- `analytical_mcp_circuit_breaker_success_count` - Current success count

#### Cache Metrics
- `analytical_mcp_cache_hits_total` - Cache hits by namespace
- `analytical_mcp_cache_misses_total` - Cache misses by namespace
- `analytical_mcp_cache_puts_total` - Cache puts by namespace
- `analytical_mcp_cache_evictions_total` - Cache evictions by namespace
- `analytical_mcp_cache_size` - Current cache size by namespace

#### System Metrics
- `analytical_mcp_uptime_seconds` - Server uptime in seconds
- `analytical_mcp_memory_usage_bytes` - Memory usage (RSS, heap, external)
- `analytical_mcp_cpu_usage_microseconds` - CPU time usage (user, system)

### Configuration

Enable metrics by setting environment variables:

```bash
METRICS_ENABLED=true        # Enable metrics server (default: true)
METRICS_PORT=9090          # Metrics server port (default: 9090)
METRICS_HOST=127.0.0.1     # Metrics server host (default: 127.0.0.1, use 0.0.0.0 to bind to all interfaces)
```

### Usage Examples

```bash
# Get Prometheus metrics
curl http://localhost:9090/metrics

# Get JSON metrics
curl http://localhost:9090/metrics?format=json

# Health check
curl http://localhost:9090/health
```

## Usage Examples

### Dataset Analysis
```javascript
{
  "data": [23, 45, 67, 12, 89, 34, 56, 78],
  "analysisType": "stats"
}
```

### Decision Analysis
```javascript
{
  "options": ["Option A", "Option B", "Option C"],
  "criteria": ["Cost", "Quality", "Speed"],
  "scores": [
    [7, 6, 8],
    [5, 9, 6],
    [9, 4, 7]
  ],
  "weights": [0.4, 0.4, 0.2]
}
```

### Hypothesis Testing
```javascript
{
  "testType": "t_test_independent",
  "data": [[23, 45, 67, 12, 89], [34, 56, 78, 90, 21]],
  "alpha": 0.05
}
```

### Logical Analysis
```javascript
{
  "argument": "All birds can fly. Penguins are birds. Therefore, penguins can fly.",
  "analysisType": "comprehensive"
}
```

## Development

### Testing
```bash
# Run all tests (unit + integration)
npm test

# Unit tests only (offline, no API key needed)
npm run test:unit

# Integration tests (need EXA_API_KEY)
npm run test:integration

# Integration tests excluding the live-API suite
npm run test:integration:no-api

# Or via the thin wrapper script
./tools/test-runner.sh unit
./tools/test-runner.sh integration
./tools/test-runner.sh integration:no-api
```

### Scripts
- `npm run build` - Build TypeScript to JavaScript
- `npm run watch` - Watch for changes and rebuild
- `npm run typecheck` - Type-check `src/` (excludes test files)
- `npm run typecheck:src` - Type-check `src/` plus integration tests
- `npm run lint` / `npm run lint:fix` - ESLint
- `npm run format` / `npm run format:check` - Prettier
- `npm test` / `npm run test:unit` / `npm run test:integration` - Jest (see [Testing](#testing))
- `npm run smoke` - Builds, starts the real server, and drives initialize/tools-list/tools-call over stdio JSON-RPC
- `npm run cache:stats` / `cache:clear` / `cache:preload` - Manage the on-disk research cache
- `npm run inspector` - Start MCP inspector for debugging

### Project Structure
```
analytical-mcp/
├── src/
│   ├── tools/           # MCP tool implementations (9 registered tools + supporting providers)
│   ├── utils/           # Utility functions, regression/NLP providers, caching, resilience, metrics
│   ├── integration/     # Integration tests (require EXA_API_KEY unless noted)
│   ├── __tests__/       # Server-level protocol test (InMemoryTransport)
│   └── index.ts         # Main server entry point
├── docs/                # Documentation
├── tools/               # Development and testing scripts
├── scripts/             # Build/smoke-test scripts
└── examples/            # Usage examples
```

## Architecture Notes

- **Provider architecture**: Complex tools (regression, NLP, visualization, argument analysis) are decomposed into single-responsibility provider modules in `src/utils/` and `src/tools/` (e.g. `linear_regression_provider.ts`, `logistic_regression_provider.ts`, `polynomial_regression_provider.ts`, `multivariate_regression_provider.ts`, `regression_metrics_provider.ts`). Tool files orchestrate and format; providers hold the logic.
- **Resilience**: `src/utils/api_resilience.ts` implements circuit breakers for external API calls; `src/utils/rate_limit_manager.ts` handles Exa rate limiting.
- **Caching**: `src/utils/cache_manager.ts`, `src/utils/enhanced_cache.ts`, and `src/utils/research_cache.ts` provide layered, namespace-aware caching (enable with `ENABLE_RESEARCH_CACHE=true`).
- **Statistics**: `src/utils/statistics.ts` implements log-gamma, incomplete beta/gamma, and t/F/chi-square CDFs from first principles for exact p-value computation — no statistical approximations or mocked results.

## Tool Categories

### Statistical Analysis
- Descriptive statistics: mean, median, standard deviation, quartiles
- Regression analysis: linear, polynomial, logistic, multivariate
- Hypothesis testing: Welch t-test, paired t-test, correlation, chi-square, ANOVA

### Decision Support
- Multi-criteria weighted decision ranking from an explicit options × criteria score matrix

### Logical Reasoning
- Argument structure, validity, and strength analysis
- Fallacy detection with confidence scoring
- Perspective generation

### Research Integration
- Multi-source verification via Exa
- Fact extraction
- Conflict/consistency checking
- Confidence scoring

## Security and Privacy

- All analytical processing occurs locally
- Research features use the Exa API (optional, requires `EXA_API_KEY`)
- No permanent data storage beyond the optional local disk cache
- API keys managed via environment variables

## License

MIT License. See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes and commit: `git commit -m 'Add feature description'`
4. Push to branch: `git push origin feature/your-feature`
5. Open pull request

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed development guidelines, code standards, and testing requirements.

## Troubleshooting

### Common Issues

**JSON parsing errors**: All logging must go to stderr, not stdout. MCP protocol uses stdout for communication. Use the `Logger` class, not `console.log`.

**Tools not appearing**: Verify server configuration in Claude Desktop settings and restart Claude Desktop application.

**Research features fail at call time**: Set `EXA_API_KEY` in your environment or `.env` file — `verify_research` and `perspective_shifter` both require it even though all 9 tools register regardless of whether it is set.

**Server not starting**: Check Node.js version is 20 or higher and all dependencies are installed with `npm install`.

See [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for detailed troubleshooting guidance.

### Debug Mode
Start the server with the MCP inspector:
```bash
npm run inspector
```

## Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Exa API Documentation](https://docs.exa.ai/)
- [Claude Desktop](https://claude.ai/desktop)
