// Jest setup file for real API testing
import { jest, beforeAll, afterAll } from '@jest/globals';
import { config } from 'dotenv';
import { checkApiKeys } from './utils/api_helpers.js';
import { config as appConfig } from './utils/config.js';

// Configure longer timeouts for tests that interact with real APIs
jest.setTimeout(60000); // 60 seconds

// Load environment variables from .env.test file for tests
config({ path: '.env.test' });

// Global beforeAll hook
beforeAll(() => {
  // Set up any needed test fixtures and check required API keys
  console.log('Setting up test environment with real API connections');
  console.log(`NODE_ENV set to: ${process.env.NODE_ENV}`);

  try {
    // Check for required API keys and throw error if missing
    checkApiKeys();
    console.log('API key validation successful');
  } catch (error: any) {
    // Log the error but don't fail setup - let tests handle missing keys appropriately
    console.error('API key validation error:', error.message);
    console.error('Make sure the EXA_API_KEY is set in your system environment variables');
    console.error('Tests that require this API key will fail.');
  }
});

// Global afterAll hook
afterAll(() => {
  // Clean up any resources
  console.log('Test environment teardown complete');
});
