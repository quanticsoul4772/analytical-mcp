#!/usr/bin/env node

/**
 * Test script for the analytical-mcp-server using MCP protocol
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output file path
const outputPath = path.join(__dirname, 'test-protocol-result.txt');

// Function to write to the output file
function writeToFile(message) {
  fs.appendFileSync(outputPath, message + '\n');
}

// Clear the output file if it exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

writeToFile('Starting test at ' + new Date().toISOString());

// Path to the server script
const serverPath = path.join(__dirname, 'build', 'index.js');
writeToFile(`Server path: ${serverPath}`);

// Start the server process
console.log(`Starting server from: ${serverPath}`);
writeToFile(`Starting server from: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
server.stdout.on('data', (data) => {
  const message = `Server stdout: ${data}`;
  console.log(message);
  writeToFile(message);
});

server.stderr.on('data', (data) => {
  const message = `Server stderr: ${data.toString()}`;
  console.log(message);
  writeToFile(message);
});

// Send a test request to the server
setTimeout(() => {
  console.log('Sending initialize request...');
  writeToFile('Sending initialize request...');
  
  const initializeRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '0.1.0'
      }
    }
  };
  
  server.stdin.write(JSON.stringify(initializeRequest) + '\n');
  
  // Wait and then send tools/list request
  setTimeout(() => {
    console.log('Sending tools/list request...');
    writeToFile('Sending tools/list request...');
    
    const toolsListRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    
    server.stdin.write(JSON.stringify(toolsListRequest) + '\n');
    
    // Wait and then send analyze_dataset request
    setTimeout(() => {
      console.log('Sending analyze_dataset request...');
      writeToFile('Sending analyze_dataset request...');
      
      const analyzeRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'analyze_dataset',
        params: {
          data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        }
      };
      
      server.stdin.write(JSON.stringify(analyzeRequest) + '\n');
      
      // Wait and then send decision_analysis request
      setTimeout(() => {
        console.log('Sending decision_analysis request...');
        writeToFile('Sending decision_analysis request...');
        
        const decisionRequest = {
          jsonrpc: '2.0',
          id: 4,
          method: 'decision_analysis',
          params: {
            options: [
              { name: 'Option A', description: 'First option' },
              { name: 'Option B', description: 'Second option' },
              { name: 'Option C', description: 'Third option' }
            ],
            criteria: [
              { name: 'Cost', weight: 2 },
              { name: 'Quality', weight: 3 },
              { name: 'Time', weight: 1 }
            ]
          }
        };
        
        server.stdin.write(JSON.stringify(decisionRequest) + '\n');
        
        // Wait for response and then exit
        setTimeout(() => {
          console.log('Test completed, closing server...');
          writeToFile('Test completed, closing server...');
          server.kill();
          console.log(`Test results written to ${outputPath}`);
          process.exit(0);
        }, 2000);
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);
