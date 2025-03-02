import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { researchCache, ResearchCacheNamespace } from '../research_cache.js';
import { cacheManager } from '../cache_manager.js';
import { config } from '../config.js';

describe('ResearchCache', () => {
  // Mock original config
  const originalEnableCache = config.ENABLE_RESEARCH_CACHE;

  beforeEach(() => {
    // Enable cache for tests
    config.ENABLE_RESEARCH_CACHE = 'true';

    // Spy on cache manager methods
    jest.spyOn(cacheManager, 'get');
    jest.spyOn(cacheManager, 'set');
    jest.spyOn(cacheManager, 'clearNamespace');

    // Mock the return value of get to be null (cache miss)
    (cacheManager.get as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    // Restore original config
    config.ENABLE_RESEARCH_CACHE = originalEnableCache;

    // Restore mocks
    jest.restoreAllMocks();
  });

  it('should store and retrieve search results from cache', () => {
    // Prepare data
    const query = 'test query';
    const options = { numResults: 5 };
    const results = { results: [{ title: 'Test', url: 'http://test.com' }] };

    // Set a mock return value for the next call to cacheManager.get
    (cacheManager.get as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce(results);

    // Initial call should be a cache miss
    const cachedResults1 = researchCache.getSearchResults(query, options);
    expect(cachedResults1).toBeNull();
    expect(cacheManager.get).toHaveBeenCalled();

    // Store results in cache
    researchCache.setSearchResults(query, options, results);
    expect(cacheManager.set).toHaveBeenCalled();

    // Next call should be a cache hit
    const cachedResults2 = researchCache.getSearchResults(query, options);
    expect(cachedResults2).toEqual(results);
  });

  it('should store and retrieve extracted facts from cache', () => {
    // Prepare data
    const text = 'test text content';
    const maxFacts = 3;
    const facts = ['Fact 1', 'Fact 2', 'Fact 3'];

    // Set a mock return value for the next call to cacheManager.get
    (cacheManager.get as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce(facts);

    // Initial call should be a cache miss
    const cachedFacts1 = researchCache.getExtractedFacts(text, maxFacts);
    expect(cachedFacts1).toBeNull();

    // Store facts in cache
    researchCache.setExtractedFacts(text, maxFacts, facts);
    expect(cacheManager.set).toHaveBeenCalled();

    // Next call should be a cache hit
    const cachedFacts2 = researchCache.getExtractedFacts(text, maxFacts);
    expect(cachedFacts2).toEqual(facts);
  });

  it('should store and retrieve validation results from cache', () => {
    // Prepare data
    const context = 'validation context';
    const data = [{ id: 1 }, { id: 2 }];
    const results = {
      validatedData: [
        { id: 1, valid: true },
        { id: 2, valid: false },
      ],
      researchContext: ['Context 1', 'Context 2'],
    };

    // Set a mock return value for the next call to cacheManager.get
    (cacheManager.get as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce(results);

    // Initial call should be a cache miss
    const cachedResults1 = researchCache.getValidationResults(context, data);
    expect(cachedResults1).toBeNull();

    // Store results in cache
    researchCache.setValidationResults(context, data, results);
    expect(cacheManager.set).toHaveBeenCalled();

    // Next call should be a cache hit
    const cachedResults2 = researchCache.getValidationResults(context, data);
    expect(cachedResults2).toEqual(results);
  });

  it('should store and retrieve cross-domain results from cache', () => {
    // Prepare data
    const problem = 'test problem';
    const domains = ['domain1', 'domain2'];
    const results = {
      analogies: ['Analogy 1', 'Analogy 2'],
      potentialSolutions: ['Solution 1', 'Solution 2'],
    };

    // Set a mock return value for the next call to cacheManager.get
    (cacheManager.get as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce(results);

    // Initial call should be a cache miss
    const cachedResults1 = researchCache.getCrossDomainResults(problem, domains);
    expect(cachedResults1).toBeNull();

    // Store results in cache
    researchCache.setCrossDomainResults(problem, domains, results);
    expect(cacheManager.set).toHaveBeenCalled();

    // Next call should be a cache hit
    const cachedResults2 = researchCache.getCrossDomainResults(problem, domains);
    expect(cachedResults2).toEqual(results);
  });

  it('should store and retrieve enrichment results from cache', () => {
    // Prepare data
    const context = 'enrichment context';
    const data = [{ id: 1 }, { id: 2 }];
    const options = { enhancedExtraction: true };
    const results = {
      enrichedData: [
        { id: 1, enriched: true },
        { id: 2, enriched: true },
      ],
      researchInsights: ['Insight 1', 'Insight 2'],
      confidence: 0.85,
    };

    // Set a mock return value for the next call to cacheManager.get
    (cacheManager.get as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce(results);

    // Initial call should be a cache miss
    const cachedResults1 = researchCache.getEnrichmentResults(context, data, options);
    expect(cachedResults1).toBeNull();

    // Store results in cache
    researchCache.setEnrichmentResults(context, data, options, results);
    expect(cacheManager.set).toHaveBeenCalled();

    // Next call should be a cache hit
    const cachedResults2 = researchCache.getEnrichmentResults(context, data, options);
    expect(cachedResults2).toEqual(results);
  });

  it('should clear a specific cache namespace', () => {
    // Clear the search cache
    researchCache.clear(ResearchCacheNamespace.SEARCH);

    // Verify that clearNamespace was called with the correct namespace
    expect(cacheManager.clearNamespace).toHaveBeenCalledWith(ResearchCacheNamespace.SEARCH);
  });

  it('should clear all research caches', () => {
    // Clear all caches
    researchCache.clearAll();

    // Verify that clearNamespace was called for each namespace
    expect(cacheManager.clearNamespace).toHaveBeenCalledWith(ResearchCacheNamespace.SEARCH);
    expect(cacheManager.clearNamespace).toHaveBeenCalledWith(ResearchCacheNamespace.FACTS);
    expect(cacheManager.clearNamespace).toHaveBeenCalledWith(ResearchCacheNamespace.VALIDATION);
    expect(cacheManager.clearNamespace).toHaveBeenCalledWith(ResearchCacheNamespace.CROSS_DOMAIN);
    expect(cacheManager.clearNamespace).toHaveBeenCalledWith(ResearchCacheNamespace.ENRICHMENT);
  });

  it('should not cache when caching is disabled', () => {
    // Disable caching
    config.ENABLE_RESEARCH_CACHE = 'false';

    // Prepare data
    const query = 'test query';
    const options = { numResults: 5 };
    const results = { results: [{ title: 'Test', url: 'http://test.com' }] };

    // Cache operations should be no-ops
    researchCache.setSearchResults(query, options, results);
    const cachedResults = researchCache.getSearchResults(query, options);

    // Should not interact with cache manager
    expect(cacheManager.set).not.toHaveBeenCalled();
    expect(cachedResults).toBeNull();
  });

  it('should get stats for all namespaces', () => {
    // Mock getStats to return test stats
    jest.spyOn(cacheManager, 'getStats').mockImplementation((namespace) => {
      return {
        hits: 10,
        misses: 5,
        puts: 15,
        evictions: 2,
        size: 13,
        oldestEntry: Date.now() - 3600000,
        newestEntry: Date.now(),
      };
    });

    // Get stats
    const stats = researchCache.getStats();

    // Should have stats for each namespace
    expect(stats).toHaveProperty(ResearchCacheNamespace.SEARCH);
    expect(stats).toHaveProperty(ResearchCacheNamespace.FACTS);
    expect(stats).toHaveProperty(ResearchCacheNamespace.VALIDATION);
    expect(stats).toHaveProperty(ResearchCacheNamespace.CROSS_DOMAIN);
    expect(stats).toHaveProperty(ResearchCacheNamespace.ENRICHMENT);
  });
});
