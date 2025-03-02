import { enhancedFactExtractor } from '../exa_research.js';

describe('Enhanced Fact Extractor', () => {
  const sampleTexts = [
    'Apple Inc. is a technology company founded by Steve Jobs in Cupertino, California. It develops innovative products like the iPhone and MacBook.',
    'Climate change is impacting global temperatures. Rising carbon emissions are associated with increased global warming trends.',
    'The quantum computing research at MIT is pushing the boundaries of computational science. Researchers are developing new algorithms for complex problem-solving.'
  ];

  test.each(sampleTexts)('should extract facts from text', (text) => {
    const extraction = enhancedFactExtractor.extractFacts(text);

    expect(extraction).toBeDefined();
    expect(extraction.facts.length).toBeGreaterThan(0);
    expect(extraction.confidence).toBeGreaterThan(0);
    expect(extraction.confidence).toBeLessThanOrEqual(1);

    extraction.facts.forEach(fact => {
      expect(fact.fact).toBeTruthy();
      expect(fact.type).toMatch(/named_entity|relationship|statement/);
      expect(fact.confidence).toBeGreaterThan(0);
      expect(fact.confidence).toBeLessThanOrEqual(1);
    });
  });

  test('should handle minimum confidence filtering', () => {
    const extraction = enhancedFactExtractor.extractFacts(sampleTexts[0], {
      minConfidence: 0.8
    });

    expect(extraction.facts.length).toBeGreaterThanOrEqual(0);
    extraction.facts.forEach(fact => {
      expect(fact.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  test('should limit maximum number of facts', () => {
    const extraction = enhancedFactExtractor.extractFacts(sampleTexts[0], {
      maxFacts: 2
    });

    expect(extraction.facts.length).toBeLessThanOrEqual(2);
  });

  test('should handle empty or very short text', () => {
    const emptyTextExtraction = enhancedFactExtractor.extractFacts('');
    const shortTextExtraction = enhancedFactExtractor.extractFacts('a');

    expect(emptyTextExtraction.facts.length).toBe(0);
    expect(emptyTextExtraction.confidence).toBe(0);
    expect(shortTextExtraction.facts.length).toBe(0);
    expect(shortTextExtraction.confidence).toBe(0);
  });
});
