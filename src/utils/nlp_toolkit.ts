import natural from 'natural';
import pos from 'pos';
import sentiment from 'sentiment';
import { Lemmatizer } from 'wink-lemmatizer';
import { POSTagger } from 'wink-pos-tagger';
import spellchecker from 'spellchecker';
import tokenize from 'tokenize-text';

import { Logger } from './logger.js';

export class NLPToolkit {
  private tokenizer: natural.WordTokenizer;
  private sentimentAnalyzer: sentiment;
  private lemmatizer: Lemmatizer;
  private posTagger: POSTagger;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.sentimentAnalyzer = new sentiment();
    this.lemmatizer = new Lemmatizer();
    this.posTagger = new POSTagger();
  }

  // Tokenization
  tokenize(text: string): string[] {
    try {
      return this.tokenizer.tokenize(text) || [];
    } catch (error) {
      Logger.error('Tokenization failed', error);
      return [];
    }
  }

  // Sentiment Analysis
  analyzeSentiment(text: string): {
    score: number;
    comparative: number;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  } {
    try {
      return this.sentimentAnalyzer.analyze(text);
    } catch (error) {
      Logger.error('Sentiment analysis failed', error);
      return {
        score: 0,
        comparative: 0,
        tokens: [],
        words: [],
        positive: [],
        negative: []
      };
    }
  }

  // Part of Speech Tagging
  getPOSTags(text: string): Array<{word: string, tag: string}> {
    try {
      const tokens = this.tokenize(text);
      return this.posTagger.tag(tokens);
    } catch (error) {
      Logger.error('POS tagging failed', error);
      return [];
    }
  }

  // Lemmatization
  lemmatize(word: string, type?: 'noun' | 'verb' | 'adjective'): string {
    try {
      switch(type) {
        case 'noun':
          return this.lemmatizer.noun(word);
        case 'verb':
          return this.lemmatizer.verb(word);
        case 'adjective':
          return this.lemmatizer.adjective(word);
        default:
          return this.lemmatizer.noun(word); // Default to noun
      }
    } catch (error) {
      Logger.error('Lemmatization failed', error);
      return word;
    }
  }

  // Spell Checking
  spellCheck(text: string): Array<{word: string, suggestions: string[]}> {
    try {
      const tokens = this.tokenize(text);
      return tokens
        .filter(token => spellchecker.isMisspelled(token))
        .map(token => ({
          word: token,
          suggestions: spellchecker.getCorrectionsForMisspelling(token)
        }));
    } catch (error) {
      Logger.error('Spell checking failed', error);
      return [];
    }
  }

  // Named Entity Recognition (basic implementation)
  extractNamedEntities(text: string): {
    persons: string[];
    organizations: string[];
    locations: string[];
  } {
    try {
      const posTags = this.getPOSTags(text);
      
      return {
        persons: posTags
          .filter(tag => tag.tag === 'NNP' && tag.word.length > 1)
          .map(tag => tag.word),
        organizations: [], // Placeholder - would require more advanced NER
        locations: [] // Placeholder - would require more advanced NER
      };
    } catch (error) {
      Logger.error('Named Entity Recognition failed', error);
      return {
        persons: [],
        organizations: [],
        locations: []
      };
    }
  }

  // Text Similarity (using Levenshtein distance)
  textSimilarity(text1: string, text2: string): number {
    try {
      const tokens1 = this.tokenize(text1);
      const tokens2 = this.tokenize(text2);
      
      const distance = natural.LevenshteinDistance(
        tokens1.join(' '), 
        tokens2.join(' ')
      );
      
      const maxLength = Math.max(tokens1.length, tokens2.length);
      return 1 - (distance / maxLength);
    } catch (error) {
      Logger.error('Text similarity calculation failed', error);
      return 0;
    }
  }
}

// Singleton instance
export const nlpToolkit = new NLPToolkit();
