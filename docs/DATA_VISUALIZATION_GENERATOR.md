# Data Visualization Generator

## Overview

The Data Visualization Generator tool creates specifications for various data visualizations to effectively represent datasets. It produces structured visualization specifications that can be rendered by common visualization libraries.

## Features

- **Multiple Chart Types**: Generate bar charts, line charts, scatter plots, pie charts, histograms, heatmaps, and box plots
- **Visualization Recommendations**: Suggest appropriate visualization types for given data
- **Customizable Options**: Configure titles, labels, color schemes, and more
- **Data Transformation**: Apply aggregation and filtering to raw data
- **Insight Generation**: Extract key insights from visualizations
- **Multiple Output Formats**: Generate specifications compatible with popular visualization libraries

## Usage

### Basic Example

```javascript
const result = await data_visualization_generator({
  data: salesData,
  visualizationType: "bar",
  variables: {
    x: "product_category",
    y: "sales_amount",
    color: "region"
  },
  options: {
    title: "Sales by Product Category and Region",
    xAxisLabel: "Product Category",
    yAxisLabel: "Sales ($)",
    sortBy: "sales_amount",
    sortDirection: "desc"
  }
});
```

### Input Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `data` | Array<Object> | Array of data objects | (required) |
| `visualizationType` | string | Type of visualization to generate | (required) |
| `variables` | Object | Variable mappings for the visualization | (required) |
| `options` | Object | Visualization options and customizations | {} |

### Response Format

The tool returns a structured visualization specification with:

1. **Specification**: Complete visualization specification ready for rendering
2. **Recommendations**: Optional alternative visualization suggestions
3. **Insights**: Automatically extracted insights from the visualization
4. **Format Options**: Available output format information

## Visualization Types

### Bar Chart

Displays categorical data with rectangular bars representing values.

Best for:
- Comparing values across categories
- Showing frequency distributions
- Displaying part-to-whole relationships (stacked bars)

Required variables:
- `x`: Category variable
- `y`: Measure variable

### Line Chart

Shows trends over a continuous variable, typically time.

Best for:
- Time series data
- Showing trends and patterns
- Comparing multiple series over time

Required variables:
- `x`: Continuous variable (often time)
- `y`: Measure variable(s)

### Scatter Plot

Displays the relationship between two numerical variables.

Best for:
- Correlation analysis
- Distribution patterns
- Identifying clusters or outliers

Required variables:
- `x`: Numerical variable
- `y`: Numerical variable
- `size` (optional): Numerical variable for point size
- `color` (optional): Variable for point coloring

### Pie Chart

Circular chart divided into sectors representing proportion of the whole.

Best for:
- Part-to-whole relationships
- Simple proportional comparisons
- Limited number of categories (≤7)

Required variables:
- `label`: Category variable
- `size`: Measure variable

### Histogram

Shows the distribution of a numerical variable.

Best for:
- Frequency distributions
- Data distribution shape analysis
- Identifying outliers and gaps

Required variables:
- `x`: Numerical variable

### Heatmap

Represents data values as colors in a matrix format.

Best for:
- Correlation matrices
- Two-dimensional categorical data
- Displaying patterns in complex datasets

Required variables:
- `x`: Category/dimension variable
- `y`: Category/dimension variable
- `color`: Measure variable

### Box Plot

Shows distribution statistics including median, quartiles, and outliers.

Best for:
- Distribution comparison across categories
- Identifying outliers
- Showing data spread and skewness

Required variables:
- `x`: Category variable
- `y`: Numerical variable

## Implementation Details

### Generation Process

The visualization generation follows these steps:

1. **Data Analysis**
   - Determine variable types and ranges
   - Check for missing data
   - Identify key statistics

2. **Specification Creation**
   - Generate appropriate encodings
   - Apply visualization best practices
   - Optimize for clarity and effectiveness

3. **Recommendation Generation**
   - Consider data characteristics
   - Suggest alternative visualizations
   - Provide reasoning for recommendations

4. **Insight Extraction**
   - Identify trends, outliers, and patterns
   - Extract key observations
   - Prioritize insights by importance

### Format Compatibility

The tool can generate specifications for:
- Vega-Lite: Declarative visualization grammar
- Plotly: Interactive visualization library
- ECharts: Charting and visualization library

## Best Practices

When using the data visualization generator:

1. **Chart Selection**
   - Choose appropriate chart types for your data
   - Consider your audience and purpose
   - Favor simplicity over complexity

2. **Variable Mapping**
   - Map variables to appropriate visual encodings
   - Use color meaningfully and sparingly
   - Consider the natural order of variables

3. **Customization**
   - Use clear, descriptive titles and labels
   - Choose accessible color schemes
   - Include necessary context

4. **Data Preparation**
   - Aggregate large datasets appropriately
   - Handle missing values consistently
   - Consider data transformations for clarity

## Example Scenarios

### Sales Dashboard

```javascript
// Monthly sales trend
const salesTrend = await data_visualization_generator({
  data: salesData,
  visualizationType: "line",
  variables: {
    x: "month",
    y: "sales",
    color: "product_line"
  },
  options: {
    title: "Monthly Sales by Product Line",
    xAxisLabel: "Month",
    yAxisLabel: "Sales ($)"
  }
});

// Regional sales comparison
const regionalSales = await data_visualization_generator({
  data: salesData,
  visualizationType: "bar",
  variables: {
    x: "region",
    y: "sales"
  },
  options: {
    title: "Total Sales by Region",
    sortDirection: "desc",
    aggregationMethod: "sum"
  }
});
```

### Data Analysis

```javascript
// Correlation visualization
const correlationHeatmap = await data_visualization_generator({
  data: surveyData,
  visualizationType: "heatmap",
  variables: {
    x: "question_id",
    y: "respondent_group",
    color: "average_score"
  },
  options: {
    title: "Survey Response Patterns",
    colorScheme: "viridis"
  }
});

// Distribution analysis
const scoreDistribution = await data_visualization_generator({
  data: testScores,
  visualizationType: "histogram",
  variables: {
    x: "score",
    color: "department"
  },
  options: {
    title: "Test Score Distribution by Department"
  }
});
```

## Error Handling

The tool includes error handling for:

- **Invalid Input**: Validates all input parameters
- **Missing Required Variables**: Checks for required variable mappings
- **Data Type Mismatches**: Verifies variable types match visualization requirements
- **Empty Data**: Handles empty datasets gracefully

## Future Enhancements

Planned improvements include:

1. **Additional Visualization Types**
   - Network graphs
   - Geographic maps
   - Sankey diagrams
   - Radar charts

2. **Enhanced Customization**
   - Advanced theming
   - Annotation support
   - Interactive control specifications

3. **AI-Powered Recommendations**
   - Context-aware visualization suggestions
   - Automatic data preparation
   - Narrative generation
