// Jest setup file for real API testing
import { jest, beforeAll, afterAll } from '@jest/globals';

// Configure longer timeouts for tests that interact with real APIs
jest.setTimeout(60000); // 60 seconds

// Global beforeAll hook
beforeAll(() => {
  // Set up any needed test fixtures or global state
  console.log('Setting up test environment with real API connections');
});

// Global afterAll hook
afterAll(() => {
  // Clean up any resources
  console.log('Test environment teardown complete');
});
