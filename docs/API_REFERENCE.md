# API Reference - Analytical MCP Server

This document provides comprehensive API documentation for all analytical tools available in the Analytical MCP Server. The server provides 9 registered tools for statistical analysis, decision support, logical reasoning, and research verification.

## Tool Categories

- **Statistical Analysis**: Dataset analysis, regression, hypothesis testing, visualization
- **Decision Support**: Multi-criteria decision analysis
- **Logical Reasoning**: Argument analysis, fallacy detection, perspective generation
- **Research Verification**: Cross-source research validation

## Available Tools

### Statistical Analysis Tools

#### analytical:analyze_dataset

Comprehensive statistical analysis of datasets with multiple analysis types.

**Parameters:**
- `data` (array): Array of numeric values or objects with numeric properties
- `analysisType` (string): Analysis type - "summary" or "stats" (default: "summary")

**Returns:** Formatted markdown report with:
- Descriptive statistics (mean, median, mode, std dev)
- Distribution analysis (quartiles, skewness, kurtosis)
- Data quality assessment
- Visualization recommendations

**Examples:**
```json
// Simple numeric array
{
  "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "analysisType": "stats"
}

// Object array with multiple variables
{
  "data": [
    {"sales": 1200, "marketing": 300, "profit": 450},
    {"sales": 1500, "marketing": 400, "profit": 600},
    {"sales": 1800, "marketing": 500, "profit": 750}
  ],
  "analysisType": "summary"
}
```

#### analytical:advanced_regression_analysis

Advanced regression analysis supporting multiple regression types with comprehensive statistical output.

**Parameters:**
- `data` (array): Array of data objects with numeric properties
- `regressionType` (string): "linear", "polynomial", "logistic", or "multivariate"
- `independentVariables` (array): Names of predictor variables
- `dependentVariable` (string): Name of response variable
- `polynomialDegree` (number, optional): Degree for polynomial regression (2-6, default: 2)
- `standardizeFeatures` (boolean, optional): Standardize features (default: false)
- `includeConfidenceIntervals` (boolean, optional): Include confidence intervals (default: true)
- `crossValidation` (boolean, optional): Perform cross-validation (default: false)

**Returns:** Comprehensive regression analysis including:
- Model coefficients and statistics
- R-squared, adjusted R-squared, F-statistic
- Residual analysis and diagnostics
- Feature importance rankings
- Model interpretation and recommendations

**Examples:**
```json
// Linear regression
{
  "data": [
    {"sales": 1200, "advertising": 100, "price": 50},
    {"sales": 1500, "advertising": 150, "price": 45},
    {"sales": 1800, "advertising": 200, "price": 40}
  ],
  "regressionType": "linear",
  "independentVariables": ["advertising", "price"],
  "dependentVariable": "sales",
  "includeConfidenceIntervals": true
}

// Polynomial regression
{
  "data": [{"x": 1, "y": 2}, {"x": 2, "y": 8}, {"x": 3, "y": 18}],
  "regressionType": "polynomial",
  "independentVariables": ["x"],
  "dependentVariable": "y",
  "polynomialDegree": 2
}
```

#### analytical:hypothesis_testing

Statistical hypothesis testing with multiple test types and comprehensive reporting.

**Parameters:**
- `testType` (string): "t_test_independent", "t_test_paired", "correlation", "chi_square", "anova"
- `data` (array): Test data (format varies by test type)
- `variables` (array, optional): Variable names for complex data structures
- `alpha` (number, optional): Significance level (default: 0.05)
- `alternativeHypothesis` (string, optional): "two-sided", "less", or "greater"

**Returns:** Statistical test results including:
- Test statistic and p-value
- Confidence intervals
- Effect size measures
- Statistical interpretation
- Power analysis (when applicable)

**Examples:**
```json
// Independent t-test
{
  "testType": "t_test_independent",
  "data": [[23, 45, 67, 34], [56, 78, 90, 45]],
  "alpha": 0.05,
  "alternativeHypothesis": "two-sided"
}

// Correlation test
{
  "testType": "correlation",
  "data": [
    {"height": 170, "weight": 65},
    {"height": 180, "weight": 75},
    {"height": 165, "weight": 60}
  ],
  "variables": ["height", "weight"]
}
```

#### analytical:data_visualization_generator

Generates comprehensive data visualization specifications with multiple chart types.

**Parameters:**
- `data` (array): Array of data objects to visualize
- `visualizationType` (string): "scatter", "line", "bar", "histogram", "box", "heatmap", "pie", "violin", "correlation"
- `variables` (array): Variable names to include in visualization
- `title` (string, optional): Chart title
- `includeTrendline` (boolean, optional): Add trendline for scatter plots
- `colorBy` (string, optional): Variable name for color encoding
- `options` (object, optional): Additional visualization options

**Returns:** Visualization specification including:
- Chart configuration (Vega-Lite compatible)
- Data preprocessing recommendations
- Styling suggestions
- Interactive features configuration
- Alternative chart type suggestions

**Examples:**
```json
// Scatter plot with trendline
{
  "data": [
    {"x": 1, "y": 2, "category": "A"},
    {"x": 2, "y": 4, "category": "B"},
    {"x": 3, "y": 6, "category": "A"}
  ],
  "visualizationType": "scatter",
  "variables": ["x", "y"],
  "colorBy": "category",
  "includeTrendline": true,
  "title": "X vs Y Relationship"
}

// Box plot comparison
{
  "data": [
    {"group": "A", "value": 23},
    {"group": "B", "value": 45},
    {"group": "A", "value": 34}
  ],
  "visualizationType": "box",
  "variables": ["group", "value"]
}
```

### Decision Support Tools

#### analytical:decision_analysis

Advanced multi-criteria decision analysis with weighted scoring and comprehensive evaluation.

**Parameters:**
- `options` (array): Decision options to analyze (strings)
- `criteria` (array): Evaluation criteria (strings)
- `weights` (array, optional): Criterion weights (must sum to 1.0 if provided)
- `includeTradeoffs` (boolean, optional): Include tradeoff analysis (default: true)
- `sensitivityAnalysis` (boolean, optional): Perform sensitivity analysis (default: false)

**Returns:** Comprehensive decision analysis including:
- Ranked options with weighted scores
- Pros and cons analysis for each option
- Risk assessment and uncertainty factors
- Sensitivity analysis (if requested)
- Recommendation rationale

**Examples:**
```json
// Basic decision analysis
{
  "options": ["Option A", "Option B", "Option C"],
  "criteria": ["Cost", "Quality", "Speed", "Risk"],
  "weights": [0.3, 0.3, 0.25, 0.15],
  "includeTradeoffs": true
}

// Advanced analysis with sensitivity
{
  "options": ["Cloud Solution", "On-Premise", "Hybrid"],
  "criteria": ["Initial Cost", "Operating Cost", "Scalability", "Security", "Maintenance"],
  "weights": [0.2, 0.25, 0.2, 0.2, 0.15],
  "sensitivityAnalysis": true
}
```

## Additional Available Tools (Not Currently Registered)

The following tools are implemented but not currently exposed via MCP. They can be registered if needed:

### analytical:ml_model_evaluation
Machine learning model performance evaluation with comprehensive metrics for both classification and regression models.

**Parameters:**
- `modelType` (string): "classification" or "regression"
- `actualValues` (array): Array of actual target values
- `predictedValues` (array): Array of model predictions
- `evaluationMetrics` (array, optional): Specific metrics to calculate

**Returns:** ML evaluation report with performance metrics, confusion matrices, and recommendations.

### analytical:advanced_statistical_analysis
Extended statistical analysis capabilities including advanced descriptive statistics and correlation analysis.

**Parameters:**
- `data` (array): Array of data objects
- `analysisType` (string): "descriptive" or "correlation"
- `variables` (array, optional): Specific variables to analyze

**Returns:** Advanced statistical analysis report with detailed metrics and interpretations.

### analytical:data_resource_management
Data resource management for CSV, JSON, and text files with parsing and preprocessing capabilities.

**Parameters:**
- `resourceType` (string): "csv", "json", or "text"
- `filePath` (string): Path to the data file
- `options` (object, optional): Parsing and preprocessing options

**Returns:** Data resource summary, preview, and processing recommendations.

## Tool Response Formats

All tools return responses in a consistent format:

### Success Response Structure
```json
{
  "content": [
    {
      "type": "text",
      "text": "Tool output (markdown formatted for complex analyses)"
    }
  ]
}
```

### Error Response Structure
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Detailed error message with resolution suggestions"
    }
  ]
}
```

## Error Handling

Comprehensive error handling across all tools:

### Parameter Validation Errors
- **Invalid data types**: Clear message about expected vs. received types
- **Missing required parameters**: List of required parameters with descriptions
- **Out-of-range values**: Valid ranges and constraints explained
- **Invalid enum values**: List of valid options provided

### Processing Errors
- **Insufficient data**: Minimum data requirements and suggestions
- **Mathematical errors**: Division by zero, invalid operations handled gracefully
- **Convergence failures**: Alternative methods suggested for regression/optimization
- **Memory limitations**: Guidance on data size limits and optimization

### External API Errors (Research Tools)
- **Network connectivity**: Timeout and retry mechanisms
- **API rate limiting**: Built-in backoff strategies
- **Authentication failures**: API key validation and setup instructions
- **Service unavailability**: Fallback methods when possible

### Error Resolution Guidance
Each error includes:
- **Error classification**: Type and severity level
- **Root cause explanation**: What went wrong and why
- **Resolution steps**: Specific actions to resolve the issue
- **Alternative approaches**: When primary method fails
- **Documentation references**: Links to relevant documentation

## Performance Considerations

### Data Size Limits
- **Statistical tools**: Optimized for datasets up to 100,000 records
- **Regression analysis**: Efficient algorithms for up to 50,000 observations
- **Text analysis**: Supports documents up to 1MB in size
- **Research verification**: Concurrent processing of multiple sources

### Optimization Features
- **Caching**: Research results cached for 24 hours (configurable)
- **Parallel processing**: Multi-source research queries processed concurrently
- **Memory management**: Streaming processing for large datasets
- **Algorithmic efficiency**: Optimized mathematical libraries (mathjs)

### Rate Limiting (Research Tools)
- **Built-in retry logic**: Exponential backoff with jitter
- **Request queuing**: Intelligent request scheduling
- **Timeout configuration**: Configurable per tool (default: 30 seconds)
- **Graceful degradation**: Fallback to cached or simplified results

## Security and Privacy

### Data Handling
- **Local processing**: All analysis performed locally when possible
- **No persistent storage**: Data not stored permanently unless explicitly cached
- **Memory cleanup**: Automatic cleanup of processed data
- **Input sanitization**: All inputs validated and sanitized

### API Key Management
- **Environment variables**: Secure storage in .env files
- **No logging**: API keys never logged or exposed
- **Validation**: API key validity checked at startup
- **Rotation support**: Easy API key rotation without restart

### Research Tool Privacy
- **Query anonymization**: Research queries don't include sensitive information
- **Source diversity**: Multiple sources prevent single-point data dependency
- **Consent-aware**: Respects robots.txt and API terms of service
- **Data minimization**: Only necessary data extracted and processed

## Integration Patterns

### Tool Chaining
Tools can be used in sequence for complex analyses:

1. **Data Analysis Pipeline**:
   - `analyze_dataset` → `advanced_regression_analysis` → `data_visualization_generator`

2. **Decision Support Workflow**:
   - `verify_research` → `perspective_shifter` → `decision_analysis`

3. **Logical Analysis Chain**:
   - `logical_fallacy_detector` → `logical_argument_analyzer` → `perspective_shifter`

### Best Practices
- **Data validation**: Validate data quality before complex analyses
- **Error propagation**: Check each step's success before proceeding
- **Result interpretation**: Use visualization tools to validate statistical results
- **Cross-verification**: Use multiple tools to validate important findings

## Logging and Debugging

### Centralized Logging System
- **Logger class**: `src/utils/logger.ts` provides consistent logging
- **MCP compliance**: All logs to stderr, protocol communication to stdout
- **Log levels**: INFO, WARN, ERROR with configurable verbosity
- **Structured logging**: Consistent format across all tools

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=DEBUG npm run inspector

# Tool-specific debugging
DEBUG=analytical:* npm run inspector
```

### Performance Monitoring
- **Execution timing**: All tools report execution duration
- **Memory usage**: Memory consumption tracked for large operations
- **API usage**: Research tool API usage monitored and reported
- **Cache performance**: Cache hit/miss ratios for research tools

## Version Compatibility

### MCP Protocol
- **Version**: Compatible with MCP SDK v1.16.0+
- **Protocol features**: Full support for tool registration and execution
- **Error handling**: MCP-compliant error response format

### Node.js Compatibility
- **Minimum version**: Node.js 20.0.0+
- **ES Modules**: Full ESM support with proper import paths
- **TypeScript**: TypeScript 5.3+ with strict type checking

### Dependency Management
- **Core dependencies**: mathjs, zod, natural, compromise
- **Optional dependencies**: Exa API for research features
- **Development dependencies**: Jest, ESLint, Prettier
- **Security updates**: Regular dependency auditing and updates

## Getting Help

For additional support:
- **Documentation**: See [docs/](../docs/) directory for detailed guides
- **Troubleshooting**: Refer to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines
- **Issues**: Report bugs and request features on GitHub Issues

This comprehensive API reference provides all the information needed to effectively use the Analytical MCP Server's powerful suite of analytical tools.
