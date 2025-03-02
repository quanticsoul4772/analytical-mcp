import { enhancedFactExtractor } from '../exa_research.js';

describe('Enhanced Fact Extractor', () => {
  const sampleTexts = [
    'Apple Inc. is a technology company founded by Steve Jobs in Cupertino, California. It develops innovative products like the iPhone and MacBook.',
    'Climate change is impacting global temperatures. Rising carbon emissions are associated with increased global warming trends.',
    'The quantum computing research at MIT is pushing the boundaries of computational science. Researchers are developing new algorithms for complex problem-solving.',
    'Machine learning has transformed industries like healthcare and finance. Artificial intelligence continues to evolve rapidly, bringing new challenges and opportunities.'
  ];

  test.each(sampleTexts)('should extract diverse facts from text', (text) => {
    const extraction = enhancedFactExtractor.extractFacts(text);

    expect(extraction).toBeDefined();
    expect(extraction.facts.length).toBeGreaterThan(0);
    expect(extraction.confidence).toBeGreaterThan(0);
    expect(extraction.confidence).toBeLessThanOrEqual(1);

    extraction.facts.forEach(fact => {
      expect(fact.fact).toBeTruthy();
      expect(fact.type).toMatch(/named_entity|relationship|statement|sentiment/);
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

  test('should handle different fact types', () => {
    const text = 'John Smith works at Google in New York. The company is known for innovative technology.';
    const extraction = enhancedFactExtractor.extractFacts(text);

    const factTypes = extraction.facts.map(f => f.type);
    
    expect(factTypes).toContain('named_entity');
    expect(factTypes).toContain('statement');
    expect(factTypes).toContain('sentiment');
  });

  test('should handle empty or very short text', () => {
    const emptyTextExtraction = enhancedFactExtractor.extractFacts('');
    const shortTextExtraction = enhancedFactExtractor.extractFacts('a');

    expect(emptyTextExtraction.facts.length).toBe(0);
    expect(emptyTextExtraction.confidence).toBe(0);
    expect(shortTextExtraction.facts.length).toBe(0);
    expect(shortTextExtraction.confidence).toBe(0);
  });

  test('should extract named entities correctly', () => {
    const text = 'Apple Inc. was founded by Steve Jobs in Cupertino, California.';
    const extraction = enhancedFactExtractor.extractFacts(text);

    const namedEntityFacts = extraction.facts.filter(f => f.type === 'named_entity');
    
    expect(namedEntityFacts.length).toBeGreaterThan(0);
    expect(namedEntityFacts.some(f => f.fact.includes('Apple'))).toBeTruthy();
    expect(namedEntityFacts.some(f => f.fact.includes('Steve Jobs'))).toBeTruthy();
    expect(namedEntityFacts.some(f => f.fact.includes('Cupertino'))).toBeTruthy();
  });

  test('should perform sentiment analysis', () => {
    const positiveText = 'This is an amazing breakthrough in technology!';
    const negativeText = 'The project failed miserably and caused significant problems.';
    
    const positiveExtraction = enhancedFactExtractor.extractFacts(positiveText);
    const negativeExtraction = enhancedFactExtractor.extractFacts(negativeText);

    const positiveSentimentFact = positiveExtraction.facts.find(f => f.type === 'sentiment');
    const negativeSentimentFact = negativeExtraction.facts.find(f => f.type === 'sentiment');

    expect(positiveSentimentFact).toBeDefined();
    expect(negativeSentimentFact).toBeDefined();
    
    if (positiveSentimentFact && negativeSentimentFact) {
      expect(positiveSentimentFact.sentiment?.score).toBeGreaterThan(0);
      expect(negativeSentimentFact.sentiment?.score).toBeLessThan(0);
    }
  });
});
