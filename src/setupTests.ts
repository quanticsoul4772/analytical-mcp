// Jest setup file for real API testing
import { jest, beforeAll, afterAll } from '@jest/globals';
import { config } from 'dotenv';
import { checkApiKeys } from './utils/api_helpers.js';

// Configure longer timeouts for tests that interact with real APIs
jest.setTimeout(60000); // 60 seconds

// Load environment variables from .env file for tests
config();

// Global beforeAll hook
beforeAll(() => {
  // Set up any needed test fixtures and check required API keys
  console.log('Setting up test environment with real API connections');
  
  // Check for required API keys and throw error if missing
  checkApiKeys();
});

// Global afterAll hook
afterAll(() => {
  // Clean up any resources
  console.log('Test environment teardown complete');
});
