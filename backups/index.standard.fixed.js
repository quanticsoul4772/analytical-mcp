#!/usr/bin/env node

/**
 * Analytical MCP Server - Standard SDK Version (Fixed)
 * Uses the MCP SDK in a standard way with fixes for compatibility
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Redirect console.log to stderr for better logging
console.log = function() {
  console.error.apply(console, arguments);
};

console.error('Starting Analytical MCP Server - Standard SDK Version (Fixed)');

// Create server instance
const server = new Server({
  name: 'Analytical MCP Server',
  version: '0.1.0'
}, {
  capabilities: { tools: {} } 
});

// Define tool handlers
async function analyzeDataset(params) {
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
}

async function decisionAnalysis(params) {
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
}

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

// Ensure server.capabilities.tools exists
if (!server.capabilities) {
  server.capabilities = {};
}
if (!server.capabilities.tools) {
  server.capabilities.tools = {};
}
if (!server.capabilities.tools.register) {
  server.capabilities.tools.register = function(tool) {
    console.error(`Registering tool: ${tool.name}`);
    if (!server._tools) {
      server._tools = new Map();
    }
    server._tools.set(tool.name, tool);
  };
}

// Register tools with the server
server.capabilities.tools.register({
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
  handler: analyzeDataset
});

server.capabilities.tools.register({
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
  handler: decisionAnalysis
});

// Add custom request handler to handle tool methods
server.onRequest = async function(request) {
  console.error(`Received request: ${JSON.stringify(request)}`);
  
  // Handle tool methods
  if (server._tools && server._tools.has(request.method)) {
    console.error(`Handling tool method: ${request.method}`);
    const tool = server._tools.get(request.method);
    return await tool.handler(request.params || {});
  }
  
  // Handle tools/list method
  if (request.method === 'tools/list') {
    console.error('Handling tools/list request');
    return {
      tools: Array.from(server._tools || []).map(([name, tool]) => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema
      }))
    };
  }
  
  // Let the SDK handle other methods
  return null;
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
