import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Logger } from '../utils/logger.js';
import { wrapToolHandler } from '../utils/tool-wrapper.js';

// Import tools and their schemas
import { analyzeDataset, analyzeDatasetSchema } from './analyze_dataset.js';
import { decisionAnalysis, decisionAnalysisSchema } from './decision_analysis.js';
import {
  advancedRegressionAnalysis,
  advancedRegressionAnalysisSchema,
} from './advanced_regression_analysis.js';
import { hypothesisTesting, hypothesisTestingSchema } from './hypothesis_testing.js';
import {
  dataVisualizationGenerator,
  dataVisualizationGeneratorSchema,
} from './data_visualization_generator.js';
import {
  logicalArgumentAnalyzer,
  logicalArgumentAnalyzerSchema,
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
export function registerTools(server: Server): void {
  // Define tool registration information
  const toolRegistrations = [
    {
      name: 'analyze_dataset',
      description: 'Analyze a dataset with statistical methods',
      schema: analyzeDatasetSchema,
      handler: analyzeDataset,
    },
    {
      name: 'decision_analysis',
      description: 'Analyze decision options based on multiple criteria',
      schema: decisionAnalysisSchema,
      handler: decisionAnalysis,
    },
    {
      name: 'advanced_regression_analysis',
      description: 'Perform advanced regression analysis on datasets',
      schema: advancedRegressionAnalysisSchema,
      handler: advancedRegressionAnalysis,
    },
    {
      name: 'hypothesis_testing',
      description: 'Perform statistical hypothesis tests on datasets',
      schema: hypothesisTestingSchema,
      handler: hypothesisTesting,
    },
    {
      name: 'data_visualization_generator',
      description: 'Generate specifications for data visualizations',
      schema: dataVisualizationGeneratorSchema,
      handler: dataVisualizationGenerator,
    },
    {
      name: 'logical_argument_analyzer',
      description: 'Analyze logical arguments for structure, fallacies, validity, and strength',
      schema: logicalArgumentAnalyzerSchema,
      handler: logicalArgumentAnalyzer,
    },
    {
      name: 'logical_fallacy_detector',
      description: 'Detect and explain logical fallacies in text with confidence scoring',
      schema: logicalFallacyDetectorSchema,
      handler: logicalFallacyDetector,
    },
    {
      name: 'perspective_shifter',
      description: 'Generate alternative perspectives on a problem or situation',
      schema: perspectiveShifterSchema,
      handler: perspectiveShifter,
    },
    // NEW: Research-related tools
    {
      name: 'verify_research',
      description: 'Cross-verify research claims from multiple sources with confidence scoring',
      schema: ResearchVerificationSchema,
      handler: (input: z.infer<typeof ResearchVerificationSchema>) => 
        researchVerification.verifyResearch(input),
    },
  ];

  // Log tools that will be registered
  toolRegistrations.forEach((tool) => {
    Logger.info(`Registering tool: ${tool.name}`);
  });

  try {
    // Register each tool with the server
    toolRegistrations.forEach((tool) => {
      try {
        // Wrap the handler with our error handling utility
        const wrappedHandler = wrapToolHandler(tool.handler, tool.schema, tool.name);

        // Register the tool using the server's registerTool method
        server.registerTool({
          name: tool.name,
          description: tool.description,
          schema: tool.schema,
          handler: wrappedHandler,
        });

        Logger.debug(`Tool registered successfully: ${tool.name}`);
      } catch (error) {
        Logger.error(`Failed to register tool: ${tool.name}`, error);
        throw error; // Re-throw to fail registration process
      }
    });

    // The research tools can be registered if needed, but we'll skip that step for now
    // since the registerTool functionality appears to be missing
    /*
    if (typeof exaResearch.registerTool === 'function') {
      exaResearch.registerTool(server);
    }
    
    if (typeof researchVerification.registerTool === 'function') {
      researchVerification.registerTool(server);
    }
    */

    Logger.info(`Successfully registered ${toolRegistrations.length} tools`);
  } catch (error) {
    Logger.error('Error during tool registration process', error);
    throw error;
  }
}
