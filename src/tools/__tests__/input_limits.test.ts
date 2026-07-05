import { describe, it, expect } from '@jest/globals';

import { analyzeDatasetSchema } from '../analyze_dataset.js';
import { decisionAnalysisSchema } from '../decision_analysis.js';
import { advancedRegressionAnalysisSchema } from '../advanced_regression_analysis.js';
import { hypothesisTestingSchema } from '../hypothesis_testing.js';
import { dataVisualizationGeneratorSchema } from '../data_visualization_generator.js';
import { logicalArgumentAnalyzerSchema } from '../logical_argument_analyzer.js';
import { logicalFallacyDetectorSchema } from '../logical_fallacy_detector.js';
import { perspectiveShifterSchema } from '../perspective_shifter.js';
import { advancedStatisticalAnalysisSchema } from '../advanced_statistical_analysis.js';
import { advancedDataPreprocessingSchema } from '../advanced_data_preprocessing.js';
import { mlModelEvaluationSchema } from '../ml_model_evaluation.js';
import { advancedAnalyzeDataset } from '../advanced_statistical_analysis.js';
import {
  MAX_DATA_POINTS,
  MAX_DIMENSIONS,
  MAX_DECISION_ITEMS,
  MAX_PREDICTORS,
  MAX_NUMERIC_COLUMNS,
  MAX_STRING_LENGTH,
} from '../limits.js';

const nums = (n: number): number[] => new Array(n).fill(0);
const strs = (n: number): string[] => new Array(n).fill('x');
const rows = (n: number): Record<string, number>[] => new Array(n).fill({ a: 1 });

// Each case: a schema, an input that exceeds one cap (must be rejected), and a
// small valid input under every cap (must be accepted).
const cases: Array<{ name: string; schema: { safeParse: (v: unknown) => { success: boolean } }; tooBig: unknown; ok: unknown }> = [
  {
    name: 'analyze_dataset.data (numeric)',
    schema: analyzeDatasetSchema,
    tooBig: { data: nums(MAX_DATA_POINTS + 1) },
    ok: { data: [1, 2, 3] },
  },
  {
    name: 'decision_analysis.options',
    schema: decisionAnalysisSchema,
    tooBig: { options: strs(MAX_DECISION_ITEMS + 1), criteria: ['c'], scores: [[1]] },
    ok: { options: ['A', 'B'], criteria: ['c'], scores: [[1], [2]] },
  },
  {
    name: 'advanced_regression_analysis.independentVariables (O(n^3) amplifier)',
    schema: advancedRegressionAnalysisSchema,
    tooBig: {
      data: [{ x: 1, y: 2 }],
      regressionType: 'linear',
      independentVariables: strs(MAX_PREDICTORS + 1),
      dependentVariable: 'y',
    },
    ok: {
      data: [{ x: 1, y: 2 }],
      regressionType: 'linear',
      independentVariables: ['x'],
      dependentVariable: 'y',
    },
  },
  {
    name: 'advanced_regression_analysis.data (rows)',
    schema: advancedRegressionAnalysisSchema,
    tooBig: {
      data: rows(MAX_DATA_POINTS + 1),
      regressionType: 'linear',
      independentVariables: ['a'],
      dependentVariable: 'a',
    },
    ok: {
      data: [{ a: 1 }],
      regressionType: 'linear',
      independentVariables: ['a'],
      dependentVariable: 'a',
    },
  },
  {
    name: 'hypothesis_testing.data (outer group count)',
    schema: hypothesisTestingSchema,
    tooBig: { testType: 'anova', data: new Array(MAX_DIMENSIONS + 1).fill([1, 2]) },
    ok: { testType: 't_test_independent', data: [[1, 2], [3, 4]] },
  },
  {
    name: 'hypothesis_testing.data (inner group length)',
    schema: hypothesisTestingSchema,
    tooBig: { testType: 't_test_independent', data: [nums(MAX_DATA_POINTS + 1)] },
    ok: { testType: 't_test_independent', data: [[1, 2], [3, 4]] },
  },
  {
    name: 'data_visualization_generator.data',
    schema: dataVisualizationGeneratorSchema,
    tooBig: {
      data: new Array(MAX_DATA_POINTS + 1).fill({ x: 1, y: 2 }),
      visualizationType: 'scatter',
      variables: ['x', 'y'],
    },
    ok: { data: [{ x: 1, y: 2 }], visualizationType: 'scatter', variables: ['x', 'y'] },
  },
  {
    name: 'data_visualization_generator.variables',
    schema: dataVisualizationGeneratorSchema,
    tooBig: {
      data: [{ x: 1 }],
      visualizationType: 'scatter',
      variables: strs(MAX_DIMENSIONS + 1),
    },
    ok: { data: [{ x: 1, y: 2 }], visualizationType: 'scatter', variables: ['x', 'y'] },
  },
  {
    name: 'advanced_statistical_analysis.data',
    schema: advancedStatisticalAnalysisSchema,
    tooBig: { data: rows(MAX_DATA_POINTS + 1), analysisType: 'descriptive' },
    ok: { data: [{ a: 1 }, { a: 2 }], analysisType: 'descriptive' },
  },
  {
    name: 'advanced_data_preprocessing.data',
    schema: advancedDataPreprocessingSchema,
    tooBig: { data: nums(MAX_DATA_POINTS + 1), preprocessingType: 'normalization' },
    ok: { data: [1, 2, 3], preprocessingType: 'normalization' },
  },
  {
    name: 'ml_model_evaluation.actualValues',
    schema: mlModelEvaluationSchema,
    tooBig: { modelType: 'regression', actualValues: nums(MAX_DATA_POINTS + 1), predictedValues: [0] },
    ok: { modelType: 'regression', actualValues: [1, 2], predictedValues: [1, 2] },
  },
  {
    name: 'logical_argument_analyzer.argument',
    schema: logicalArgumentAnalyzerSchema,
    tooBig: { argument: 'a'.repeat(MAX_STRING_LENGTH + 1) },
    ok: { argument: 'All men are mortal. Socrates is a man.' },
  },
  {
    name: 'logical_fallacy_detector.text',
    schema: logicalFallacyDetectorSchema,
    tooBig: { text: 'a'.repeat(MAX_STRING_LENGTH + 1) },
    ok: { text: 'You are wrong because you are young.' },
  },
  {
    name: 'perspective_shifter.problem',
    schema: perspectiveShifterSchema,
    tooBig: { problem: 'a'.repeat(MAX_STRING_LENGTH + 1) },
    ok: { problem: 'Our retention is dropping.' },
  },
];

describe('Input size caps', () => {
  it.each(cases)('rejects oversized input for $name', ({ schema, tooBig }) => {
    expect(schema.safeParse(tooBig).success).toBe(false);
  });

  it.each(cases)('accepts a valid under-cap input for $name', ({ schema, ok }) => {
    expect(schema.safeParse(ok).success).toBe(true);
  });

  // The stats numeric-column count comes from record keys, so it is guarded in
  // the handler (O(columns^2 x rows) correlation), not by a schema .max().
  it('rejects too many numeric columns in advanced_statistical_analysis', async () => {
    const wideRow = Object.fromEntries(
      Array.from({ length: MAX_NUMERIC_COLUMNS + 1 }, (_, i) => [`c${i}`, i])
    );
    await expect(advancedAnalyzeDataset([wideRow], 'descriptive')).rejects.toThrow();
  });
});
