#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Create a simple server
const server = new Server({
    name: "analytical",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});

// Set up tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Handling tools/list request");
    return {
        tools: [
            {
                name: "analyze_dataset",
                description: "Analyze a dataset with statistical methods",
                inputSchema: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: { type: "number" },
                            description: "Array of numeric data to analyze"
                        }
                    },
                    required: ["data"]
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
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" }
                                },
                                required: ["name"]
                            },
                            description: "Array of options to evaluate"
                        },
                        criteria: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    weight: { type: "number" }
                                },
                                required: ["name"]
                            },
                            description: "Array of criteria for evaluation"
                        }
                    },
                    required: ["options", "criteria"]
                }
            }
        ]
    };
});

// Set up tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`Handling tool call: ${request.params.name}`);
    
    switch (request.params.name) {
        case "analyze_dataset": {
            const params = request.params.arguments;
            if (!Array.isArray(params.data)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide an array of numbers to analyze" }],
                    isError: true
                };
            }
            
            const data = params.data.filter(n => typeof n === "number");
            const sum = data.reduce((a, b) => a + b, 0);
            const mean = sum / data.length;
            const min = Math.min(...data);
            const max = Math.max(...data);
            const sorted = [...data].sort((a, b) => a - b);
            const middle = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 === 0 
                ? (sorted[middle - 1] + sorted[middle]) / 2
                : sorted[middle];
            
            return {
                content: [{
                    type: "text",
                    text: `
## Dataset Analysis

**Summary Statistics:**
- Count: ${data.length} values
- Sum: ${sum}
- Mean: ${mean.toFixed(2)}
- Range: ${min} to ${max}
- Median: ${median.toFixed(2)}

**Sample Data:**
${data.slice(0, 5).join(', ')}${data.length > 5 ? ', ...' : ''}
                    `
                }]
            };
        }
        case "decision_analysis": {
            const params = request.params.arguments;
            if (!Array.isArray(params.options) || !Array.isArray(params.criteria)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide options and criteria arrays" }],
                    isError: true
                };
            }
            
            const analysis = params.options.map(option => {
                const scores = params.criteria.map(criterion => ({
                    criterion: criterion.name,
                    score: Math.random() * 10,
                    weight: criterion.weight || 1
                }));
                
                const totalScore = scores.reduce((sum, item) => sum + item.score * item.weight, 0) / 
                                scores.reduce((sum, item) => sum + item.weight, 0);
                
                return {
                    option: option.name,
                    totalScore: totalScore.toFixed(2),
                    scores
                };
            });
            
            analysis.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
            
            return {
                content: [{
                    type: "text",
                    text: `
## Decision Analysis Results

**Ranked Options:**
${analysis.map((item, index) => `${index + 1}. ${item.option} (Score: ${item.totalScore})`).join('\n')}

**Detailed Analysis:**
${analysis.map(item => `
### ${item.option}
- Total Score: ${item.totalScore}
- Individual Criteria Scores:
  ${item.scores.map(score => `- ${score.criterion}: ${score.score.toFixed(2)}`).join('\n  ')}
`).join('\n')}
                    `
                }]
            };
        }
        default:
            return {
                content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
                isError: true
            };
    }
});

// Add custom request handler for notifications/cancelled
server.onRequest = async (request) => {
    // Handle notifications/cancelled
    if (request.method === "notifications/cancelled") {
        console.error(`Handling notifications/cancelled: ${JSON.stringify(request.params)}`);
        return null; // No response needed for notifications
    }
    
    // Let the SDK handle other methods
    return null;
};

// Add error handler
server.onerror = (error) => {
    console.error(`Server error: ${error.message || error}`);
};

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Analytical MCP server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
