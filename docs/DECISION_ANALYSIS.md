# Decision Analysis

## Overview

The Decision Analysis tool provides a structured approach to evaluating and comparing different options based on multiple criteria. It implements several multi-criteria decision analysis (MCDA) methods to help identify optimal choices and understand tradeoffs.

## Features

- **Multiple Decision Methods**: Weighted sum, Analytic Hierarchy Process (AHP), and TOPSIS
- **Criteria Weighting**: Specify importance of different factors in decision-making
- **Sensitivity Analysis**: Understand how changes in weights affect outcomes
- **Constraint Handling**: Define minimum/maximum thresholds for criteria
- **Comprehensive Rankings**: Get detailed rankings with scores and explanations
- **Best Option Identification**: Clear identification of optimal choices with justification

## Usage

### Basic Example

```javascript
const result = await decision_analysis({
  options: [
    { id: "opt1", name: "Option A", description: "First alternative" },
    { id: "opt2", name: "Option B", description: "Second alternative" },
    { id: "opt3", name: "Option C", description: "Third alternative" }
  ],
  criteria: [
    { id: "cost", name: "Cost", weight: 0.4, type: "cost" },
    { id: "quality", name: "Quality", weight: 0.35, type: "benefit" },
    { id: "time", name: "Implementation Time", weight: 0.25, type: "cost" }
  ],
  evaluations: [
    { optionId: "opt1", criterionId: "cost", value: 5000 },
    { optionId: "opt1", criterionId: "quality", value: 8 },
    { optionId: "opt1", criterionId: "time", value: 3 },
    // ... more evaluations for all options and criteria
  ],
  analysisType: "weighted-sum",
  sensitivityAnalysis: true
});
```

### Input Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `options` | Array<Object> | Array of decision options | (required) |
| `criteria` | Array<Object> | Array of criteria with weights | (required) |
| `evaluations` | Array<Object> | Option evaluations for each criterion | (required) |
| `analysisType` | string | Decision method to use | "weighted-sum" |
| `sensitivityAnalysis` | boolean | Whether to perform sensitivity analysis | false |
| `constraintThresholds` | Object | Minimum/maximum acceptable values | {} |

### Response Format

The tool returns a comprehensive analysis with:

1. **Rankings**: Ordered list of options with scores for each method
2. **Best Option**: Clear identification of the optimal choice with justification
3. **Sensitivity Analysis**: Information on how sensitive rankings are to weight changes
4. **Constraint Analysis**: Options that satisfy or violate defined constraints

## Decision Methods

### Weighted Sum

The simplest and most intuitive MCDA method. Each criterion score is multiplied by its weight, and the sum represents the overall score.

Best for:
- Straightforward decisions
- Independent criteria
- Situations requiring simple explanation

### Analytic Hierarchy Process (AHP)

A structured technique for organizing and analyzing complex decisions based on pairwise comparisons.

Best for:
- Hierarchical decision problems
- Qualitative and quantitative criteria
- Situations requiring consistency checks

### TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)

Identifies options that are closest to the ideal solution and furthest from the negative-ideal solution.

Best for:
- Decisions with clearly defined ideal points
- Handling benefit and cost criteria together
- Normalized comparison across different units

## Implementation Details

### Decision Process

The decision analysis follows these steps:

1. **Data Normalization**
   - Convert all criteria to a common scale
   - Handle benefit vs. cost criteria appropriately

2. **Method Application**
   - Apply the selected decision method(s)
   - Calculate scores for each option

3. **Ranking Generation**
   - Order options based on their scores
   - Calculate normalized scores and ranks

4. **Sensitivity Analysis** (if selected)
   - Identify critical criteria
   - Calculate switching points
   - Determine ranking robustness

5. **Constraint Checking** (if defined)
   - Verify options against constraints
   - Identify violations

### Performance Considerations

- **Weight Normalization**: Weights are normalized to sum to 1.0
- **Computational Efficiency**: Methods are optimized for large option sets
- **Precision Control**: Numerical precision is maintained throughout calculations

## Best Practices

When using the decision analysis tool:

1. **Criteria Selection**
   - Choose independent criteria to avoid double-counting
   - Ensure criteria comprehensively cover decision factors
   - Limit criteria to a manageable number (7±2)

2. **Weight Assignment**
   - Assign weights based on the relative importance of criteria
   - Consider using structured weight elicitation methods
   - Validate weights with stakeholders

3. **Evaluation Process**
   - Use consistent scales across evaluations
   - Document assumptions behind evaluations
   - Consider uncertainty in evaluations

4. **Result Interpretation**
   - Look beyond just the "best" option
   - Consider robustness and sensitivity
   - Examine tradeoffs between top options

## Example Scenarios

### Investment Decision

```javascript
// Comparing investment opportunities
const investmentAnalysis = await decision_analysis({
  options: [
    { id: "stock", name: "Stock Portfolio", description: "Diversified stocks" },
    { id: "bonds", name: "Bond Fund", description: "Government bonds" },
    { id: "realestate", name: "Real Estate", description: "Commercial property" }
  ],
  criteria: [
    { id: "return", name: "Expected Return", weight: 0.5, type: "benefit" },
    { id: "risk", name: "Risk Level", weight: 0.3, type: "cost" },
    { id: "liquidity", name: "Liquidity", weight: 0.2, type: "benefit" }
  ],
  // ... evaluations
  analysisType: "all",
  sensitivityAnalysis: true
});
```

### Vendor Selection

```javascript
// Selecting a software vendor
const vendorSelection = await decision_analysis({
  options: [
    { id: "vendor1", name: "Vendor A", description: "Established market leader" },
    { id: "vendor2", name: "Vendor B", description: "Innovative startup" },
    { id: "vendor3", name: "Vendor C", description: "Cost-effective solution" }
  ],
  criteria: [
    { id: "cost", name: "Total Cost", weight: 0.25, type: "cost" },
    { id: "features", name: "Feature Set", weight: 0.3, type: "benefit" },
    { id: "support", name: "Support Quality", weight: 0.2, type: "benefit" },
    { id: "reliability", name: "System Reliability", weight: 0.25, type: "benefit" }
  ],
  // ... evaluations
  constraintThresholds: {
    reliability: { minValue: 7 }  // Minimum acceptable reliability
  }
});
```

## Error Handling

The tool implements robust error handling for:

- **Invalid Input**: Validates all input parameters
- **Inconsistent Data**: Checks for missing evaluations or inconsistent criteria
- **Numerical Issues**: Handles division by zero and other numerical errors

## Future Enhancements

Planned improvements include:

1. **Additional Methods**
   - PROMETHEE method for preference ranking
   - ELECTRE method for outranking relations
   - Fuzzy multi-criteria decision analysis

2. **Enhanced Sensitivity Analysis**
   - Monte Carlo simulation for probabilistic analysis
   - Interactive sensitivity visualization

3. **Group Decision Support**
   - Aggregation of preferences from multiple stakeholders
   - Conflict resolution mechanisms
   - Consensus building support
