import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.js';
import { auditToolCall } from '../utils/audit.js';
import { requestContext } from '../utils/request_context.js';
import { MAX_STRING_LENGTH } from './limits.js';

// Import tools and their schemas
import { analyzeDataset, analyzeDatasetSchema } from './analyze_dataset.js';
import { decisionAnalysis, decisionAnalysisSchema } from './decision_analysis.js';
import {
  advancedRegressionAnalysis,
  advancedRegressionAnalysisSchema,
  RegressionAnalysisOptions,
} from './advanced_regression_analysis.js';
import { hypothesisTesting, hypothesisTestingSchema } from './hypothesis_testing.js';
import {
  dataVisualizationGenerator,
  dataVisualizationGeneratorSchema,
  VisualizationOptions,
} from './data_visualization_generator.js';
import {
  logicalArgumentAnalyzer,
  logicalArgumentAnalyzerSchema,
  AnalysisOptions,
} from './logical_argument_analyzer.js';
import {
  logicalFallacyDetector,
  logicalFallacyDetectorSchema,
} from './logical_fallacy_detector.js';
import { perspectiveShifter, perspectiveShifterSchema } from './perspective_shifter.js';
import { evaluateMLModel, mlModelEvaluationSchema } from './ml_model_evaluation.js';
import {
  advancedAnalyzeDataset,
  advancedStatisticalAnalysisSchema,
} from './advanced_statistical_analysis.js';
import {
  advancedDataPreprocessing,
  advancedDataPreprocessingSchema,
} from './advanced_data_preprocessing.js';

// NEW: Import research-related tools
import { exaResearch } from '../utils/exa_research.js';
import { researchVerification } from './research_verification.js';

// Schema for research verification
const ResearchVerificationSchema = z.object({
  query: z.string().max(MAX_STRING_LENGTH).describe('The primary factual claim or question to verify.'),
  verificationQueries: z
    .array(z.string())
    .max(5)
    .optional()
    .describe('Optional alternate phrasings used to cross-check the claim across additional sources (max 5).'),
  minConsistencyThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe("Cross-source consistency (0-1) required to mark the claim 'verified' (default 0.7)."),
  sources: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Number of sources to retrieve and cross-verify per query, 1-10 (default 3).'),
});

/**
 * Register all tools with the server using the latest MCP SDK patterns
 */
export function registerTools(server: McpServer): void {
  // Define tool registration information with proper wrapper functions
  const toolRegistrations = [
    {
      name: 'analyze_dataset',
      description:
        "Summarize a single numeric series with descriptive statistics. Returns a markdown report: 'summary' gives count/min/max/mean/sum; 'stats' adds median, quartiles, standard deviation, variance, and coefficient of variation. Accepts a number[] or an array of objects (the first numeric property is used). For multi-column tables or cross-variable correlation use advanced_statistical_analysis; to transform values use advanced_data_preprocessing.",
      schema: analyzeDatasetSchema,
      handler: async ({ data, analysisType }: { data: any[], analysisType?: string }) => 
        analyzeDataset(data, analysisType || 'summary'),
    },
    {
      name: 'decision_analysis',
      description:
        'Rank options against weighted criteria with a weighted-sum decision matrix. Returns a markdown report: ranked options, a per-option breakdown (score × weight contribution, strengths, weaknesses), and a recommendation. Weights are normalized to sum to 1; omit them for equal weighting.',
      schema: decisionAnalysisSchema,
      handler: async (params: {
        options: string[];
        criteria: string[];
        scores: number[][];
        weights?: number[];
      }) => decisionAnalysis(params),
    },
    {
      name: 'advanced_regression_analysis',
      description:
        'Fit a regression model (linear, polynomial, logistic, or multivariate) predicting a named dependent variable from named predictor columns. Returns a markdown report with fitted coefficients, performance metrics, and interpretation. Use this when you have a designated outcome to predict; for association strength without a model use advanced_statistical_analysis, and to score existing predictions use ml_model_evaluation.',
      schema: advancedRegressionAnalysisSchema,
      handler: async (params: RegressionAnalysisOptions) => 
        advancedRegressionAnalysis(params),
    },
    {
      name: 'hypothesis_testing',
      description:
        'Run a statistical hypothesis test and report the p-value with a reject / fail-to-reject decision at the chosen alpha. Supports independent (Welch) and paired t-tests, Pearson-correlation significance, chi-square independence, and one-way ANOVA. Returns a markdown report with the test statistic, p-value, and conclusion. Use this when you need significance; for descriptive correlation without inference use advanced_statistical_analysis.',
      schema: hypothesisTestingSchema,
      handler: async ({ testType, data, variables, alpha, alternativeHypothesis }: { testType: string, data: any[], variables?: string[], alpha?: number, alternativeHypothesis?: string }) => 
        hypothesisTesting(testType, data, variables, alpha || 0.05, alternativeHypothesis),
    },
    {
      name: 'data_visualization_generator',
      description:
        'Generate a chart specification (Vega-Lite) plus rendering instructions for a dataset — it describes a chart, it does not render an image. Supports scatter, line, bar, histogram, box, heatmap, pie, violin, and correlation plots. Returns a markdown report with the data-point count, the spec, and usage guidance.',
      schema: dataVisualizationGeneratorSchema,
      handler: async (params: VisualizationOptions) => 
        dataVisualizationGenerator(params),
    },
    {
      name: 'logical_argument_analyzer',
      description:
        "Assess a natural-language argument for structure, validity, strength, and fallacies. Returns a markdown analysis; 'comprehensive' (default) runs all four plus optional improvement recommendations. Use this for overall argument quality; to only flag and name fallacies use logical_fallacy_detector.",
      schema: logicalArgumentAnalyzerSchema,
      handler: async (params: AnalysisOptions) => 
        logicalArgumentAnalyzer(params),
    },
    {
      name: 'logical_fallacy_detector',
      description:
        'Detect and name logical fallacies in text via pattern matching, each with a confidence score, description, and before/after examples. Returns a markdown report grouped by category with an overall severity assessment. Use this to flag specific fallacies; for a full argument assessment use logical_argument_analyzer.',
      schema: logicalFallacyDetectorSchema,
      handler: async (params: {
        text: string;
        confidenceThreshold?: number;
        categories?: string[];
        includeExplanations?: boolean;
        includeExamples?: boolean;
      }) => logicalFallacyDetector(params),
    },
    {
      name: 'perspective_shifter',
      description:
        'Generate alternative viewpoints on a problem — by stakeholder or discipline — grounded in web research via Exa. Returns a markdown report with key facts and actionable insights per perspective. Requires EXA_API_KEY and ENABLE_RESEARCH_INTEGRATION=true and makes live network calls; it fails without them. To cross-check factual claims instead of generating viewpoints, use verify_research.',
      schema: perspectiveShifterSchema,
      handler: async (params: { problem: string, currentPerspective?: string, shiftType?: string, numberOfPerspectives?: number }) => 
        perspectiveShifter(params),
    },
    {
      name: 'advanced_statistical_analysis',
      description:
        'Compute per-column descriptive statistics, or Pearson correlation for every numeric column pair, over a table of records. Returns a markdown report (mean/median/std/variance/min/max per column, or r plus a weak/moderate/strong label per pair); non-numeric columns are ignored. Use analyze_dataset for a single numeric series; for correlation significance (p-values) use hypothesis_testing; to fit a predictive model use advanced_regression_analysis.',
      schema: advancedStatisticalAnalysisSchema,
      handler: async ({ data, analysisType }: { data: any[], analysisType: string }) =>
        advancedAnalyzeDataset(data, analysisType),
    },
    {
      name: 'advanced_data_preprocessing',
      description:
        'Transform a numeric series for downstream modeling: min-max normalization, z-score standardization, missing-value handling, or IQR outlier detection. Returns a markdown report with the transform\'s parameters and a preview of the resulting values. Use analyze_dataset to describe data without changing it.',
      schema: advancedDataPreprocessingSchema,
      handler: async ({ data, preprocessingType }: { data: any[], preprocessingType: string }) =>
        advancedDataPreprocessing(data, preprocessingType),
    },
    {
      name: 'ml_model_evaluation',
      description:
        'Score an existing model\'s predictions against actual values. Classification returns accuracy/precision/recall/F1 from a binary (0/1) confusion matrix; regression returns MSE/MAE/RMSE/R². Returns a markdown report of the requested metrics plus sample count. This scores supplied predictions; to fit a model from raw data use advanced_regression_analysis.',
      schema: mlModelEvaluationSchema,
      handler: async ({
        modelType,
        actualValues,
        predictedValues,
        evaluationMetrics,
      }: {
        modelType: string;
        actualValues: number[];
        predictedValues: number[];
        evaluationMetrics?: string[];
      }) => evaluateMLModel(modelType, actualValues, predictedValues, evaluationMetrics),
    },
    // NEW: Research-related tools
    {
      name: 'verify_research',
      description:
        "Cross-verify a factual claim across multiple web sources via Exa and return a structured confidence verdict. Returns an object {verifiedResults, confidence:{score, verified, consistencyThreshold, details:{sourceCount, uniqueSources, conflictingClaims, ...}}} — not markdown — from cross-source Jaccard consistency and conflict detection. Requires EXA_API_KEY and ENABLE_RESEARCH_INTEGRATION=true and makes live network calls; it fails without them. To generate alternative viewpoints instead of verifying facts, use perspective_shifter.",
      schema: ResearchVerificationSchema,
      handler: async (input: z.infer<typeof ResearchVerificationSchema>) =>
        researchVerification.verifyResearch({
          ...input,
          factExtractionOptions: {
            maxFacts: 10,
            minConfidence: 0.7
          }
        }),
    },
  ];

  // Log tools that will be registered
  Logger.info(`Registering ${toolRegistrations.length} tools`);

  // Register each tool with the server using the new MCP SDK pattern
  for (const tool of toolRegistrations) {
    try {
      server.tool(
        tool.name,
        tool.description,
'shape' in tool.schema ? tool.schema.shape : tool.schema,
async (args: any, extra: any) => {
          const startMs = Date.now();
          const ctx = { outboundExaCalls: 0 };
          try {
            // Run the handler inside a request context so outbound Exa calls are
            // attributed to this invocation. All handlers expect the args object.
            const result = await requestContext.run(ctx, () => tool.handler(args));

            auditToolCall({
              tool: tool.name,
              args,
              durationMs: Date.now() - startMs,
              ok: true,
              exaCalls: ctx.outboundExaCalls,
            });

            return {
              content: [
                {
                  type: 'text' as const,
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }
              ]
            };
          } catch (error) {
            auditToolCall({
              tool: tool.name,
              args,
              durationMs: Date.now() - startMs,
              ok: false,
              error,
              exaCalls: ctx.outboundExaCalls,
            });
            Logger.error(`Error executing tool ${tool.name}`, error);
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
              ]
            };
          }
        }
      );
      
      Logger.debug(`Registered tool: ${tool.name}`);
    } catch (error) {
      Logger.error(`Failed to register tool ${tool.name}`, error);
    }
  }

  Logger.info('All tools registered successfully');
}
