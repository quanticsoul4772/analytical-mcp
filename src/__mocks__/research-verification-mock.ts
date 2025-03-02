/**
 * Mock implementation of the research verification tool
 */

class ResearchVerificationToolMock {
  verifyResearch = jest.fn().mockResolvedValue({
    verifiedResults: [
      'The market for renewable energy is expected to grow significantly in the next decade.',
      'Solar and wind technologies have seen rapid cost reductions in recent years.',
      'Energy storage remains a key challenge for renewable energy adoption.'
    ],
    confidence: {
      score: 0.85,
      details: {
        sourceConsistency: 0.82,
        sourceCount: 3,
        uniqueSources: ['Source 1', 'Source 2', 'Source 3'],
        conflictingClaims: [
          'One source suggests growth of 15% while another indicates 17%'
        ],
        factExtractions: [
          {
            source: 'Source 1',
            facts: [
              { fact: 'Renewable energy market growth', type: 'statement', confidence: 0.9 }
            ],
            sourceConfidence: 0.88
          }
        ]
      }
    }
  });

  registerTool = jest.fn();
}

export const researchVerification = new ResearchVerificationToolMock();