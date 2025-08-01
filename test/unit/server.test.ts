import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockMcpServer, MockStdioServerTransport } from '../mocks/mock-server.js';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation((info, capabilities) => 
    new MockMcpServer(info, capabilities)
  ),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => 
    new MockStdioServerTransport()
  ),
}));

// Mock the logger
jest.mock('../../src/utils/logger.js', () => ({
  Logger: {
    initializeFromEnvironment: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock config
jest.mock('../../src/utils/config.js', () => ({
  config: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'DEBUG',
  },
}));

// Mock cache manager
jest.mock('../../src/utils/cache_manager.js', () => ({
  cacheManager: {
    initialize: jest.fn(),
    clearAll: jest.fn(),
  },
}));

// Mock tools registration
jest.mock('../../src/tools/index.js', () => ({
  registerTools: jest.fn(),
}));

describe('Server Initialization', () => {
  let mockServer: MockMcpServer;
  let mockTransport: MockStdioServerTransport;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset process event listeners
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
  });

  afterEach(() => {
    // Clean up any added listeners
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
  });

  it('should create server with correct configuration', async () => {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    
    // Import and initialize server
    await import('../../src/index.js');
    
    expect(McpServer).toHaveBeenCalledWith(
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
  });

  it('should register tools with server', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    
    // Import server to trigger tool registration
    await import('../../src/index.js');
    
    expect(registerTools).toHaveBeenCalled();
  });

  it('should initialize logger with correct environment', async () => {
    const { Logger } = await import('../../src/utils/logger.js');
    
    await import('../../src/index.js');
    
    expect(Logger.initializeFromEnvironment).toHaveBeenCalledWith('test', 'DEBUG');
  });

  it('should set up error handlers', async () => {
    const originalListeners = {
      uncaughtException: process.listeners('uncaughtException').length,
      unhandledRejection: process.listeners('unhandledRejection').length,
    };

    await import('../../src/index.js');

    expect(process.listeners('uncaughtException').length).toBeGreaterThan(originalListeners.uncaughtException);
    expect(process.listeners('unhandledRejection').length).toBeGreaterThan(originalListeners.unhandledRejection);
  });

  it('should handle uncaught exceptions in test environment', async () => {
    const { Logger } = await import('../../src/utils/logger.js');
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await import('../../src/index.js');

    // Find the uncaught exception handler
    const uncaughtHandlers = process.listeners('uncaughtException');
    const handler = uncaughtHandlers[uncaughtHandlers.length - 1] as (error: Error) => void;

    const testError = new Error('Test uncaught exception');
    
    expect(() => handler(testError)).toThrow('process.exit called');
    expect(Logger.error).toHaveBeenCalledWith('Uncaught exception', testError);
    
    mockExit.mockRestore();
  });

  it('should handle unhandled rejections', async () => {
    const { Logger } = await import('../../src/utils/logger.js');

    await import('../../src/index.js');

    // Find the unhandled rejection handler
    const rejectionHandlers = process.listeners('unhandledRejection');
    const handler = rejectionHandlers[rejectionHandlers.length - 1] as (reason: any) => void;

    const testReason = 'Test unhandled rejection';
    handler(testReason);

    expect(Logger.error).toHaveBeenCalledWith(
      'Unhandled rejection', 
      expect.any(Error)
    );
  });

  it('should not exit on errors in production environment', async () => {
    // Mock production environment
    jest.doMock('../../src/utils/config.js', () => ({
      config: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'INFO',
      },
    }));

    const { Logger } = await import('../../src/utils/logger.js');
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Re-import to get production behavior
    delete require.cache[require.resolve('../../src/index.js')];
    await import('../../src/index.js');

    // Find the uncaught exception handler
    const uncaughtHandlers = process.listeners('uncaughtException');
    const handler = uncaughtHandlers[uncaughtHandlers.length - 1] as (error: Error) => void;

    const testError = new Error('Test production exception');
    
    // Should not throw (no process.exit in production)
    expect(() => handler(testError)).not.toThrow();
    expect(Logger.error).toHaveBeenCalledWith('Uncaught exception', testError);
    
    mockExit.mockRestore();
  });
});