# Examples

This directory contains example usage of the Analytical MCP Server tools.

## Basic Examples

### Dataset Analysis
```javascript
const { analyzeDataset } = require('../build/tools/analyze_dataset.js');

// Simple statistical analysis
analyzeDataset([23, 45, 67, 12, 89, 34, 56, 78], 'stats')
  .then(result => console.log(result));
```

### Decision Analysis
```javascript
const { decisionAnalysis } = require('../build/tools/decision_analysis.js');

// Multi-criteria decision making
decisionAnalysis({
  options: ['Cloud Migration', 'On-Premise', 'Hybrid'],
  criteria: ['Cost', 'Security', 'Scalability'],
  weights: [0.4, 0.3, 0.3]
}).then(result => console.log(result));
```

### Regression Analysis
```javascript
const { advancedRegressionAnalysis } = require('../build/tools/advanced_regression_analysis.js');

const salesData = [
  { advertising: 100, sales: 1200 },
  { advertising: 150, sales: 1500 },
  { advertising: 200, sales: 1800 },
  { advertising: 120, sales: 1400 }
];

advancedRegressionAnalysis(
  salesData, 
  'linear', 
  ['advertising'], 
  'sales'
).then(result => console.log(result));
```

## Running Examples

```bash
# Basic sales analysis
node examples/sales_performance_analysis.js

# Market analysis workflow  
node examples/market_strategy_analysis.js

# Research-enhanced analysis
node examples/research_enhanced_decision_analysis.js

# Run all integration examples
node examples/run_integration_examples.js
```

## MCP Tool Usage

When using through Claude Desktop, call tools with the `analytical:` prefix:

- `analytical:analyze_dataset`
- `analytical:decision_analysis`
- `analytical:advanced_regression_analysis`
- `analytical:hypothesis_testing`
- `analytical:logical_argument_analyzer`
- `analytical:perspective_shifter`
- `analytical:verify_research`

See [API_REFERENCE.md](../docs/API_REFERENCE.md) for complete tool documentation.
