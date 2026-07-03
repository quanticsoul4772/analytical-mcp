# Examples

This directory contains example usage of the Analytical MCP Server tools. The
examples import directly from the compiled `build/` output (they are plain
ES modules, matching this project's `"type": "module"` setting), so you must
build the project before running them.

```bash
npm run build
```

## Basic Examples

### Dataset Analysis
```javascript
import { analyzeDataset } from '../build/tools/analyze_dataset.js';

// Simple statistical analysis (positional args: data, then analysisType)
analyzeDataset([23, 45, 67, 12, 89, 34, 56, 78], 'stats')
  .then(result => console.log(result));
```

### Decision Analysis
```javascript
import { decisionAnalysis } from '../build/tools/decision_analysis.js';

// Multi-criteria decision making. `scores` is required: one row per option,
// one 0-10 score per criterion (scores[i][j] = option i vs criterion j).
decisionAnalysis({
  options: ['Cloud Migration', 'On-Premise', 'Hybrid'],
  criteria: ['Cost', 'Security', 'Scalability'],
  scores: [
    [7, 6, 9], // Cloud Migration
    [4, 8, 4], // On-Premise
    [6, 7, 7]  // Hybrid
  ],
  weights: [0.4, 0.3, 0.3]
}).then(result => console.log(result));
```

### Regression Analysis
```javascript
import { advancedRegressionAnalysis } from '../build/tools/advanced_regression_analysis.js';

const salesData = [
  { advertising: 100, sales: 1200 },
  { advertising: 150, sales: 1500 },
  { advertising: 200, sales: 1800 },
  { advertising: 120, sales: 1400 }
];

advancedRegressionAnalysis({
  data: salesData,
  regressionType: 'linear',
  independentVariables: ['advertising'],
  dependentVariable: 'sales'
}).then(result => console.log(result));
```

## Running Examples

```bash
npm run build

# Housing market regression and investment decision analysis
node examples/housing_market_analysis.js

# Sales performance stats, hypothesis testing, and visualization
node examples/sales_performance_analysis.js

# Market strategy workflow: argument analysis, fallacy detection,
# perspective shifting, and decision analysis
node examples/market_strategy_analysis.js

# Research-enhanced decision analysis (requires a valid EXA_API_KEY in .env)
node examples/research_enhanced_decision_analysis.js
```

Note: `market_strategy_analysis.js` and `research_enhanced_decision_analysis.js`
call `perspectiveShifter` / `researchIntegration`, which make live Exa API
requests — set `EXA_API_KEY` in `.env` before running them.

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
