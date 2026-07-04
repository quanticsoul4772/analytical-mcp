import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// The perspective shifter reaches the Exa API through '../utils/exa_research.js'.
// Mock that boundary BEFORE importing the tools so the perspective tests run
// offline and deterministically (jest.mock() does not work under this repo's
// ESM Jest; unstable_mockModule + a dynamic import is the working pattern).
type SearchResponse = { results: Array<{ title: string; url?: string; contents?: string }> };
const searchMock = jest.fn<(query: unknown) => Promise<SearchResponse>>();
const extractKeyFactsMock = jest.fn<(results: unknown, maxFacts?: number) => string[]>();

// import.meta.jest is bound to this file, so the relative specifier resolves
// from this directory to the same module perspective_shifter.js imports.
const jestEsm = (import.meta as any).jest as typeof jest;

jestEsm.unstable_mockModule('../utils/exa_research.js', () => ({
  exaResearch: {
    search: searchMock,
    extractKeyFacts: extractKeyFactsMock,
    validateData: jest.fn(),
  },
  registerExaResearch: jest.fn(),
}));

// logicalArgumentAnalyzer and logicalFallacyDetector are pure/offline (no API
// key, no network) and do not import the mocked module; they run for real.
const { logicalArgumentAnalyzer } = await import('../tools/logical_argument_analyzer.js');
const { logicalFallacyDetector } = await import('../tools/logical_fallacy_detector.js');
const { perspectiveShifter } = await import('../tools/perspective_shifter.js');

describe('Logical Reasoning Tools Integration Test', () => {
  // Sample policy argument
  const policyArgument = `
    We should implement a carbon tax because it will reduce emissions.
    Climate change poses a significant threat to our economy and society.
    A carbon tax will incentivize businesses to adopt cleaner technologies.
    Some argue that a carbon tax will hurt businesses, but studies show the economic impact is minimal
    while the environmental benefits are substantial.
    Therefore, a carbon tax is the most effective policy to address climate change.
  `;

  beforeEach(() => {
    // Deterministic offline stand-ins for the Exa boundary.
    searchMock.mockReset();
    extractKeyFactsMock.mockReset();
    searchMock.mockResolvedValue({
      results: [
        {
          title: 'Domain Analysis Source',
          url: 'https://example.com/source',
          contents: 'Analysis of the policy problem from this domain perspective.',
        },
      ],
    });
    extractKeyFactsMock.mockReturnValue([
      'This perspective highlights domain-specific constraints and opportunities.',
    ]);
  });

  it('should analyze a policy argument and identify its structure', async () => {
    // Step 1: Analyze the logical structure of the argument
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: policyArgument,
      analysisType: 'comprehensive',
      includeRecommendations: true,
    });

    // Verify argument structure was identified
    expect(argumentAnalysis).toContain('Argument Analysis');
    expect(argumentAnalysis).toContain('Premises');
    expect(argumentAnalysis).toContain('Conclusion');
    expect(argumentAnalysis).toContain('carbon tax');
    expect(argumentAnalysis).toContain('reduce emissions');

    // Verify strength assessment
    expect(argumentAnalysis).toContain('Strength Assessment');
    expect(argumentAnalysis).toContain('Validity');
    expect(argumentAnalysis).toContain('Argument Strength');

    // Verify recommendations were included
    expect(argumentAnalysis).toContain('Recommendations');
  });

  it('should detect fallacies in a follow-up counterargument', async () => {
    // Counter argument with fallacies
    const counterArgument = `
      A carbon tax would destroy our economy completely.
      We must either reject this tax entirely or watch every business collapse.
      If we want to remain competitive, we must abandon all environmental regulations.
      This slippery slope will lead to total economic disaster!
      Besides, these climate scientists are just young activists who don't understand how business really works.
    `;

    // Step 2: Analyze the counterargument for fallacies
    const fallacyResults = await logicalFallacyDetector(
      counterArgument,
      0.4, // Lower threshold to detect more potential fallacies
      ['all'],
      true,
      true
    );

    // Verify fallacies were detected
    expect(fallacyResults).toContain('Logical Fallacy Analysis');

    // Check for specific fallacies
    expect(fallacyResults.includes('Slippery Slope')).toBe(true);
    expect(
      fallacyResults.includes('False Dichotomy') || fallacyResults.includes('Black and White')
    ).toBe(true);
    expect(
      fallacyResults.includes('Ad Hominem') || fallacyResults.includes('Appeal to Authority')
    ).toBe(true);

    // Verify explanations were included
    expect(fallacyResults).toContain('Description:');

    // Verify examples were included
    expect(fallacyResults).toContain('Example of Fallacious Reasoning:');
    expect(fallacyResults).toContain('Improved Reasoning:');
  });

  it('should generate multiple perspectives on a policy issue', async () => {
    // Step 3: Generate alternative perspectives on the issue
    const perspectiveResults = await perspectiveShifter(
      'Should we implement a carbon tax policy?',
      'Environmental Activist',
      'stakeholder',
      4,
      true
    );

    // No network was hit: the mocked Exa boundary served every domain search.
    expect(searchMock).toHaveBeenCalledTimes(4);

    // Verify the analysis was produced for the given problem
    expect(perspectiveResults).toContain('Perspective Shifting Analysis');
    expect(perspectiveResults).toContain('Original Problem:');
    expect(perspectiveResults).toContain('carbon tax');

    // Check for multiple distinct stakeholder perspectives (customer, employee,
    // investor, management are the first four stakeholder domains).
    expect(perspectiveResults).toContain('CUSTOMER Perspective');
    expect(perspectiveResults).toContain('EMPLOYEE Perspective');
    expect(perspectiveResults).toContain('INVESTOR Perspective');
    expect(perspectiveResults).toContain('MANAGEMENT Perspective');

    // Verify perspectives are distinct
    const perspectives = perspectiveResults.match(/### (\w+) Perspective/g);
    expect(perspectives).not.toBeNull();
    if (perspectives) {
      const uniquePerspectives = new Set(perspectives);
      expect(uniquePerspectives.size).toBeGreaterThanOrEqual(3);
    }

    // Verify actionable insights were included
    expect(perspectiveResults).toContain('Actionable Insights');
  });

  it('should integrate argument analysis with fallacy detection', async () => {
    // Mixed quality argument with some fallacies
    const mixedArgument = `
      Implementing a carbon tax is a matter of urgency.
      Scientists agree that climate change is happening, so we must act now with this specific policy.
      Anyone opposing this tax is too ignorant to care about future generations.
      While there may be some short-term economic adjustments, businesses will adapt quickly.
      Many European countries have implemented similar policies with positive outcomes.
    `;

    // Step 1: Analyze argument structure
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: mixedArgument,
      analysisType: 'structure',
      includeRecommendations: true,
    });

    // Step 2: Check for fallacies in the same argument
    const fallacyResults = await logicalFallacyDetector(mixedArgument, 0.5);

    // Verify both analyses are consistent and complementary
    expect(argumentAnalysis).toContain('Argument Structure Analysis');
    expect(fallacyResults).toContain('Logical Fallacy Analysis');

    // If fallacies were found, they should correspond to weaknesses in argument
    expect(
      fallacyResults.includes('Ad Hominem') &&
        argumentAnalysis.includes('opposing') &&
        argumentAnalysis.includes('future generations')
    ).toBeTruthy();

    if (fallacyResults.includes('Appeal to Authority')) {
      expect(argumentAnalysis.includes('Scientists agree')).toBeTruthy();
    }
  });

  it('should generate useful perspectives based on argument analysis', async () => {
    // First analyze the argument
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: policyArgument,
      analysisType: 'comprehensive',
    });

    // Extract key elements from argument analysis to construct problem statement
    // (in a real integration, this would parse the analysis results)
    expect(argumentAnalysis).toContain('Argument Analysis');
    const problemStatement =
      'How should we balance environmental protection through carbon taxation with economic concerns?';

    // Use that to generate targeted perspectives
    const perspectiveResults = await perspectiveShifter(
      problemStatement,
      'Policy Maker',
      'stakeholder',
      3,
      true
    );

    // No network was hit: the mocked Exa boundary served every domain search.
    expect(searchMock).toHaveBeenCalledTimes(3);

    // Verify perspectives address the specific problem
    expect(perspectiveResults).toContain('Perspective Shifting Analysis');
    expect(
      perspectiveResults.includes('carbon') ||
        perspectiveResults.includes('environmental') ||
        perspectiveResults.includes('economic')
    ).toBeTruthy();

    // Verify actionable insights
    expect(perspectiveResults).toContain('Actionable Insights');
  });
});
