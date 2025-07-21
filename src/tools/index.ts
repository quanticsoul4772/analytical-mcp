import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.js';

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

// NEW: Import research-related tools
import { exaResearch } from '../utils/exa_research.js';
import { researchVerification } from './research_verification.js';

// Schema for research verification
const ResearchVerificationSchema = z.object({
  query: z.string().describe('Primary research query'),
  verificationQueries: z.array(z.string()).optional().describe('Alternate queries for verification'),
  minConsistencyThreshold: z.number().min(0).max(1).optional().default(0.7).describe('Minimum consistency score'),
  sources: z.number().min(1).max(10).optional().default(3).describe('Number of sources to cross-verify'),
});

/**
 * Register all tools with the server using the latest MCP SDK patterns
 */
export function registerTools(server: McpServer): void {
  // Define tool registration information with proper wrapper functions
  const toolRegistrations = [
    {
      name: 'analyze_dataset',
      description: 'Analyze a dataset with statistical methods',
      schema: analyzeDatasetSchema,
      handler: async ({ data, analysisType }: { data: any[], analysisType?: string }) => 
        analyzeDataset(data, analysisType || 'summary'),
    },
    {
      name: 'decision_analysis',
      description: 'Analyze decision options based on multiple criteria',
      schema: decisionAnalysisSchema,
      handler: async (params: { options: string[], criteria: string[], weights?: number[] }) => 
        decisionAnalysis(params),
    },
    {
      name: 'advanced_regression_analysis',
      description: 'Perform advanced regression analysis on datasets',
      schema: advancedRegressionAnalysisSchema,
      handler: async (params: RegressionAnalysisOptions) => 
        advancedRegressionAnalysis(params),
    },
    {
      name: 'hypothesis_testing',
      description: 'Perform statistical hypothesis tests on datasets',
      schema: hypothesisTestingSchema,
      handler: async ({ testType, data, variables, alpha, alternativeHypothesis }: { testType: string, data: any[], variables?: string[], alpha?: number, alternativeHypothesis?: string }) => 
        hypothesisTesting(testType, data, variables, alpha || 0.05, alternativeHypothesis),
    },
    {
      name: 'data_visualization_generator',
      description: 'Generate specifications for data visualizations',
      schema: dataVisualizationGeneratorSchema,
      handler: async (params: VisualizationOptions) => 
        dataVisualizationGenerator(params),
    },
    {
      name: 'logical_argument_analyzer',
      description: 'Analyze logical arguments for structure, fallacies, validity, and strength',
      schema: logicalArgumentAnalyzerSchema,
      handler: async (params: AnalysisOptions) => 
        logicalArgumentAnalyzer(params),
    },
    {
      name: 'logical_fallacy_detector',
      description: 'Detect and explain logical fallacies in text with confidence scoring',
      schema: logicalFallacyDetectorSchema,
      handler: async ({ text, confidenceThreshold }: { text: string, confidenceThreshold?: number }) => 
        logicalFallacyDetector(text, confidenceThreshold || 0.7),
    },
    {
      name: 'perspective_shifter',
      description: 'Generate alternative perspectives on a problem or situation',
      schema: perspectiveShifterSchema,
      handler: async (params: { problem: string, currentPerspective?: string, shiftType?: string, numberOfPerspectives?: number }) => 
        perspectiveShifter(params),
    },
    // NEW: Research-related tools
    {
      name: 'verify_research',
      description: 'Cross-verify research claims from multiple sources with confidence scoring',
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
          try {
            // All handlers now expect the args object directly
            const result = await tool.handler(args);
            
            return {
              content: [
                {
                  type: 'text' as const,
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }
              ]
            };
          } catch (error) {
            Logger.error(`Error executing tool ${tool.name}`, error);
            return {
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
