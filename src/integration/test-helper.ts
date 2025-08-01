/**
 * Test helper functions for integration tests
 */

// Mock imports will be handled by Jest configuration
// import { exaResearch } from '../__mocks__/exa-research.js';
// import { researchVerification } from '../__mocks__/research-verification-mock.js';
// import { mockExaSearchResponse, mockExtractionResults } from '../__mocks__/exa-research-mock.js';
import fetch from 'node-fetch';
import { config, isFeatureEnabled } from '../utils/config.js';

// Mock search response for testing
const mockExaSearchResponse = {
  results: [
    {
      id: 'test-1',
      title: 'Test Result',
      text: 'Test content',
      url: 'https://example.com'
    }
  ]
};

/**
 * Sets up mock responses for Exa API tests
 */
export function setupExaMocks(options: {
  searchResults?: typeof mockExaSearchResponse;
  shouldFail?: boolean;
  failureCode?: number;
  rateLimit?: boolean;
}) {
  // Mock the fetch function for Exa API calls
  (fetch as jest.Mock).mockImplementation((url, options) => {
    if (options.shouldFail) {
      return Promise.resolve({
        ok: false,
        status: options.failureCode || 400,
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'API Error',
            code: 'error_code'
          }
        })
      });
    }
    
    if (options.rateLimit) {
      return Promise.resolve({
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'Rate limit exceeded',
            code: 'rate_limited'
          }
        })
      });
    }
    
    return Promise.resolve({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(options.searchResults || mockExaSearchResponse)
    });
  });
  
  // Mock would go here if exaResearch mock was available
  // exaResearch.search.mockResolvedValue(options.searchResults || mockExaSearchResponse);
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
