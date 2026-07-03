/**
 * Tests for Advanced Named Entity Recognition (multi-provider coordinator).
 *
 * The Exa research dependency is mocked at the module boundary so the suite
 * runs fully offline; the local providers (rule-based, specialized pattern
 * extractor, text processor) are exercised for real.
 */

import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';

const searchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

import.meta.jest.unstable_mockModule('../exa_research.js', () => ({
  exaResearch: {
    search: searchMock,
  },
}));

const { advancedNER, EntityType } = await import('../advanced_ner.js');
const { config } = await import('../config.js');
const { DataProcessingError } = await import('../errors.js');

const originalResearchFlag = config.ENABLE_RESEARCH_INTEGRATION;
const originalNlpUseExa = config.NLP_USE_EXA;

function enableExaProvider(): void {
  config.ENABLE_RESEARCH_INTEGRATION = 'true';
  config.NLP_USE_EXA = 'true';
}

describe('Advanced Named Entity Recognition', () => {
  beforeEach(() => {
    searchMock.mockReset();
    // Offline by default: the Exa provider is gated on this flag.
    config.ENABLE_RESEARCH_INTEGRATION = 'false';
    config.NLP_USE_EXA = originalNlpUseExa;
  });

  afterAll(() => {
    config.ENABLE_RESEARCH_INTEGRATION = originalResearchFlag;
    config.NLP_USE_EXA = originalNlpUseExa;
  });

  it('recognizes person and organization entities offline without calling Exa', async () => {
    const text = 'John Smith is the CEO of Acme Inc in New York City.';
    const entities = await advancedNER.recognizeEntities(text);

    expect(searchMock).not.toHaveBeenCalled();
    expect(entities.length).toBeGreaterThan(0);

    const person = entities.find((e) => e.type === EntityType.PERSON);
    expect(person).toBeDefined();
    expect(person?.text).toBe('John Smith');

    const org = entities.find((e) => e.type === EntityType.ORGANIZATION);
    expect(org).toBeDefined();
    expect(org?.text).toBe('Acme Inc');

    // Every reported span must match the original text exactly.
    for (const entity of entities) {
      expect(text.slice(entity.startIndex, entity.endIndex)).toBe(entity.text);
      expect(entity.confidence).toBeGreaterThan(0);
      expect(entity.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('extracts date entities', async () => {
    const text = 'The event is on January 15, 2024.';
    const entities = await advancedNER.recognizeEntities(text);

    const dateEntities = entities.filter((e) => e.type === EntityType.DATE);
    expect(dateEntities.length).toBeGreaterThan(0);
    expect(dateEntities[0].text).toContain('January 15, 2024');
  });

  it('extracts money entities', async () => {
    const text = 'The product costs $99.99.';
    const entities = await advancedNER.recognizeEntities(text);

    const moneyEntities = entities.filter((e) => e.type === EntityType.MONEY);
    expect(moneyEntities.length).toBeGreaterThan(0);
    expect(moneyEntities[0].text).toContain('$');
  });

  it('uses Exa research when the feature flag and NLP_USE_EXA are enabled', async () => {
    enableExaProvider();
    const text = 'Acme Corp announced that John Smith will lead the office in Berlin.';
    searchMock.mockResolvedValue({
      results: [{ text, url: 'https://example.com' }],
    });

    const entities = await advancedNER.recognizeEntities(text);

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.stringContaining('entities named in:') })
    );
    expect(entities.length).toBeGreaterThan(0);

    const org = entities.find((e) => e.type === EntityType.ORGANIZATION);
    expect(org).toBeDefined();
    expect(org?.text).toBe('Acme Corp');
  });

  it('falls back to local providers when Exa search fails', async () => {
    enableExaProvider();
    searchMock.mockRejectedValue(new Error('API error'));

    const text = 'Jane Doe works at Acme Inc.';
    const entities = await advancedNER.recognizeEntities(text);

    expect(searchMock).toHaveBeenCalled();
    expect(entities.length).toBeGreaterThan(0);

    const person = entities.find((e) => e.type === EntityType.PERSON);
    expect(person?.text).toBe('Jane Doe');
  });

  it('does not call Exa when NLP_USE_EXA is disabled', async () => {
    config.ENABLE_RESEARCH_INTEGRATION = 'true';
    config.NLP_USE_EXA = 'false';

    const entities = await advancedNER.recognizeEntities('Jane Doe works at Acme Inc.');

    expect(searchMock).not.toHaveBeenCalled();
    expect(entities.length).toBeGreaterThan(0);
  });

  it('rejects empty input with a DataProcessingError', async () => {
    await expect(advancedNER.recognizeEntities('')).rejects.toThrow(DataProcessingError);
  });

  it('reports recognition statistics', async () => {
    const stats = await advancedNER.getRecognitionStats(
      'John Smith is the CEO of Acme Inc in New York City.'
    );

    expect(stats.totalEntities).toBeGreaterThan(0);
    expect(stats.averageConfidence).toBeGreaterThan(0);
    expect(stats.averageConfidence).toBeLessThanOrEqual(1);
    expect(Object.keys(stats.entityTypes).length).toBeGreaterThan(0);
    expect(Object.keys(stats.providerUsage).length).toBeGreaterThan(0);
  });
});
