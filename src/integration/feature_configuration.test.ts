import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ValidationError, ConfigurationError, APIError } from '../utils/errors.js';

// Mock the configuration module
jest.mock('../utils/config', () => {
  const originalModule = jest.requireActual('../utils/config');
  return {
    ...originalModule,
    config: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'INFO',
      EXA_API_KEY: 'test-api-key',
      ENABLE_RESEARCH_INTEGRATION: true,
    },
    isFeatureEnabled: jest.fn(),
    getConfig: jest.fn(),
  };
});

// Import after mocking
import { config, isFeatureEnabled, getConfig } from '../utils/config.js';
import { exaResearch } from '../utils/exa_research.js';
import { Logger } from '../utils/logger.js';

// Mock fetch for API calls
jest.mock('node-fetch');

// Mock Logger
jest.mock('../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    initializeFromEnvironment: jest.fn(),
  },
}));

describe('Feature Configuration Integration Tests', () => {
  let originalFetch;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (isFeatureEnabled as jest.Mock).mockImplementation((feature) => {
      if (feature === 'researchIntegration') {
        return config.ENABLE_RESEARCH_INTEGRATION && !!config.EXA_API_KEY;
      }
      return false;
    });

    (getConfig as jest.Mock).mockImplementation((key) => config[key]);

    // Store original fetch
    originalFetch = global.fetch;

    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        results: [{ title: 'Test', url: 'https://example.com', contents: 'Test content' }],
      }),
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  it('should enable research integration when properly configured', async () => {
    // Configure feature to be enabled
    config.ENABLE_RESEARCH_INTEGRATION = true;
    config.EXA_API_KEY = 'test-api-key';

    // Verify feature is enabled
    expect(isFeatureEnabled('researchIntegration')).toBe(true);

    // Test API integration works
    const results = await exaResearch.search({
      query: 'test query',
      numResults: 3,
      useWebResults: true,
      useNewsResults: false,
      includeContents: true,
    });

    // Verify results
    expect(results).toBeDefined();
    expect(results.results).toBeInstanceOf(Array);

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.exa.ai'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    );
  });

  it('should disable research integration when feature flag is off', async () => {
    // Configure feature to be disabled via feature flag
    config.ENABLE_RESEARCH_INTEGRATION = false;
    config.EXA_API_KEY = 'test-api-key';

    // Verify feature is disabled
    expect(isFeatureEnabled('researchIntegration')).toBe(false);

    // Test API integration fails gracefully
    await expect(
      exaResearch.search({
        query: 'test query',
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true,
      })
    ).rejects.toThrow(APIError);

    // Verify fetch was not called
    expect(global.fetch).not.toHaveBeenCalled();

    // Verify appropriate error logging
    expect(Logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Research integration is disabled'),
      expect.any(Object)
    );
  });

  it('should disable research integration when API key is missing', async () => {
    // Configure feature to be disabled via missing API key
    config.ENABLE_RESEARCH_INTEGRATION = true;
    config.EXA_API_KEY = undefined;

    // Verify feature is disabled
    expect(isFeatureEnabled('researchIntegration')).toBe(false);

    // Test API integration fails gracefully
    await expect(
      exaResearch.search({
        query: 'test query',
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true,
      })
    ).rejects.toThrow(APIError);

    // Verify fetch was not called
    expect(global.fetch).not.toHaveBeenCalled();

    // Verify appropriate error logging
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('API key is required'),
      expect.any(Object)
    );
  });

  it('should respect log level configuration', async () => {
    // Test different log levels
    const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

    for (const level of logLevels) {
      // Set log level
      config.LOG_LEVEL = level;

      // Initialize logger from config
      Logger.initializeFromEnvironment(config);

      // Get numeric log level (for comparison)
      const currentLevel = ['DEBUG', 'INFO', 'WARN', 'ERROR'].indexOf(level);

      // Clear previous calls
      (Logger.debug as jest.Mock).mockClear();
      (Logger.info as jest.Mock).mockClear();
      (Logger.warn as jest.Mock).mockClear();
      (Logger.error as jest.Mock).mockClear();

      // Log messages at different levels
      Logger.debug('Debug message');
      Logger.info('Info message');
      Logger.warn('Warning message');
      Logger.error('Error message');

      // Verify logging behavior based on configured level
      expect(Logger.debug).toHaveBeenCalledTimes(currentLevel <= 0 ? 1 : 0);
      expect(Logger.info).toHaveBeenCalledTimes(currentLevel <= 1 ? 1 : 0);
      expect(Logger.warn).toHaveBeenCalledTimes(currentLevel <= 2 ? 1 : 0);
      expect(Logger.error).toHaveBeenCalledTimes(1); // ERROR always logs
    }
  });

  it('should handle environment transitions correctly', async () => {
    // Test development environment
    config.NODE_ENV = 'development';

    // Verify debug level is enabled in development
    expect(getConfig('LOG_LEVEL')).toBe('INFO');

    // Initialize logger from config
    Logger.initializeFromEnvironment(config);

    // Test production environment
    config.NODE_ENV = 'production';
    config.LOG_LEVEL = 'WARN';

    // Verify log level is respected in production
    expect(getConfig('LOG_LEVEL')).toBe('WARN');

    // Initialize logger from config
    Logger.initializeFromEnvironment(config);

    // Clear previous calls
    (Logger.debug as jest.Mock).mockClear();
    (Logger.info as jest.Mock).mockClear();

    // Log messages
    Logger.debug('Debug message');
    Logger.info('Info message');

    // In WARN level, debug and info should be ignored
    expect(Logger.debug).not.toHaveBeenCalled();
    expect(Logger.info).not.toHaveBeenCalled();
  });
});
