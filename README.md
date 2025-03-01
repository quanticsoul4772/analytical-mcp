# Analytical MCP Server

A specialized MCP server focused on enhancing AI capabilities for structured problem-solving, analytical reasoning, and decision-making.

## Features

This MCP server provides powerful analytical tools to AI assistants:

- **Data Analysis**: Comprehensive statistical analysis of datasets
- **Decision Framework**: Multi-criteria decision analysis and recommendation
- **ML Evaluation**: Performance evaluation of machine learning models
- **Data Preprocessing**: Advanced data cleaning and transformation capabilities
- **Advanced Regression**: Multiple regression types including linear, polynomial, logistic, and multivariate
- **Hypothesis Testing**: Comprehensive statistical testing framework (t-tests, chi-square, ANOVA)
- **Data Visualization**: Generation of visualization specifications for diverse chart types
- **Logical Analysis**: Argument structure, fallacy detection, validity and strength assessment
- **Perspective Shifting**: Generation of alternative viewpoints for creative problem-solving

## Getting Started

### Prerequisites

- Node.js v20+
- API keys for external services (set in environment variables)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/analytical-mcp.git
cd analytical-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Running Tests

Tests are configured to use real API dependencies from system environment variables:

```bash
# Run all tests
npm test

# Run tests with optimized settings
npm run test:optimized

# Run specific test for logical fallacy detector
./test-fallacy-detector.bat  # Windows
./run-tests-optimized.sh     # Unix/Linux/macOS
```

See [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) for more details on testing with API dependencies.

### Example: Logical Fallacy Detection

```javascript
// Detect logical fallacies in a given text
const fallacyAnalysis = await logical_fallacy_detector({
  text: "Experts say this diet is the best, so it must work perfectly!",
  confidenceThreshold: 0.5,  // Minimum confidence to report a fallacy
  categories: ['relevance', 'informal'],  // Fallacy categories to check
  includeExplanations: true,  // Include detailed explanations
  includeExamples: true       // Include good and bad reasoning examples
});

// Example output structure:
// {
//   detectedFallacies: [
//     {
//       name: "Appeal to Authority",
//       category: "relevance",
//       confidence: 0.7,
//       description: "...",
//       examples: {
//         bad: "...",
//         good: "..."
//       }
//     }
//   ],
//   severity: "Low",
//   reportMarkdown: "Detailed markdown report of fallacies"
// }
```

### Logical Fallacy Detection Features

The Logical Fallacy Detector provides:
- Multiple fallacy category detection
- Configurable confidence thresholds
- Detailed explanations of detected fallacies
- Examples of improved reasoning
- Overall argument assessment

Supported Fallacy Categories:
- Informal Fallacies
- Formal Fallacies
- Relevance Fallacies
- Ambiguity Fallacies
