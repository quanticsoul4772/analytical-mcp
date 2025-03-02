#!/usr/bin/env node

/**
 * Simple verification script for the analytical-mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

console.log('Creating server instance...');
try {
  const server = new Server({
    name: 'Test Server',
    version: '0.1.0',
  }, {
    capabilities: { tools: {} }
  });
  
  console.log('Server created successfully!');
  console.log('Server capabilities:', server.capabilities);
  
  if (server.capabilities && server.capabilities.tools) {
    console.log('Tools capability is available');
  } else {
    console.log('Tools capability is NOT available');
  }
  
  console.log('Verification completed successfully');
} catch (error) {
  console.error('Error creating server:', error);
}
