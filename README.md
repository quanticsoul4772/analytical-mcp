# Analytical MCP Server

A specialized MCP server focused on enhancing AI capabilities for structured problem-solving, analytical reasoning, and decision-making.

## Features

This MCP server provides powerful analytical tools to AI assistants:

- **Data Analysis**: Basic and advanced statistical analysis of datasets
- **Decision Framework**: Multi-criteria decision analysis and recommendation
- **ML Evaluation**: Performance evaluation of machine learning models

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

Available datasets:
- `sales2024`
- `customerFeedback`
- `marketingQ1`
- `productMetrics`
- `operationalCosts`

### advanced_statistical_analysis

Performs advanced statistical analysis on datasets, including descriptive statistics and correlation analysis.

Parameters:
- `datasetId`: Unique identifier for the dataset (string)
- `analysisType`: Type of analysis to perform ["descriptive", "correlation"] (required)

Available datasets:
- `sales_quarterly`
- `customer_metrics`

### ml_model_evaluation

Evaluates machine learning model performance using various metrics.

Parameters:
- `modelType`: Type of machine learning model ["classification", "regression"] (required)
- `actualValues`: Actual target values (array of numbers)
- `predictedValues`: Model's predicted values (array of numbers)
- `evaluationMetrics`: Metrics to calculate (optional, defaults based on model type)
  - Classification metrics: ["accuracy", "precision", "recall", "f1_score"]
  - Regression metrics: ["mse", "mae", "rmse", "r_squared"]

### decision_analysis

Analyzes decision options based on multiple criteria.

Parameters:
- `options`: List of decision options to analyze (array of strings)
- `criteria`: List of criteria to evaluate options against (array of strings)
- `weights`: Optional weights for each criterion (array of numbers, must match criteria length)

## Examples

### Basic Data Analysis

To analyze the sales data:

"Can you analyze the sales2024 dataset and provide detailed statistics?"

### Advanced Statistical Analysis

To perform a correlation analysis:

"I want to understand the relationship between variables in the sales_quarterly dataset. Can you run a correlation analysis?"

### ML Model Evaluation

To evaluate a classification model:

"I need to evaluate my classification model. The actual values are [1, 0, 1, 1, 0] and the predicted values are [1, 0, 0, 1, 0]. Can you calculate the accuracy, precision, and recall?"

### Decision Making

To help choose between options:

"I need to decide between three marketing strategies: 'Digital Campaign', 'Event Sponsorship', and 'Influencer Partnership'. The criteria are 'Cost Efficiency', 'Reach', and 'Brand Alignment'. Which option is best?"

## Troubleshooting

If you encounter issues with the server:
- Check that Node.js v20+ is installed
- Ensure all dependencies are installed correctly with `npm install`
- Verify your configuration file path is correct
- Check console output for any error messages

## License

[MIT](LICENSE)
