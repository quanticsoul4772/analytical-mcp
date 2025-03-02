import { describe, it, expect } from '@jest/globals';
import { exaResearch } from '../utils/exa_research.js';
import { logicalArgumentAnalyzer } from '../tools/logical_argument_analyzer.js';
import { logicalFallacyDetector } from '../tools/logical_fallacy_detector.js';
import { perspectiveShifter } from '../tools/perspective_shifter.js';
import { decisionAnalysis } from '../tools/decision_analysis.js';
import { APIError } from '../utils/errors.js';

describe('Market Analysis Workflow Integration Tests', () => {
  it('should execute a partial market analysis workflow', async () => {
    // Skip test if EXA_API_KEY is not in environment
    if (!process.env.EXA_API_KEY) {
      console.warn('Skipping test: EXA_API_KEY not found in environment');
      return;
    }

    // Step 1: Market Research with real API
    const marketResearch = await exaResearch.search({
      query: 'Current market trends in technology sector',
      numResults: 2,
      timeRangeMonths: 3,
      useWebResults: true,
      useNewsResults: false,
      includeContents: true,
    });

    expect(marketResearch).toBeDefined();
    expect(exaResearch.search).toHaveBeenCalledWith({
      query: expect.any(String),
      numResults: expect.any(Number),
      timeRangeMonths: expect.any(Number),
      useWebResults: expect.any(Boolean),
      useNewsResults: expect.any(Boolean),
      includeContents: expect.any(Boolean),
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
      includeRecommendations: true,
    });

    expect(argumentAnalysis).toContain('Argument Structure Analysis');
    expect(argumentAnalysis).toContain('Premise 1');
    expect(argumentAnalysis).toContain('Conclusion');

    // Step 4: Validate with fact checking
    const factValidation = await exaResearch.validateData(
      marketResearch,
      'Technology market expansion strategies for 2024'
    );

    expect(factValidation).toEqual(MOCK_RESEARCH_VALIDATION);
    expect(exaResearch.validateData).toHaveBeenCalledWith(
      marketResearch,
      'Technology market expansion strategies for 2024'
    );

    // Step 5: Check for logical fallacies
    const fallacyCheck = await logicalFallacyDetector({
      text: "We should expand into emerging markets because they're new and untapped. This will guarantee our success.",
      confidenceThreshold: 0.7,
      includeExplanations: true,
    });

    expect(fallacyCheck).toContain('Logical Fallacy Analysis');

    // Step 6: Generate alternative perspectives
    const perspectives = await perspectiveShifter({
      problem: 'Should we expand into emerging technology markets?',
      currentPerspective: 'Executive Management',
      shiftType: 'stakeholder',
      numberOfPerspectives: 3,
      includeActionable: true,
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
        'Defer Expansion',
      ],
      criteria: [
        'Market Potential',
        'Emerging Technology Trends',
        'Geopolitical Stability',
        'Digital Adoption Rates',
        'Economic Indicators',
        'Competitive Landscape',
        'Resource Requirements',
      ],
      weights: [0.2, 0.15, 0.1, 0.15, 0.1, 0.15, 0.15],
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
        query: 'Current market trends in technology sector 2024',
        numResults: 5,
        timeRangeMonths: 6,
        useWebResults: true,
        useNewsResults: true,
        includeContents: true,
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
      options: ['Immediate Expansion', 'Phased Entry', 'Strategic Partnership'],
      criteria: ['Market Potential', 'Resource Requirements'],
      weights: [0.6, 0.4],
    });

    expect(strategyDecision).toContain('Decision Analysis Results');
    expect(strategyDecision).toContain('Options Analysis');
  });
});
