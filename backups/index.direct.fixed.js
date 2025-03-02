#!/usr/bin/env node

/**
 * Analytical MCP Server - Direct Fixed Version
 * Compatible with MCP SDK 1.0.1
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Redirect console.log to stderr for better logging
console.log = function() {
  console.error.apply(console, arguments);
};

console.error('Starting Analytical MCP Server - Direct Fixed Version');

// Create server instance
const server = new Server({
  name: 'Analytical MCP Server',
  version: '0.1.0'
}, {
  capabilities: { tools: {} } 
});

// Define tool handlers
const analyzeDatasetHandler = async (params) => {
  console.error("Analyzing dataset:", params);
  
  if (!Array.isArray(params.data)) {
    return "Error: Please provide an array of numbers to analyze";
  }
  
  const data = params.data.filter(n => typeof n === 'number');
  
  // Basic statistics
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  return `
## Dataset Analysis

**Summary Statistics:**
- Count: ${data.length} values
- Sum: ${sum}
- Mean: ${mean.toFixed(2)}
- Range: ${min} to ${max}
- Median: ${getMedian(data).toFixed(2)}

**Sample Data:**
${data.slice(0, 5).join(', ')}${data.length > 5 ? ', ...' : ''}
  `;
};

const decisionAnalysisHandler = async (params) => {
  console.error("Performing decision analysis:", params);
  
  if (!Array.isArray(params.options)) {
    return "Error: Please provide an array of options to analyze";
  }
  
  if (!Array.isArray(params.criteria)) {
    return "Error: Please provide an array of criteria for evaluation";
  }
  
  // Simple decision analysis
  const analysis = params.options.map(option => {
    const scores = params.criteria.map(criterion => {
      return {
        criterion: criterion.name,
        score: Math.random() * 10, // Simplified scoring
        weight: criterion.weight || 1
      };
    });
    
    const totalScore = scores.reduce((sum, item) => sum + item.score * item.weight, 0) / 
                       scores.reduce((sum, item) => sum + item.weight, 0);
    
    return {
      option: option.name,
      totalScore: totalScore.toFixed(2),
      scores
    };
  });
  
  // Sort by total score
  analysis.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
  
  return `
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
  `;
};

// Helper function to get median
function getMedian(values) {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

// Completely override the handle method to directly handle jsonrpc requests
server.handle = async function(request) {
  console.error(`Received request: ${JSON.stringify(request)}`);
  
  try {
    if (request.method === 'analyze_dataset') {
      console.error('Handling analyze_dataset request');
      const result = await analyzeDatasetHandler(request.params || {});
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    }
    
    if (request.method === 'decision_analysis') {
      console.error('Handling decision_analysis request');
      const result = await decisionAnalysisHandler(request.params || {});
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    }
    
    // Handle initialize method
    if (request.method === 'initialize') {
      console.error('Handling initialize request');
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          serverInfo: {
            name: 'Analytical MCP Server',
            version: '0.1.0'
          },
          capabilities: {
            tools: [
              {
                name: 'analyze_dataset',
                description: 'Analyze a dataset with statistical methods',
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { type: 'number' },
                      description: 'Array of numeric data to analyze'
                    }
                  },
                  required: ['data']
                }
              },
              {
                name: 'decision_analysis',
                description: 'Analyze decision options based on multiple criteria',
                schema: {
                  type: 'object',
                  properties: {
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          description: { type: 'string' }
                        },
                        required: ['name']
                      },
                      description: 'Array of options to evaluate'
                    },
                    criteria: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          weight: { type: 'number' }
                        },
                        required: ['name']
                      },
                      description: 'Array of criteria for evaluation'
                    }
                  },
                  required: ['options', 'criteria']
                }
              }
            ]
          }
        }
      };
    }
    
    // Handle tools/list method
    if (request.method === 'tools/list') {
      console.error('Handling tools/list request');
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'analyze_dataset',
              description: 'Analyze a dataset with statistical methods',
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Array of numeric data to analyze'
                  }
                },
                required: ['data']
              }
            },
            {
              name: 'decision_analysis',
              description: 'Analyze decision options based on multiple criteria',
              schema: {
                type: 'object',
                properties: {
                  options: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        description: { type: 'string' }
                      },
                      required: ['name']
                    },
                    description: 'Array of options to evaluate'
                  },
                  criteria: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        weight: { type: 'number' }
                      },
                      required: ['name']
                    },
                    description: 'Array of criteria for evaluation'
                  }
                },
                required: ['options', 'criteria']
              }
            }
          ]
        }
      };
    }
    
    console.error(`Method not found: ${request.method}`);
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32601,
        message: `Method not found: ${request.method}`
      }
    };
  } catch (error) {
    console.error(`Error handling request: ${error.message}`, error);
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32000,
        message: error.message || 'Unknown error'
      }
    };
  }
};

// Connect using stdio transport
console.error('Connecting to stdio transport...');
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('Analytical MCP Server running on stdio');
}).catch(err => {
  console.error('Server connection failed:', err);
  process.exit(1);
});
