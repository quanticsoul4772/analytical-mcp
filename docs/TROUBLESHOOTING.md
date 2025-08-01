# Troubleshooting Guide

## Error Code Troubleshooting

### Quick Error Code Reference

| Error Code | Category | Description | Quick Fix |
|------------|----------|-------------|-----------|
| ERR_1001 | Validation | Invalid input format | Check data types and format |
| ERR_1002 | Validation | Missing required parameter | Verify all required fields |
| ERR_1003 | Validation | Invalid data format | Ensure correct data structure |
| ERR_1004 | Validation | Invalid parameter type | Check parameter types |
| ERR_1005 | Validation | Parameter out of range | Verify value constraints |
| ERR_2001 | API | Rate limit exceeded | Wait and retry, or check limits |
| ERR_2002 | API | Authentication failed | Verify API keys |
| ERR_2003 | API | Request timeout | Check network, retry |
| ERR_2004 | API | Service unavailable | Check service status, use fallback |
| ERR_2005 | API | Invalid response | Check API endpoint |
| ERR_3001 | Processing | Calculation failed | Check data quality, try different method |
| ERR_3002 | Processing | Memory limit exceeded | Reduce data size |
| ERR_3003 | Processing | Operation timeout | Increase timeout or reduce complexity |
| ERR_3004 | Processing | Insufficient data | Provide more data points |
| ERR_3005 | Processing | Algorithm convergence failed | Adjust parameters |
| ERR_4001 | Configuration | Missing configuration | Check environment variables |
| ERR_4002 | Configuration | Invalid configuration | Validate config format |
| ERR_4003 | Configuration | Config load failed | Check file permissions |
| ERR_5001 | Tool | Tool not found | Verify tool registration |
| ERR_5002 | Tool | Tool execution failed | Check tool dependencies |
| ERR_5003 | Tool | Tool dependency missing | Install missing dependencies |

### Error-Specific Troubleshooting

#### Validation Errors (ERR_1xxx)

**ERR_1001 - Invalid Input**
```javascript
// Common causes and solutions
const invalidInputs = [
  null,           // Solution: Provide valid data
  undefined,      // Solution: Provide valid data
  "string",       // Solution: Use correct data type
  {},             // Solution: Use array for datasets
  []              // Solution: Provide non-empty data
];

// Debugging
console.log("Data type:", typeof yourData);
console.log("Is array:", Array.isArray(yourData));
console.log("Length:", yourData?.length);
```

**ERR_1002 - Missing Required Parameter**
```javascript
// Check required parameters for each tool
const requiredParams = {
  analyze_dataset: ['data'],
  decision_analysis: ['options', 'criteria'],
  hypothesis_testing: ['testType', 'data'],
  verify_research: ['query']
};
```

#### API Errors (ERR_2xxx)

**ERR_2001 - Rate Limit Exceeded**
```bash
# Check API usage and limits
curl -H "x-api-key: $EXA_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.exa.ai/usage

# Implement exponential backoff
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'ERR_2001' && i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      throw error;
    }
  }
}
```

**ERR_2002 - Authentication Failed**
```bash
# Verify API key configuration
echo "EXA_API_KEY: ${EXA_API_KEY:0:10}..." # Shows first 10 chars
node -e "console.log('API Key configured:', !!process.env.EXA_API_KEY)"

# Test API key validity
npm run test:api-keys
```

#### Processing Errors (ERR_3xxx)

**ERR_3004 - Insufficient Data**
```javascript
// Minimum data requirements by tool
const minimumData = {
  analyze_dataset: 3,      // Minimum 3 data points
  regression_analysis: 5,   // Minimum 5 points for regression
  hypothesis_testing: 10,   // Minimum 10 points for statistical tests
  correlation_analysis: 15  // Minimum 15 points for correlation
};

// Check your data size
if (data.length < minimumData.analyze_dataset) {
  console.error(`Need at least ${minimumData.analyze_dataset} data points, got ${data.length}`);
}
```

**ERR_3002 - Memory Limit**
```bash
# Increase Node.js memory limit
node --max-old-space-size=8192 build/index.js

# Or set in environment
export NODE_OPTIONS="--max-old-space-size=8192"

# Monitor memory usage
npm run test:leak-detection
```

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
3. Verify Logger class is used for all output (no console statements)
4. Restart Claude Desktop

#### JSON Parsing Errors
**Symptoms:** "Expected ',' or ']' after array element" errors
**Cause:** Server writes non-JSON content to stdout

**Solution:**
The project uses a centralized Logger class for all output. No direct console statements should be used.

```typescript
// ❌ Wrong - corrupts MCP communication
console.log('Debug message');

// ✅ Correct - uses Logger system
import { Logger } from './utils/logger.js';
const logger = Logger.getInstance();
logger.info('Debug message');
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
The project uses a centralized Logger class. Adjust logging levels in `.env`:

```bash
LOG_LEVEL=DEBUG
NODE_ENV=development
```

### Logger Usage
All code uses the Logger class instead of console statements:

```typescript
import { Logger } from './utils/logger.js';
const logger = Logger.getInstance();

logger.info('Information message');
logger.warn('Warning message'); 
logger.error('Error message');
```

### Utility Scripts
Utility scripts integrate with Logger:
- tools/cache-manager.js: Cache management with Logger
- tools/check-api-keys.js: API validation with Logger
- All output uses Logger formatting

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
