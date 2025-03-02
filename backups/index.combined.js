#!/usr/bin/env node

/**
 * Analytical MCP Server - Combined Version
 * Implements the MCP protocol directly with explicit method handling
 */

import * as readline from 'readline';

// Redirect console.log to stderr for better logging
console.log = function() {
  console.error.apply(console, arguments);
};

console.error('Starting Analytical MCP Server - Combined Version');

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

// Define the tools
const tools = [
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
    },
    handler: analyzeDatasetHandler
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
    },
    handler: decisionAnalysisHandler
  }
];

// Store tools in a map for easy access
const toolsMap = new Map();
tools.forEach(tool => {
  toolsMap.set(tool.name, tool);
});

// Handle a JSON-RPC request
async function handleRequest(request) {
  console.error(`Received request: ${JSON.stringify(request)}`);
  
  try {
    // Handle initialize method
    if (request.method === 'initialize') {
      console.error('Handling initialize request');
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'Analytical MCP Server',
            version: '0.1.0'
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
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            schema: tool.schema
          }))
        }
      };
    }
    
    // Handle tool methods
    if (toolsMap.has(request.method)) {
      console.error(`Handling ${request.method} request`);
      const tool = toolsMap.get(request.method);
      const result = await tool.handler(request.params || {});
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    }
    
    // Handle unknown methods
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
    console.error(`Error handling request: ${error.message || error}`, error);
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32000,
        message: error.message || 'Unknown error'
      }
    };
  }
}

// Set up readline interface for stdio
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Process each line of input
rl.on('line', async (line) => {
  try {
    // Parse the JSON-RPC request
    const request = JSON.parse(line);
    
    // Handle the request
    const response = await handleRequest(request);
    
    // Send the response
    console.log(JSON.stringify(response));
  } catch (error) {
    console.error(`Error processing request: ${error.message}`, error);
    
    // Send an error response
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    }));
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down...');
  process.exit(0);
});

console.error('Analytical MCP Server running on stdio');
