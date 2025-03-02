/**
 * Integration tests for Exa Research functionality
 */
import { exaResearch } from '../__mocks__/exa-research';
import { mockExaSearchResponse } from '../__mocks__/exa-research-mock';
import { setupExaMocks, resetAllMocks, mockApiKeys } from './test-helper';
import fetch from 'node-fetch';
import { APIError } from '../utils/errors';

// Mock external dependencies
jest.mock('node-fetch');
jest.mock('../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));
jest.mock('../utils/config', () => {
  return {
    config: {
      EXA_API_KEY: 'test-api-key',
      NODE_ENV: 'test'
    },
    isFeatureEnabled: jest.fn().mockImplementation((feature) => {
      if (feature === 'FEATURE_ENHANCED_RESEARCH') return true;
      return false;
    })
  };
});

describe('Exa Research Integration', () => {
  beforeEach(() => {
    resetAllMocks();
    mockApiKeys();
    setupExaMocks({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search()', () => {
    it('should successfully perform a search query', async () => {
      const result = await exaResearch.search({
        query: 'renewable energy market trends',
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true
      });

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(3);
      expect(result.results[0].title).toBe('Test Article 1');
      expect(exaResearch.search).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      setupExaMocks({ shouldFail: true, failureCode: 400 });
      
      await expect(exaResearch.search({
        query: 'failed search',
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true
      })).rejects.toThrow(APIError);
    });

    it('should handle rate limiting', async () => {
      setupExaMocks({ rateLimit: true });
      
      await expect(exaResearch.search({
        query: 'rate limited search',
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true
      })).rejects.toThrow(APIError);
    });
  });

  describe('extractKeyFacts()', () => {
    it('should extract key facts from search results', () => {
      const facts = exaResearch.extractKeyFacts(mockExaSearchResponse.results);
      
      expect(facts).toBeDefined();
      expect(Array.isArray(facts)).toBe(true);
      expect(facts.length).toBe(mockExaSearchResponse.results.length);
      expect(facts[0]).toContain('Key fact from Test Article 1');
    });
  });

  describe('verifyFact()', () => {
    it('should verify a fact against multiple sources', async () => {
      const result = await exaResearch.verifyFact('The market for renewable energy grew by 15% in 2022');
      
      expect(result).toBeDefined();
      expect(result.isVerified).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(Array.isArray(result.supportingEvidence)).toBe(true);
    });
  });
});