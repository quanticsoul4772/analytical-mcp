import { z } from 'zod';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { Logger } from '../utils/logger.js';
import { wrapToolHandler } from '../utils/tool-wrapper.js';

// Import tools and their schemas
import { analyzeDataset, analyzeDatasetSchema } from "./analyze_dataset.js";
import { decisionAnalysis, decisionAnalysisSchema } from "./decision_analysis.js";
import { 
  advancedRegressionAnalysis,
  advancedRegressionAnalysisSchema
} from "./advanced_regression_analysis.js";
import {
  hypothesisTesting,
  hypothesisTestingSchema
} from "./hypothesis_testing.js";
import {
  dataVisualizationGenerator,
  dataVisualizationGeneratorSchema
} from "./data_visualization_generator.js";
import {
  logicalArgumentAnalyzer,
  logicalArgumentAnalyzerSchema
} from "./logical_argument_analyzer.js";
import {
  logicalFallacyDetector,
  logicalFallacyDetectorSchema
} from "./logical_fallacy_detector.js";
import {
  perspectiveShifter,
  perspectiveShifterSchema
} from "./perspective_shifter.js";

// Type for input parameters
type ToolParameters = {
  name: string;
  parameters: Record<string, unknown>;
};

// Type definition for server with potential methods
type ExtendedServer = Server & {
  methods?: {
    tools?: {
      register: (tool: any) => void;
    };
  };
};

// Register all tools with the server
export function registerTools(server: ExtendedServer) {
  // Define tool registration information
  const toolRegistrations = [
    {
      name: "analyze_dataset",
      description: "Analyze a dataset with statistical methods",
      schema: analyzeDatasetSchema,
      handler: analyzeDataset
    },
    {
      name: "decision_analysis",
      description: "Analyze decision options based on multiple criteria",
      schema: decisionAnalysisSchema,
      handler: decisionAnalysis
    },
    {
      name: "advanced_regression_analysis",
      description: "Perform advanced regression analysis on datasets",
      schema: advancedRegressionAnalysisSchema,
      handler: advancedRegressionAnalysis
    },
    {
      name: "hypothesis_testing",
      description: "Perform statistical hypothesis tests on datasets",
      schema: hypothesisTestingSchema,
      handler: hypothesisTesting
    },
    {
      name: "data_visualization_generator",
      description: "Generate specifications for data visualizations",
      schema: dataVisualizationGeneratorSchema,
      handler: dataVisualizationGenerator
    },
    {
      name: "logical_argument_analyzer",
      description: "Analyze logical arguments for structure, fallacies, validity, and strength",
      schema: logicalArgumentAnalyzerSchema,
      handler: logicalArgumentAnalyzer
    },
    {
      name: "logical_fallacy_detector",
      description: "Detect and explain logical fallacies in text with confidence scoring",
      schema: logicalFallacyDetectorSchema,
      handler: logicalFallacyDetector
    },
    {
      name: "perspective_shifter",
      description: "Generate alternative perspectives on a problem or situation",
      schema: perspectiveShifterSchema,
      handler: perspectiveShifter
    }
  ];

  // Attach tools to the server
  toolRegistrations.forEach(tool => {
    Logger.info(`Registering tool: ${tool.name}`);
  });

  if (server.methods?.tools) {
    toolRegistrations.forEach(tool => {
      try {
        // Wrap the handler with our error handling utility
        const wrappedHandler = wrapToolHandler(
          tool.handler,
          tool.schema,
          tool.name
        );

        server.methods!.tools!.register({
          name: tool.name,
          description: tool.description,
          schema: tool.schema,
          handler: wrappedHandler
        });

        Logger.debug(`Tool registered successfully: ${tool.name}`);
      } catch (error) {
        Logger.error(`Failed to register tool: ${tool.name}`, error);
        throw error; // Re-throw to fail registration process
      }
    });
  } else {
    const error = new Error('Server methods not fully implemented or initialized');
    Logger.error('Tool registration failed', error);
    throw error;
  }
}
