import natural from 'natural';
import pos from 'pos';
import sentiment from 'sentiment';
import winkLemmatizer from 'wink-lemmatizer';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import nspell from 'nspell';

import { Logger } from './logger.js';

const require = createRequire(import.meta.url);

export class NLPToolkit {
  private tokenizer: natural.WordTokenizer;
  private sentimentAnalyzer: sentiment;
  private posLexer: InstanceType<typeof pos.Lexer>;
  private posTagger: InstanceType<typeof pos.Tagger>;
  private spell: ReturnType<typeof nspell> | null = null;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.sentimentAnalyzer = new sentiment();
    this.posLexer = new pos.Lexer();
    this.posTagger = new pos.Tagger();
  }

  // Lazily load the hunspell dictionary (pure JS via nspell; the previous
  // native `spellchecker` package no longer compiles on Node >= 22).
  // dictionary-en exposes only its ESM entry point via `exports`, so resolve
  // the entry module and read the .aff/.dic files that sit next to it.
  private getSpell(): ReturnType<typeof nspell> {
    if (!this.spell) {
      const dictDir = path.dirname(require.resolve('dictionary-en'));
      const aff = fs.readFileSync(path.join(dictDir, 'index.aff'));
      const dic = fs.readFileSync(path.join(dictDir, 'index.dic'));
      this.spell = nspell(aff, dic);
    }
    return this.spell;
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

  // Part of Speech Tagging (Brill tagger from the `pos` package)
  getPOSTags(text: string): Array<{word: string, tag: string}> {
    try {
      const words = this.posLexer.lex(text);
      return this.posTagger.tag(words).map(([word, tag]) => ({ word, tag }));
    } catch (error) {
      Logger.error('POS tagging failed', error);
      return [];
    }
  }

  // Lemmatization (wink-lemmatizer)
  lemmatize(word: string, type?: 'noun' | 'verb' | 'adjective'): string {
    try {
      switch(type) {
        case 'noun':
          return winkLemmatizer.noun(word);
        case 'verb':
          return winkLemmatizer.verb(word);
        case 'adjective':
          return winkLemmatizer.adjective(word);
        default:
          return winkLemmatizer.noun(word); // Default to noun
      }
    } catch (error) {
      Logger.error('Lemmatization failed', error);
      return word;
    }
  }

  // Spell Checking
  spellCheck(text: string): Array<{word: string, suggestions: string[]}> {
    try {
      const spell = this.getSpell();
      const tokens = this.tokenize(text);
      return tokens
        .filter(token => !spell.correct(token))
        .map(token => ({
          word: token,
          suggestions: spell.suggest(token)
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

      // Merge consecutive proper nouns into a single entity ("Steve Jobs",
      // "New York") instead of reporting each token separately.
      const properNounPhrases: string[] = [];
      let current: string[] = [];
      for (const { word, tag } of posTags) {
        if ((tag === 'NNP' || tag === 'NNPS') && word.length > 1) {
          current.push(word);
        } else if (current.length > 0) {
          properNounPhrases.push(current.join(' '));
          current = [];
        }
      }
      if (current.length > 0) {
        properNounPhrases.push(current.join(' '));
      }

      return {
        persons: properNounPhrases,
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
      const normalized1 = this.tokenize(text1).join(' ');
      const normalized2 = this.tokenize(text2).join(' ');

      const distance = natural.LevenshteinDistance(normalized1, normalized2);

      // Normalize by character length (the same unit as the edit distance);
      // dividing by token count could produce values below 0.
      const maxLength = Math.max(normalized1.length, normalized2.length);
      return maxLength === 0 ? 1 : 1 - distance / maxLength;
    } catch (error) {
      Logger.error('Text similarity calculation failed', error);
      return 0;
    }
  }
}

// Singleton instance
export const nlpToolkit = new NLPToolkit();
