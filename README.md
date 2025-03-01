# Analytical MCP Server

A specialized MCP server focused on enhancing AI capabilities for structured problem-solving, analytical reasoning, and decision-making.

## Features

This MCP server provides powerful analytical tools to AI assistants:

- **Data Analysis**: Basic and advanced statistical analysis of datasets
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

### Configuration

The project includes a `claude_config_example.json` file that shows how to configure the MCP server for Claude. You can use this as a template for your own configuration.

### Integration with Claude Desktop

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

Provides basic statistical analysis of datasets.

Parameters:
- `datasetId`: ID of the dataset to analyze (string)
- `analysisType`: Type of analysis to perform ["summary", "stats"] (optional, default: "summary")

### decision_analysis

Analyzes decision options based on multiple criteria.

Parameters:
- `options`: List of decision options to analyze (array of strings)
- `criteria`: List of criteria to evaluate options against (array of strings)
- `weights`: Optional weights for each criterion (array of numbers)

### advanced_regression_analysis

Performs various types of regression analysis on datasets.

Parameters:
- `datasetId`: ID of the dataset to analyze (string)
- `regressionType`: Type of regression to perform ["linear", "polynomial", "logistic", "multivariate"] (string)
- `independentVariables`: Column names of independent variables (array of strings)
- `dependentVariable`: Column name of dependent variable (string)
- `polynomialDegree`: Degree for polynomial regression (number, optional)
- `includeMetrics`: Include performance metrics in results (boolean, default: true)
- `includeCoefficients`: Include calculated coefficients in results (boolean, default: true)

### hypothesis_testing

Performs statistical hypothesis tests on datasets.

Parameters:
- `testType`: Type of test to perform ["t_test_independent", "t_test_paired", "chi_square", "anova", "correlation"] (string)
- `datasetId`: ID of the dataset to analyze (string)
- `variables`: Variables to use in the test (array of strings)
- `alpha`: Significance level (number, default: 0.05)
- `alternativeHypothesis`: Alternative hypothesis direction ["two_sided", "greater_than", "less_than"] (string, default: "two_sided")

### data_visualization_generator

Generates specifications for data visualizations.

Parameters:
- `datasetId`: ID of the dataset to visualize (string)
- `visualizationType`: Type of visualization ["scatter", "line", "bar", "histogram", "box", "heatmap", "pie", "violin", "correlation"] (string)
- `variables`: Variables to include in the visualization (array of strings)
- `title`: Optional title for the visualization (string, optional)
- `includeTrendline`: Include a trendline for scatter plots (boolean, default: false)
- `options`: Additional visualization options (object, optional)

### logical_argument_analyzer

Analyzes logical arguments for structure, fallacies, validity, and strength.

Parameters:
- `argument`: The argument to analyze (string)
- `analysisType`: Type of analysis to perform ["structure", "fallacies", "validity", "strength", "comprehensive"] (string, default: "comprehensive")
- `includeRecommendations`: Include recommendations for improving the argument (boolean, default: true)

### logical_fallacy_detector

Detects and explains logical fallacies in text with confidence scoring.

Parameters:
- `text`: The text to analyze for logical fallacies (string)
- `confidenceThreshold`: Minimum confidence level to report a fallacy (0-1) (number, default: 0.5)
- `includeExplanations`: Include detailed explanations for detected fallacies (boolean, default: true)
- `includeExamples`: Include examples of how to correct each fallacy (boolean, default: true)
- `fallacyCategories`: Categories of fallacies to detect ["formal", "informal", "relevance", "clarity", "all"] (array of strings, default: ["all"])

### perspective_shifter

Generates alternative perspectives on a problem or situation.

Parameters:
- `problem`: The problem or situation to analyze from different perspectives (string)
- `currentPerspective`: The current perspective or approach (string, optional)
- `shiftType`: Type of perspective shift to generate ["stakeholder", "temporal", "contrarian", "disciplinary", "scale", "comprehensive"] (string, default: "comprehensive")
- `numberOfPerspectives`: Number of alternative perspectives to generate (number, default: 3)
- `includeActionable`: Include actionable insights for each perspective (boolean, default: true)

## Examples

### Data Analysis

"Can you analyze my sales data for 2024?"

```json
{
  "datasetId": "sales2024",
  "analysisType": "stats"
}
```

### Advanced Regression

"Predict housing prices based on square footage and number of bedrooms"

```json
{
  "datasetId": "housing",
  "regressionType": "linear",
  "independentVariables": ["area", "bedrooms"],
  "dependentVariable": "price",
  "includeMetrics": true
}
```

### Logical Argument Analysis

"Is this a sound argument? 'All birds have feathers. Penguins are birds. Therefore, penguins have feathers.'"

```json
{
  "argument": "All birds have feathers. Penguins are birds. Therefore, penguins have feathers.",
  "analysisType": "comprehensive",
  "includeRecommendations": true
}
```

### Logical Fallacy Detection

"Analyze this statement: 'Dr. Smith says this supplement works, so it must be effective. And if you don't believe me, just look at how uneducated the critics are!'"

```json
{
  "text": "Dr. Smith says this supplement works, so it must be effective. And if you don't believe me, just look at how uneducated the critics are!",
  "confidenceThreshold": 0.5,
  "fallacyCategories": ["all"]
}
```

### Perspective Shifting

"I'm struggling with how to improve team productivity while maintaining work-life balance."

```json
{
  "problem": "I'm struggling with how to improve team productivity while maintaining work-life balance.",
  "shiftType": "stakeholder",
  "numberOfPerspectives": 3,
  "includeActionable": true
}
```

### Data Visualization

"Create a scatter plot of income vs. spending with a trendline."

```json
{
  "datasetId": "correlation_data",
  "visualizationType": "scatter",
  "variables": ["income", "spending"],
  "includeTrendline": true
}
```

## Tool Combinations

These tools can be combined for powerful analytical workflows:

1. **Data-Driven Decision Making**
   - Analyze data → Run statistical tests → Visualize results → Apply decision analysis

2. **Argument Improvement**
   - Detect fallacies → Analyze argument structure → Apply perspective shifting → Rebuild stronger argument

3. **Problem Solving**
   - Analyze with perspective shifting → Test hypotheses with data → Use decision analysis to evaluate options

## Troubleshooting

- Ensure Node.js v20+ is installed
- Check dependencies with `npm install`
- Verify configuration file path
- Review console output for error messages

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.