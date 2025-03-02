import { nlpToolkit } from '../nlp_toolkit.js';

describe('NLP Toolkit', () => {
  const sampleTexts = [
    'The quick brown fox jumps over the lazy dog.',
    'Natural language processing is an exciting field of artificial intelligence.',
    'Machine learning algorithms are transforming many industries.'
  ];

  test('tokenization works correctly', () => {
    sampleTexts.forEach(text => {
      const tokens = nlpToolkit.tokenize(text);
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens).toBeInstanceOf(Array);
    });
  });

  test('sentiment analysis provides meaningful results', () => {
    sampleTexts.forEach(text => {
      const sentimentResult = nlpToolkit.analyzeSentiment(text);
      
      expect(sentimentResult).toHaveProperty('score');
      expect(sentimentResult).toHaveProperty('comparative');
      expect(sentimentResult).toHaveProperty('tokens');
      expect(sentimentResult).toHaveProperty('words');
      expect(sentimentResult).toHaveProperty('positive');
      expect(sentimentResult).toHaveProperty('negative');
    });
  });

  test('POS tagging works correctly', () => {
    sampleTexts.forEach(text => {
      const posTags = nlpToolkit.getPOSTags(text);
      
      expect(posTags.length).toBeGreaterThan(0);
      posTags.forEach(tag => {
        expect(tag).toHaveProperty('word');
        expect(tag).toHaveProperty('tag');
      });
    });
  });

  test('lemmatization handles different word types', () => {
    const testWords = [
      { word: 'running', type: 'verb', expected: 'run' },
      { word: 'dogs', type: 'noun', expected: 'dog' },
      { word: 'beautiful', type: 'adjective', expected: 'beautiful' }
    ];

    testWords.forEach(({ word, type, expected }) => {
      const lemma = nlpToolkit.lemmatize(word, type as any);
      expect(lemma).toBeDefined();
      expect(lemma.length).toBeGreaterThan(0);
    });
  });

  test('spell checking identifies misspelled words', () => {
    const textWithMisspellings = 'Thsi is a sentense with misspeled words';
    const corrections = nlpToolkit.spellCheck(textWithMisspellings);
    
    expect(corrections.length).toBeGreaterThan(0);
    corrections.forEach(correction => {
      expect(correction).toHaveProperty('word');
      expect(correction).toHaveProperty('suggestions');
    });
  });

  test('named entity extraction works', () => {
    const textWithNames = 'John works at Google in New York.';
    const entities = nlpToolkit.extractNamedEntities(textWithNames);
    
    expect(entities).toHaveProperty('persons');
    expect(entities).toHaveProperty('organizations');
    expect(entities).toHaveProperty('locations');
  });

  test('text similarity calculation works', () => {
    const similarity = nlpToolkit.textSimilarity(
      'The quick brown fox',
      'The fast brown fox'
    );

    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });
});
