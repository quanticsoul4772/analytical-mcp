import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { exaResearch } from '../utils/exa_research.js';
import { logicalArgumentAnalyzer } from '../tools/logical_argument_analyzer.js';
import { logicalFallacyDetector } from '../tools/logical_fallacy_detector.js';
import { perspectiveShifter } from '../tools/perspective_shifter.js';
import { decisionAnalysis } from '../tools/decision_analysis.js';
import { APIError } from '../utils/errors.js';

// Mock the external API calls
jest.mock('../utils/exa_research', () => ({
  exaResearch: {
    search: jest.fn(),
    extractKeyFacts: jest.fn(),
    validateData: jest.fn()
  }
}));

// Sample test data
const MOCK_MARKET_RESEARCH = {
  results: [
    {
      title: 'Technology Market Trends 2024',
      url: 'https://example.com/tech-trends-2024',
      contents: 'AI adoption continues to accelerate across industries. Cloud migration remains a top priority for enterprises. Edge computing is gaining traction for real-time applications.'
    },
    {
      title: 'Emerging Markets Technology Report',
      url: 'https://example.com/emerging-markets-tech',
      contents: 'Southeast Asia shows rapid digital adoption rates. Latin America presents growth opportunities in fintech and e-commerce. Middle East investing heavily in smart city technologies.'
    }
  ]
};

const MOCK_MARKET_INSIGHTS = [
  'AI adoption continues to accelerate across industries.',
  'Cloud migration remains a top priority for enterprises.',
  'Southeast Asia shows rapid digital adoption rates.',
  'Latin America presents growth opportunities in fintech and e-commerce.'
];

const MOCK_RESEARCH_VALIDATION = {
  validatedData: MOCK_MARKET_RESEARCH,
  researchContext: [
    'Technology markets in emerging economies grew by 18% in 2023.',
    'Digital infrastructure investments in Southeast Asia increased by 25% year-over-year.',
    'E-commerce penetration in Latin America reached 28% by end of 2023.'
  ]
};

describe('Market Analysis Workflow Integration Tests', () => {
  beforeAll(() => {
    // Set up mocks
    (exaResearch.search as jest.Mock).mockResolvedValue(MOCK_MARKET_RESEARCH);
    (exaResearch.extractKeyFacts as jest.Mock).mockReturnValue(MOCK_MARKET_INSIGHTS);
    (exaResearch.validateData as jest.Mock).mockResolvedValue(MOCK_RESEARCH_VALIDATION);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should execute the complete market analysis workflow', async () => {
    // Step 1: Market Research
    const marketResearch = await exaResearch.search({
      query: "Current market trends in technology sector 2024",
      numResults: 5,
      timeRangeMonths: 6,
      useWebResults: true,
      useNewsResults: true,
      includeContents: true
    });

    expect(marketResearch).toBeDefined();
    expect(exaResearch.search).toHaveBeenCalledWith({
      query: expect.any(String),
      numResults: expect.any(Number),
      timeRangeMonths: expect.any(Number),
      useWebResults: expect.any(Boolean),
      useNewsResults: expect.any(Boolean),
      includeContents: expect.any(Boolean)
    });

    // Step 2: Extract market insights
    const marketInsights = exaResearch.extractKeyFacts(marketResearch);
    expect(marketInsights).toEqual(MOCK_MARKET_INSIGHTS);
    expect(exaResearch.extractKeyFacts).toHaveBeenCalledWith(marketResearch);

    // Step 3: Analyze market expansion argument
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: `We should expand into emerging markets because our current market is saturated. 
                 The research suggests significant growth opportunities in regions with increasing digital adoption.`,
      analysisType: 'structure',
      includeRecommendations: true
    });

    expect(argumentAnalysis).toContain('Argument Structure Analysis');
    expect(argumentAnalysis).toContain('Premise 1');
    expect(argumentAnalysis).toContain('Conclusion');

    // Step 4: Validate with fact checking
    const factValidation = await exaResearch.validateData(
      marketResearch, 
      "Technology market expansion strategies for 2024"
    );

    expect(factValidation).toEqual(MOCK_RESEARCH_VALIDATION);
    expect(exaResearch.validateData).toHaveBeenCalledWith(
      marketResearch,
      "Technology market expansion strategies for 2024"
    );

    // Step 5: Check for logical fallacies
    const fallacyCheck = await logicalFallacyDetector({
      text: "We should expand into emerging markets because they're new and untapped. This will guarantee our success.",
      confidenceThreshold: 0.7,
      includeExplanations: true
    });

    expect(fallacyCheck).toContain('Logical Fallacy Analysis');

    // Step 6: Generate alternative perspectives
    const perspectives = await perspectiveShifter({
      problem: "Should we expand into emerging technology markets?",
      currentPerspective: "Executive Management",
      shiftType: 'stakeholder',
      numberOfPerspectives: 3,
      includeActionable: true
    });

    expect(perspectives).toContain('Alternative Perspectives');
    expect(perspectives).toContain('Perspective 1');

    // Step 7: Decision analysis
    const strategyDecision = await decisionAnalysis({
      options: [
        'Immediate Emerging Market Expansion',
        'Phased Market Entry',
        'Strategic Partnership',
        'Market Research Deepening',
        'Defer Expansion'
      ],
      criteria: [
        'Market Potential',
        'Emerging Technology Trends',
        'Geopolitical Stability',
        'Digital Adoption Rates',
        'Economic Indicators',
        'Competitive Landscape',
        'Resource Requirements'
      ],
      weights: [0.2, 0.15, 0.1, 0.15, 0.1, 0.15, 0.15]
    });

    expect(strategyDecision).toContain('Decision Analysis Results');
    expect(strategyDecision).toContain('Options Analysis');
  });

  it('should handle API failures gracefully', async () => {
    // Set up API failure mock
    (exaResearch.search as jest.Mock).mockRejectedValueOnce(
      new APIError('External API error', 429, true, 'exa/search')
    );

    try {
      // Attempt market research
      await exaResearch.search({
        query: "Current market trends in technology sector 2024",
        numResults: 5,
        timeRangeMonths: 6,
        useWebResults: true,
        useNewsResults: true,
        includeContents: true
      });
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      expect((error as APIError).status).toBe(429);
      expect((error as APIError).retryable).toBe(true);
    }

    // Restore for next test
    (exaResearch.search as jest.Mock).mockResolvedValue(MOCK_MARKET_RESEARCH);
  });

  it('should still perform analysis with partial data when research integration fails', async () => {
    // Mock specific feature failure
    (exaResearch.validateData as jest.Mock).mockRejectedValueOnce(
      new APIError('Research validation failed', 500, false, 'exa/validate')
    );

    // Decision analysis should still work even if research validation fails
    const strategyDecision = await decisionAnalysis({
      options: [
        'Immediate Expansion',
        'Phased Entry',
        'Strategic Partnership'
      ],
      criteria: [
        'Market Potential',
        'Resource Requirements'
      ],
      weights: [0.6, 0.4]
    });

    expect(strategyDecision).toContain('Decision Analysis Results');
    expect(strategyDecision).toContain('Options Analysis');
  });
});