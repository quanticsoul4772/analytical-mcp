import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
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

// Register all tools with the server
export function registerTools(server: Server) {
  // Register tool schemas
  server.methods.tools.register({
    name: "analyze_dataset",
    description: "Analyze a dataset with statistical methods",
    parameters: analyzeDatasetSchema
  });

  server.methods.tools.register({
    name: "decision_analysis",
    description: "Analyze decision options based on multiple criteria",
    parameters: decisionAnalysisSchema
  });
  
  server.methods.tools.register({
    name: "advanced_regression_analysis",
    description: "Perform advanced regression analysis on datasets",
    parameters: advancedRegressionAnalysisSchema
  });
  
  server.methods.tools.register({
    name: "hypothesis_testing",
    description: "Perform statistical hypothesis tests on datasets",
    parameters: hypothesisTestingSchema
  });
  
  server.methods.tools.register({
    name: "data_visualization_generator",
    description: "Generate specifications for data visualizations",
    parameters: dataVisualizationGeneratorSchema
  });
  
  server.methods.tools.register({
    name: "logical_argument_analyzer",
    description: "Analyze logical arguments for structure, fallacies, validity, and strength",
    parameters: logicalArgumentAnalyzerSchema
  });
  
  server.methods.tools.register({
    name: "logical_fallacy_detector",
    description: "Detect and explain logical fallacies in text with confidence scoring",
    parameters: logicalFallacyDetectorSchema
  });
  
  server.methods.tools.register({
    name: "perspective_shifter",
    description: "Generate alternative perspectives on a problem or situation",
    parameters: perspectiveShifterSchema
  });

  // Handle tool calls
  server.on(
    "tools.call",
    async (req: { body: CallToolRequestSchema }, res) => {
      try {
        const { name, parameters } = req.body;
        
        let result: string;
        
        switch (name) {
          case "analyze_dataset":
            result = await analyzeDataset(
              parameters.datasetId as string,
              parameters.analysisType as string
            );
            break;
            
          case "decision_analysis":
            result = await decisionAnalysis(
              parameters.options as string[],
              parameters.criteria as string[],
              parameters.weights as number[] | undefined
            );
            break;
            
          case "advanced_regression_analysis":
            result = await advancedRegressionAnalysis(
              parameters.datasetId as string,
              parameters.regressionType as string,
              parameters.independentVariables as string[],
              parameters.dependentVariable as string,
              parameters.polynomialDegree as number | undefined,
              parameters.includeMetrics as boolean | undefined,
              parameters.includeCoefficients as boolean | undefined
            );
            break;
            
          case "hypothesis_testing":
            result = await hypothesisTesting(
              parameters.testType as string,
              parameters.datasetId as string,
              parameters.variables as string[],
              parameters.alpha as number | undefined,
              parameters.alternativeHypothesis as string | undefined
            );
            break;
            
          case "data_visualization_generator":
            result = await dataVisualizationGenerator(
              parameters.datasetId as string,
              parameters.visualizationType as string,
              parameters.variables as string[],
              parameters.title as string | undefined,
              parameters.includeTrendline as boolean | undefined,
              parameters.options as Record<string, any> | undefined
            );
            break;
            
          case "logical_argument_analyzer":
            result = await logicalArgumentAnalyzer(
              parameters.argument as string,
              parameters.analysisType as string | undefined,
              parameters.includeRecommendations as boolean | undefined
            );
            break;
            
          case "logical_fallacy_detector":
            result = await logicalFallacyDetector(
              parameters.text as string,
              parameters.confidenceThreshold as number | undefined,
              parameters.includeExplanations as boolean | undefined,
              parameters.includeExamples as boolean | undefined,
              parameters.fallacyCategories as string[] | undefined
            );
            break;
            
          case "perspective_shifter":
            result = await perspectiveShifter(
              parameters.problem as string,
              parameters.currentPerspective as string | undefined,
              parameters.shiftType as string | undefined,
              parameters.numberOfPerspectives as number | undefined,
              parameters.includeActionable as boolean | undefined
            );
            break;
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        res.json({ result });
      } catch (error) {
        console.error("Error calling tool:", error);
        res.json({
          error: {
            message: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }
  );

  // Handle tool listing
  server.on(
    "tools.list",
    async (req: { body: ListToolsRequestSchema }, res) => {
      res.json({
        tools: [
          {
            name: "analyze_dataset",
            description: "Analyze a dataset with statistical methods",
            parameters: analyzeDatasetSchema
          },
          {
            name: "decision_analysis",
            description: "Analyze decision options based on multiple criteria",
            parameters: decisionAnalysisSchema
          },
          {
            name: "advanced_regression_analysis",
            description: "Perform advanced regression analysis on datasets",
            parameters: advancedRegressionAnalysisSchema
          },
          {
            name: "hypothesis_testing",
            description: "Perform statistical hypothesis tests on datasets",
            parameters: hypothesisTestingSchema
          },
          {
            name: "data_visualization_generator",
            description: "Generate specifications for data visualizations",
            parameters: dataVisualizationGeneratorSchema
          },
          {
            name: "logical_argument_analyzer",
            description: "Analyze logical arguments for structure, fallacies, validity, and strength",
            parameters: logicalArgumentAnalyzerSchema
          },
          {
            name: "logical_fallacy_detector",
            description: "Detect and explain logical fallacies in text with confidence scoring",
            parameters: logicalFallacyDetectorSchema
          },
          {
            name: "perspective_shifter",
            description: "Generate alternative perspectives on a problem or situation",
            parameters: perspectiveShifterSchema
          }
        ]
      });
    }
  );
}
