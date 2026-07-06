import { describe, it, expect, jest } from '@jest/globals';

// advanced_ner.ts instantiates a module-level singleton whose constructor wires
// up several providers (a circular import with rule_based_ner_provider). Mock the
// Exa boundary and load through the production entry point (the advancedNER
// singleton) the same way advanced_ner.test.ts does, to avoid the load-order TDZ.
const jestEsm = (import.meta as any).jest as typeof jest;
jestEsm.unstable_mockModule('../exa_research.js', () => ({
  exaResearch: { search: jest.fn(), extractKeyFacts: jest.fn(), validateData: jest.fn() },
  registerExaResearch: jest.fn(),
}));

const { advancedNER, EntityType } = await import('../advanced_ner.js');

describe('NER ORGANIZATION regex bound', () => {
  const orgs = async (text: string) =>
    (await advancedNER.recognizeEntities(text)).filter((e) => e.type === EntityType.ORGANIZATION);

  it('caps a >6-word capitalized run to the last 6 words + suffix', async () => {
    // 8 leading capitalized words + a suffix. The {1,6} bound must drop the
    // earliest words; the old unbounded `+` swallowed the whole run (and was
    // O(n^2) on a long suffix-less run). Deterministic regression guard.
    const found = await orgs('Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel Company');
    expect(found.some((e) => e.text.includes('Company'))).toBe(true);
    expect(found.some((e) => e.text.includes('Alpha'))).toBe(false);
    expect(found.some((e) => e.text.includes('Bravo'))).toBe(false);
  });

  it('still matches a normal (<=6-word) organization in full', async () => {
    const found = await orgs('Acme Global Trading Company reported record profits');
    expect(found.some((e) => e.text.includes('Acme Global Trading Company'))).toBe(true);
  });

  it('terminates on a long suffix-less capitalized run with no false organization', async () => {
    // Smoke check (not the quadratic-regression guard — the old pattern also
    // finishes this size under Jest's timeout; the deterministic test above is
    // the real guard). Confirms no bogus ORGANIZATION is produced.
    const found = await orgs('Word '.repeat(2000));
    expect(found).toHaveLength(0);
  });
});
