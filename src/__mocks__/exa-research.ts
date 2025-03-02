/**
 * Complete mock for the Exa Research module
 */

import { mockExaSearchResponse, mockExtractionResults } from './exa-research-mock';

class ExaResearchToolMock {
  search = jest.fn().mockResolvedValue(mockExaSearchResponse);
  
  extractKeyFacts = jest.fn().mockImplementation((results) => {
    return results.map(result => `Key fact from ${result.title}: ${result.contents.substring(0, 50)}...`);
  });
  
  extractEntities = jest.fn().mockImplementation((text) => {
    return [
      { entity: 'Example Entity', type: 'ORGANIZATION', confidence: 0.9 },
      { entity: 'John Doe', type: 'PERSON', confidence: 0.85 }
    ];
  });
  
  verifyFact = jest.fn().mockResolvedValue({
    isVerified: true,
    confidence: 0.87,
    supportingEvidence: ['Supporting evidence 1', 'Supporting evidence 2'],
    contradictingEvidence: []
  });
  
  analyzeText = jest.fn().mockResolvedValue({
    sentiment: 'positive',
    topics: ['technology', 'business', 'innovation'],
    keyPhrases: ['important development', 'significant growth', 'market opportunity']
  });
  
  registerTool = jest.fn();
}

export const exaResearch = new ExaResearchToolMock();