#!/usr/bin/env node

/**
 * Verification script that writes output to a file
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output file path
const outputPath = path.join(__dirname, 'verification-result.txt');

// Function to write to the output file
function writeToFile(message) {
  fs.appendFileSync(outputPath, message + '\n');
}

// Clear the output file if it exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

writeToFile('Starting verification at ' + new Date().toISOString());
writeToFile('Creating server instance...');

try {
  const server = new Server({
    name: 'Test Server',
    version: '0.1.0',
  }, {
    capabilities: { tools: {} }
  });
  
  writeToFile('Server created successfully!');
  writeToFile('Server capabilities: ' + JSON.stringify(server.capabilities, null, 2));
  
  if (server.capabilities && server.capabilities.tools) {
    writeToFile('Tools capability is available');
  } else {
    writeToFile('Tools capability is NOT available');
  }
  
  writeToFile('Verification completed successfully');
} catch (error) {
  writeToFile('Error creating server: ' + error.message);
  writeToFile('Stack trace: ' + error.stack);
}

console.log(`Verification completed. Results written to ${outputPath}`);
