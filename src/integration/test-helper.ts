/**
 * Test helper functions for integration tests
 */

import { jest } from '@jest/globals';

// Mock data (inline since __mocks__ was removed)
const mockExaSearchResponse = {
  results: [
    {
      url: 'https://example.com/test1',
      title: 'Test Result 1',
      text: 'Test content 1',
      score: 0.9
    },
    {
      url: 'https://example.com/test2', 
      title: 'Test Result 2',
      text: 'Test content 2',
      score: 0.8
    }
  ]
};

const mockExtractionResults = {
  entities: ['Entity1', 'Entity2'],
  topics: ['Topic1', 'Topic2'],
  summary: 'Test summary'
};
import fetch from 'node-fetch';
import { config, isFeatureEnabled } from '../utils/config.js';

/**
 * Sets up mock responses for Exa API tests
 */
export function setupExaMocks(mockOptions: {
  searchResults?: typeof mockExaSearchResponse;
  shouldFail?: boolean;
  failureCode?: number;
  rateLimit?: boolean;
}) {
  // Mock the fetch function for Exa API calls
  (fetch as jest.Mock).mockImplementation((url: string, options: any) => {
    if (mockOptions.shouldFail) {
      return Promise.resolve({
        ok: false,
        status: mockOptions.failureCode || 400,
        json: jest.fn(() => Promise.resolve({
          error: {
            message: 'API Error',
            code: 'error_code'
          }
        }))
      });
    }
    
    if (mockOptions.rateLimit) {
      return Promise.resolve({
        ok: false,
        status: 429,
        json: jest.fn(() => Promise.resolve({
          error: {
            message: 'Rate limit exceeded',
            code: 'rate_limited'
          }
        }))
      });
    }
    
    return Promise.resolve({
      ok: true,
      status: 200,
      json: jest.fn(() => Promise.resolve(mockOptions.searchResults || mockExaSearchResponse))
    });
  });
  
  // Mock the Exa search method would go here if using mocks
  // Note: Since __mocks__ was removed, tests use real API calls
}

/**
 * Resets all mocks between tests
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  
  // Reset config mocks
  (isFeatureEnabled as jest.Mock).mockImplementation((feature) => {
    if (feature === 'FEATURE_ENHANCED_RESEARCH') return true;
    if (feature === 'FEATURE_ADVANCED_EXTRACTION') return true;
    if (feature === 'FEATURE_EXPERIMENTAL_NLP') return false;
    return false;
  });
}

/**
 * Mocks an API key environment for tests
 */
export function mockApiKeys() {
  process.env.EXA_API_KEY = 'mock-exa-api-key';
  
  // Update config mock
  Object.assign(config, {
    EXA_API_KEY: 'mock-exa-api-key'
  });
}
