# Troubleshooting Guide

## Common Issues

### Server Connection Issues

#### "Server Disabled" in Claude Desktop
**Symptoms:** Server shows as disabled or not connecting
**Causes:**
- JSON parsing errors in server communication
- Logging to stdout instead of stderr
- Server process crashes on startup

**Solutions:**
1. Check server logs: `npm run inspector`
2. Verify environment variables are set
3. Ensure no console.log statements write to stdout
4. Restart Claude Desktop

#### JSON Parsing Errors
**Symptoms:** "Expected ',' or ']' after array element" errors
**Cause:** Server writes non-JSON content to stdout

**Solution:**
Ensure all logging uses `console.error()` instead of `console.log()`. MCP protocol requires clean stdout.

```typescript
// ❌ Wrong - corrupts MCP communication
console.log('Debug message');

// ✅ Correct - uses stderr 
console.error('Debug message');
```

### Tool Execution Issues

#### "Tool not found" Errors
**Symptoms:** Claude reports analytical tools are not available
**Causes:**
- Server not registered
- Tool registration failed
- Namespace prefix missing

**Solutions:**
1. Verify server is in Claude Desktop config
2. Use namespace: `analytical:tool_name`
3. Check server startup logs for registration errors

#### Research Features Disabled
**Symptoms:** "Research integration is disabled" errors
**Causes:**
- Missing EXA_API_KEY environment variable
- Research features disabled in configuration

**Solutions:**
1. Add EXA_API_KEY to .env file
2. Verify API key is valid
3. Check configuration settings

### Development Issues

#### TypeScript Compilation Errors
**Common Issues:**
- Missing type definitions
- Import path problems
- Interface mismatches

**Solutions:**
```bash
# Clear TypeScript cache
rm -rf build/
npm run build

# Check for missing dependencies
npm install

# Verify TypeScript version
npx tsc --version
```

#### Test Failures
**Common Issues:**
- API keys not configured for tests
- Mock data setup problems
- Network connectivity issues

**Solutions:**
```bash
# Run tests with environment
npm run test:api-keys

# Use test runner
./tools/test-runner.sh integration

# Check test configuration
cat jest.config.js
```

### Performance Issues

#### Slow Response Times
**Symptoms:** Tools take longer than expected to respond
**Causes:**
- Large dataset processing
- External API calls
- Cache misses

**Solutions:**
1. Enable caching: `ENABLE_RESEARCH_CACHE=true`
2. Reduce dataset size for testing
3. Use appropriate analysis types
4. Monitor server logs for bottlenecks

#### Memory Issues
**Symptoms:** Server crashes with out-of-memory errors
**Causes:**
- Large datasets
- Memory leaks
- Insufficient Node.js heap size

**Solutions:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 build/index.js

# Monitor memory usage
npm run test:optimized

# Use data sampling for large datasets
```

## Debugging Techniques

### MCP Inspector
Use the MCP inspector to debug server communication:

```bash
npm run inspector
```

This starts a web interface at `localhost:6277` for testing tools.

### Logging Configuration
Adjust logging levels in `.env`:

```bash
LOG_LEVEL=DEBUG
NODE_ENV=development
```

### Tool Testing
Test individual tools:

```bash
# Test dataset analysis
echo '{"data": [1,2,3], "analysisType": "summary"}' | \
  node -e "
    const { analyzeDataset } = require('./build/tools/analyze_dataset.js');
    analyzeDataset([1,2,3], 'summary').then(console.log);
  "
```

### Network Debugging
For research tools, verify network connectivity:

```bash
# Test Exa API connection
curl -H "x-api-key: YOUR_EXA_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "numResults": 1}' \
     https://api.exa.ai/search
```

## Configuration Issues

### Environment Variables
Required environment variables:

```bash
# Required for research features
EXA_API_KEY=your_exa_api_key_here

# Optional configuration
LOG_LEVEL=INFO
NODE_ENV=production
ENABLE_RESEARCH_CACHE=true
```

### Claude Desktop Configuration
Verify Claude Desktop configuration:

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
1. Server startup logs
2. Error messages from Claude Desktop
3. MCP inspector results
4. Tool execution logs

### Diagnostic Commands
```bash
# Check server health
npm run build && npm run inspector

# Verify environment
node -e "console.log(process.env.EXA_API_KEY ? 'API key set' : 'API key missing')"

# Test tool registration
npm run test:server

# Check dependencies
npm audit
```

### Common Log Messages

#### Normal Startup
```
[INFO] Logger initialized in production environment
[INFO] Registering 9 tools
[INFO] All tools registered successfully
[INFO] Analytical MCP Server running on stdio
```

#### Problem Indicators
```
[ERROR] Failed to register tool: [tool_name]
[WARN] Research integration is disabled
[ERROR] JSON parsing error at position...
```

## Recovery Procedures

### Reset
If server is in a broken state:

```bash
# Clean rebuild
rm -rf build/ node_modules/
npm install
npm run build

# Reset configuration
cp .env.example .env
# Edit .env with your settings

# Test functionality
npm run inspector
```

### Partial Recovery
For specific issues:

```bash
# Fix tool registration issues
npm run build
./tools/test-runner.sh server

# Fix research features
# Verify EXA_API_KEY in .env
./tools/test-runner.sh research
```
