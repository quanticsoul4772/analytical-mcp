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
registerTools(server);

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Analytical MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
