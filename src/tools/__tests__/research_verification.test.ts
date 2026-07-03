import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ValidationError } from '../../utils/errors.js';

// Mock the Exa research boundary so tests stay offline (no network, no API key)
type SearchResponse = { results: Array<{ title: string; url?: string; contents?: string }> };
const searchMock = jest.fn<(query: unknown) => Promise<SearchResponse>>();

// Use import.meta.jest: it is bound to this file, so relative specifiers
// resolve from this directory (the @jest/globals jest object is bound to
// setupTests.ts under ESM and resolves relative paths from src/).
const jestEsm = (import.meta as any).jest as typeof jest;

jestEsm.unstable_mockModule('../../utils/exa_research.js', () => ({
  exaResearch: {
    search: searchMock,
    extractKeyFacts: jest.fn(),
    validateData: jest.fn(),
  },
  registerExaResearch: jest.fn(),
}));

const { researchVerification } = await import('../research_verification.js');

// Two sources with moderate fact overlap: the computed confidence lands
// strictly between the low and high thresholds used below.
function mockModeratelyConsistentSources(): void {
  searchMock
    .mockResolvedValueOnce({
      results: [
        {
          title: 'Scientific Journal 1',
          contents:
            'Artificial intelligence is transforming multiple industries, including healthcare and finance.',
        },
        {
          title: 'Tech Magazine',
          contents:
            'AI technologies are rapidly advancing, with machine learning at the forefront of innovation.',
        },
      ],
    })
    .mockResolvedValueOnce({
      results: [
        {
          title: 'Research Institute Report',
          contents:
            'Machine learning algorithms are becoming more sophisticated, enabling complex problem-solving.',
        },
      ],
    });
}

describe('Research Verification Tool', () => {
  beforeEach(() => {
    searchMock.mockReset();
  });

  it('should verify research with consistent sources', async () => {
    // Two sources whose extracted facts share most of their vocabulary
    searchMock
      .mockResolvedValueOnce({
        results: [
          {
            title: 'Climate Change Impact Report',
            contents: 'Global temperatures are rising due to increased carbon emissions worldwide.',
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            title: 'UN Climate Report',
            contents:
              'Global temperatures are rising because of increased carbon emissions worldwide.',
          },
        ],
      });

    const result = await researchVerification.verifyResearch({
      query: 'Climate change causes',
      verificationQueries: ['Global warming evidence'],
      minConsistencyThreshold: 0.6,
    });

    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(result.confidence.score).toBeGreaterThan(0.6);
    expect(result.confidence.score).toBeLessThanOrEqual(1);
    expect(result.confidence.verified).toBe(true);
    expect(result.confidence.consistencyThreshold).toBe(0.6);
    expect(result.verifiedResults.length).toBeGreaterThan(0);
    expect(result.confidence.details.sourceCount).toBeGreaterThan(0);
  });

  it('should report the true low score for inconsistent sources, not the threshold floor', async () => {
    // Facts across (and within) sources share no vocabulary at all
    searchMock
      .mockResolvedValueOnce({
        results: [
          {
            title: 'Quantum Computing Digest',
            contents:
              'Quantum processors deliver exponential computational advantages in cryptography workloads. ' +
              'Semiconductor fabrication requires exceptional precision manufacturing equipment.',
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            title: 'Hobbyist Gardening Weekly',
            contents:
              'Gardening enthusiasts cultivate heirloom tomato varieties during spring seasons. ' +
              'Orchestra musicians rehearsed challenging symphonic arrangements throughout winter.',
          },
        ],
      });

    const result = await researchVerification.verifyResearch({
      query: 'Climate change trends',
      verificationQueries: ['Temperature change analysis'],
      // Default threshold (0.7) stays above the computed score: the reported
      // score must be the true low value, not clamped up to the threshold.
    });

    expect(result.confidence.score).toBeLessThan(0.6);
    expect(result.confidence.verified).toBe(false);
    expect(result.confidence.consistencyThreshold).toBe(0.7);
    expect(result.verifiedResults.length).toBeGreaterThan(0);
  });

  it('treats the threshold as a decision boundary: same evidence, same score, opposite verdicts', async () => {
    mockModeratelyConsistentSources();
    const lowThreshold = await researchVerification.verifyResearch({
      query: 'Artificial intelligence trends',
      verificationQueries: ['Machine learning advancements'],
      minConsistencyThreshold: 0.1,
    });

    searchMock.mockReset();
    mockModeratelyConsistentSources();
    const highThreshold = await researchVerification.verifyResearch({
      query: 'Artificial intelligence trends',
      verificationQueries: ['Machine learning advancements'],
      minConsistencyThreshold: 0.9,
    });

    // Identical evidence yields the identical reported score regardless of the
    // configured threshold; only the verified verdict flips.
    expect(lowThreshold.confidence.score).toBe(highThreshold.confidence.score);
    expect(lowThreshold.confidence.score).toBeGreaterThan(0.1);
    expect(lowThreshold.confidence.score).toBeLessThan(0.9);
    expect(lowThreshold.confidence.verified).toBe(true);
    expect(highThreshold.confidence.verified).toBe(false);
    expect(lowThreshold.confidence.consistencyThreshold).toBe(0.1);
    expect(highThreshold.confidence.consistencyThreshold).toBe(0.9);
  });

  it('should handle complex multi-source verification', async () => {
    mockModeratelyConsistentSources();

    const result = await researchVerification.verifyResearch({
      query: 'Artificial intelligence trends',
      verificationQueries: ['Machine learning advancements'],
      sources: 3,
      minConsistencyThreshold: 0.8,
    });

    // The reported score is the real computed value for these sources (0.75).
    // The old implementation clamped it up to the configured threshold,
    // masking sub-threshold consistency; now the threshold only drives
    // `verified`.
    expect(result.confidence.score).toBeGreaterThan(0);
    expect(result.confidence.score).toBeLessThan(0.8);
    expect(result.confidence.verified).toBe(false);
    expect(result.confidence.consistencyThreshold).toBe(0.8);
    expect(result.verifiedResults.length).toBeGreaterThan(0);
    expect(result.confidence.details.sourceCount).toBe(3);
    expect(result.confidence.details.uniqueSources.length).toBe(3);
    expect(result.confidence.details.uniqueSources).toContain('Tech Magazine');
    expect(result.confidence.details.factExtractions.length).toBe(3);
  });

  it('should handle input validation', async () => {
    await expect(
      researchVerification.verifyResearch({
        query: 'Valid query',
        sources: 20, // Exceeds max sources
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      researchVerification.verifyResearch({
        query: 'Valid query',
        minConsistencyThreshold: 1.5, // Exceeds max threshold
      })
    ).rejects.toThrow(ValidationError);

    // Validation failures happen before any research call
    expect(searchMock).not.toHaveBeenCalled();
  });
});
