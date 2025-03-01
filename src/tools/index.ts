import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { analyzeDataset } from "./analyze_dataset.js";
import { decisionAnalysis } from "./decision_analysis.js";
import { 
  advancedAnalyzeDataset, 
  advancedStatisticalAnalysisSchema 
} from "./advanced_statistical_analysis.js";
import {
  evaluateMLModel,
  mlModelEvaluationSchema
} from "./ml_model_evaluation.js";

/**
 * Register all analytical tools with the MCP server
 * @param server The MCP server instance
 */
export function registerTools(server: Server) {
  // Register the tools list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "analyze_dataset",
          description: "Analyze a dataset with basic statistical methods",
          inputSchema: {
            type: "object",
            properties: {
              datasetId: {
                type: "string",
                description: "ID of the dataset to analyze"
              },
              analysisType: {
                type: "string",
                enum: ["summary", "stats"],
                description: "Type of analysis to perform"
              }
            },
            required: ["datasetId"]
          }
        },
        {
          name: "advanced_statistical_analysis",
          description: "Perform advanced statistical analysis on datasets",
          inputSchema: {
            type: "object",
            properties: {
              datasetId: {
                type: "string",
                description: "Unique identifier for the dataset"
              },
              analysisType: {
                type: "string",
                enum: ["descriptive", "correlation"],
                description: "Type of advanced statistical analysis to perform"
              }
            },
            required: ["datasetId", "analysisType"]
          }
        },
        {
          name: "ml_model_evaluation",
          description: "Evaluate machine learning model performance using various metrics",
          inputSchema: {
            type: "object",
            properties: {
              modelType: {
                type: "string",
                enum: ["classification", "regression"],
                description: "Type of machine learning model"
              },
              actualValues: {
                type: "array",
                items: { type: "number" },
                description: "Actual target values"
              },
              predictedValues: {
                type: "array",
                items: { type: "number" },
                description: "Model's predicted values"
              },
              evaluationMetrics: {
                type: "array",
                items: { 
                  type: "string",
                  enum: [
                    "accuracy", "precision", "recall", "f1_score",
                    "mse", "mae", "rmse", "r_squared"
                  ]
                },
                description: "Metrics to calculate (optional, defaults based on model type)"
              }
            },
            required: ["modelType", "actualValues", "predictedValues"]
          }
        },
        {
          name: "decision_analysis",
          description: "Analyze decision options based on multiple criteria",
          inputSchema: {
            type: "object",
            properties: {
              options: {
                type: "array",
                items: { type: "string" },
                description: "List of decision options to analyze"
              },
              criteria: {
                type: "array",
                items: { type: "string" },
                description: "List of criteria to evaluate options against"
              },
              weights: {
                type: "array",
                items: { type: "number" },
                description: "Optional weights for each criterion (must match criteria length)"
              }
            },
            required: ["options", "criteria"]
          }
        }
      ]
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case "analyze_dataset": {
        try {
          const args = request.params.arguments || {};
          const datasetId = String(args.datasetId || "");
          const analysisType = String(args.analysisType || "summary");
          
          if (!datasetId) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: datasetId is required" }]
            };
          }
          
          const result = await analyzeDataset(datasetId, analysisType);
          
          return { content: [{ type: "text", text: result }] };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text", text: `Error analyzing dataset: ${error instanceof Error ? error.message : String(error)}` }]
          };
        }
      }

      case "advanced_statistical_analysis": {
        try {
          const args = request.params.arguments || {};
          const datasetId = String(args.datasetId || "");
          const analysisType = String(args.analysisType || "descriptive");
          
          if (!datasetId) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: datasetId is required" }]
            };
          }
          
          const result = await advancedAnalyzeDataset(datasetId, analysisType);
          
          return { content: [{ type: "text", text: result }] };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text", text: `Error in advanced statistical analysis: ${error instanceof Error ? error.message : String(error)}` }]
          };
        }
      }

      case "ml_model_evaluation": {
        try {
          const args = request.params.arguments || {};
          const modelType = String(args.modelType || "");
          const actualValues = Array.isArray(args.actualValues) ? args.actualValues.map(Number) : [];
          const predictedValues = Array.isArray(args.predictedValues) ? args.predictedValues.map(Number) : [];
          let evaluationMetrics: string[] | undefined = undefined;
          
          if (Array.isArray(args.evaluationMetrics)) {
            evaluationMetrics = args.evaluationMetrics.map(String);
          }
          
          if (!modelType || !["classification", "regression"].includes(modelType)) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: modelType must be 'classification' or 'regression'" }]
            };
          }
          
          if (actualValues.length === 0 || predictedValues.length === 0) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: actualValues and predictedValues must be non-empty arrays" }]
            };
          }
          
          if (actualValues.length !== predictedValues.length) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: actualValues and predictedValues must have the same length" }]
            };
          }
          
          const result = await evaluateMLModel(modelType, actualValues, predictedValues, evaluationMetrics);
          
          return { content: [{ type: "text", text: result }] };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text", text: `Error evaluating ML model: ${error instanceof Error ? error.message : String(error)}` }]
          };
        }
      }

      case "decision_analysis": {
        try {
          const args = request.params.arguments || {};
          const options = Array.isArray(args.options) ? args.options.map(String) : [];
          const criteria = Array.isArray(args.criteria) ? args.criteria.map(String) : [];
          let weights: number[] | undefined = undefined;
          
          if (Array.isArray(args.weights)) {
            weights = args.weights.map(Number);
          }
          
          if (options.length === 0) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: options must be a non-empty array of strings" }]
            };
          }
          
          if (criteria.length === 0) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: criteria must be a non-empty array of strings" }]
            };
          }
          
          const result = await decisionAnalysis(options, criteria, weights);
          
          return { content: [{ type: "text", text: result }] };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text", text: `Error analyzing decision: ${error instanceof Error ? error.message : String(error)}` }]
          };
        }
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }]
        };
    }
  });
}
