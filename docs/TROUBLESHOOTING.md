# Troubleshooting Guide

## Known Issues That Were Fixed Recently

These were real bugs fixed in PRs #128/#129. If you hit symptoms matching one of
these, you're not looking at a new bug — check that your local `build/` and
`node_modules` are up to date.

### dotenv >= 17 corrupts the MCP stdio channel

**Symptom:** The server appears to crash or the client reports JSON parsing errors
immediately on startup ("Unexpected token", "Expected ',' or ']'", etc.), even though
the server process is alive.

**Cause:** `dotenv` v17+ prints an informational banner to **stdout** by default when
`dotenv.config()` is called. Since MCP communicates over stdio with newline-delimited
JSON-RPC, any non-JSON line on stdout desyncs the client.

**Fix (already applied):** `src/utils/config.ts` calls `dotenv.config({ quiet: true })`.
Do not remove the `quiet: true` option, and do not add any other library or code path
that writes to `process.stdout` / uses `console.log` in the server process.

**Regression check:** `npm run smoke` (`scripts/smoke.js`) exists specifically to catch
this class of bug — it spawns the real built server and fails loudly if any stdout line
isn't valid JSON. Run it after touching `config.ts`, `index.ts`, or any startup path.

### Native `spellchecker` package doesn't build on Node >= 22

**Symptom:** `npm install` fails while compiling a native addon, or spell-checking
silently does nothing.

**Cause:** The project previously depended on the native `spellchecker` package, which
does not compile against Node >= 22.

**Fix (already applied):** Replaced with pure-JS `nspell` + `dictionary-en`
(see `src/utils/nlp_toolkit.ts`, `getSpell()`). Do not reintroduce `spellchecker` as a
dependency or suggest reinstalling it — use `nspell`/`dictionary-en` for any
spell-checking work.

### `jest.mock()` silently does nothing

**Symptom:** A test's `jest.mock('../../some-module.js', ...)` call has no effect —
the real implementation runs instead of the mock, with no error.

**Cause:** This is not a bug in the test. This codebase runs Jest under native ESM, and
`jest.mock()` (the CommonJS API) is a no-op under ESM. See
[TESTING.md](./TESTING.md#mocking-modules-under-esm-jestmock-does-not-work-here) for
the working pattern (`import.meta.jest.unstable_mockModule(...)` before a dynamic
`import()`).

## Common Issues

### Server Connection Issues

#### "Server Disabled" in Claude Desktop
**Symptoms:** Server shows as disabled or not connecting
**Causes:**
- JSON parsing errors in server communication (see dotenv issue above)
- Something in the process writing to stdout instead of stderr
- Server process crashes on startup (check for a thrown error before
  `registerTools()` completes)

**Solutions:**
1. Run `npm run smoke` locally first — it reproduces the same startup path Claude
   Desktop uses and will surface protocol corruption or startup crashes directly.
2. Use `npm run inspector` to interactively exercise the server.
3. Verify environment variables are set in the Claude Desktop config's `env` block.
4. Restart Claude Desktop after config changes.

#### JSON Parsing Errors
**Symptoms:** "Expected ',' or ']' after array element" or similar errors
**Cause:** Something wrote non-JSON content to stdout while the server was running.

**Solution:**
The project uses a centralized `Logger` class for all output; `Logger` always writes
via `console.error`, i.e. to stderr, never stdout. Never use `console.log` (or any
other stdout write) in server code — `eslint`'s `no-console` rule flags this.

```typescript
// Wrong - could corrupt MCP communication if it ever targets stdout
console.log('Debug message');

// Correct - Logger writes to stderr
import { Logger } from './utils/logger.js';
Logger.info('Debug message');
```

### Tool Execution Issues

#### "Tool not found" Errors
**Symptoms:** Claude reports analytical tools are not available
**Causes:**
- Server not registered in the client config
- Tool registration failed during startup (`registerTools` in `src/tools/index.ts`
  throws or one of the 9 tool registrations fails)

**Solutions:**
1. Verify the server is present and enabled in the Claude Desktop config.
2. Check server startup logs (stderr) for `Registering 12 tools` followed by `All
   tools registered successfully`; if a tool is missing from that list, its
   registration threw.
3. Run `npm run smoke` — it fails if `tools/list` returns fewer than 12 tools.

### Development Issues

#### TypeScript Compilation Errors
**Common Issues:**
- Missing type definitions
- Import path problems (remember: relative imports must use the `.js` extension
  even though the source is `.ts` — this is an ESM requirement, not a typo)
- Interface mismatches

**Solutions:**
```bash
# Clear TypeScript build output
rm -rf build/
npm run build

# Check for missing dependencies
npm install

# Typecheck without emitting
npm run typecheck
```

#### Test Failures
**Common Issues:**
- Bare `npm test` refuses to start without `EXA_API_KEY` (the `pretest` hook runs
  `tools/check-api-keys.js`, which exits 1 if the key is missing) — use `npm run
  test:unit` instead if you just want the offline suite.
- A `jest.mock()` call that appears to do nothing — see the ESM mocking note above.
- Fake-timer misuse or stale expected values in a specific suite — check that suite's
  git history before assuming environment issues.

**Solutions:**
```bash
# Run the offline unit suite (no API key needed)
npm run test:unit

# Verify API key is set (only needed for `npm test` / `npm run test:integration`)
npm run check-api-keys

# Use the shell wrapper
./tools/test-runner.sh unit
./tools/test-runner.sh integration

# Inspect jest config directly
cat jest.config.js
```

See [TESTING.md](./TESTING.md) for the full breakdown of what does and doesn't need
`EXA_API_KEY`.

### Performance Issues

#### Slow Response Times
**Symptoms:** Tools take longer than expected to respond
**Causes:**
- Large dataset processing
- External Exa API calls (research features)
- Cache misses

**Solutions:**
1. Enable caching: `ENABLE_RESEARCH_CACHE=true` in `.env`
2. Reduce dataset size for testing
3. Use appropriate analysis types
4. Monitor server logs (stderr) for bottlenecks

#### Memory Issues
**Symptoms:** Server crashes with out-of-memory errors, or the jest suite runs out of
memory under leak diagnostics
**Causes:**
- Large datasets
- Long-lived interval timers (cache cleanup, rate limiter) accumulating state
- Insufficient Node.js heap size

**Solutions:**
```bash
# Increase Node.js memory limit for the server
node --max-old-space-size=4096 build/index.js

# Run tests with a larger heap and --expose-gc
npm run test:optimized

# Chase suspected leaks explicitly (off by default — see TESTING.md)
npm run test:leak-detection
```

## Debugging Techniques

### MCP Inspector
Use the MCP inspector to debug server communication interactively:

```bash
npm run inspector
```

This runs `npx @modelcontextprotocol/inspector build/index.js` and opens a local web UI
for calling tools directly; the exact URL/port is printed to the console when it
starts.

### Logging Configuration
The project uses a centralized `Logger` class. Adjust logging levels in `.env`:

```bash
LOG_LEVEL=DEBUG
NODE_ENV=development
```

### Logger Usage
All code uses the `Logger` class's static methods instead of `console` statements:

```typescript
import { Logger } from './utils/logger.js';

Logger.debug('Debug message');
Logger.info('Information message');
Logger.warn('Warning message');
Logger.error('Error message');
```

### Utility Scripts
Utility scripts also integrate with `Logger`:
- `tools/cache-manager.js` — cache management (`npm run cache:stats|cache:clear|cache:preload`)
- `tools/check-api-keys.js` — API key validation (`npm run check-api-keys`)
- `tools/test_metrics.js` — starts the server with `METRICS_ENABLED=true` and probes
  the metrics HTTP endpoint

### Network Debugging
For research tools, verify network connectivity to Exa directly:

```bash
curl -H "x-api-key: YOUR_EXA_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "numResults": 1}' \
     https://api.exa.ai/search
```

## Configuration Issues

### Environment Variables
See `.env.example` for the full list with defaults. The most relevant:

```bash
# Core
NODE_ENV=development
PORT=3000
HOST=localhost
LOG_LEVEL=DEBUG            # DEBUG, INFO, WARN, ERROR

# Research (Exa)
EXA_API_KEY=your_exa_api_key_here
ENABLE_RESEARCH_INTEGRATION=true
ENABLE_RESEARCH_CACHE=true
ENABLE_ADVANCED_NLP=true
ENABLE_ADVANCED_STATISTICS=true
ENABLE_PERSPECTIVE_GENERATION=true

# Cache
CACHE_PERSISTENT=true
CACHE_DIR=./cache
CACHE_DEFAULT_TTL=86400000

# Metrics HTTP server (src/utils/config.ts)
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_HOST=127.0.0.1
```

`EXA_API_KEY` missing only disables research/NLP features at runtime and blocks the
Exa-dependent tests (see [TESTING.md](./TESTING.md)) — it does not stop the server
from starting or the rest of the tools from working.

### Claude Desktop Configuration
Example `mcpServers` entry:

```json
{
  "mcpServers": {
    "analytical": {
      "command": "node",
      "args": ["--max-old-space-size=4096", "/path/to/analytical-mcp/build/index.js"],
      "env": {
        "EXA_API_KEY": "your-exa-api-key"
      }
    }
  }
}
```

## Getting Help

### Log Analysis
When reporting issues, include:
1. Server startup logs (stderr)
2. Error messages from Claude Desktop
3. `npm run inspector` results
4. `npm run smoke` output

### Diagnostic Commands
```bash
# Full protocol smoke test (build + real subprocess + real JSON-RPC)
npm run smoke

# Verify environment
node -e "console.log(process.env.EXA_API_KEY ? 'API key set' : 'API key missing')"

# Offline unit tests
npm run test:unit

# Check dependencies
npm audit
```

### Common Log Messages

#### Normal Startup
```
[INFO] Logger initialized in production environment
[INFO] Registering 12 tools
[INFO] All tools registered successfully
[INFO] Analytical MCP Server running on stdio
```

#### Problem Indicators
```
[ERROR] Failed to register tool: [tool_name]
[WARN] Research integration is disabled
[ERROR] Port validation failed
```

## Recovery Procedures

### Reset
If the server is in a broken state:

```bash
# Clean rebuild
rm -rf build/ node_modules/
npm install
npm run build

# Reset configuration
cp .env.example .env
# Edit .env with your settings

# Verify with the smoke test
npm run smoke
```

### Partial Recovery
For specific issues:

```bash
# Fix tool registration issues
npm run build
npm run smoke

# Fix research features
# Verify EXA_API_KEY in .env, then:
./tools/test-runner.sh integration
```
