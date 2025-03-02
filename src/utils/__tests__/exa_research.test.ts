import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ValidationError, APIError, DataProcessingError } from '../errors.js';

// Mock the entire fetch module and config
jest.mock('node-fetch');
jest.mock('../api_helpers.js', () => ({
  executeApiRequest: jest.fn((fn) => fn()),
  RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504],
}));
jest.mock('../config.js', () => ({
  config: {
    EXA_API_KEY: 'test-api-key',
  },
  isFeatureEnabled: jest.fn().mockReturnValue(true),
}));

// Mock the Logger
jest.mock('../logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Exa Research Utility', () => {
  let mockFetch;
  let exaResearch;
  let isFeatureEnabled;
  
  // Set up before each test
  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Import the mock fetch again to get a fresh mock
    const fetch = await import('node-fetch');
    mockFetch = fetch.default;
    
    // Reinitialize the module
    jest.isolateModules(() => {
      jest.resetModules();
    });

    // Re-import the module after mocks are set up
    const exaResearchModule = await import('../exa_research.js');
    exaResearch = exaResearchModule.exaResearch;
    
    // Import isFeatureEnabled
    const configModule = await import('../config.js');
    isFeatureEnabled = configModule.isFeatureEnabled;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default values when no config is provided', () => {
      // Mock isFeatureEnabled to return true
      isFeatureEnabled.mockReturnValue(true);
      
      // Properties are private, but we can test behavior
      expect(exaResearch).toBeDefined();
    });

    it('should log a warning when API key is missing', async () => {
      // Reset modules and mock config with no API key
      jest.resetModules();
      jest.mock('../config.js', () => ({
        config: { 
          EXA_API_KEY: undefined,
        },
        isFeatureEnabled: jest.fn().mockReturnValue(false),
      }));
      
      // Re-import the module
      const { exaResearch } = await import('../exa_research.js');
      
      // Check Logger was called with warning
      const { Logger } = await import('../logger.js');
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No Exa API key provided'),
        expect.any(Object)
      );
    });

    it('should throw ValidationError when invalid config is provided', async () => {
      // Use the require to get the constructor
      const { ExaResearchTool } = await import('../exa_research.js');
      
      // Invalid config
      const invalidConfig = {
        baseUrl: 123 // Should be a string
      };
      
      // Should throw ValidationError
      expect(() => {
        new ExaResearchTool(invalidConfig);
      }).toThrow(ValidationError);
    });
  });

  describe('Search Function', () => {
    it('should throw an APIError when research integration is disabled', async () => {
      // Mock isFeatureEnabled to return false
      isFeatureEnabled.mockReturnValue(false);
      
      await expect(
        exaResearch.search({ query: 'test query' })
      ).rejects.toThrow(APIError);
    });

    it('should throw ValidationError when invalid query parameters are provided', async () => {
      // Mock isFeatureEnabled to return true
      isFeatureEnabled.mockReturnValue(true);
      
      // Invalid query - missing required field
      await expect(
        // @ts-ignore - Testing runtime behavior with invalid input
        exaResearch.search({})
      ).rejects.toThrow(ValidationError);
      
      // Invalid query - numResults out of range
      await expect(
        exaResearch.search({ 
          query: 'test query',
          numResults: 20 // Max is 10
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw APIError when no API key is available', async () => {
      // Reset modules
      jest.resetModules();
      
      // Mock config with no API key
      jest.mock('../config.js', () => ({
        config: { 
          EXA_API_KEY: undefined,
        },
        isFeatureEnabled: jest.fn().mockReturnValue(true),
      }));
      
      // Re-import the module
      const { exaResearch } = await import('../exa_research.js');
      
      // Should throw APIError for missing API key
      await expect(
        exaResearch.search({ query: 'test query' })
      ).rejects.toThrow(APIError);
    });

    it('should handle successful API responses correctly', async () => {
      // Mock successful fetch response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          results: [
            { 
              title: 'Test Result', 
              url: 'https://example.com',
              contents: 'Test content for the search result.'
            }
          ]
        })
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      // Mock isFeatureEnabled to return true
      isFeatureEnabled.mockReturnValue(true);
      
      // Call search
      const result = await exaResearch.search({ query: 'test query' });
      
      // Verify result structure
      expect(result).toHaveProperty('results');
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results[0]).toHaveProperty('title', 'Test Result');
      expect(result.results[0]).toHaveProperty('url', 'https://example.com');

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.exa.ai/search'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: expect.any(String)
        })
      );
    });

    it('should handle API error responses correctly', async () => {
      // Mock error response
      const mockErrorResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      };
      mockFetch.mockResolvedValue(mockErrorResponse);
      
      // Mock isFeatureEnabled to return true
      isFeatureEnabled.mockReturnValue(true);
      
      // Call should throw APIError
      await expect(
        exaResearch.search({ query: 'test query' })
      ).rejects.toThrow(APIError);
    });

    it('should handle network errors correctly', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network Error'));
      
      // Mock isFeatureEnabled to return true
      isFeatureEnabled.mockReturnValue(true);
      
      // Call should throw APIError
      await expect(
        exaResearch.search({ query: 'test query' })
      ).rejects.toThrow(APIError);
    });
  });

  describe('Extract Key Facts Function', () => {
    it('should handle empty results gracefully', () => {
      // Call with empty array
      const facts = exaResearch.extractKeyFacts([]);
      
      expect(facts).toEqual([]);
    });

    it('should handle null or invalid results gracefully', () => {
      // @ts-ignore - Testing runtime behavior with invalid input
      const facts = exaResearch.extractKeyFacts(null);
      
      expect(facts).toEqual([]);
    });

    it('should extract facts from search results correctly', () => {
      // Sample search results
      const results = [
        {
          title: 'Test Title 1',
          url: 'https://example.com/1',
          contents: 'This is a long sentence that should be extracted as a fact. Another sentence that is too short.'
        },
        {
          title: 'Test Title 2 with more details about the topic',
          url: 'https://example.com/2',
        }
      ];
      
      const facts = exaResearch.extractKeyFacts(results);
      
      // Should extract at least one fact
      expect(facts.length).toBeGreaterThan(0);
      
      // Should include the long sentence
      expect(facts).toContain('This is a long sentence that should be extracted as a fact');
      
      // Should include the title
      expect(facts).toContain('Test Title 2 with more details about the topic');
    });

    it('should filter out short sentences and disclaimers', () => {
      const results = [
        {
          title: 'Test',
          url: 'https://example.com',
          contents: 'This is a disclaimer notice. This is a copyright notice. This is a short text. This is a sufficiently long sentence that should be included in the facts extraction process.'
        }
      ];
      
      const facts = exaResearch.extractKeyFacts(results);
      
      // Should extract only the long sentence
      expect(facts).toEqual(['This is a sufficiently long sentence that should be included in the facts extraction process.']);
    });

    it('should respect the maxFacts parameter', () => {
      const results = [
        {
          title: 'Long title 1 that should be extracted as a fact by itself',
          url: 'https://example.com/1',
          contents: 'Long sentence 1 that should be extracted. Long sentence 2 that should be extracted.'
        },
        {
          title: 'Long title 2 that should be extracted as a fact by itself',
          url: 'https://example.com/2',
          contents: 'Long sentence 3 that should be extracted. Long sentence 4 that should be extracted.'
        }
      ];
      
      // Extract only 2 facts
      const facts = exaResearch.extractKeyFacts(results, 2);
      
      // Should respect the limit
      expect(facts.length).toBe(2);
    });

    it('should handle errors during fact extraction', () => {
      // Create a result with a property that will cause error when processed
      const problematicResults = [
        {
          title: { toString: () => { throw new Error('Test error'); } },
          url: 'https://example.com'
        }
      ];
      
      // Should throw DataProcessingError
      expect(() => {
        // @ts-ignore - Testing runtime behavior with invalid input
        exaResearch.extractKeyFacts(problematicResults);
      }).toThrow(DataProcessingError);
    });
  });

  describe('Validate Data Function', () => {
    it('should throw ValidationError for invalid data format', async () => {
      // Test with null data
      await expect(
        // @ts-ignore - Testing runtime behavior with invalid input
        exaResearch.validateData(null, 'test context')
      ).rejects.toThrow(ValidationError);
      
      // Test with non-array data
      await expect(
        // @ts-ignore - Testing runtime behavior with invalid input
        exaResearch.validateData({}, 'test context')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty context', async () => {
      await expect(
        // @ts-ignore - Testing runtime behavior with invalid input
        exaResearch.validateData([], '')
      ).rejects.toThrow(ValidationError);
      
      await expect(
        // @ts-ignore - Testing runtime behavior with invalid input
        exaResearch.validateData([], null)
      ).rejects.toThrow(ValidationError);
    });

    it('should return original data with research context when successful', async () => {
      // Mock successful search
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          results: [
            { 
              title: 'Research Result',
              url: 'https://example.com',
              contents: 'This is a research finding that provides context for the validation.'
            }
          ]
        })
      });
      
      // Sample data to validate
      const sampleData = [{ value: 1 }, { value: 2 }];
      
      // Call validateData
      const result = await exaResearch.validateData(sampleData, 'test context');
      
      // Should return original data and research context
      expect(result).toHaveProperty('validatedData');
      expect(result).toHaveProperty('researchContext');
      expect(result.validatedData).toEqual(sampleData);
      expect(result.researchContext).toBeInstanceOf(Array);
    });

    it('should handle API errors gracefully and return original data', async () => {
      // Mock API error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      });
      
      // Sample data to validate
      const sampleData = [{ value: 1 }, { value: 2 }];
      
      // Call validateData - shouldn't throw even with API error
      const result = await exaResearch.validateData(sampleData, 'test context');
      
      // Should return original data with empty context
      expect(result.validatedData).toEqual(sampleData);
      expect(result.researchContext).toEqual([]);
    });

    it('should handle validation errors gracefully and return original data', async () => {
      // Mock validation error in search (numResults out of range)
      // Mock the search method to throw ValidationError
      jest.spyOn(exaResearch, 'search').mockImplementation(() => {
        throw new ValidationError('Validation error in search');
      });
      
      // Sample data to validate
      const sampleData = [{ value: 1 }, { value: 2 }];
      
      // Call validateData - shouldn't throw even with validation error
      const result = await exaResearch.validateData(sampleData, 'test context');
      
      // Should return original data with empty context
      expect(result.validatedData).toEqual(sampleData);
      expect(result.researchContext).toEqual([]);
    });

    it('should throw DataProcessingError for other errors', async () => {
      // Mock unexpected error in search
      jest.spyOn(exaResearch, 'search').mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      // Sample data to validate
      const sampleData = [{ value: 1 }, { value: 2 }];
      
      // Call validateData - should throw DataProcessingError
      await expect(
        exaResearch.validateData(sampleData, 'test context')
      ).rejects.toThrow(DataProcessingError);
    });
  });

  describe('Register Function', () => {
    it('should return true on successful registration', () => {
      const mockServer = {};
      
      const registerResult = exaResearch.registerTool(mockServer);
      
      // Check Logger was called
      const { Logger } = require('../logger');
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Exa Research tool registered')
      );
    });
  });
});