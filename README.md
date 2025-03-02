# Analytical MCP Server

A specialized Model Context Protocol (MCP) server providing advanced analytical, research, and natural language processing capabilities.

## Key Features

### Analytical Tools
- Dataset Analysis
- Decision Analysis
- Correlation Analysis
- Regression Analysis
- Time Series Analysis
- Hypothesis Testing

### Advanced NLP Capabilities
- Enhanced Fact Extraction
- Named Entity Recognition
- Coreference Resolution
- Relationship Extraction
- Sentiment Analysis
- Text Similarity
- Part of Speech Tagging
- Lemmatization
- Spell Checking

## Installation

### Prerequisites
- Node.js (v20+)
- npm
- Exa API key (for research and advanced NLP capabilities)

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your API keys
   # You'll need an Exa API key for research functionality
   ```
4. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Running Tools
Each tool can be invoked with specific parameters. Example:
```typescript
// Analyze a dataset
const datasetAnalysis = await analyze_dataset([1, 2, 3, 4, 5]);

// Verify research claims
const researchVerification = await verify_research({
  query: 'Climate change impacts',
  sources: 3
});

// Extract entities from text
const entities = await advancedNER.recognizeEntities(
  "Apple Inc. is planning to open a new headquarters in Austin, Texas."
);
```

### Advanced NLP Demo
You can run the included NLP demo to see the advanced capabilities in action:
```bash
npm run build
node examples/advanced_nlp_demo.js
```

## Development

### Available Scripts
- `npm run build`: Compile TypeScript
- `npm test`: Run all tests
- `npm run test:integration`: Run integration tests only
- `npm run test:exa`: Run Exa Research API tests
- `npm run test:research`: Run Research Verification tests
- `npm run test:server`: Run Server Tool Registration tests
- `npm run lint`: Check code quality
- `npm run format`: Format code
- `npm run nlp:demo`: Run advanced NLP demo

### Test Scripts
We provide dedicated scripts for running specific test suites:

#### Unix/Linux/Mac
```bash
# Run all integration tests with a summary report
./tools/run-all-integration-tests.sh

# Run specific test suites
./tools/run-exa-tests.sh
./tools/run-research-tests.sh
./tools/run-server-tests.sh
./tools/run-api-key-tests.sh
./tools/run-data-pipeline-tests.sh
./tools/run-market-analysis-tests.sh
```

#### Windows
```batch
# Run all integration tests with a summary report
.\tools\run-all-integration-tests.bat
```

### Key Technologies
- TypeScript
- Model Context Protocol SDK
- Exa API for Research and NLP
- Natural Language Processing libraries
- Jest for Testing

## Advanced NLP Implementation
The Analytical MCP Server implements advanced NLP features using:
- Exa research API for context-aware entity recognition
- Natural language toolkit for basic NLP operations
- Custom rule-based fallback mechanisms for offline capabilities
- Enhanced fact extraction with confidence scoring
- Relationship extraction between entities

For detailed information, see the [Advanced NLP documentation](docs/advanced-nlp.md).

## Required API Keys
This project requires the following API key:
- `EXA_API_KEY`: Used for research integration and advanced NLP

The `.env.example` file contains all available configuration options:
- API keys
- Feature flags
- Cache settings
- NLP configuration
- Server configuration

Copy this file to `.env` in your project root and update with your actual API keys to get started.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License
