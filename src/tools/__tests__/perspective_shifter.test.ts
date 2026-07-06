import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the Exa boundary so the test stays offline.
const searchMock = jest.fn<(q: unknown) => Promise<{ results: unknown[] }>>();
const extractKeyFactsMock = jest.fn<(r: unknown) => string[]>();

const jestEsm = (import.meta as any).jest as typeof jest;
jestEsm.unstable_mockModule('../../utils/exa_research.js', () => ({
  exaResearch: {
    search: searchMock,
    extractKeyFacts: extractKeyFactsMock,
    validateData: jest.fn(),
  },
  registerExaResearch: jest.fn(),
}));

const { perspectiveShifter } = await import('../perspective_shifter.js');

describe('perspective_shifter actionable insights', () => {
  beforeEach(() => {
    searchMock.mockReset();
    extractKeyFactsMock.mockReset();
    searchMock.mockResolvedValue({ results: [{ title: 'Src', url: 'u', contents: 'c' }] });
  });

  it('derives the actionable line from the top extracted fact and the problem', async () => {
    extractKeyFactsMock.mockReturnValue(['Retention improves when onboarding is shorter.']);

    const out = await perspectiveShifter({
      problem: 'Our app retention is dropping.',
      numberOfPerspectives: 1,
    });

    expect(out).toContain('**Actionable Insights:**');
    expect(out).toContain('Our app retention is dropping.');
    expect(out).toContain('Retention improves when onboarding is shorter.');
    // The old hardcoded template must be gone.
    expect(out).not.toContain('Consider the unique constraints and opportunities');
  });

  it('states plainly when no evidence was retrieved (no fabricated insight)', async () => {
    extractKeyFactsMock.mockReturnValue([]);

    const out = await perspectiveShifter({
      problem: 'Our app retention is dropping.',
      numberOfPerspectives: 1,
    });

    expect(out).toMatch(/No .*-specific evidence was retrieved/);
  });
});
