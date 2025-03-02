import { describe, it, expect } from '@jest/globals';
import { exaResearch } from '../utils/exa_research.js';
import { APIError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

describe('Research API Integration', () => {
  it('should perform search and return results', async () => {
    // Skip test if EXA_API_KEY is not in environment
    if (!process.env.EXA_API_KEY) {
      Logger.warn('Skipping test: EXA_API_KEY not found in environment');
      return;
    }

    // Perform search with real API
    const result = await exaResearch.search({
      query: 'test query for integration test',
      numResults: 2,
      useWebResults: true,
      useNewsResults: false,
      includeContents: true,
    });

    // Verify result - we don't test specific content, just structure
    expect(result).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);

    // Real API should return some results
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('should extract key facts from search results', async () => {
    // Skip test if EXA_API_KEY is not in environment
    if (!process.env.EXA_API_KEY) {
      Logger.warn('Skipping test: EXA_API_KEY not found in environment');
      return;
    }

    // Get real search results first
    const results = await exaResearch.search({
      query: 'latest technology trends',
      numResults: 2,
      useWebResults: true,
      useNewsResults: false,
      includeContents: true,
    });

    // Extract key facts from the real results
    const facts = exaResearch.extractKeyFacts(results.results);

    // Check structure and patterns rather than specific content
    expect(facts).toBeInstanceOf(Array);
    expect(facts.length).toBeGreaterThan(0);

    // Each fact should be a non-empty string
    facts.forEach((fact) => {
      expect(typeof fact).toBe('string');
      expect(fact.length).toBeGreaterThan(10);
    });
  });

  it('should handle API errors gracefully', async () => {
    // Skip test if EXA_API_KEY is not in environment
    if (!process.env.EXA_API_KEY) {
      Logger.warn('Skipping test: EXA_API_KEY not found in environment');
      return;
    }

    // Attempt search with invalid parameters to trigger an error
    try {
      await exaResearch.search({
        query: '', // Empty query should cause an error
        numResults: -1, // Invalid number
        useWebResults: true,
        useNewsResults: false,
        includeContents: true,
      });

      // Should not reach here
      expect(false).toBe(true); // Force fail if no error thrown
    } catch (error) {
      // Verify error is an APIError
      expect(error).toBeInstanceOf(APIError);
    }
  });

  it('should validate data using real API', async () => {
    // Skip test if EXA_API_KEY is not in environment
    if (!process.env.EXA_API_KEY) {
      Logger.warn('Skipping test: EXA_API_KEY not found in environment');
      return;
    }

    // Sample data to validate
    const dataToValidate = [
      { product: 'A', sales: 1200, growth: 0.15 },
      { product: 'B', sales: 980, growth: 0.08 },
      { product: 'C', sales: 1450, growth: 0.22 },
    ];

    // Perform validation with real API
    const validationResult = await exaResearch.validateData(
      dataToValidate,
      'Product sales growth validation'
    );

    // Verify structure but not specific content
    expect(validationResult).toBeDefined();
    expect(validationResult.validatedData).toBeDefined();
    expect(validationResult.researchContext).toBeInstanceOf(Array);
  });
});
