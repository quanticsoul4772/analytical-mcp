/**
 * Tests for Advanced Named Entity Recognition
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { advancedNER, EntityType } from '../advanced_ner.js';
import { exaResearch } from '../exa_research.js';
import { nlpToolkit } from '../nlp_toolkit.js';
import { config } from '../config.js';

// Mock dependencies
jest.mock('../exa_research.js', () => ({
  exaResearch: {
    search: jest.fn(),
  },
}));

jest.mock('../nlp_toolkit.js', () => ({
  nlpToolkit: {
    extractNamedEntities: jest.fn(),
    getPOSTags: jest.fn(),
  },
}));

jest.mock('../config.js', () => ({
  config: {
    NLP_USE_EXA: 'true',
    NLP_EXA_SEARCH_PARAMS: {
      numResults: 3,
      useWebResults: true,
      useNewsResults: false,
    },
  },
  isFeatureEnabled: jest.fn().mockReturnValue(true),
}));

describe('Advanced Named Entity Recognition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should recognize entities using Exa research', async () => {
    // Set up mocks for Exa search
    const mockSearchResults = {
      results: [
        {
          title: 'Sample Result',
          url: 'https://example.com',
          contents: 'John Smith is the CEO of Acme Corporation in New York City.'
        }
      ]
    };
    
    (exaResearch.search as jest.Mock).mockResolvedValue(mockSearchResults);
    
    // Set up mocks for NLP toolkit
    (nlpToolkit.extractNamedEntities as jest.Mock).mockReturnValue({
      persons: ['John Smith'],
      organizations: ['Acme Corporation'],
      locations: ['New York City']
    });
    
    (nlpToolkit.getPOSTags as jest.Mock).mockReturnValue([
      { word: 'John', tag: 'NNP' },
      { word: 'Smith', tag: 'NNP' },
      { word: 'is', tag: 'VBZ' },
      { word: 'the', tag: 'DT' },
      { word: 'CEO', tag: 'NN' },
      { word: 'of', tag: 'IN' },
      { word: 'Acme', tag: 'NNP' },
      { word: 'Corporation', tag: 'NNP' },
      { word: 'in', tag: 'IN' },
      { word: 'New', tag: 'NNP' },
      { word: 'York', tag: 'NNP' },
      { word: 'City', tag: 'NNP' }
    ]);
    
    // Run the test
    const text = 'John Smith is the CEO of Acme Corporation in New York City.';
    const entities = await advancedNER.recognizeEntities(text);
    
    // Verify results
    expect(entities.length).toBeGreaterThan(0);
    
    // Check for expected entity types
    const personEntities = entities.filter(e => e.type === EntityType.PERSON);
    const orgEntities = entities.filter(e => e.type === EntityType.ORGANIZATION);
    const locationEntities = entities.filter(e => e.type === EntityType.LOCATION);
    
    expect(personEntities.length).toBeGreaterThan(0);
    expect(orgEntities.length).toBeGreaterThan(0);
    expect(locationEntities.length).toBeGreaterThan(0);
    
    // Verify Exa search was called
    expect(exaResearch.search).toHaveBeenCalled();
  });
  
  it('should fall back to rule-based approach when Exa search fails', async () => {
    // Make Exa search fail
    (exaResearch.search as jest.Mock).mockRejectedValue(new Error('API error'));
    
    // Set up mocks for NLP toolkit (for rule-based approach)
    (nlpToolkit.extractNamedEntities as jest.Mock).mockReturnValue({
      persons: ['Jane Doe'],
      organizations: [],
      locations: []
    });
    
    (nlpToolkit.getPOSTags as jest.Mock).mockReturnValue([
      { word: 'Jane', tag: 'NNP' },
      { word: 'Doe', tag: 'NNP' },
      { word: 'works', tag: 'VBZ' },
      { word: 'at', tag: 'IN' },
      { word: 'Acme', tag: 'NNP' },
      { word: 'Inc', tag: 'NNP' }
    ]);
    
    // Run the test
    const text = 'Jane Doe works at Acme Inc.';
    const entities = await advancedNER.recognizeEntities(text);
    
    // Verify results
    expect(entities.length).toBeGreaterThan(0);
    
    // Verify Exa search was attempted but rule-based approach was used
    expect(exaResearch.search).toHaveBeenCalled();
    expect(nlpToolkit.getPOSTags).toHaveBeenCalled();
  });
  
  it('should extract date entities', async () => {
    // Make Exa search fail to force rule-based approach
    (exaResearch.search as jest.Mock).mockRejectedValue(new Error('API error'));
    
    // Set up mocks for date extraction
    (nlpToolkit.getPOSTags as jest.Mock).mockReturnValue([
      { word: 'The', tag: 'DT' },
      { word: 'event', tag: 'NN' },
      { word: 'is', tag: 'VBZ' },
      { word: 'on', tag: 'IN' },
      { word: 'January', tag: 'NNP' },
      { word: '15', tag: 'CD' },
      { word: '2024', tag: 'CD' }
    ]);
    
    // Run the test
    const text = 'The event is on January 15 2024.';
    const entities = await advancedNER.recognizeEntities(text);
    
    // Verify date entities were found
    const dateEntities = entities.filter(e => e.type === EntityType.DATE);
    expect(dateEntities.length).toBeGreaterThan(0);
  });
  
  it('should extract money entities', async () => {
    // Make Exa search fail to force rule-based approach
    (exaResearch.search as jest.Mock).mockRejectedValue(new Error('API error'));
    
    // Set up mocks for money extraction
    (nlpToolkit.getPOSTags as jest.Mock).mockReturnValue([
      { word: 'The', tag: 'DT' },
      { word: 'product', tag: 'NN' },
      { word: 'costs', tag: 'VBZ' },
      { word: '$', tag: 'SYM' },
      { word: '99.99', tag: 'CD' }
    ]);
    
    // Run the test
    const text = 'The product costs $99.99.';
    const entities = await advancedNER.recognizeEntities(text);
    
    // Verify money entities were found
    const moneyEntities = entities.filter(e => e.type === EntityType.MONEY);
    expect(moneyEntities.length).toBeGreaterThan(0);
    expect(moneyEntities[0].text).toContain('$');
  });
  
  it('should disable Exa when feature flag is off', async () => {
    // Make isFeatureEnabled return false for this test
    jest.spyOn(config, 'isFeatureEnabled' as any).mockReturnValue(false);
    
    // Set up mocks
    (nlpToolkit.extractNamedEntities as jest.Mock).mockReturnValue({
      persons: ['Jane Doe'],
      organizations: [],
      locations: []
    });
    
    (nlpToolkit.getPOSTags as jest.Mock).mockReturnValue([
      { word: 'Jane', tag: 'NNP' },
      { word: 'Doe', tag: 'NNP' },
      { word: 'works', tag: 'VBZ' },
      { word: 'at', tag: 'IN' },
      { word: 'Acme', tag: 'NNP' },
      { word: 'Inc', tag: 'NNP' }
    ]);
    
    // Run the test
    const text = 'Jane Doe works at Acme Inc.';
    const entities = await advancedNER.recognizeEntities(text);
    
    // Verify results and that Exa search was not called
    expect(entities.length).toBeGreaterThan(0);
    expect(exaResearch.search).not.toHaveBeenCalled();
  });
});
