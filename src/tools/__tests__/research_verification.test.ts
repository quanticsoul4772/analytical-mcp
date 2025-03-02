import { researchVerification } from '../research_verification.js';
import { exaResearch } from '../exa_research.js';

// Mock Exa Research to prevent actual API calls during testing
jest.mock('../exa_research.js', () => ({
  exaResearch: {
    search: jest.fn()
  }
}));

describe('Research Verification Tool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should verify research with consistent sources', async () => {
    // Mock Exa search to return consistent results
    (exaResearch.search as jest.Mock)
      .mockResolvedValueOnce({
        results: [
          { 
            title: 'Climate Change Impact Report', 
            contents: 'Global temperatures are rising due to increased carbon emissions. The impact of climate change is becoming more evident in recent years.' 
          }
        ]
      })
      .mockResolvedValueOnce({
        results: [
          { 
            title: 'UN Climate Report', 
            contents: 'Scientific evidence shows carbon emissions drive global warming. Climate change is a significant global challenge.' 
          }
        ]
      });

    const result = await researchVerification.verifyResearch({
      query: 'Climate change causes',
      verificationQueries: ['Global warming evidence']
    });

    expect(result.confidence.score).toBeGreaterThan(0.6);
    expect(result.verifiedResults.length).toBeGreaterThan(0);
    expect(result.confidence.details.sourceCount).toBeGreaterThan(0);
  });

  it('should handle inconsistent sources', async () => {
    // Mock Exa search to return inconsistent results
    (exaResearch.search as jest.Mock)
      .mockResolvedValueOnce({
        results: [
          { 
            title: 'Climate Change Report', 
            contents: 'Global temperatures are rising rapidly and pose significant risks.' 
          }
        ]
      })
      .mockResolvedValueOnce({
        results: [
          { 
            title: 'Contrarian Climate Study', 
            contents: 'Global temperatures are stable or declining. Climate change concerns are overstated.' 
          }
        ]
      });

    const result = await researchVerification.verifyResearch({
      query: 'Climate change trends',
      verificationQueries: ['Temperature change analysis']
    });

    expect(result.confidence.score).toBeLessThan(0.6);
    expect(result.verifiedResults.length).toBeGreaterThan(0);
  });

  it('should handle complex multi-source verification', async () => {
    // Mock Exa search with multiple sources
    (exaResearch.search as jest.Mock)
      .mockResolvedValueOnce({
        results: [
          { 
            title: 'Scientific Journal 1', 
            contents: 'Artificial intelligence is transforming multiple industries, including healthcare and finance.' 
          },
          { 
            title: 'Tech Magazine', 
            contents: 'AI technologies are rapidly advancing, with machine learning at the forefront of innovation.' 
          }
        ]
      })
      .mockResolvedValueOnce({
        results: [
          { 
            title: 'Research Institute Report', 
            contents: 'Machine learning algorithms are becoming more sophisticated, enabling complex problem-solving.' 
          }
        ]
      });

    const result = await researchVerification.verifyResearch({
      query: 'Artificial intelligence trends',
      verificationQueries: ['Machine learning advancements'],
      sources: 3
    });

    expect(result.confidence.score).toBeGreaterThan(0.5);
    expect(result.verifiedResults.length).toBeGreaterThan(0);
    expect(result.confidence.details.sourceCount).toBeGreaterThan(1);
    expect(result.confidence.details.uniqueSources.length).toBeGreaterThan(1);
  });

  it('should handle input validation', async () => {
    await expect(
      researchVerification.verifyResearch({
        query: '', // Invalid empty query
      })
    ).rejects.toThrow(Error);

    await expect(
      researchVerification.verifyResearch({
        query: 'Valid query',
        sources: 20 // Exceeds max sources
      })
    ).rejects.toThrow(Error);
  });
});
