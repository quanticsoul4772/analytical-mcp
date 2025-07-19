# Analytical MCP Server

A Model Context Protocol (MCP) server that provides statistical analysis, decision-making, and logical reasoning tools.

## Setup

### Prerequisites
- Node.js >= 20.0.0
- EXA_API_KEY environment variable (for research features)

### Installation
```bash
npm install
npm run build
```

### Configuration
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

### Debug Mode
Start the server with the MCP inspector:
```bash
npm run inspector
```

## Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Exa API Documentation](https://docs.exa.ai/)
- [Claude Desktop](https://claude.ai/desktop)
