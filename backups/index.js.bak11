#!/usr/bin/env node

/**
 * Analytical MCP Server - Simplified Fixed Version
 * Compatible with MCP SDK 1.0.1
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Redirect console.log to stderr for better logging
console.log = function() {
  console.error.apply(console, arguments);
};

console.error('Starting Analytical MCP Server - Simplified Fixed Version');

// Create server instance
const server = new Server({
  name: 'Analytical MCP Server',
  version: '0.1.0'
}, {
  capabilities: { tools: {} } 
});

// Initialize tools registry
server.toolsRegistry = { tools: {} };

// Add tool registration method
server.registerTool = function(name, description, schema, handler) {
  console.error(`Registering tool ${name}`);
  server.toolsRegistry.tools[name] = {
    name,
    description,
    schema,
    handler
  };
};

// Define tool handlers
const analyzeDatasetHandler = async (params) => {
  console.error("Analyzing dataset:", params);
  
  if (!Array.isArray(params.data)) {
    return "Error: Please provide an array of numbers to analyze";
  }
  
  const data = params.filter(n => typeof n === 'number') || params.data.filter(n => typeof n === 'number');
  
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

// Register tools
if (server.capabilities && server.capabilities.tools) {
  server.capabilities.tools.register({
    name: 'analyze_dataset',
    description: 'Analyze a dataset with statistical methods',
    handler: analyzeDatasetHandler,
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
  });
  
  server.capabilities.tools.register({
    name: 'decision_analysis',
    description: 'Analyze decision options based on multiple criteria',
    handler: decisionAnalysisHandler,
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
  });
  
  console.error("Tools registered via capabilities API");
} else {
  // Fallback method if capabilities is not available
  server.registerTool(
    'analyze_dataset',
    'Analyze a dataset with statistical methods',
    {
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
    analyzeDatasetHandler
  );
  
  server.registerTool(
    'decision_analysis',
    'Analyze decision options based on multiple criteria',
    {
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
    decisionAnalysisHandler
  );
  
  console.error("Tools registered via custom method");
}

// Override handle method to process tool requests
const originalHandle = server.handle;
server.handle = async function(request) {
  try {
    // Try using the original handler first
    if (originalHandle) {
      return await originalHandle(request);
    }
    
    // Fall back to custom handling
    const toolName = request.method;
    const tool = server.toolsRegistry.tools[toolName];
    
    if (!tool) {
      console.error(`Method not found: ${toolName}`);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${toolName}`
        }
      };
    }
    
    console.error(`Executing tool: ${toolName}`);
    const result = await tool.handler(request.params || {});
    return {
      jsonrpc: '2.0',
      id: request.id,
      result
    };
  } catch (error) {
    console.error(`Error handling tool request:`, error);
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
