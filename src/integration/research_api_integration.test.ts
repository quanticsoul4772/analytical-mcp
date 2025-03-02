import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { exaResearch } from '../utils/exa_research.js';
import { withRetry, executeApiRequest } from '../utils/api_helpers.js';
import { config, isFeatureEnabled } from '../utils/config.js';
import { APIError } from '../utils/errors.js';

// Mock node-fetch
jest.mock('node-fetch');

// Mock config
jest.mock('../utils/config', () => ({
  config: {
    EXA_API_KEY: 'test-api-key',
    NODE_ENV: 'test'
  },
  isFeatureEnabled: jest.fn().mockReturnValue(true)
}));

describe('Research API Integration', () => {
  // Store original fetch implementation
  let originalFetch;
  let mockResponse;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
    
    // Create mock response
    mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        results: [
          {
            title: 'Test Research Article',
            url: 'https://example.com/research',
            contents: 'This is a test research article with important findings.'
          }
        ]
      })
    };
    
    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should perform search with retry logic', async () => {
    // Mock a transient failure then success
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse);

    // Perform search with API
    const result = await exaResearch.search({
      query: 'test query',
      numResults: 5,
      useWebResults: true,
      useNewsResults: true,
      includeContents: true
    });

    // Verify result
    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);
    expect(result.results[0].title).toBe('Test Research Article');
    
    // Verify fetch was called twice (retry after failure)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should disable research integration when feature flag is off', async () => {
    // Mock feature flag as disabled
    (isFeatureEnabled as jest.Mock).mockReturnValueOnce(false);
    
    // Attempt to perform search
    await expect(exaResearch.search({
      query: 'test query',
      numResults: 5,
      useWebResults: true,
      useNewsResults: true,
      includeContents: true
    })).rejects.toThrow(APIError);
    
    // Verify fetch was not called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle API rate limiting correctly', async () => {
    // Mock rate limit response
    const rateLimitResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    };
    
    // Set up fetch to return rate limit error then success
    global.fetch = jest.fn()
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(mockResponse);
    
    // Perform search (should retry after rate limit)
    const result = await exaResearch.search({
      query: 'test query',
      numResults: 5,
      useWebResults: true,
      useNewsResults: true,
      includeContents: true
    });
    
    // Verify result
    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);
    
    // Verify fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle permanent API errors correctly', async () => {
    // Mock permanent error response (not retryable)
    const errorResponse = {
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    };
    
    // Set up fetch to always return error
    global.fetch = jest.fn().mockResolvedValue(errorResponse);
    
    // Attempt to perform search
    await expect(exaResearch.search({
      query: 'test query',
      numResults: 5,
      useWebResults: true,
      useNewsResults: true,
      includeContents: true
    })).rejects.toThrow(APIError);
    
    // Verify fetch was called only once (no retry for permanent error)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should extract key facts from research results', async () => {
    // Create rich mock response with multiple results
    mockResponse.json = jest.fn().mockResolvedValue({
      results: [
        {
          title: 'Important Research Findings 2024',
          url: 'https://example.com/research1',
          contents: 'The first important finding shows significant impact on industry trends. Another critical insight reveals market dynamics are shifting rapidly.'
        },
        {
          title: 'Secondary Research Analysis',
          url: 'https://example.com/research2',
          contents: 'Secondary analysis confirms initial findings with additional data points. The correlation between factors X and Y is stronger than previously thought.'
        }
      ]
    });
    
    // Perform search
    const results = await exaResearch.search({
      query: 'test query',
      numResults: 5,
      useWebResults: true,
      useNewsResults: true,
      includeContents: true
    });
    
    // Extract key facts
    const facts = exaResearch.extractKeyFacts(results.results);
    
    // Verify extraction
    expect(facts).toBeInstanceOf(Array);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.some(fact => fact.includes('important finding'))).toBe(true);
    expect(facts.some(fact => fact.includes('correlation'))).toBe(true);
  });

  it('should integrate with data validation workflow', async () => {
    // Sample data to validate
    const dataToValidate = [
      { product: 'A', sales: 1200, growth: 0.15 },
      { product: 'B', sales: 980, growth: 0.08 },
      { product: 'C', sales: 1450, growth: 0.22 }
    ];
    
    // Create mock response for validation
    mockResponse.json = jest.fn().mockResolvedValue({
      results: [
        {
          title: 'Product Sales Validation',
          url: 'https://example.com/sales-data',
          contents: 'Product A has shown consistent growth of 15-18% annually. Product C is the fastest growing in the category with 20-25% annual growth.'
        }
      ]
    });
    
    // Perform validation
    const validationResult = await exaResearch.validateData(
      dataToValidate,
      'Product sales growth validation'
    );
    
    // Verify validation result
    expect(validationResult).toBeDefined();
    expect(validationResult.validatedData).toEqual(dataToValidate);
    expect(validationResult.researchContext).toBeInstanceOf(Array);
    expect(validationResult.researchContext.length).toBeGreaterThan(0);
    expect(validationResult.researchContext.some(fact => 
      fact.includes('Product A') || fact.includes('Product C')
    )).toBe(true);
    
    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});