# API Reference

## Tool Specifications

### analytical:analyze_dataset

Statistical analysis of datasets.

**Parameters:**
- `data` (array): Array of numeric values or objects
- `analysisType` (string): "summary" or "stats" (default: "summary")

**Returns:** Statistical analysis including mean, median, standard deviation, quartiles.

**Possible Error Codes:**
- ERR_1001 (invalid data format)
- ERR_1004 (invalid parameter type)
- ERR_3004 (insufficient data points)

**Example:**
```json
{
  "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "analysisType": "stats"
}
```

**Example with Error Handling:**
```javascript
try {
  const result = await analytical.analyze_dataset({
    data: [23, 45, 67, 12, 89, 34, 56, 78],
    analysisType: "stats"
  });
  console.log("Analysis completed:", result.summary);
} catch (error) {
  switch (error.code) {
    case 'ERR_1001':
      console.error("Invalid data format:", error.message);
      break;
    case 'ERR_3004':
      console.error("Insufficient data points:", error.message);
      break;
    default:
      console.error("Unexpected error:", error.message);
  }
}
```

### analytical:decision_analysis

Multi-criteria decision analysis with weighted scoring.

**Parameters:**
- `options` (array): Decision options to analyze
- `criteria` (array): Evaluation criteria  
- `weights` (array, optional): Criterion weights (must match criteria length)

**Returns:** Ranked options with scores and analysis.

**Possible Error Codes:**
- ERR_1002 (missing required parameters)
- ERR_1005 (weight array length mismatch)
- ERR_3001 (calculation failure)

**Example:**
```json
{
  "options": ["Option A", "Option B", "Option C"],
  "criteria": ["Cost", "Quality", "Speed"],
  "weights": [0.4, 0.4, 0.2]
}
```

**Example with Error Handling:**
```javascript
try {
  const result = await analytical.decision_analysis({
    options: ["Cloud Migration", "On-Premise Upgrade", "Hybrid Solution"],
    criteria: ["Cost", "Scalability", "Security", "Maintenance"],
    weights: [0.3, 0.25, 0.25, 0.2]
  });
  
  console.log("Decision Analysis Results:");
  result.rankings.forEach((option, index) => {
    console.log(`${index + 1}. ${option.name}: ${option.score.toFixed(2)}`);
  });
} catch (error) {
  if (error.code === 'ERR_1005') {
    console.error("Weight configuration error:", error.message);
    console.log("Ensure weights array matches criteria length");
  } else if (error.code === 'ERR_1002') {
    console.error("Missing parameters:", error.message);
  } else {
    console.error("Analysis failed:", error.message);
  }
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

**Possible Error Codes:**
- ERR_1001 (invalid data format)
- ERR_1004 (invalid regression type)
- ERR_3005 (algorithm convergence failed)
- ERR_3004 (insufficient data points)

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

**Possible Error Codes:**
- ERR_1001 (invalid data format)
- ERR_1004 (invalid test type)
- ERR_3004 (insufficient data for test)
- ERR_3001 (statistical calculation failed)

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

**Possible Error Codes:**
- ERR_1001 (invalid data format)
- ERR_1004 (invalid visualization type)
- ERR_1002 (missing required variables)

### analytical:logical_argument_analyzer

Logical argument analysis for structure, fallacies, validity, and strength.

**Parameters:**
- `argument` (string): Argument text to analyze
- `analysisDepth` (string, optional): "basic" or "comprehensive" (default: "basic")

**Returns:** Argument structure analysis, validity assessment, improvement recommendations.

**Possible Error Codes:**
- ERR_1002 (missing argument text)
- ERR_1005 (argument too long)
- ERR_3003 (processing timeout)

### analytical:logical_fallacy_detector

Logical fallacy detection in text.

**Parameters:**
- `text` (string): Text to analyze
- `confidenceThreshold` (number, optional): Minimum confidence level (0-1, default: 0.7)

**Returns:** Detected fallacies with explanations and confidence scores.

**Possible Error Codes:**
- ERR_1002 (missing text input)
- ERR_1005 (text too long for analysis)
- ERR_3003 (processing timeout)

### analytical:perspective_shifter

Alternative perspectives on problems or situations.

**Parameters:**
- `problem` (string): Problem or situation to analyze
- `currentPerspective` (string, optional): Current perspective or viewpoint
- `shiftType` (string, optional): "stakeholder", "discipline", "contrarian"
- `numberOfPerspectives` (number, optional): Number of perspectives (default: 3)

**Returns:** Alternative perspectives with analysis and insights.

**Possible Error Codes:**
- ERR_1002 (missing problem description)
- ERR_1005 (invalid shift type)
- ERR_2001, ERR_2003 (API-related for enhanced perspectives)

### analytical:verify_research

Research claim verification from multiple sources.

**Parameters:**
- `query` (string): Primary research query
- `verificationQueries` (array, optional): Alternative queries for verification
- `minConsistencyThreshold` (number, optional): Minimum consistency score (0-1, default: 0.7)
- `sources` (number, optional): Number of sources to verify (1-10, default: 3)

**Returns:** Verification results with consistency scores and source analysis.

**Possible Error Codes:**
- ERR_2001, ERR_2003, ERR_2004 (API-related)
- ERR_1001, ERR_1002 (validation)

**Example with Comprehensive Error Handling:**
```javascript
async function verifyClaimWithFallback(claim, sources = 3) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const result = await analytical.verify_research({
        query: claim,
        sources: sources,
        minConsistencyThreshold: 0.8
      });
      
      console.log(`Verification completed with ${result.sources.length} sources`);
      console.log(`Consistency score: ${result.consistencyScore}`);
      
      if (result.consistencyScore >= 0.8) {
        console.log("✅ Claim verified with high confidence");
      } else {
        console.log("⚠️  Claim verification inconclusive");
      }
      
      return result;
      
    } catch (error) {
      attempt++;
      
      switch (error.code) {
        case 'ERR_2001': // Rate limit
          console.log(`Rate limited (attempt ${attempt}/${maxRetries}). Waiting...`);
          if (attempt <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
            continue;
          }
          break;
          
        case 'ERR_2003': // Timeout
          console.log(`Request timed out (attempt ${attempt}/${maxRetries})`);
          if (attempt <= maxRetries) {
            continue;
          }
          break;
          
        case 'ERR_2004': // Service unavailable
          console.log("Research service temporarily unavailable");
          console.log("Falling back to cached results or manual verification");
          return { verified: false, reason: "Service unavailable" };
          
        case 'ERR_4001': // Missing API key
          console.error("Research functionality disabled - missing API key");
          console.log("Add EXA_API_KEY to environment variables");
          throw error;
          
        default:
          console.error("Unexpected verification error:", error.message);
          throw error;
      }
    }
  }
  
  throw new Error(`Verification failed after ${maxRetries} attempts`);
}

// Usage
try {
  const result = await verifyClaimWithFallback(
    "Electric vehicles have lower lifetime carbon emissions than gasoline cars"
  );
} catch (error) {
  console.error("Final verification failure:", error.message);
}
```

### analytical:advanced_statistical_analysis

Advanced statistical analysis with multiple test options.

**Parameters:**
- `data` (array): Dataset for analysis
- `analysisType` (string): "descriptive", "correlation", "distribution", "outlier_detection"
- `options` (object, optional): Analysis-specific options

**Returns:** Advanced statistical metrics and analysis results.

**Possible Error Codes:**
- ERR_1001, ERR_1004 (data validation)
- ERR_3001, ERR_3004 (processing)

### analytical:advanced_data_preprocessing

Data preprocessing and cleaning operations.

**Parameters:**
- `data` (array): Raw dataset
- `preprocessingType` (string): "cleaning", "normalization", "feature_engineering"
- `options` (object, optional): Preprocessing configuration

**Returns:** Processed dataset with transformation details.

**Possible Error Codes:**
- ERR_1001, ERR_1003 (data format)
- ERR_3001 (processing failure)

### analytical:ml_model_evaluation

Machine learning model evaluation and metrics.

**Parameters:**
- `predictions` (array): Model predictions
- `actual` (array): Actual values
- `modelType` (string): "classification", "regression"
- `metrics` (array, optional): Specific metrics to calculate

**Returns:** Model performance metrics and evaluation results.

**Possible Error Codes:**
- ERR_1001 (mismatched array lengths)
- ERR_1004 (invalid model type)
- ERR_3005 (metric calculation failure)

### analytical:recommendation_provider

Generate recommendations based on data analysis.

**Parameters:**
- `data` (array): Input data for recommendations
- `recommendationType` (string): "collaborative", "content_based", "hybrid"
- `userProfile` (object, optional): User preferences
- `maxRecommendations` (number, optional): Maximum recommendations (default: 5)

**Returns:** Ranked recommendations with confidence scores.

**Possible Error Codes:**
- ERR_1002 (missing profile data)
- ERR_3004 (insufficient data)

### analytical:data_resource_management

Manage and optimize data resources.

**Parameters:**
- `operation` (string): "optimize", "cache", "cleanup", "validate"
- `resourceType` (string): "dataset", "model", "cache"
- `filePath` (string, optional): Path to resource file

**Returns:** Resource management results and optimization metrics.

**Possible Error Codes:**
- ERR_4001 (file not found)
- ERR_4003 (permission denied)
- ERR_3002 (memory limit)

### analytical:exa_research

Advanced research using Exa API integration.

**Parameters:**
- `query` (string): Research query
- `type` (string): "search", "contents", "find_similar"
- `options` (object, optional): Search configuration

**Returns:** Research results with relevance scoring.

**Possible Error Codes:**
- ERR_2001, ERR_2002, ERR_2003 (API issues)
- ERR_4001 (missing API key)

### analytical:argument_structure_provider

Analyze argument structure and components.

**Parameters:**
- `argument` (string): Argument text
- `structureType` (string, optional): "basic", "detailed", "formal"

**Returns:** Argument structure with premises, conclusions, and logical flow.

**Possible Error Codes:**
- ERR_1002 (empty argument)
- ERR_3003 (processing timeout)

### analytical:argument_validity_provider

Assess argument validity and logical soundness.

**Parameters:**
- `argument` (string): Argument to validate
- `validationType` (string, optional): "formal", "informal", "both"

**Returns:** Validity assessment with reasoning and suggestions.

**Possible Error Codes:**
- ERR_1001 (invalid text format)
- ERR_3003 (analysis timeout)

### analytical:argument_strength_provider

Evaluate argument strength and persuasiveness.

**Parameters:**
- `argument` (string): Argument text
- `strengthCriteria` (array, optional): Specific criteria to evaluate

**Returns:** Strength assessment with detailed analysis.

**Possible Error Codes:**
- ERR_1002 (missing argument text)
- ERR_3001 (evaluation failure)

### analytical:logical_fallacy_provider

Comprehensive logical fallacy analysis and education.

**Parameters:**
- `text` (string): Text to analyze
- `fallacyTypes` (array, optional): Specific fallacy types to check
- `educationalMode` (boolean, optional): Include explanations (default: false)

**Returns:** Fallacy detection with educational content.

**Possible Error Codes:**
- ERR_1005 (text too long)
- ERR_3003 (processing timeout)

## Error Handling

All tools implement comprehensive error handling with standardized error codes:

### Error Response Format
```json
{
  "error": {
    "code": "ERR_1001",
    "message": "[tool_name] Invalid input data format",
    "context": {
      "toolName": "analyze_dataset",
      "timestamp": "2025-08-01T16:42:00.000Z",
      "parameters": {...},
      "recoverable": false
    }
  }
}
```

### Common Error Codes by Tool Category

#### Data Analysis Tools
- **ERR_1001**: Invalid input data format
- **ERR_1004**: Invalid parameter type
- **ERR_3001**: Calculation failed
- **ERR_3004**: Insufficient data points

#### API-Dependent Tools (Research)
- **ERR_2001**: API rate limit exceeded
- **ERR_2003**: API request timeout
- **ERR_2004**: Service unavailable
- **ERR_4001**: Missing API configuration

#### Logic Analysis Tools
- **ERR_1002**: Missing required parameter
- **ERR_1005**: Parameter out of range
- **ERR_3003**: Processing timeout

### Recovery Behavior
- **Automatic Retry**: API errors (ERR_2xxx) with exponential backoff
- **Fallback**: Cache usage when external services fail
- **Graceful Degradation**: Reduced functionality for non-critical errors

## Rate Limiting

Research tools using external APIs:
- Built-in retry logic with exponential backoff
- Configurable timeout settings
- Graceful degradation when limits are reached

## Logging System

### Logger Implementation
- Centralized Logger class in src/utils/logger.ts
- MCP protocol compliance (stderr for logs, stdout for protocol communication)
- Singleton pattern for consistent instance usage
- Log levels: info, warn, error

### Usage Pattern
```typescript
import { Logger } from './utils/logger.js';
const logger = Logger.getInstance();

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message');
```

### Utility Script Integration
- tools/cache-manager.js: Cache management with Logger integration
- tools/check-api-keys.js: API key validation with Logger integration
- All utility scripts use Logger instead of console statements
- Examples directory preserves console output for demonstration clarity
