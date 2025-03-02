# Analyze Dataset

## Overview

The Analyze Dataset tool provides comprehensive statistical analysis of structured datasets. It examines data distributions, relationships, outliers, and summary statistics to help users gain insights from their data.

## Features

- **Summary Statistics**: Calculate mean, median, standard deviation, min/max values, and more
- **Correlation Analysis**: Identify relationships between variables
- **Distribution Analysis**: Understand the shape and characteristics of data distributions
- **Outlier Detection**: Identify anomalous data points
- **Configurable Analysis Types**: Select which analyses to perform
- **Column Filtering**: Focus analysis on specific variables of interest
- **Missing Data Handling**: Options for handling null values
- **Data Normalization**: Standardize data for comparable analysis

## Usage

### Basic Example

```javascript
const result = await analyze_dataset({
  data: customerData,
  columns: ["age", "income", "purchase_frequency", "satisfaction_score"],
  analysisTypes: ["summary", "correlation", "distribution"],
  options: {
    excludeNulls: true,
    significanceLevel: 0.05
  }
});
```

### Input Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `data` | Array<Object> | Array of data objects | (required) |
| `columns` | string[] | Columns to analyze | all columns |
| `analysisTypes` | string[] | Types of analysis to perform | ["all"] |
| `options.significanceLevel` | number | Statistical significance level | 0.05 |
| `options.excludeNulls` | boolean | Whether to exclude null values | true |
| `options.normalizeData` | boolean | Whether to normalize numerical data | false |

### Response Format

The tool returns a comprehensive analysis with:

1. **Summary**: Basic statistics for each column
2. **Correlation**: Relationships between numerical variables
3. **Distribution**: Data distribution characteristics
4. **Outliers**: Identified anomalous data points
5. **Execution Time**: Analysis performance metrics

## Analysis Types

### Summary

Calculates basic descriptive statistics for each column in the dataset.

For numerical columns:
- Count: Number of non-null values
- Mean: Average value
- Median: Middle value (50th percentile)
- Min/Max: Minimum and maximum values
- Standard Deviation: Measure of dispersion
- Variance: Square of standard deviation
- Quartiles: 25th, 50th, 75th percentiles
- Null Count: Number of missing values
- Unique Count: Number of distinct values

For categorical columns:
- Count: Number of non-null values
- Mode: Most frequent value
- Frequency: Count of most frequent value
- Unique Values: Number of distinct values
- Null Count: Number of missing values
- Category Distribution: Percentage breakdown by category

### Correlation

Analyzes relationships between numerical variables in the dataset.

Features:
- Pearson correlation coefficients
- Statistical significance testing
- Correlation matrix visualization structure
- Strength classification (strong, moderate, weak)
- Direction indication (positive, negative)

### Distribution

Analyzes the distribution characteristics of each variable.

For numerical variables:
- Histogram bins and counts
- Distribution shape classification (normal, skewed, bimodal, etc.)
- Skewness and kurtosis measurements
- Density estimation
- Cumulative distribution

For categorical variables:
- Frequency counts by category
- Percentage distribution
- Entropy measurement
- Distribution evenness assessment

### Outliers

Identifies anomalous data points using various detection methods.

Features:
- Z-score based outlier detection
- IQR (Interquartile Range) based detection
- Isolation Forest for complex outliers
- Local Outlier Factor for density-based detection
- Outlier scores and rankings
- Context-sensitive outlier reporting

## Implementation Details

### Analysis Process

The dataset analysis follows these steps:

1. **Data Validation**
   - Check data structure and types
   - Validate column existence
   - Identify numerical vs. categorical variables

2. **Data Preparation**
   - Handle missing values according to options
   - Apply normalization if requested
   - Format data for specific analyses

3. **Statistical Computation**
   - Calculate summary statistics
   - Compute correlations between variables
   - Analyze distributions
   - Detect outliers

4. **Result Compilation**
   - Format results in structured objects
   - Generate human-readable interpretations
   - Compile execution metrics

### Performance Considerations

The implementation includes several optimizations:

- **Lazy Computation**: Only performs requested analysis types
- **Column Subsetting**: Analyzes only specified columns
- **Vectorized Operations**: Uses optimized numerical operations
- **Memory Management**: Processes large datasets in chunks
- **Early Validation**: Fails quickly on invalid inputs

## Best Practices

When using the dataset analysis tool:

1. **Data Preparation**
   - Clean your data before analysis
   - Handle missing values appropriately
   - Consider normalizing data when comparing variables on different scales

2. **Analysis Selection**
   - Choose relevant analysis types for your goals
   - Start with summary statistics for an overview
   - Use correlation analysis to explore relationships
   - Check distributions to understand data characteristics
   - Look for outliers that might affect your analysis

3. **Result Interpretation**
   - Consider both statistical significance and practical significance
   - Look for patterns across different analyses
   - Pay attention to outliers and their potential impact
   - Use distribution insights to inform further analysis

4. **Performance Optimization**
   - Limit analysis to relevant columns for large datasets
   - Consider sampling for exploratory analysis of very large datasets
   - Select only needed analysis types

## Example Scenarios

### Customer Data Analysis

```javascript
// Analyze customer purchase behavior
const customerAnalysis = await analyze_dataset({
  data: customerData,
  columns: ["age", "income", "purchase_amount", "purchase_frequency", "customer_segment"],
  analysisTypes: ["summary", "correlation", "distribution"],
  options: {
    excludeNulls: true
  }
});

// Extract key insights
const avgPurchase = customerAnalysis.summary.columns["purchase_amount"].mean;
const ageIncomeCorrelation = customerAnalysis.correlation["age"]["income"];
const highValueSegments = customerAnalysis.distribution["customer_segment"]
  .filter(bin => bin.percentage > 15);
```

### Manufacturing Quality Control

```javascript
// Analyze production metrics and defect rates
const qualityAnalysis = await analyze_dataset({
  data: productionData,
  columns: ["temperature", "pressure", "speed", "material_type", "defect_rate"],
  analysisTypes: ["correlation", "outliers"],
  options: {
    significanceLevel: 0.01,
    normalizeData: true
  }
});

// Identify key factors affecting defect rates
const defectCorrelations = Object.keys(qualityAnalysis.correlation["defect_rate"])
  .filter(factor => Math.abs(qualityAnalysis.correlation["defect_rate"][factor]) > 0.5);

// Find production runs with anomalous conditions
const anomalousRuns = qualityAnalysis.outliers["temperature"].concat(
  qualityAnalysis.outliers["pressure"]
);
```

## Error Handling

The tool implements robust error handling for:

- **Invalid Data Format**: Validates data structure before processing
- **Missing Columns**: Checks for specified columns in the dataset
- **Type Mismatches**: Handles inappropriate data types gracefully
- **Computation Errors**: Manages errors in statistical calculations
- **Memory Limitations**: Handles large datasets appropriately

## Future Enhancements

Planned improvements include:

1. **Advanced Analysis Types**
   - Time series analysis for temporal data
   - Cluster analysis for pattern detection
   - Dimensionality reduction techniques
   - Regression analysis for relationship modeling

2. **Enhanced Visualizations**
   - Visualization specifications for key findings
   - Interactive visualization options
   - Automatic insight extraction

3. **Automated Recommendations**
   - Suggested next analysis steps
   - Automatic detection of interesting patterns
   - Anomaly explanation capabilities

4. **Causal Analysis**
   - Identify potential causal relationships
   - Perform quasi-experimental analysis
   - Suggest experimental designs for validation
