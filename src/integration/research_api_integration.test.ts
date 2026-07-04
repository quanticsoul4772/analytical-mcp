import { describe, it, expect } from '@jest/globals';
import { exaResearch } from '../utils/exa_research.js';
import { ValidationError } from '../utils/errors.js';
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

  it('should extract key facts from search results', () => {
    // extractKeyFacts is a pure, offline transformation over search results, so
    // we feed it deterministic canned results rather than nondeterministic live
    // search output. This exercises the real extraction logic (advanced fact
    // extraction with fallback) without any network call or API key, and passes
    // identically whether or not EXA_API_KEY is set.
    const results = [
      {
        title: 'Renewable Energy Report 2025',
        url: 'https://example.com/energy',
        contents:
          'Global renewable energy capacity increased by thirty percent in 2025, and ' +
          'solar power generation grew substantially across many regions worldwide. ' +
          'Analysts reported that wind installations expanded faster than any previous year on record.',
      },
      {
        title: 'Technology Trends Overview',
        url: 'https://example.com/tech',
        contents:
          'Artificial intelligence adoption increased sharply as enterprises deployed ' +
          'large language models into production systems this year. ' +
          'Researchers found that automated tooling reduced development time considerably for most software teams.',
      },
    ];

    // Extract key facts from the deterministic results
    const facts = exaResearch.extractKeyFacts(results);

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
    // Invalid parameters are rejected by schema validation before any network
    // request is issued, so this is deterministic and needs no API key. The
    // current error shape is a code-first ValidationError (see
    // src/utils/errors.ts): `.code` is the ERR_xxxx code and `.recoverable`
    // is false for validation failures.
    const error = await exaResearch
      .search({
        query: '', // Empty query
        numResults: -1, // Invalid number: violates the schema's min(1)
        useWebResults: true,
        useNewsResults: false,
        includeContents: true,
      })
      .then(() => {
        throw new Error('Expected search to reject for invalid parameters');
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe('ERR_1001');
    expect((error as ValidationError).recoverable).toBe(false);
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
    const validationResult = await exaResearch.validateData({
      originalData: dataToValidate,
      context: 'Product sales growth validation',
    });

    // Verify structure but not specific content
    expect(validationResult).toBeDefined();
    expect(validationResult.validatedData).toBeDefined();
    expect(validationResult.researchContext).toBeInstanceOf(Array);
  });
});
