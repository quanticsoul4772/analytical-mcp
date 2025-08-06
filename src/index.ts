#!/usr/bin/env node

/**
 * Analytical MCP Server
 *
 * A specialized MCP server focused on enhancing AI capabilities for structured
 * problem-solving, analytical reasoning, and decision-making.
 * Updated to use latest MCP SDK patterns
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { Logger } from './utils/logger.js';
import { config } from './utils/config.js';
import { cacheManager } from './utils/cache_manager.js';
import { ResearchCacheNamespace } from './utils/research_cache.js';
import { metricsServer } from './utils/metrics_server.js';

// Initialize logger with fallback values
Logger.initializeFromEnvironment(config.NODE_ENV || 'production', config.LOG_LEVEL || 'INFO');

// Configure global error handlers
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
  // Clean shutdown
  gracefulShutdown().finally(() => {
    if (config.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)));
  // Don't exit immediately in production
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  Logger.info('Received SIGINT, shutting down gracefully...');
  gracefulShutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  Logger.info('Received SIGTERM, shutting down gracefully...');
  gracefulShutdown().finally(() => process.exit(0));
});

/**
 * Initialize the MCP server with appropriate capabilities
 */
function initializeServer(): McpServer {
  // Create the server with tools capability
  const server = new McpServer(
    {
      name: 'Analytical MCP Server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
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
 * Initialize the metrics server if enabled
 */
async function initializeMetricsServer(): Promise<void> {
  if (config.METRICS_ENABLED === 'true') {
    try {
      await metricsServer.start();
      Logger.info(`Metrics server started on port ${config.METRICS_PORT}`);
    } catch (error) {
      Logger.warn('Failed to start metrics server, continuing without metrics endpoint', error);
    }
  } else {
    Logger.debug('Metrics server is disabled, skipping initialization');
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(): Promise<void> {
  try {
    Logger.info('Starting graceful shutdown...');
    
    // Stop metrics server
    if (metricsServer.isRunning()) {
      await metricsServer.stop();
      Logger.info('Metrics server stopped');
    }
    
    Logger.info('Graceful shutdown completed');
  } catch (error) {
    Logger.error('Error during graceful shutdown', error);
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

    // Initialize metrics server (non-critical)
    await initializeMetricsServer().catch((error) => {
      Logger.warn('Metrics server initialization failed, continuing without metrics endpoint', error);
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
