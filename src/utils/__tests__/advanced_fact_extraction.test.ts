import { describe, it, expect } from '@jest/globals';
import { factExtractor } from '../advanced_fact_extraction.js';

describe('Advanced Fact Extraction', () => {
  // Sample text for testing
  const sampleText = `
    The global artificial intelligence market grew by 38% in 2023 to reach $150 billion. 
    Healthcare AI applications showed the strongest growth, with a 45% increase year-over-year.
    Experts suggest that regulatory frameworks are still catching up to the rapid pace of AI advancement.
    Please note that this page uses cookies to enhance your browsing experience.
    According to a recent survey, 72% of enterprises are planning to increase their AI investments.
    Sign up for our newsletter to stay updated with the latest trends. 
    Terms of service apply to all users of this platform.
    Natural language processing applications represent the largest segment of the AI market at 28%.
    Copyright 2023, All rights reserved.
  `;

  it('should extract high-quality facts from text', () => {
    const facts = factExtractor.extractFacts(sampleText, {
      maxFacts: 4,
      requireVerbs: true,
      filterBoilerplate: true,
    });

    // Should extract facts and not boilerplate
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.length).toBeLessThanOrEqual(4);

    // Check that we're getting factual content and not boilerplate
    const factTexts = facts.map((f) => f.text);

    // Should include market facts
    expect(factTexts.some((text) => text.includes('global artificial intelligence market'))).toBe(
      true
    );

    // Should not include boilerplate
    expect(
      factTexts.some(
        (text) =>
          text.includes('cookies') || text.includes('newsletter') || text.includes('Copyright')
      )
    ).toBe(false);

    // Should have scores
    expect(facts[0].score).toBeGreaterThan(0);
  });

  it('should respect maxFacts parameter', () => {
    const facts = factExtractor.extractFacts(sampleText, {
      maxFacts: 2,
    });

    expect(facts.length).toBeLessThanOrEqual(2);
  });

  it('should handle empty or invalid input', () => {
    expect(factExtractor.extractFacts('')).toEqual([]);
    expect(factExtractor.extractFacts(null as any)).toEqual([]);
    expect(factExtractor.extractFacts(undefined as any)).toEqual([]);
  });

  it('should score sentences with numeric content higher', () => {
    const factsWithNumbers = factExtractor.extractFacts(
      'The AI market grew 38% last year. AI is transforming many industries.'
    );

    // The sentence with numbers should be scored higher
    expect(factsWithNumbers[0].text).toContain('38%');
  });

  it('should boost sentences that match context query', () => {
    const text = `
      Cloud computing market reached $500 billion in 2023.
      AI market grew to $150 billion in the same period.
      Mobile app development continues to be a strong sector.
    `;

    const facts = factExtractor.extractFacts(text, {
      contextQuery: 'artificial intelligence market growth',
      maxFacts: 2,
    });

    // The AI-related fact should be ranked first due to context relevance
    expect(facts[0].text).toContain('AI market');
  });

  it('should extract entities from text', () => {
    const facts = factExtractor.extractFacts(
      'Microsoft reported $250 billion in revenue for 2023. The company expanded its AI initiatives.'
    );

    // Should have detected entities
    expect(facts[0].entities).toBeDefined();
    expect(facts[0].entities?.length).toBeGreaterThan(0);
    expect(facts[0].entities).toContain('Microsoft');
    expect(facts[0].entities?.some((e) => e.includes('$250 billion'))).toBe(true);
  });
});
