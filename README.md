# Analytical MCP Server

A Model Context Protocol (MCP) server that provides statistical analysis, decision-making, and logical reasoning tools.

## Setup

### Prerequisites
- Node.js >= 20.0.0
- EXA_API_KEY environment variable (for research features)

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

### Statistical Analysis
- **`analytical:analyze_dataset`** - Statistical analysis of datasets
- **`analytical:advanced_regression_analysis`** - Linear, polynomial, and logistic regression
- **`analytical:hypothesis_testing`** - Statistical hypothesis testing (t-tests, chi-square, ANOVA)
- **`analytical:data_visualization_generator`** - Generate data visualization specifications

### Decision Analysis
- **`analytical:decision_analysis`** - Multi-criteria decision analysis with weighted scoring

### Logical Reasoning
- **`analytical:logical_argument_analyzer`** - Analyze argument structure and validity
- **`analytical:logical_fallacy_detector`** - Detect logical fallacies in text
- **`analytical:perspective_shifter`** - Generate alternative perspectives on problems

### Research Verification
- **`analytical:verify_research`** - Cross-verify research claims from multiple sources

## Observability & Metrics

The Analytical MCP Server includes built-in observability features for monitoring circuit breakers and cache performance.

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
METRICS_HOST=0.0.0.0       # Metrics server host (default: 0.0.0.0)
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
  "weights": [0.4, 0.4, 0.2]
}
```

### Logical Analysis
```javascript
{
  "argument": "All birds can fly. Penguins are birds. Therefore, penguins can fly.",
  "analysisDepth": "comprehensive"
}
```

## Development

### Testing
```bash
# Run all tests
./tools/test-runner.sh

# Run specific test suite
./tools/test-runner.sh integration

# Available test suites: api-keys, server, integration, research, data-pipeline
```

### Scripts
- `npm run build` - Build TypeScript to JavaScript
- `npm run watch` - Watch for changes and rebuild
- `npm run test` - Run Jest tests
- `npm run inspector` - Start MCP inspector for debugging

### Project Structure
```
analytical-mcp/
├── src/
│   ├── tools/           # MCP tool implementations
│   ├── utils/           # Utility functions
│   └── index.ts         # Main server entry point
├── docs/                # Documentation
├── tools/               # Development and testing scripts
└── examples/            # Usage examples
```

## Tool Categories

### Statistical Analysis
- Descriptive statistics (mean, median, standard deviation, quartiles)
- Correlation analysis
- Regression analysis (linear, polynomial, logistic)
- Hypothesis testing (t-tests, chi-square, ANOVA)

### Decision Support
- Multi-criteria decision analysis
- Weighted scoring systems
- Trade-off analysis
- Risk assessment

### Logical Reasoning
- Argument structure analysis
- Fallacy detection
- Perspective generation
- Critical thinking support

### Research Integration
- Multi-source verification
- Fact extraction
- Consistency checking
- Research validation

## Security & Privacy

- Processing is done locally
- Research features use Exa API (optional)
- No data is stored permanently
- Configurable caching with local-only storage

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/feature-name`)
3. Commit your changes (`git commit -m 'Add feature description'`)
4. Push to the branch (`git push origin feature/feature-name`)
5. Open a Pull Request

For detailed contribution guidelines, see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Troubleshooting

### Common Issues

**JSON parsing errors**: Ensure all logging goes to stderr, not stdout. The MCP protocol uses stdout for communication.

**Tools not appearing**: Verify the server is properly configured in Claude Desktop and restart the application.

**Research features disabled**: Check that EXA_API_KEY is set in your environment configuration.

**Console output issues**: The project uses a Logger class for all output. Utility scripts in the tools/ directory integrate with the Logger system for consistent formatting.

### Debug Mode
Start the server with the MCP inspector:
```bash
npm run inspector
```

## Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Exa API Documentation](https://docs.exa.ai/)
- [Claude Desktop](https://claude.ai/desktop)
