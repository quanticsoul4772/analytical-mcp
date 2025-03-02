# Analytical MCP Server API Reference

This document provides a comprehensive reference for all tools available in the Analytical MCP Server.

## Table of Contents

- [Data Analysis Tools](#data-analysis-tools)
  - [analyze_dataset](#analyze_dataset)
  - [advanced_regression_analysis](#advanced_regression_analysis)
  - [advanced_statistical_analysis](#advanced_statistical_analysis)
  - [data_visualization_generator](#data_visualization_generator)
- [Decision Analysis Tools](#decision-analysis-tools)
  - [decision_analysis](#decision_analysis)
- [Logical Reasoning Tools](#logical-reasoning-tools)
  - [logical_argument_analyzer](#logical_argument_analyzer)
  - [logical_fallacy_detector](#logical_fallacy_detector)
- [Perspective Generation Tools](#perspective-generation-tools)
  - [perspective_shifter](#perspective_shifter)
- [Research Tools](#research-tools)
  - [exa_research](#exa_research)
  - [research_integration](#research_integration)

---

## Data Analysis Tools

### analyze_dataset

Analyze a dataset with statistical methods.

#### Input Parameters

```typescript
{
  data: Array<Record<string, any>>;  // Array of data objects
  columns?: string[];                // Columns to analyze (default: all)
  analysisTypes?: Array<
    | 'summary'                      // Basic summary statistics
    | 'correlation'                  // Correlation analysis
    | 'distribution'                 // Distribution analysis
    | 'outliers'                     // Outlier detection
    | 'all'                          // All analysis types
  >;
  options?: {
    significanceLevel?: number;      // Statistical significance level (default: 0.05)
    excludeNulls?: boolean;          // Whether to exclude null values (default: true)
    normalizeData?: boolean;         // Whether to normalize data (default: false)
  };
}
```

#### Response

```typescript
{
  summary: {
    count: number;                   // Number of records
    columns: Record<string, {        // Per-column statistics
      mean?: number;                 // Mean (numerical columns)
      median?: number;               // Median (numerical columns)
      min?: any;                     // Minimum value
      max?: any;                     // Maximum value
      std?: number;                  // Standard deviation (numerical columns)
      nullCount: number;             // Count of null values
      uniqueCount: number;           // Count of unique values
    }>;
  };
  correlation?: Record<string, Record<string, number>>; // Correlation matrix
  distribution?: Record<string, Array<{
    bin: string | number;            // Distribution bin
    count: number;                   // Count in bin
    percentage: number;              // Percentage in bin
  }>>;
  outliers?: Record<string, Array<{
    value: any;                      // Outlier value
    index: number;                   // Index in dataset
    score: number;                   // Outlier score
  }>>;
  executionTime: number;             // Analysis execution time in ms
}
```

### advanced_regression_analysis

Perform advanced regression analysis on datasets.

#### Input Parameters

```typescript
{
  data: Array<Record<string, any>>;  // Array of data objects
  dependentVariable: string;         // Target variable
  independentVariables: string[];    // Predictor variables
  regressionType:
    | 'linear'                       // Linear regression
    | 'polynomial'                   // Polynomial regression
    | 'logistic'                     // Logistic regression
    | 'multivariate';                // Multivariate regression
  options?: {
    polynomialDegree?: number;       // Degree for polynomial regression (default: 2)
    testSize?: number;               // Proportion of test data (default: 0.2)
    standardize?: boolean;           // Whether to standardize variables (default: true)
    confidenceLevel?: number;        // Confidence level for intervals (default: 0.95)
  };
}
```

#### Response

```typescript
{
  coefficients: Record<string, number>; // Regression coefficients
  modelFit: {
    rSquared: number;                // R-squared value
    adjustedRSquared: number;        // Adjusted R-squared
    rootMeanSquaredError: number;    // RMSE
    pValue: number;                  // Model p-value
  };
  predictions?: {
    trainingData: Array<{
      actual: number;                // Actual value
      predicted: number;             // Predicted value
      residual: number;              // Residual (actual - predicted)
    }>;
    testData?: Array<{
      actual: number;                // Actual value
      predicted: number;             // Predicted value
      residual: number;              // Residual (actual - predicted)
    }>;
  };
  confidenceIntervals?: Record<string, {
    lower: number;                   // Lower confidence bound
    upper: number;                   // Upper confidence bound
  }>;
  equation: string;                  // Human-readable equation
  executionTime: number;             // Execution time in ms
}
```

### advanced_statistical_analysis

Perform comprehensive statistical analysis on datasets.

#### Input Parameters

```typescript
{
  data: Array<Record<string, any>>;  // Array of data objects
  analysisTypes: Array<
    | 'descriptive'                  // Descriptive statistics
    | 'inferential'                  // Inferential statistics
    | 'timeSeries'                   // Time series analysis
    | 'multivariate'                 // Multivariate analysis
  >;
  variables: {
    dependent?: string[];            // Dependent variables
    independent?: string[];          // Independent variables
    timeVariable?: string;           // Time variable for time series
    groupVariable?: string;          // Grouping variable
  };
  options?: {
    confidenceLevel?: number;        // Confidence level (default: 0.95)
    adjustForMultipleTesting?: boolean; // Adjust p-values (default: true)
    seasonalPeriod?: number;         // Period for seasonal analysis
    missingValueStrategy?:           // Missing value handling
      | 'remove'                     // Remove rows with missing values
      | 'mean'                       // Replace with mean
      | 'median'                     // Replace with median
      | 'interpolate';               // Linear interpolation
  };
}
```

#### Response

```typescript
{
  descriptive?: {
    summary: Record<string, {
      mean: number;                  // Mean
      median: number;                // Median
      mode: number | string | null;  // Mode (most frequent)
      variance: number;              // Variance
      standardDeviation: number;     // Standard deviation
      skewness: number;              // Skewness
      kurtosis: number;              // Kurtosis
      range: number;                 // Range (max - min)
      quantiles: {                   // Quantile values
        q1: number;                  // First quartile (25%)
        q2: number;                  // Second quartile (50%, median)
        q3: number;                  // Third quartile (75%)
      };
    }>;
  };
  inferential?: {
    testResults: Array<{
      testName: string;              // Name of statistical test
      variables: string[];           // Variables involved
      statistic: number;             // Test statistic
      pValue: number;                // p-value
      significanceLevel: number;     // Significance level
      significant: boolean;          // Whether result is significant
      interpretation: string;        // Human-readable interpretation
    }>;
  };
  timeSeries?: {
    variables: Record<string, {
      trend: {
        coefficient: number;         // Trend coefficient
        pValue: number;              // Significance of trend
      };
      seasonality: {
        detected: boolean;           // Whether seasonality is detected
        period: number;              // Seasonal period
        strength: number;            // Strength of seasonality
      };
      stationarity: {
        stationary: boolean;         // Whether series is stationary
        pValue: number;              // p-value from stationarity test
      };
      forecast?: Array<{
        timestamp: string;           // Forecast timestamp
        value: number;               // Forecast value
        lower: number;               // Lower prediction interval
        upper: number;               // Upper prediction interval
      }>;
    }>;
  };
  multivariate?: {
    correlationMatrix: Record<string, Record<string, number>>;
    principalComponents?: Array<{
      component: number;             // Component number
      eigenvalue: number;            // Eigenvalue
      varianceExplained: number;     // Percentage of variance explained
      cumulativeVariance: number;    // Cumulative variance explained
      loadings: Record<string, number>; // Variable loadings
    }>;
    clusterAnalysis?: {
      clusters: number;              // Number of clusters
      silhouetteScore: number;       // Silhouette score (quality)
      clusterSizes: number[];        // Size of each cluster
      clusterCentroids: Array<Record<string, number>>; // Centroids
    };
  };
  executionTime: number;             // Execution time in ms
}
```

### data_visualization_generator

Generate specifications for data visualizations.

#### Input Parameters

```typescript
{
  data: Array<Record<string, any>>;  // Array of data objects
  visualizationType:
    | 'bar'                          // Bar chart
    | 'line'                         // Line chart
    | 'scatter'                      // Scatter plot
    | 'pie'                          // Pie chart
    | 'histogram'                    // Histogram
    | 'heatmap'                      // Heatmap
    | 'boxplot';                     // Box plot
  variables: {
    x?: string;                      // X-axis variable
    y?: string | string[];           // Y-axis variable(s)
    color?: string;                  // Color grouping variable
    size?: string;                   // Size variable
    label?: string;                  // Label variable
  };
  options?: {
    title?: string;                  // Chart title
    subtitle?: string;               // Chart subtitle
    xAxisLabel?: string;             // X-axis label
    yAxisLabel?: string;             // Y-axis label
    colorScheme?: string;            // Color scheme name
    aggregationMethod?:              // Data aggregation method
      | 'sum'                        // Sum values
      | 'average'                    // Average values
      | 'count'                      // Count values
      | 'min'                        // Minimum value
      | 'max';                       // Maximum value
    sortBy?: string;                 // Sort variable
    sortDirection?: 'asc' | 'desc';  // Sort direction
    limit?: number;                  // Limit number of data points
    normalized?: boolean;            // Use normalized values
  };
}
```

#### Response

```typescript
{
  specification: {
    type: string;                    // Visualization type
    title: string;                   // Chart title
    subtitle?: string;               // Chart subtitle
    data: {
      values: Array<Record<string, any>>; // Processed data
    };
    encoding: {                      // Visual encodings
      x?: {
        field: string;               // X-axis field
        type: string;                // Data type (quantitative, nominal, etc.)
        title: string;               // Axis title
      };
      y?: {
        field: string;               // Y-axis field
        type: string;                // Data type
        title: string;               // Axis title
      };
      color?: {
        field: string;               // Color field
        type: string;                // Data type
        scale: {
          scheme: string;            // Color scheme
        };
        title: string;               // Legend title
      };
      // Other encodings as needed
    };
    // Visualization-specific properties
  };
  recommendations?: Array<{
    type: string;                    // Recommended visualization type
    reason: string;                  // Reason for recommendation
    score: number;                   // Recommendation score
  }>;
  insights?: Array<{
    type: string;                    // Insight type
    description: string;             // Human-readable description
    importance: number;              // Importance score
  }>;
  formatOptions: {
    vega: boolean;                   // Whether Vega-Lite format is available
    plotly: boolean;                 // Whether Plotly format is available
    echarts: boolean;                // Whether ECharts format is available
  };
  executionTime: number;             // Execution time in ms
}
```

## Decision Analysis Tools

### decision_analysis

Analyze decision options based on multiple criteria.

#### Input Parameters

```typescript
{
  options: Array<{
    id: string;                      // Option identifier
    name: string;                    // Option name
    description?: string;            // Option description
  }>;
  criteria: Array<{
    id: string;                      // Criterion identifier
    name: string;                    // Criterion name
    description?: string;            // Criterion description
    weight: number;                  // Criterion weight (0-1)
    type: 'benefit' | 'cost';        // Benefit (higher is better) or cost (lower is better)
  }>;
  evaluations: Array<{
    optionId: string;                // Option identifier
    criterionId: string;             // Criterion identifier
    value: number;                   // Evaluation value
    confidence?: number;             // Confidence in evaluation (0-1)
  }>;
  analysisType?:
    | 'weighted-sum'                 // Weighted sum model
    | 'ahp'                          // Analytic Hierarchy Process
    | 'topsis'                       // TOPSIS method
    | 'all';                         // All methods
  sensitivityAnalysis?: boolean;     // Whether to perform sensitivity analysis
  constraintThresholds?: Record<string, {
    criterionId: string;             // Criterion identifier
    minValue?: number;               // Minimum acceptable value
    maxValue?: number;               // Maximum acceptable value
  }>;
}
```

#### Response

```typescript
{
  rankings: {
    weightedSum?: Array<{
      optionId: string;              // Option identifier
      name: string;                  // Option name
      score: number;                 // Overall score
      rank: number;                  // Rank (1 = best)
      normalizedScore: number;       // Score normalized to 0-1
      criteriaScores: Record<string, {
        raw: number;                 // Raw criterion score
        weighted: number;            // Weighted criterion score
        contribution: number;        // Contribution to overall score (%)
      }>;
    }>;
    // Results for other methods if requested
  };
  bestOption: {
    id: string;                      // Best option identifier
    name: string;                    // Best option name
    score: number;                   // Best option score
    method: string;                  // Method that selected this option
    winningMargin: number;           // Margin over second best
    winningReasons: string[];        // Reasons this option won
  };
  sensitivityAnalysis?: {
    criticalCriteria: Array<{
      criterionId: string;           // Criterion identifier
      name: string;                  // Criterion name
      sensitivity: number;           // Sensitivity score
      switchingPoint: number;        // Weight at which ranking changes
    }>;
    robustness: Record<string, number>; // Robustness score per option
  };
  constraints?: {
    satisfiedByAll: string[];        // Constraints satisfied by all options
    violatedOptions: Record<string, string[]>; // Violations per option
  };
  executionTime: number;             // Execution time in ms
}
```

## Logical Reasoning Tools

### logical_argument_analyzer

Analyze logical arguments for structure, fallacies, validity, and strength.

#### Input Parameters

```typescript
{
  text: string;                      // Text containing the argument
  analysisTypes?: Array<
    | 'structure'                    // Argument structure
    | 'fallacies'                    // Logical fallacies
    | 'validity'                     // Logical validity
    | 'strength'                     // Argument strength
    | 'all'                          // All analysis types
  >;
  options?: {
    identifyPremisesAndConclusions?: boolean; // Extract premises and conclusions
    fallacyConfidenceThreshold?: number; // Minimum confidence for fallacy detection
    includeImplicitPremises?: boolean; // Identify unstated premises
    formalLogicNotation?: boolean;  // Use formal logic notation
  };
}
```

#### Response

```typescript
{
  structure?: {
    premises: Array<{
      text: string;                  // Premise text
      type: 'explicit' | 'implicit'; // Premise type
      strength: number;              // Premise strength (0-1)
    }>;
    conclusions: Array<{
      text: string;                  // Conclusion text
      strength: number;              // Conclusion strength (0-1)
    }>;
    argumentType:                    // Argument classification
      | 'deductive'                  // Deductive argument
      | 'inductive'                  // Inductive argument
      | 'abductive'                  // Abductive argument
      | 'analogical';                // Argument by analogy
    formalStructure?: string;        // Formal logic notation
  };
  fallacies?: Array<{
    name: string;                    // Fallacy name
    category: string;                // Fallacy category
    description: string;             // Fallacy description
    confidence: number;              // Detection confidence
    location: {
      text: string;                  // Text containing fallacy
      start: number;                 // Start position
      end: number;                   // End position
    };
    suggestion?: string;             // Suggestion for improvement
  }>;
  validity?: {
    isValid: boolean;                // Whether argument is logically valid
    validityScore: number;           // Validity score (0-1)
    invalidReason?: string;          // Reason for invalidity
    truthPreservation?: boolean;     // Whether argument preserves truth
  };
  strength?: {
    overallStrength: number;         // Overall argument strength (0-1)
    persuasiveness: number;          // Persuasiveness score (0-1)
    evidenceQuality: number;         // Evidence quality score (0-1)
    coherence: number;               // Coherence score (0-1)
    relevance: number;               // Relevance score (0-1)
  };
  summary: string;                   // Summary of analysis
  improvements: string[];            // Suggested improvements
  executionTime: number;             // Execution time in ms
}
```

### logical_fallacy_detector

Detect and explain logical fallacies in text with confidence scoring.

#### Input Parameters

```typescript
{
  text: string;                      // Text to analyze for logical fallacies
  confidenceThreshold?: number;      // Minimum confidence level to report a fallacy (0-1)
  categories?: Array<
    | 'informal'                     // Informal fallacies
    | 'formal'                       // Formal fallacies
    | 'relevance'                    // Relevance fallacies
    | 'ambiguity'                    // Ambiguity fallacies
    | 'all'                          // All fallacy categories
  >;
  includeExplanations?: boolean;     // Include detailed explanations
  includeExamples?: boolean;         // Include examples of good and bad reasoning
}
```

#### Response

```typescript
{
  detectedFallacies: Array<{
    name: string;                    // Fallacy name
    category: string;                // Fallacy category
    confidence: number;              // Detection confidence
    description: string;             // Fallacy description
    examples?: {
      bad: string;                   // Example of fallacious reasoning
      good: string;                  // Example of improved reasoning
    };
  }>;
  severity: 'Low' | 'Moderate' | 'High'; // Overall severity rating
  reportMarkdown: string;            // Detailed markdown report
}
```

## Perspective Generation Tools

### perspective_shifter

Generate alternative perspectives on a problem or situation.

#### Input Parameters

```typescript
{
  problem: string;                   // Problem or situation description
  currentPerspective?: string;       // Current perspective or approach
  desiredOutcome?: string;           // Desired outcome or goal
  domains?: string[];                // Domains to consider (default: diverse set)
  perspectiveTypes?: Array<
    | 'opposite'                     // Opposite perspective
    | 'adjacent'                     // Adjacent/related perspective
    | 'orthogonal'                   // Orthogonal/unrelated perspective
    | 'historical'                   // Historical perspective
    | 'future'                       // Future-oriented perspective
    | 'interdisciplinary'            // Cross-domain perspective
    | 'random'                       // Random creative perspective
  >;
  constraints?: string[];            // Constraints to respect
  numberOfPerspectives?: number;     // Number of perspectives to generate
  detailLevel?:
    | 'brief'                        // Short summary
    | 'standard'                     // Standard detail
    | 'comprehensive';               // Comprehensive analysis
}
```

#### Response

```typescript
{
  perspectives: Array<{
    id: string;                      // Perspective identifier
    type: string;                    // Perspective type
    summary: string;                 // Brief summary
    details: string;                 // Detailed description
    domain: string;                  // Domain or field
    advantages: string[];            // Advantages of this perspective
    limitations: string[];           // Limitations of this perspective
    innovativeness: number;          // Innovativeness score (0-1)
    applicability: number;           // Applicability score (0-1)
  }>;
  connections: Array<{
    perspectiveIds: string[];        // Connected perspective IDs
    description: string;             // Description of connection
    strength: number;                // Connection strength (0-1)
  }>;
  metaPerspective: {
    patterns: string[];              // Patterns across perspectives
    overallInsight: string;          // Key insight from all perspectives
    recommendedCombination?: string[]; // Recommended perspective combination
  };
  executionTime: number;             // Execution time in ms
}
```

## Research Tools

### exa_research

Perform web research queries and extract relevant information.

#### Input Parameters

```typescript
{
  query: string;                     // Search query
  numResults?: number;               // Number of search results (1-10)
  timeRangeMonths?: number;          // Time range for results in months
  useWebResults?: boolean;           // Include web search results
  useNewsResults?: boolean;          // Include news results
  includeContents?: boolean;         // Include full content of search results
}
```

#### Response

```typescript
{
  results: Array<{
    title: string;                   // Result title
    url: string;                     // Result URL
    publishedDate?: string;          // Publication date
    contents?: string;               // Result content
    score?: number;                  // Relevance score
  }>;
}
```

### research_integration

Cross-domain research generation and knowledge synthesis.

#### Input Parameters

```typescript
{
  originalData: Array<any>;          // Original data to enrich
  context: string;                   // Research context
  options?: {
    numResults?: number;             // Number of results per search
    timeRangeMonths?: number;        // Time range in months
    includeNewsResults?: boolean;    // Include news results
  };
}
```

#### Response

```typescript
{
  enrichedData: Array<any>;          // Enriched data
  researchInsights: string[];        // Key insights from research
  confidence: number;                // Confidence in enrichment
}
```

For the cross-domain analogies feature:

#### Input Parameters

```typescript
{
  problem: string;                   // Problem statement
  domains?: string[];                // Domains to search (default: technology, science, business)
}
```

#### Response

```typescript
{
  analogies: string[];               // Cross-domain analogies
  potentialSolutions: string[];      // Potential solutions based on analogies
}
```
