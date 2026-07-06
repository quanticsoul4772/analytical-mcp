import { describe, it, expect } from '@jest/globals';
import { SITE_CHROME_PATTERNS } from '../advanced_fact_extraction.js';

const isChrome = (s: string) => SITE_CHROME_PATTERNS.some((p) => p.test(s));

describe('SITE_CHROME_PATTERNS', () => {
  it('matches common site chrome', () => {
    expect(isChrome('Skip to main content')).toBe(true);
    expect(isChrome('Suggested Searches')).toBe(true);
    expect(isChrome('Share on Facebook')).toBe(true);
    expect(isChrome('Image courtesy of the National Air and Space Museum Archives')).toBe(true);
    expect(isChrome('Follow us on Twitter')).toBe(true);
    expect(isChrome('Search')).toBe(true);
  });

  it('does not match ordinary factual sentences (no false positives)', () => {
    // The bare word "search" must not match inside "research".
    expect(isChrome('Researchers search the archives for primary sources.')).toBe(false);
    expect(isChrome('The company reported record revenue in the third quarter.')).toBe(false);
    expect(isChrome('On 2023-05-01 the tower opened to the public.')).toBe(false);
    expect(isChrome('They share on average two updates per week.')).toBe(false);
  });
});
