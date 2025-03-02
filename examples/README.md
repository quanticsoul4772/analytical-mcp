# Analytical MCP Integration Examples

This directory contains practical examples demonstrating the powerful integrations between different analytical tools in the Analytical MCP Server. These examples showcase how combining research capabilities with analytical tools creates comprehensive analytical workflows that solve complex problems.

## Overview

The examples demonstrate four key integration patterns:

1. **Research-Enhanced Decision Analysis**: Integrates web research with multi-criteria decision analysis
2. **Fact-Checked Logical Analysis**: Combines logical fallacy detection with research validation
3. **Multi-Perspective Problem Solving**: Merges perspective shifting with cross-domain analogical research
4. **Data-Driven ML Evaluation**: Integrates ML model evaluation with research-enhanced analysis

## Cache Performance Examples

Additionally, we provide examples demonstrating the performance benefits of caching:

1. **Cache Performance Demo**: Shows the speed improvements from caching (95-99% faster response times)
2. **Cache-Aware Workflow**: Demonstrates a sophisticated stale-while-revalidate caching pattern

## Prerequisites

To run these examples, you'll need:

1. Node.js v20+
2. API keys for any external services (set in environment variables)
3. The Analytical MCP server built and ready

```bash
# Make sure the project is built
npm run build
```

## Running the Examples

You can run examples individually:

```bash
# Run the research-enhanced decision analysis example
node examples/research_enhanced_decision_analysis.js

# Run the fact-checked logical analysis example
node examples/fact_checked_logical_analysis.js

# Run the multi-perspective problem solving example
node examples/multi_perspective_problem_solving.js

# Run the data-driven ML evaluation example
node examples/data_driven_ml_evaluation.js

# Run the cache performance demo
node examples/cache_performance_demo.js

# Run the cache-aware workflow example
node examples/cache_aware_workflow.js
```

Or run all integration examples at once using the test suite:

```bash
# Run all integration examples
node examples/run_integration_examples.js

# Run specific examples by providing partial names
node examples/run_integration_examples.js decision logical
```

## Example Details

### Research-Enhanced Decision Analysis

**File**: `research_enhanced_decision_analysis.js`

This example demonstrates enhancing decision analysis with real-time research data. It evaluates technology investment opportunities by:

1. Defining decision options and criteria
2. Researching each option to gather insights
3. Using research confidence to weight evaluations
4. Performing a multi-criteria decision analysis
5. Generating a confidence-adjusted recommendation

**Integration Points**:
- `researchIntegration.enrichAnalyticalContext` ↔ `decisionAnalysis`

**Use Cases**:
- Investment decisions
- Technology selection
- Strategic planning
- Resource allocation

### Fact-Checked Logical Analysis

**File**: `fact_checked_logical_analysis.js`

This example shows how to combine logical analysis with fact-checking for robust argument evaluation. It analyzes policy arguments by:

1. Analyzing logical structure to identify premises and conclusions
2. Detecting logical fallacies in the argument
3. Fact-checking each premise with research
4. Determining argument strength based on logic AND evidence
5. Generating a comprehensive assessment report

**Integration Points**:
- `logicalArgumentAnalyzer` ↔ `logicalFallacyDetector` ↔ `researchIntegration`

**Use Cases**:
- Policy analysis
- Argument validation
- Critical thinking training
- Content verification

### Multi-Perspective Problem Solving

**File**: `multi_perspective_problem_solving.js`

This example demonstrates a comprehensive approach to creative problem-solving by:

1. Generating diverse perspectives on a problem
2. Researching cross-domain analogies
3. Integrating perspectives with analogical solutions
4. Evaluating integrated solutions using multi-criteria analysis
5. Creating a holistic action plan

**Integration Points**:
- `perspectiveShifter` ↔ `researchIntegration.findCrossdomainAnalogies` ↔ `decisionAnalysis`

**Use Cases**:
- Innovation challenges
- Complex problem solving
- Strategic planning
- Design thinking

### Data-Driven ML Evaluation

**File**: `data_driven_ml_evaluation.js`

This example shows how to perform context-aware machine learning model evaluation by:

1. Researching industry benchmarks for model metrics
2. Researching feature importance norms
3. Analyzing model dataset characteristics
4. Comparing model performance to research-based benchmarks
5. Generating evidence-based improvement recommendations

**Integration Points**:
- `researchIntegration` ↔ `analyzeDataset` ↔ `advancedRegressionAnalysis`

**Use Cases**:
- ML model evaluation
- AI performance benchmarking
- Model selection
- Feature engineering

### Cache Performance Demo

**File**: `cache_performance_demo.js`

This example demonstrates the performance benefits of caching by:

1. Performing identical operations with and without caching
2. Measuring and comparing execution times
3. Showing dramatic performance improvements (95-99% faster)
4. Displaying hit/miss statistics and cache utilization

**Integration Points**:
- `researchCache` ↔ `exaResearch` ↔ `researchIntegration`

**Use Cases**:
- Performance optimization
- API usage reduction
- System resilience improvement

### Cache-Aware Workflow

**File**: `cache_aware_workflow.js`

This example demonstrates sophisticated cache management using the stale-while-revalidate pattern by:

1. Immediately returning cached data when available (even if stale)
2. Background refreshing stale cache entries without blocking users
3. Configuring staleness thresholds for different data types
4. Providing graceful degradation when refresh operations fail

**Integration Points**:
- `researchCache` ↔ `researchIntegration` with custom caching logic

**Use Cases**:
- Interactive applications requiring responsive UIs
- Data dashboards with real-time updates
- Systems with varying data freshness requirements

## Advanced Integration Patterns

These examples demonstrate several key integration patterns that can be applied to other domains:

1. **Research → Analysis → Decision** pattern (Research-Enhanced Decision Analysis)
2. **Structure → Validation → Assessment** pattern (Fact-Checked Logical Analysis)
3. **Diverge → Research → Converge** pattern (Multi-Perspective Problem Solving)
4. **Benchmark → Evaluate → Recommend** pattern (Data-Driven ML Evaluation)
5. **Cache → Background Refresh → Update** pattern (Cache-Aware Workflow)

## Cache Management

For more advanced cache management, use the cache-manager tool:

```bash
# View cache statistics
npm run cache:stats

# Clear all caches
npm run cache:clear

# Preload cache from disk
npm run cache:preload

# Run cache performance demo
npm run cache:demo
```

## Error Handling

Each example includes comprehensive error handling to showcase robust implementation patterns:

1. Input validation with clear error messages
2. Graceful degradation when components fail
3. Fallback mechanisms when research is unavailable
4. Comprehensive logging for debugging

## Extending the Examples

You can use these examples as templates for your own integrations:

1. Create a new file in the `examples` directory
2. Import the necessary tools and utilities
3. Implement your integration workflow
4. Add your example to the `run_integration_examples.js` script
