import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { analyzeDataset, analyzeDatasetSchema } from "./analyze_dataset.js";
import { decisionAnalysis, decisionAnalysisSchema } from "./decision_analysis.js";

export function registerTools(server: Server) {
  // Register the tools list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "analyze_dataset",
          description: "Analyze a dataset with statistical methods",
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
      ],
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
              content: [
                {
                  type: "text",
                  text: "Error: datasetId is required",
                },
              ],
            };
          }
          
          const result = await analyzeDataset(datasetId, analysisType);
          
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error analyzing dataset: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
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
              content: [
                {
                  type: "text",
                  text: "Error: options must be a non-empty array of strings",
                },
              ],
            };
          }
          
          if (criteria.length === 0) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: "Error: criteria must be a non-empty array of strings",
                },
              ],
            };
          }
          
          const result = await decisionAnalysis(options, criteria, weights);
          
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error analyzing decision: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      default:
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Unknown tool: ${request.params.name}`,
            },
          ],
        };
    }
  });
}
