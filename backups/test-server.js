#!/usr/bin/env node

/**
 * Simple test script for the analytical-mcp-server
 * Writes output to test-result.txt
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server script
const serverPath = path.join(__dirname, 'build', 'index.js');

// Output file path
const outputPath = path.join(__dirname, 'test-result.txt');

// Function to write to the output file
function writeToFile(message) {
  fs.appendFileSync(outputPath, message + '\n');
}

// Clear the output file if it exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

writeToFile('Starting test at ' + new Date().toISOString());
writeToFile('Server path: ' + serverPath);

// Start the server process
writeToFile('Starting server from: ' + serverPath);
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
server.stdout.on('data', (data) => {
  const output = `Server stdout: ${data}`;
  writeToFile(output);
  console.log(output);
});

server.stderr.on('data', (data) => {
  const output = `Server stderr: ${data.toString()}`;
  writeToFile(output);
  console.log(output);
});

// Send a test request to the server
setTimeout(() => {
  writeToFile('\nSending analyze_dataset request...');
  console.log('Sending analyze_dataset request...');
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'analyze_dataset',
    params: {
      data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
  
  // Wait for response and then send another request
  setTimeout(() => {
    writeToFile('\nSending decision_analysis request...');
    console.log('Sending decision_analysis request...');
    const request2 = {
      jsonrpc: '2.0',
      id: 2,
      method: 'decision_analysis',
      params: {
        options: [
          { name: 'Option A', description: 'First option' },
          { name: 'Option B', description: 'Second option' }
        ],
        criteria: [
          { name: 'Cost', weight: 2 },
          { name: 'Quality', weight: 3 }
        ]
      }
    };
    
    server.stdin.write(JSON.stringify(request2) + '\n');
    
    // Wait for response and then exit
    setTimeout(() => {
      writeToFile('\nTest completed, closing server...');
      console.log('Test completed, closing server...');
      server.kill();
      process.exit(0);
    }, 2000);
  }, 2000);
}, 2000);
