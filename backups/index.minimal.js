#!/usr/bin/env node

/**
 * Analytical MCP Server - Minimal Working Version
 * For MCP SDK 1.0.1 compatibility
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Redirect console.log to stderr
console.log = function() {
  console.error.apply(console, arguments);
};

// Create server with required options
const server = new Server({
  name: 'Analytical MCP Server',
  version: '0.1.0'
}, {
  capabilities: { tools: {} } 
});

// Define a simple tool for testing
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

// Register a single tool for testing
if (server.capabilities && server.capabilities.tools) {
  server.capabilities.tools.register({
    name: 'analyze_dataset',
    description: 'Analyze a dataset with statistical methods',
    handler: analyzeDatasetHandler,
    // Basic schema
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
  console.error("Tool registered via capabilities API");
} else {
  // Fallback method if capabilities is not available
  server.registerTool = server.registerTool || function(name, desc, schema, handler) {
    console.error(`Tool ${name} registered via custom method`);
    // Just store it for now, we'll handle invocation manually
    if (!server._tools) server._tools = {};
    server._tools[name] = { handler };
  };
  
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
  
  // Override handle method
  const originalHandle = server.handle;
  server.handle = async function(request) {
    if (request.method === 'analyze_dataset' && server._tools && server._tools.analyze_dataset) {
      try {
        const result = await server._tools.analyze_dataset.handler(request.params || {});
        return {
          jsonrpc: '2.0',
          id: request.id,
          result
        };
      } catch (error) {
        console.error("Error handling tool request:", error);
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
    
    if (originalHandle) {
      return await originalHandle(request);
    }
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32601,
        message: `Method not found: ${request.method}`
      }
    };
  };
}

// Connect using stdio transport
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('Analytical MCP Server running on stdio');
}).catch(err => {
  console.error('Server connection failed:', err);
  process.exit(1);
});
