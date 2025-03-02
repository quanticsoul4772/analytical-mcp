# Analytical MCP Server

A specialized MCP server focused on enhancing AI capabilities for structured problem-solving, analytical reasoning, and decision-making.

## Features

- **Data Analysis**: Statistical analysis, regression modeling, and hypothesis testing
- **Decision Analysis**: Multi-criteria decision evaluation with uncertainty handling
- **Logical Reasoning**: Logical argument analysis and fallacy detection 
- **Perspective Generation**: View problems from multiple stakeholder viewpoints
- **Research Integration**: Enhance reasoning with external knowledge (requires API key)

## Setup

### Prerequisites

- Node.js 20.x or higher
- System environment variables for required API keys

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd analytical-mcp

# Install dependencies
npm install

# Verify API key setup
npm run check-api-keys
```

### Required API Keys

This project requires the following API key to be set in your system environment variables:

- **EXA_API_KEY**: Used for research capabilities and integration tests
  - Register at [Exa.ai](https://exa.ai) to obtain a key

To set up the API key in your environment:

**Windows (PowerShell):**
```powershell
$env:EXA_API_KEY="your-api-key-here"
```

**Windows (Command Prompt):**
```cmd
set EXA_API_KEY=your-api-key-here
```

**macOS/Linux:**
```bash
export EXA_API_KEY="your-api-key-here"
```

For persistent configuration, add the API key to your system environment variables.

## Running Tests

```bash
# Verify API keys are present before testing
npm run check-api-keys

# Run all tests
npm test

# Run optimized tests (more memory allocation)
npm run test:optimized

# Run with detection for open handles
npm run test:handles

# Run integration tests only
npm run test:integration

# Run integration tests without API-dependent tests
npm run test:integration:no-api
```

## Development

```bash
# Start development mode with auto-compilation
npm run watch

# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck
```

## Documentation

- [Testing Strategy](./TESTING_STRATEGY.md)
- [Architecture](./ARCHITECTURE.md)
- [API Testing Guide](./API_TESTING_GUIDE.md)
- [Error Handling](./ERROR_HANDLING.md)

## Troubleshooting

### API Key Issues

If you encounter errors related to missing API keys:

1. Verify your API key is correctly set in system environment variables
2. Run `npm run check-api-keys` to validate key configuration
3. Some tests will fail if API keys are missing - use `test:integration:no-api` to skip these tests

### Open Handles in Tests

If you encounter warnings about open handles:

1. Use `npm run test:handles` to identify problematic tests
2. Check for unclosed network connections or timers
3. Ensure proper cleanup in test afterEach/afterAll hooks

## License

See [LICENSE](./LICENSE) file for details.
