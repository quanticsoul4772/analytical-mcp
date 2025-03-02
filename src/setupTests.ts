// Jest setup file for real API testing
import { jest, beforeAll, afterAll } from '@jest/globals';
import { config } from 'dotenv';
import { checkApiKeys } from './utils/api_helpers.js';
import { config as appConfig } from './utils/config.js';
import { Logger } from './utils/logger.js';

// Configure longer timeouts for tests that interact with real APIs
jest.setTimeout(60000); // 60 seconds

// Load environment variables from .env.test file for tests
config({ path: '.env.test' });

// Global beforeAll hook
beforeAll(() => {
  // Set up any needed test fixtures and check required API keys
  Logger.info('Setting up test environment with real API connections');
  Logger.info(`NODE_ENV set to: ${process.env.NODE_ENV}`);

  try {
    // Check for required API keys and throw error if missing
    checkApiKeys();
    Logger.info('API key validation successful');
  } catch (error: any) {
    // Log the error but don't fail setup - let tests handle missing keys appropriately
    Logger.error('API key validation error:', error);
    Logger.error('Make sure the EXA_API_KEY is set in your system environment variables');
    Logger.warn('Tests that require this API key will fail.');
  }
});

// Global afterAll hook
afterAll(() => {
  // Clean up any resources
  Logger.info('Test environment teardown complete');
});
