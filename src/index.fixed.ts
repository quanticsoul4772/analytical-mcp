#!/usr/bin/env node

/**
 * Analytical MCP Server
 *
 * A specialized MCP server focused on enhancing AI capabilities for structured
 * problem-solving, analytical reasoning, and decision-making.
 * Updated to use latest MCP SDK patterns with improved JSON serialization
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { Logger } from './utils/logger.js';
import { config } from './utils/config.js';
import { cacheManager } from './utils/cache_manager.js';
import { ResearchCacheNamespace } from './utils/research_cache.js';

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

// Install a modified JSON.stringify to handle circular references
const originalStringify = JSON.stringify;
JSON.stringify = function(value, replacer, space) {
  // Use a WeakSet to track circular references
  const seen = new WeakSet();
  
  // Custom replacer function to handle circular references
  const circularReplacer = (key: string, val: any) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    
    if (typeof val === 'function') {
      return '[Function]';
    }
    
    if (val instanceof Error) {
      return {
        name: val.name,
        message: val.message,
        stack: val.stack
      };
    }
    
    if (val instanceof RegExp) {
      return val.toString();
    }
    
    if (val === undefined) {
      return null;
    }
    
    return val;
  };
  
  // Combine user replacer with our circular replacer
  const finalReplacer = replacer 
    ? (key: string, val: any) => circularReplacer(key, typeof replacer === 'function' 
        ? replacer(key, val) 
        : val)
    : circularReplacer;
    
  try {
    return originalStringify(value, finalReplacer, space);
  } catch (err) {
    Logger.error('JSON serialization error', err);
    // Provide a fallback serialization for the value
    return originalStringify({
      error: 'Unable to serialize response',
      message: err instanceof Error ? err.message : String(err)
    });
  }
};

/**
 * Initialize the MCP server with appropriate capabilities
 */
function initializeServer(): Server {
  // Log startup parameters
  Logger.debug('Initializing server...', {
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL
  });
  
  // Create the server with tools capability
  const server = new Server(
    {
      name: 'Analytical MCP Server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      }
    }
  );

  return server;
}

/**
 * Safely initialize the cache if enabled
 */
async function initializeCache(): Promise<void> {
  if (config.ENABLE_RESEARCH_CACHE === 'true') {
    try {
      Logger.info('Preloading cache from disk...');
      const loadedEntries = await cacheManager.preload();
      Logger.info(`Loaded ${loadedEntries} entries from cache`);

      // Log cache statistics
      if (loadedEntries > 0) {
        const stats: Record<string, any> = {};
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
