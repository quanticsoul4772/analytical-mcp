# Analytical MCP Server

A Model Context Protocol (MCP) server that provides analytical and statistical tools for Claude.

## Features

This server provides the following tools:

### analyze_dataset

Analyze a dataset with statistical methods.

**Input:**
- `data`: Array of numeric data to analyze

**Output:**
- Summary statistics (count, sum, mean, median, range, standard deviation, variance)
- Distribution information (quartiles, interquartile range)
- Sample data preview

### decision_analysis

Analyze decision options based on multiple criteria.

**Input:**
- `options`: Array of options to evaluate, each with a name and optional description
- `criteria`: Array of criteria for evaluation, each with a name and optional weight

**Output:**
- Ranked options by score
- Detailed analysis of each option with individual criteria scores

### correlation_analysis

Analyze correlation between two datasets.

**Input:**
- `x`: First dataset (X values)
- `y`: Second dataset (Y values)

**Output:**
- Pearson correlation coefficient
- Coefficient of determination (R²)
- Interpretation of correlation strength
- Sample data preview

### regression_analysis

Perform linear regression analysis on a dataset.

**Input:**
- `x`: Independent variable values (X)
- `y`: Dependent variable values (Y)

**Output:**
- Regression equation (y = mx + b)
- Model quality metrics (R-squared, standard error)
- Interpretation of slope and intercept
- Sample predictions

### time_series_analysis

Analyze time series data for trends and patterns.

**Input:**
- `data`: Time series data points
- `interval`: Time interval between data points (e.g., 'day', 'hour', 'month')

**Output:**
- Overview (length, average value, average change)
- Trend analysis (detected trend, first/last values, total change)
- Volatility metrics (standard deviation, max increase/decrease)
- Moving average (3-period)

### hypothesis_testing

Perform statistical hypothesis testing.

**Input:**
- `sample1`: First sample data
- `sample2`: Second sample data (optional for some tests)
- `test`: Type of test (e.g., 't-test', 'z-test', 'chi-square')
- `alpha`: Significance level (default: 0.05)

**Output:**
- Test information (type, significance level, sample sizes)
- Test results (statistics, p-value, significance)
- Interpretation of results

### verify_research

Cross-verify research claims from multiple sources with confidence scoring.

**Input:**
- `query`: Primary research query
- `verificationQueries` (optional): Alternate queries for verification
- `minConsistencyThreshold` (optional, default: 0.7): Minimum consistency score
- `sources` (optional, default: 3): Number of sources to cross-verify

**Output:**
- Verified research results
- Confidence score with detailed breakdown
  * Source consistency
  * Number of sources
  * Unique sources used
  * Any conflicting claims

## Installation

This server is designed to be used with the Claude Desktop App. To install:

1. Make sure the server is properly configured in the Claude Desktop App settings
2. Restart the Claude Desktop App to apply the changes

## Usage

Once installed, you can use the tools directly in Claude. For example:

```
Use the verify_research tool to cross-validate a research claim
Use the analyze_dataset tool to analyze this data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

## Research Integration

The server now supports advanced research capabilities:
- Multi-source fact verification
- Confidence scoring for research insights
- Flexible research query handling

## Development

This server is built using the Model Context Protocol (MCP) SDK. To modify or extend:

1. Edit the source code in `build/index.js`
2. Restart the server and Claude Desktop App to apply changes

## License

MIT
