# API Reference

This document specifies the 12 tools registered by `registerTools()` in `src/tools/index.ts`, in
the order they are registered. All examples were checked against each tool's Zod schema and, where
a test file exists, against its test assertions.

Tools are accessed with the `analytical:` prefix when used through Claude Desktop
(e.g. `analytical:analyze_dataset`).

## analytical:analyze_dataset

Statistical analysis of a dataset. Source: `src/tools/analyze_dataset.ts`.

**Parameters:**
- `data` (array, required): `number[]` or an array of objects (`Record<string, any>[]`). If an
  array of objects is given, the tool uses the first numeric property it finds in the first object.
- `analysisType` (enum, optional): `"summary"` or `"stats"`. Default `"summary"`.

**Returns:** A markdown string.
- `"summary"`: count, average, min, max, sum, and a sample of the first 5 values.
- `"stats"`: count, sum, range, quartiles (Q1/Q2/Q3), mean, median, standard deviation, variance,
  and coefficient of variation.

**Example:**
```json
{
  "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "analysisType": "stats"
}
```

## analytical:decision_analysis

Multi-criteria decision analysis with weighted scoring. Source: `src/tools/decision_analysis.ts`.

**Parameters:**
- `options` (`string[]`, required): decision options.
- `criteria` (`string[]`, required): evaluation criteria.
- `scores` (`number[][]`, **required**): a score matrix, one row per option, one score per
  criterion. `scores[i][j]` rates option `i` against criterion `j`, on a **0–10** scale. This is a
  required parameter with no default — a `ValidationError` is thrown if it is missing, has the
  wrong shape, or contains values outside 0–10.
- `weights` (`number[]`, optional): one weight per criterion. If omitted, criteria are weighted
  equally. Weights are normalized to sum to 1 regardless of the scale they're supplied in.

**Returns:** A markdown report with a ranked list of options, a per-option breakdown table
(criterion / score / normalized weight / contribution), strengths (score ≥ 7) and weaknesses
(score ≤ 3) per option, and a top-option recommendation.

**Example:**
```json
{
  "options": ["Option A", "Option B"],
  "criteria": ["Cost", "Quality"],
  "scores": [
    [10, 0],
    [0, 10]
  ],
  "weights": [0.8, 0.2]
}
```
With these inputs, Option A scores `10*0.8 = 8.00` and Option B scores `10*0.2 = 2.00`, so Option A
ranks first (verified against `src/tools/__tests__/decision_analysis.test.ts`).

## analytical:advanced_regression_analysis

Regression analysis on datasets, dispatched to one of four provider classes under
`src/utils/*_regression_provider.ts`. Source: `src/tools/advanced_regression_analysis.ts`.

**Parameters:**
- `data` (`Record<string, number>[]`, required): data points.
- `regressionType` (enum, required): `"linear"`, `"polynomial"`, `"logistic"`, or `"multivariate"`.
- `independentVariables` (`string[]`, required, min 1): predictor variable names.
- `dependentVariable` (`string`, required, min length 1): response variable name.
- `polynomialDegree` (integer, optional, 2–6): degree for `"polynomial"` regression. Schema has no
  default; the coordinator applies a runtime default of `2` if omitted. Polynomial regression
  requires exactly one independent variable.
- `standardizeVariables` (boolean, optional): z-score standardize predictor columns before fitting.
  Default `false`.
- `useConfidenceInterval` (boolean, optional): include confidence intervals. Default `false`.
- `useTestSplit` (boolean, optional): use a train/test split. Default `false`.
- `includeMetrics` (boolean, optional): include model fit statistics. Default `true`.
- `includeCoefficients` (boolean, optional): include coefficient details. Default `true`.

**Returns:** A markdown report: analysis header (type, variables, options used), the regression
equation, coefficients table, and model fit statistics — verified against
`src/tools/__tests__/advanced_regression_analysis.test.ts` (asserts on `"Linear Equation:"`,
`"Coefficients"`, `"Model Fit Statistics"`, etc.).

**Example:**
```json
{
  "data": [
    { "x": 1, "y": 3 },
    { "x": 2, "y": 5 },
    { "x": 3, "y": 7 },
    { "x": 4, "y": 9 }
  ],
  "regressionType": "linear",
  "independentVariables": ["x"],
  "dependentVariable": "y"
}
```

## analytical:hypothesis_testing

Statistical hypothesis testing with real p-values computed from the special functions in
`src/utils/statistics.ts` (log-gamma / incomplete-beta / incomplete-gamma based CDFs — no
approximation tables). Source: `src/tools/hypothesis_testing.ts`.

**Parameters:**
- `testType` (enum, required): exactly `"t_test_independent"`, `"t_test_paired"`, `"correlation"`,
  `"chi_square"`, or `"anova"` — read directly from the Zod enum.
- `data` (required): shape depends on `testType`:
  - `t_test_independent`, `t_test_paired`: two numeric arrays, `[group1, group2]`.
  - `correlation`: two numeric arrays `[x, y]`, or an array of records (uses `variables[0]`/`[1]`
    or the first two object keys).
  - `chi_square`: a contingency table, `number[][]`, at least 2×2, non-negative counts.
  - `anova`: two or more numeric arrays (one per group).
- `variables` (`string[]`, optional): variable names, used by `correlation` when `data` is an
  array of records.
- `alpha` (number, optional, 0.01–0.1): significance level. Default `0.05`.
- `alternativeHypothesis` (string, optional): only meaningful for the two t-test types. Accepted
  values are `"less"` or `"greater"` (case-insensitive); anything else — including omission —
  resolves to a two-sided test. This is a free-form string in the schema, not an enum.

**Returns:** A markdown report headed `# Hypothesis Testing Report`, containing a results table
specific to the test (t-statistic/F-statistic/chi-square, degrees of freedom, p-value, alpha, and
a Reject/Fail-to-reject conclusion line). The independent t-test uses Welch's t-test
(Welch–Satterthwaite degrees of freedom, not pooled variance).

**Example:**
```json
{
  "testType": "t_test_independent",
  "data": [
    [5.1, 4.9, 5.3, 5.2, 4.8],
    [4.2, 4.0, 4.4, 4.1, 4.3]
  ],
  "alpha": 0.05
}
```
This example is taken from `src/tools/__tests__/hypothesis_testing.test.ts`, which asserts the
result contains `"Independent T-Test Results (Welch)"` and `"Reject null hypothesis"`.

## analytical:data_visualization_generator

Generates a visualization specification (Vega-Lite based) plus usage guidance. Source:
`src/tools/data_visualization_generator.ts`.

**Parameters:**
- `data` (`Record<string, any>[]`, required): data objects to visualize.
- `visualizationType` (enum, required): `"scatter"`, `"line"`, `"bar"`, `"histogram"`, `"box"`,
  `"heatmap"`, `"pie"`, `"violin"`, or `"correlation"`. (`"violin"` and `"correlation"` are not in
  older versions of this document.)
- `variables` (`string[]`, required): property names in `data` to visualize.
- `title` (string, optional): defaults to an auto-generated title from the type and variables.
- `includeTrendline` (boolean, optional): include a trendline, relevant for scatter plots. Default
  `false`.
- `options` (`Record<string, any>`, optional): additional, chart-specific options passed through to
  spec generation.

**Returns:** A markdown report: header, chart-type-specific notes, the generated specification
(as JSON inside the report), usage instructions, and recommendations.

**Example:**
```json
{
  "data": [
    { "category": "A", "value": 10 },
    { "category": "B", "value": 20 }
  ],
  "visualizationType": "bar",
  "variables": ["category", "value"]
}
```

## analytical:logical_argument_analyzer

Analyzes an argument's structure, fallacies, validity, and strength using a provider-per-concern
architecture (`ArgumentStructureProvider`, `LogicalFallacyProvider`, `ArgumentValidityProvider`,
`ArgumentStrengthProvider`, `RecommendationProvider`). Source:
`src/tools/logical_argument_analyzer.ts`.

**Parameters:**
- `argument` (string, required): the argument text to analyze.
- `analysisType` (enum, optional): `"structure"`, `"fallacies"`, `"validity"`, `"strength"`, or
  `"comprehensive"`. Default `"comprehensive"`. (Note: the parameter is `analysisType`, not
  `analysisDepth` — there is no `analysisDepth` parameter on this tool.)
- `includeRecommendations` (boolean, optional): include improvement recommendations. Default
  `true`.

**Returns:** A markdown report containing the argument text plus whichever of structure /
fallacies / validity / strength sections `analysisType` selects, followed by recommendations if
requested.

**Example:**
```json
{
  "argument": "All swans I have seen are white, therefore all swans are white.",
  "analysisType": "comprehensive"
}
```

## analytical:logical_fallacy_detector

Detects logical fallacies in text via a fixed set of regex-based fallacy signals. Source:
`src/tools/logical_fallacy_detector.ts`.

**Parameters:**
- `text` (string, required): text to analyze.
- `confidenceThreshold` (number, optional, 0–1): minimum confidence to report a fallacy. Default
  `0.5` in the tool's own schema (`registerTools()` applies its own fallback of `0.7` when this
  argument is omitted — see note below).
- `categories` (array of enum, optional): one or more of `"informal"`, `"formal"`, `"relevance"`,
  `"ambiguity"`, `"all"`. Default `["all"]`.
- `includeExplanations` (boolean, optional): include a description of each detected fallacy.
  Default `true`.
- `includeExamples` (boolean, optional): include a "bad"/"good" example pair per detected fallacy.
  Default `true`.

> Note: the tool module's own default for `confidenceThreshold` is `0.5`, but the MCP
> registration wrapper in `src/tools/index.ts` calls the handler with
> `confidenceThreshold || 0.7` — so when this parameter is omitted through the MCP tool call, the
> effective default is `0.7`, not `0.5`.
>
> Also note: the registration wrapper's handler destructures only `{ text, confidenceThreshold }`
> from the incoming arguments and ignores `categories`, `includeExplanations`, and
> `includeExamples` entirely — even though the registered Zod schema declares (and validates)
> those three fields. In practice, calling `analytical:logical_fallacy_detector` always runs with
> `categories: ['all']`, `includeExplanations: true`, `includeExamples: true`, regardless of what
> a caller passes for those fields.

**Returns:** A markdown report (`# Logical Fallacy Analysis`) with the original text, fallacies
grouped by category with a confidence percentage, and an overall severity assessment
(Low/Moderate/High based on the count detected).

**Example:**
```json
{
  "text": "You can't trust her climate policy because she's just a young activist.",
  "confidenceThreshold": 0.6
}
```

## analytical:perspective_shifter

Generates alternative perspectives on a problem by running one Exa web search per perspective
domain. Source: `src/tools/perspective_shifter.ts`.

**Requires `EXA_API_KEY`.** This tool is always registered (it appears in the MCP tool list
regardless of configuration), but every call performs a live Exa search via
`src/utils/exa_research.ts`. It will return an error result unless both:
- `EXA_API_KEY` is set in the environment, and
- `ENABLE_RESEARCH_INTEGRATION=true` is set (research integration is off by default — see
  `src/utils/config.ts`; `isFeatureEnabled('researchIntegration')` reads this env var directly,
  independent of `NODE_ENV`).

**Parameters:**
- `problem` (string, required): the problem or situation to analyze.
- `currentPerspective` (string, optional): default `"default"`.
- `shiftType` (enum, optional): `"stakeholder"`, `"discipline"`, `"contrarian"`, `"optimistic"`, or
  `"pessimistic"`. Default `"stakeholder"`. Only `"stakeholder"` and `"discipline"` have a
  predefined domain list (customer/employee/investor/... and technology/economics/psychology/...);
  the other values fall back to generated placeholder domain names.
- `numberOfPerspectives` (number, optional, 1–10): default `3`.
- `includeActionable` (boolean, optional): append an "Actionable Insights" note per perspective.
  Default `true`.

**Returns:** A markdown report with one section per perspective domain, each containing key facts
extracted from that domain's search results.

**Example:**
```json
{
  "problem": "Our SaaS product has high churn in the first 30 days.",
  "shiftType": "stakeholder",
  "numberOfPerspectives": 3
}
```

## analytical:advanced_statistical_analysis

Descriptive statistics and cross-variable Pearson correlation on tabular data. Source:
`src/tools/advanced_statistical_analysis.ts`. For a single numeric series use `analyze_dataset`.

**Schema:**
```
{
  data: Array<Record<string, number | string>>; // rows of named numeric (or string) fields
  analysisType: 'descriptive' | 'correlation';
}
```

**Example:**
```json
{
  "data": [
    { "revenue": 120, "spend": 40 },
    { "revenue": 150, "spend": 55 },
    { "revenue": 90, "spend": 30 }
  ],
  "analysisType": "correlation"
}
```

`descriptive` reports mean/median/standard deviation/variance/min/max per numeric column;
`correlation` reports the pairwise Pearson correlation between numeric columns.

## analytical:advanced_data_preprocessing

Preprocess a numeric dataset. Source: `src/tools/advanced_data_preprocessing.ts`.

**Schema:**
```
{
  data: Array<number | Record<string, number>>; // a flat numeric series or rows of numeric fields
  preprocessingType: 'normalization' | 'standardization'
    | 'missing_value_handling' | 'outlier_detection';
}
```

- `normalization` — min-max scale to [0, 1].
- `standardization` — z-score to mean 0, standard deviation 1.
- `missing_value_handling` — drop non-numeric/missing entries and report counts.
- `outlier_detection` — flag values outside Q1/Q3 ± 1.5·IQR.

**Example:**
```json
{ "data": [10, 20, 30, 40, 500], "preprocessingType": "outlier_detection" }
```

## analytical:ml_model_evaluation

Evaluate machine-learning model predictions. Source: `src/tools/ml_model_evaluation.ts`.

**Schema:**
```
{
  modelType: 'classification' | 'regression';
  actualValues: number[];       // ground-truth values (binary 0/1 for classification)
  predictedValues: number[];    // model predictions, same length as actualValues
  evaluationMetrics?: Array<     // optional; defaults to ['accuracy'] / ['mse'] by modelType
    'accuracy' | 'precision' | 'recall' | 'f1_score'   // classification
    | 'mse' | 'mae' | 'rmse' | 'r_squared'             // regression
  >;
}
```

Empty arrays, mismatched lengths, or an unknown `modelType` throw a `ValidationError` (surfaced
as an `isError` result). Classification metrics assume binary 0/1 labels; precision/recall/F1
report 0 (rather than `NaN`) when their denominator is zero.

**Example:**
```json
{
  "modelType": "classification",
  "actualValues": [1, 0, 1, 1, 0],
  "predictedValues": [1, 0, 0, 1, 0],
  "evaluationMetrics": ["accuracy", "precision", "recall", "f1_score"]
}
```

## analytical:verify_research

Cross-verifies a research claim against multiple sources with a computed confidence score. Source:
`src/tools/research_verification.ts`; registered with its own schema defined inline in
`src/tools/index.ts` (distinct from, but a subset of, the tool module's internal schema).

**Requires `EXA_API_KEY`.** Same registration/runtime behavior as `perspective_shifter` above:
always registered, but requires `EXA_API_KEY` and `ENABLE_RESEARCH_INTEGRATION=true` to actually
return results instead of an error.

**Parameters (as exposed to MCP clients):**
- `query` (string, required): primary research query.
- `verificationQueries` (`string[]`, optional, max 5): additional queries run (at most 3 in flight)
  alongside `query` for cross-verification.
- `minConsistencyThreshold` (number, optional, 0–1): default `0.7`.
- `sources` (number, optional, 1–10): number of results requested per query. Default `3`.

Note: the tool's internal implementation also accepts a `factExtractionOptions` object
(`{ maxFacts, minConfidence }`), but the MCP registration wrapper does not expose it as a
tool parameter — it is hardcoded to `{ maxFacts: 10, minConfidence: 0.7 }` for every call made
through the registered `verify_research` tool.

**Returns:** An object (serialized to JSON in the tool response), not markdown:
```ts
{
  verifiedResults: string[];      // all extracted facts across sources
  confidence: {
    score: number;                // 0–1, rounded to 2 decimals
    verified: boolean;            // score >= minConsistencyThreshold
    consistencyThreshold: number; // echoes minConsistencyThreshold
    details: {
      sourceConsistency: number;
      sourceCount: number;
      uniqueSources: string[];
      conflictingClaims: string[];       // human-readable "claim1 vs claim2" strings
      factExtractions: Array<{
        source: string;
        facts: Array<{ fact: string; type: string; confidence: number }>;
        sourceConfidence: number;
      }>;
    };
  };
}
```

**Example:**
```json
{
  "query": "Does intermittent fasting improve insulin sensitivity?",
  "verificationQueries": ["intermittent fasting insulin sensitivity clinical trial"],
  "minConsistencyThreshold": 0.7,
  "sources": 3
}
```

## Error Handling

Tools throw typed errors (`ValidationError`, `DataProcessingError`, `APIError`, defined in
`src/utils/errors.ts`) with an `ERR_xxxx` code and a message. The MCP registration wrapper in
`src/tools/index.ts` catches every error and returns an error result — `{ isError: true, content:
[{ type: 'text', text: 'Error: <message>' }] }` — so clients see a tool-level error, not a
protocol-level failure. (Inputs that fail Zod schema validation are rejected by the SDK before the
handler runs, and also surface as `isError`.)

## Logging System

- Centralized `Logger` class in `src/utils/logger.ts`.
- MCP protocol compliance: all logs go to stderr; stdout is reserved for MCP JSON-RPC traffic.
- Log levels: debug, info, warn, error.
