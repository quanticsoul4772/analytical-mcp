#!/usr/bin/env node

/**
 * Analytical MCP Server
 * 
 * A specialized MCP server focused on enhancing AI capabilities for structured 
 * problem-solving, analytical reasoning, and decision-making.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";
import { Logger } from "./utils/logger.js";
import { AnalyticalError } from "./utils/errors.js";

// Configure global error handlers
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
  // Don't exit immediately in production to allow graceful shutdown
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)));
  // Don't exit immediately in production
});

/**
 * Create an MCP server with tools capability for analytical functions
 */
const server = new Server(
  {
    name: "Analytical MCP Server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register our analytical tools
try {
  registerTools(server);
  Logger.info("All tools registered successfully");
} catch (error) {
  Logger.error("Failed to register tools", error);
  process.exit(1);
}

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.info("Analytical MCP Server running on stdio");
  } catch (error) {
    Logger.error("Server initialization failed", error);
    process.exit(1);
  }
}

main().catch((error) => {
  const err = error instanceof Error ? error : new Error(String(error));
  Logger.error("Fatal server error", err);
  process.exit(1);
});
