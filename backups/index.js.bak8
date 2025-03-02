#!/usr/bin/env node

/**
 * Analytical MCP Server
 *
 * A specialized MCP server focused on enhancing AI capabilities for structured
 * problem-solving, analytical reasoning, and decision-making.
 * Fully compatible with MCP SDK 1.0.1
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { Logger } from './utils/logger.js';
import { config } from './utils/config.js';
import { cacheManager } from './utils/cache_manager.js';
import { ResearchCacheNamespace } from './utils/research_cache.js';

// Override console.log to use console.error instead
// This prevents log output from interfering with MCP communication
const originalConsoleLog = console.log;
console.log = function() {
  console.error.apply(console, arguments);
};

// Initialize logger with fallback values
Logger.initializeFromEnvironment(config.NODE_ENV || 'production', config.LOG_LEVEL || 'INFO');

// Configure global error handlers
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
  // Don't exit immediately in production to allow graceful shutdown
  if (config.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)));
  // Don't exit immediately in production
});

/**
 * Initialize the MCP server with SDK v1.0.1 compatibility
 */
function initializeServer() {
  // For MCP SDK 1.0.1 compatibility, use minimal params
  const server = new Server({
    name: 'Analytical MCP Server',
    version: '0.1.0',
  });
  
  // Monkey patch tools property
  server.tools = {
    register: function(name, config) {
      if (!server._tools) {
        server._tools = {};
      }
      server._tools[name] = config;
      Logger.debug(`Tool ${name} registered via tools.register`);
    }
  };
  
  // Ensure server has on method
  if (!server.on) {
    server.on = function(event, handler) {
      if (event === 'request' && typeof handler === 'function') {
        server._requestHandler = handler;
      }
    };
  }
  
  // Override handle method to use our tools
  const originalHandle = server.handle;
  server.handle = async function(request) {
    try {
      // Try using registered tools first
      if (server._tools && server._tools[request.method]) {
        const tool = server._tools[request.method];
        const result = await tool.handler(request.params || {});
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: result
        };
      }
      
      // If request handler exists, try it
      if (server._requestHandler) {
        return new Promise((resolve) => {
          server._requestHandler(request, (error, result) => {
            if (error) {
              resolve({
                jsonrpc: '2.0',
                id: request.id,
                error: {
                  code: -32000,
                  message: error.message || 'Unknown error'
                }
              });
            } else {
              resolve({
                jsonrpc: '2.0',
                id: request.id,
                result: result
              });
            }
          });
        });
      }
      
      // Fall back to original handle if available
      if (originalHandle) {
        return await originalHandle(request);
      }
      
      // Nothing worked - method not found
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        }
      };
    } catch (error) {
      Logger.error(`Error handling request: ${request.method}`, error);
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
  
  return server;
}

/**
 * Safely initialize the cache if enabled
 */
async function initializeCache() {
  if (config.ENABLE_RESEARCH_CACHE === 'true') {
    try {
      Logger.info('Preloading cache from disk...');
      const loadedEntries = await cacheManager.preload();
      Logger.info(`Loaded ${loadedEntries} entries from cache`);

      // Log cache statistics
      if (loadedEntries > 0) {
        const stats = {};
        Object.values(ResearchCacheNamespace).forEach((namespace) => {
          if (typeof namespace === 'string') {
            stats[namespace] = cacheManager.getStats(namespace);
          }
        });
        Logger.debug('Cache statistics', { stats });
      }
    } catch (error) {
      Logger.warn('Failed to initialize cache, continuing without cache', error);
    }
  } else {
    Logger.debug('Cache is disabled, skipping initialization');
  }
}

/**
 * Main server startup function
 */
async function main() {
  try {
    // Initialize the server
    const server = initializeServer();
    
    // Register tools
    registerTools(server);
    Logger.info('All tools registered successfully');

    // Initialize cache (non-critical)
    await initializeCache().catch((error) => {
      Logger.warn('Cache initialization failed, continuing without cache', error);
    });

    // Connect using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.info('Analytical MCP Server running on stdio');
  } catch (error) {
    Logger.error('Server initialization failed', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  const err = error instanceof Error ? error : new Error(String(error));
  Logger.error('Fatal server error', err);
  process.exit(1);
});
