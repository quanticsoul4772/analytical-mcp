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
3. Set up your environment variables (see `.env.example` for required variables)
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
- `npm test`: Run test suite
- `npm run lint`: Check code quality
- `npm run format`: Format code
- `npm run nlp:demo`: Run advanced NLP demo

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

See the `.env.example` file for configuration options.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License
