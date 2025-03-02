import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ConfigurationError } from '../errors.js';

// Save original environment to restore it later
const originalEnv = process.env;

// Mock the Logger
jest.mock('../logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    initializeFromEnvironment: jest.fn(),
  },
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn().mockReturnValue({ parsed: {}, error: null }),
}));

describe('Configuration Module', () => {
  // Reset environment and mocks before each test
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear all mocks
    jest.clearAllMocks();
  });

  // Restore original environment after each test
  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Config Loading', () => {
    it('should load default values when environment variables are not provided', async () => {
      // Clear environment variables that might affect the test
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.HOST;
      delete process.env.LOG_LEVEL;
      delete process.env.EXA_API_KEY;
      delete process.env.ENABLE_RESEARCH_INTEGRATION;
      
      // Import the module after setting up the environment
      const { config } = await import('../config.js');
      
      // Check for default values
      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(3000);
      expect(config.HOST).toBe('localhost');
      expect(config.LOG_LEVEL).toBe('INFO');
      expect(config.EXA_API_KEY).toBeUndefined();
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe(false);
    });

    it('should load values from environment variables when provided', async () => {
      // Set test environment variables
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';
      process.env.HOST = 'api.example.com';
      process.env.LOG_LEVEL = 'ERROR';
      process.env.EXA_API_KEY = 'test-api-key';
      process.env.ENABLE_RESEARCH_INTEGRATION = 'true';
      
      // Import the module after setting up the environment
      const { config } = await import('../config.js');
      
      // Check for provided values
      expect(config.NODE_ENV).toBe('production');
      expect(config.PORT).toBe(8080);
      expect(config.HOST).toBe('api.example.com');
      expect(config.LOG_LEVEL).toBe('ERROR');
      expect(config.EXA_API_KEY).toBe('test-api-key');
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe(true);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should convert PORT to number', async () => {
      process.env.PORT = '9999';
      
      const { config } = await import('../config.js');
      
      expect(config.PORT).toBe(9999);
      expect(typeof config.PORT).toBe('number');
    });

    it('should handle invalid PORT value correctly', async () => {
      process.env.PORT = 'not-a-number';
      
      await expect(async () => {
        await import('../config.js');
      }).rejects.toThrow(ConfigurationError);
    });

    it('should handle invalid NODE_ENV value', async () => {
      process.env.NODE_ENV = 'invalid-env';
      
      await expect(async () => {
        await import('../config.js');
      }).rejects.toThrow(ConfigurationError);
    });

    it('should handle invalid LOG_LEVEL value', async () => {
      process.env.LOG_LEVEL = 'INVALID_LEVEL';
      
      await expect(async () => {
        await import('../config.js');
      }).rejects.toThrow(ConfigurationError);
    });

    it('should handle boolean conversion for ENABLE_RESEARCH_INTEGRATION', async () => {
      // Test 'true' as string
      process.env.ENABLE_RESEARCH_INTEGRATION = 'true';
      let { config } = await import('../config.js');
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe(true);
      
      // Reset modules to re-import
      jest.resetModules();
      
      // Test 'TRUE' (case insensitive)
      process.env.ENABLE_RESEARCH_INTEGRATION = 'TRUE';
      ({ config } = await import('../config.js'));
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe(true);
      
      // Reset modules to re-import
      jest.resetModules();
      
      // Test 'false' as string
      process.env.ENABLE_RESEARCH_INTEGRATION = 'false';
      ({ config } = await import('../config.js'));
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe(false);
      
      // Reset modules to re-import
      jest.resetModules();
      
      // Test invalid value (not 'true') - should default to false
      process.env.ENABLE_RESEARCH_INTEGRATION = 'not-a-boolean';
      ({ config } = await import('../config.js'));
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should get config values using getConfig helper', async () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '5000';
      
      const { getConfig } = await import('../config.js');
      
      expect(getConfig('NODE_ENV')).toBe('test');
      expect(getConfig('PORT')).toBe(5000);
    });

    it('should check if features are enabled using isFeatureEnabled', async () => {
      // Test when both flag and API key are set
      process.env.ENABLE_RESEARCH_INTEGRATION = 'true';
      process.env.EXA_API_KEY = 'valid-key';
      
      let { isFeatureEnabled } = await import('../config.js');
      
      expect(isFeatureEnabled('researchIntegration')).toBe(true);
      
      // Reset modules to re-import
      jest.resetModules();
      
      // Test when flag is true but API key is missing
      process.env.ENABLE_RESEARCH_INTEGRATION = 'true';
      delete process.env.EXA_API_KEY;
      
      ({ isFeatureEnabled } = await import('../config.js'));
      
      expect(isFeatureEnabled('researchIntegration')).toBe(false);
      
      // Reset modules to re-import
      jest.resetModules();
      
      // Test when flag is false but API key is present
      process.env.ENABLE_RESEARCH_INTEGRATION = 'false';
      process.env.EXA_API_KEY = 'valid-key';
      
      ({ isFeatureEnabled } = await import('../config.js'));
      
      expect(isFeatureEnabled('researchIntegration')).toBe(false);
    });

    it('should handle unknown feature in isFeatureEnabled', async () => {
      const { isFeatureEnabled } = await import('../config.js');
      
      // @ts-ignore - Testing runtime behavior with invalid input
      expect(isFeatureEnabled('unknownFeature')).toBe(false);
    });
  });

  describe('Dotenv Integration', () => {
    it('should handle dotenv error gracefully', async () => {
      // Mock dotenv to return an error
      const dotenv = require('dotenv');
      dotenv.config.mockReturnValueOnce({ 
        parsed: null, 
        error: new Error('Mocked dotenv error') 
      });
      
      // This shouldn't throw, it should log a warning and continue
      await import('../config.js');
      
      // Verify Logger.warn was called
      const { Logger } = require('../logger');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Error loading .env file. Using system environment variables.',
        expect.any(Error)
      );
    });
  });
});