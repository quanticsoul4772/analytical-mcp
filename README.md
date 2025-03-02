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
- **Research Integration**: Web research integration and cross-domain knowledge synthesis

## Documentation

For detailed information on the project architecture and individual tools, please refer to:

- [Architecture Overview](ARCHITECTURE.md): Comprehensive overview of the system architecture
- [API Reference](docs/API_REFERENCE.md): Complete API reference for all tools

### Tool Documentation

- [Analyze Dataset](docs/ANALYZE_DATASET.md): Statistical analysis of datasets
- [Advanced Regression Analysis](docs/ADVANCED_REGRESSION_ANALYSIS.md): Multiple regression types and analysis
- [Advanced Statistical Analysis](docs/ADVANCED_STATISTICAL_ANALYSIS.md): Comprehensive statistical capabilities
- [Data Visualization Generator](docs/DATA_VISUALIZATION_GENERATOR.md): Generate visualization specifications
- [Decision Analysis](docs/DECISION_ANALYSIS.md): Multi-criteria decision making
- [Logical Fallacy Detector](docs/LOGICAL_FALLACY_DETECTOR.md): Detect and explain logical fallacies
- [Perspective Shifter](docs/PERSPECTIVE_SHIFTER.md): Generate alternative perspectives
- [Research Integration](docs/RESEARCH_INTEGRATION.md): Web research and knowledge synthesis

### Development and Testing Documentation

- [API Testing Guide](API_TESTING_GUIDE.md): Guide for testing tools with API dependencies
- [Error Handling](ERROR_HANDLING.md): Error handling approach and error types
- [Testing Strategy](TESTING_STRATEGY.md): Overview of testing methodologies
- [Test Optimization](TEST_OPTIMIZATION.md): Guidelines for test performance
- [Optimization Checklist](OPTIMIZATION_CHECKLIST.md): Performance optimization guidelines

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

## Usage Examples

### Logical Fallacy Detection

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

### Advanced Regression Analysis

```javascript
// Perform regression analysis on sales data
const regressionResults = await advanced_regression_analysis({
  data: salesData,  
  dependentVariable: "monthly_sales",
  independentVariables: ["advertising_spend", "price", "competitor_price"],
  regressionType: "linear",
  options: {
    standardize: true,
    confidenceLevel: 0.95,
    testSize: 0.2
  }
});

// Example output includes coefficients, model fit statistics, 
// predictions, and a human-readable equation
```

### Decision Analysis

```javascript
// Analyze decision options with multiple criteria
const decisionResults = await decision_analysis({
  options: [
    { id: "optA", name: "Option A", description: "First alternative" },
    { id: "optB", name: "Option B", description: "Second alternative" },
    { id: "optC", name: "Option C", description: "Third alternative" }
  ],
  criteria: [
    { id: "cost", name: "Cost", weight: 0.4, type: "cost" },
    { id: "quality", name: "Quality", weight: 0.35, type: "benefit" },
    { id: "time", name: "Implementation Time", weight: 0.25, type: "cost" }
  ],
  evaluations: [
    // ... evaluations for each option/criterion combination
  ],
  analysisType: "weighted-sum",
  sensitivityAnalysis: true
});

// Results include rankings, best option, and sensitivity analysis
```

### Perspective Shifting

```javascript
// Generate alternative perspectives on a problem
const perspectives = await perspective_shifter({
  problem: "How can we reduce customer churn in our subscription service?",
  currentPerspective: "We currently focus on improving features to retain customers.",
  domains: ["psychology", "economics", "design"],
  perspectiveTypes: ["opposite", "adjacent", "interdisciplinary"],
  numberOfPerspectives: 3
});

// Results include diverse perspectives and potential connections
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
