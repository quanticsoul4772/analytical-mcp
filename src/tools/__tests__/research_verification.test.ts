import { researchVerification } from '../research_verification.js';
import { exaResearch } from '../exa_research.js';

// Mock Exa Research to prevent actual API calls during testing
jest.mock('../exa_research.js', () => ({
  exaResearch: {
    search: jest.fn(),
    extractKeyFacts: jest.fn()
  }
}));

describe('Research Verification Tool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should verify research with consistent sources', async () => {
    // Mock Exa search to return consistent results
    (exaResearch.search as jest.Mock).mockResolvedValueOnce({
      results: [
        { 
          title: 'Climate Change Impact Report', 
          contents: 'Global temperatures are rising due to increased carbon emissions.' 
        },
        { 
          title: 'Environmental Science Study', 
          contents: 'Carbon emissions contribute significantly to global temperature increases.' 
        }
      ]
    });

    (exaResearch.search as jest.Mock).mockResolvedValueOnce({
      results: [
        { 
          title: 'UN Climate Report', 
          contents: 'Scientific evidence shows carbon emissions drive global warming.' 
        }
      ]
    });

    (exaResearch.extractKeyFacts as jest.Mock)
      .mockReturnValueOnce([
        'Global temperatures are rising due to increased carbon emissions.'
      ])
      .mockReturnValueOnce([
        'Scientific evidence shows carbon emissions drive global warming.'
      ]);

    const result = await researchVerification.verifyResearch({
      query: 'Climate change causes',
      verificationQueries: ['Global warming evidence']
    });

    expect(result.confidence.score).toBeGreaterThan(0.6);
    expect(result.verifiedResults).toHaveLength(1);
    expect(result.confidence.details.conflictingClaims).toHaveLength(0);
  });

  it('should handle inconsistent sources', async () => {
    // Mock Exa search to return inconsistent results
    (exaResearch.search as jest.Mock).mockResolvedValueOnce({
      results: [
        { 
          title: 'Climate Change Report', 
          contents: 'Global temperatures are rising rapidly.' 
        }
      ]
    });

    (exaResearch.search as jest.Mock).mockResolvedValueOnce({
      results: [
        { 
          title: 'Contrarian Climate Study', 
          contents: 'Global temperatures are stable or declining.' 
        }
      ]
    });

    (exaResearch.extractKeyFacts as jest.Mock)
      .mockReturnValueOnce(['Global temperatures are rising rapidly.'])
      .mockReturnValueOnce(['Global temperatures are stable or declining.']);

    const result = await researchVerification.verifyResearch({
      query: 'Climate change trends',
      verificationQueries: ['Temperature change analysis']
    });

    expect(result.confidence.score).toBeLessThan(0.5);
    expect(result.confidence.details.conflictingClaims).toHaveLength(1);
  });

  it('should handle invalid input', async () => {
    await expect(
      researchVerification.verifyResearch({
        query: '', // Invalid empty query
      })
    ).rejects.toThrow();
  });
});
