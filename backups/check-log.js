#!/usr/bin/env node

/**
 * Script to check the last few lines of the MCP server log
 */

import fs from 'fs';
import path from 'path';

const logPath = '../Users/rbsmi/AppData/Roaming/Claude/logs/mcp-server-analytical-mcp-server.log';

try {
  // Check if the file exists
  if (!fs.existsSync(logPath)) {
    console.error(`Log file not found: ${logPath}`);
    process.exit(1);
  }

  // Get the file size
  const stats = fs.statSync(logPath);
  const fileSize = stats.size;

  // Read the last 10KB of the file
  const bufferSize = Math.min(10 * 1024, fileSize);
  const buffer = Buffer.alloc(bufferSize);
  const fd = fs.openSync(logPath, 'r');
  fs.readSync(fd, buffer, 0, bufferSize, fileSize - bufferSize);
  fs.closeSync(fd);

  // Convert buffer to string and split into lines
  const content = buffer.toString('utf8');
  const lines = content.split('\n');

  // Get the last 50 lines
  const lastLines = lines.slice(-50);

  console.log('Last 50 lines of the log file:');
  console.log('----------------------------');
  console.log(lastLines.join('\n'));
  console.log('----------------------------');
} catch (error) {
  console.error(`Error reading log file: ${error.message}`);
}
