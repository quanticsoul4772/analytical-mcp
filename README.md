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

## Installation & Setup

### Prerequisites

- Node.js v20+ 
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/analytical-mcp/analytical-mcp.git
cd analytical-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Direct Data Input

All tools now support direct data input, eliminating the need for dataset IDs. Each tool accepts data directly in the method call.

### Example: Data Analysis

```javascript
// Analyze a numeric array
const summaryStats = await analyze_dataset({
  data: [100, 200, 150, 300, 250],
  analysisType: "stats"
});

// Analyze an array of objects
const objectStats = await analyze_dataset({
  data: [
    { age: 25, income: 50000 },
    { age: 35, income: 75000 },
    { age: 45, income: 100000 }
  ],
  analysisType: "stats"
});
```

### Example: Hypothesis Testing

```javascript
// Independent t-test
const tTestResults = await hypothesis_testing({
  testType: "t_test_independent",
  data: [
    [45, 52, 48, 50],  // Group 1
    [40, 38, 42, 45]   // Group 2
  ],
  variables: ["group1", "group2"],
  alpha: 0.05
});
```

### Example: Regression Analysis

```javascript
// Multivariate regression
const regressionResults = await advanced_regression_analysis({
  data: [
    { area: 1000, bedrooms: 2, price: 200000 },
    { area: 1500, bedrooms: 3, price: 300000 },
    { area: 2000, bedrooms: 4, price: 400000 }
  ],
  regressionType: "multivariate",
  independentVariables: ["area", "bedrooms"],
  dependentVariable: "price"
});
```

## Configuration

The project includes a `claude_config_example.json` file that shows how to configure the MCP server for Claude. You can use this as a template for your own configuration.

## Integration with Claude Desktop

1. Locate or create your Claude Desktop config file:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add the following to your config file:

```json
{
  "mcpServers": {
    "analytical": {
      "command": "node",
      "args": ["/absolute/path/to/analytical-mcp/build/index.js"]
    }
  }
}
```

3. Restart Claude Desktop

## Available Tools

### analyze_dataset
Provides basic and advanced statistical analysis of datasets.

### decision_analysis
Analyzes decision options based on multiple criteria.

### advanced_regression_analysis
Performs various types of regression analysis on datasets.

### hypothesis_testing
Performs statistical hypothesis tests on datasets.

### data_visualization_generator
Generates specifications for data visualizations.

### logical_argument_analyzer
Analyzes logical arguments for structure, fallacies, validity, and strength.

### logical_fallacy_detector
Detects and explains logical fallacies in text with confidence scoring.

### perspective_shifter
Generates alternative perspectives on a problem or situation.

## Contributing

Contributions are welcome! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
