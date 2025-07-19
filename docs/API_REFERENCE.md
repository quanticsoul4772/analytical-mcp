# API Reference

## Tool Specifications

### analytical:analyze_dataset

Statistical analysis of datasets.

**Parameters:**
- `data` (array): Array of numeric values or objects
- `analysisType` (string): "summary" or "stats" (default: "summary")

**Returns:** Statistical analysis including mean, median, standard deviation, quartiles.

**Example:**
```json
{
  "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "analysisType": "stats"
}
```

### analytical:decision_analysis

Multi-criteria decision analysis with weighted scoring.

**Parameters:**
- `options` (array): Decision options to analyze
- `criteria` (array): Evaluation criteria  
- `weights` (array, optional): Criterion weights (must match criteria length)

**Returns:** Ranked options with scores and analysis.

**Example:**
```json
{
  "options": ["Option A", "Option B", "Option C"],
  "criteria": ["Cost", "Quality", "Speed"],
  "weights": [0.4, 0.4, 0.2]
}
```

### analytical:advanced_regression_analysis

Regression analysis on datasets.

**Parameters:**
- `data` (array): Data objects for regression
- `regressionType` (string): "linear", "polynomial", "logistic", or "multivariate"
- `independentVariables` (array): Independent variable names
- `dependentVariable` (string): Dependent variable name

**Returns:** Regression equation, coefficients, R-squared, model statistics.

**Example:**
```json
{
  "data": [
    {"sales": 1200, "advertising": 100},
    {"sales": 1500, "advertising": 150},
    {"sales": 1800, "advertising": 200}
  ],
  "regressionType": "linear",
  "independentVariables": ["advertising"],
  "dependentVariable": "sales"
}
```

### analytical:hypothesis_testing

Statistical hypothesis testing.

**Parameters:**
- `testType` (string): "t_test_independent", "t_test_paired", "correlation", "chi_square", "anova"
- `data` (array): Test data (format depends on test type)
- `variables` (array, optional): Variable names for complex data
- `alpha` (number, optional): Significance level (default: 0.05)
- `alternativeHypothesis` (string, optional): Alternative hypothesis

**Returns:** Test statistics, p-values, conclusions.

**Example:**
```json
{
  "testType": "t_test_independent",
  "data": [[23, 45, 67], [34, 56, 78]],
  "alpha": 0.05
}
```

### analytical:data_visualization_generator

Data visualization specifications.

**Parameters:**
- `data` (array): Data objects to visualize
- `visualizationType` (string): "scatter", "line", "bar", "histogram", "box", "heatmap", "pie"
- `variables` (array): Variable names to include

**Returns:** Visualization specification with chart configuration.

### analytical:logical_argument_analyzer

Logical argument analysis for structure, fallacies, validity, and strength.

**Parameters:**
- `argument` (string): Argument text to analyze
- `analysisDepth` (string, optional): "basic" or "comprehensive" (default: "basic")

**Returns:** Argument structure analysis, validity assessment, improvement recommendations.

### analytical:logical_fallacy_detector

Logical fallacy detection in text.

**Parameters:**
- `text` (string): Text to analyze
- `confidenceThreshold` (number, optional): Minimum confidence level (0-1, default: 0.7)

**Returns:** Detected fallacies with explanations and confidence scores.

### analytical:perspective_shifter

Alternative perspectives on problems or situations.

**Parameters:**
- `problem` (string): Problem or situation to analyze
- `currentPerspective` (string, optional): Current perspective or viewpoint
- `shiftType` (string, optional): "stakeholder", "discipline", "contrarian"
- `numberOfPerspectives` (number, optional): Number of perspectives (default: 3)

**Returns:** Alternative perspectives with analysis and insights.

### analytical:verify_research

Research claim verification from multiple sources.

**Parameters:**
- `query` (string): Primary research query
- `verificationQueries` (array, optional): Alternative queries for verification
- `minConsistencyThreshold` (number, optional): Minimum consistency score (0-1, default: 0.7)
- `sources` (number, optional): Number of sources to verify (1-10, default: 3)

**Returns:** Verification results with consistency scores and source analysis.

## Error Handling

Tools return structured error messages for:
- Invalid parameters
- Missing required data
- External API failures (research tools)
- Processing errors

Error responses include:
- Error type and code
- Error message
- Resolution suggestions

## Rate Limiting

Research tools using external APIs:
- Built-in retry logic with exponential backoff
- Configurable timeout settings
- Graceful degradation when limits are reached
