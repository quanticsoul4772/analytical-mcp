import { describe, it, expect } from '@jest/globals';
import { normalizeExaResults } from '../exa_research.js';

describe('normalizeExaResults', () => {
  it("populates `contents` from Exa's `text` field and preserves other fields", () => {
    const [out] = normalizeExaResults([
      { title: 'T', url: 'https://example.com', text: 'Body text.', highlights: ['h'], score: 0.9 },
    ]);
    expect(out.contents).toBe('Body text.');
    expect(out.text).toBe('Body text.');
    expect(out.highlights).toEqual(['h']);
    expect(out.title).toBe('T');
    expect(out.url).toBe('https://example.com');
    expect(out.score).toBe(0.9);
  });

  it('keeps an existing `contents` value (does not overwrite with text)', () => {
    const [out] = normalizeExaResults([{ title: 'T', url: 'u', contents: 'already', text: 'other' }]);
    expect(out.contents).toBe('already');
  });

  it('leaves `contents` undefined when neither contents nor text is present', () => {
    const [out] = normalizeExaResults([{ title: 'T', url: 'u' }]);
    expect(out.contents).toBeUndefined();
  });

  it('handles an empty or nullish input', () => {
    expect(normalizeExaResults([])).toEqual([]);
    expect(normalizeExaResults(undefined as unknown as any[])).toEqual([]);
  });
});
