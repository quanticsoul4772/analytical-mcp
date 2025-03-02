import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { logicalArgumentAnalyzer } from '../tools/logical_argument_analyzer.js';
import { logicalFallacyDetector } from '../tools/logical_fallacy_detector.js';
import { perspectiveShifter } from '../tools/perspective_shifter.js';

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

  it('should analyze a policy argument and identify its structure', async () => {
    // Step 1: Analyze the logical structure of the argument
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: policyArgument,
      analysisType: 'comprehensive',
      includeRecommendations: true
    });

    // Verify argument structure was identified
    expect(argumentAnalysis).toContain('Argument Analysis');
    expect(argumentAnalysis).toContain('Premises');
    expect(argumentAnalysis).toContain('Conclusion');
    expect(argumentAnalysis).toContain('carbon tax');
    expect(argumentAnalysis).toContain('reduces emissions');
    
    // Verify strength assessment
    expect(argumentAnalysis).toContain('Strength Assessment');
    expect(argumentAnalysis).toContain('Validity');
    expect(argumentAnalysis).toContain('Soundness');
    
    // Verify recommendations were included
    expect(argumentAnalysis).toContain('Recommendations');
  });

  it('should detect fallacies in a follow-up counterargument', async () => {
    // Counter argument with fallacies
    const counterArgument = `
      A carbon tax would destroy our economy completely.
      Countries without carbon taxes will always outperform us economically.
      If we want to remain competitive, we must reject all environmental regulations.
      This slippery slope will lead to economic disaster!
      Besides, who are these "climate scientists" to tell businesses what to do anyway?
    `;
    
    // Step 2: Analyze the counterargument for fallacies
    const fallacyResults = await logicalFallacyDetector({
      text: counterArgument,
      confidenceThreshold: 0.4, // Lower threshold to detect more potential fallacies
      categories: ['all'],
      includeExplanations: true,
      includeExamples: true
    });
    
    // Verify fallacies were detected
    expect(fallacyResults).toContain('Logical Fallacy Analysis');
    
    // Check for specific fallacies
    expect(fallacyResults).toContain('Slippery Slope');
    expect(fallacyResults).toContain('False Dichotomy') || 
      expect(fallacyResults).toContain('Black and White');
    expect(fallacyResults).toContain('Ad Hominem') || 
      expect(fallacyResults).toContain('Appeal to Authority');
    
    // Verify explanations were included
    expect(fallacyResults).toContain('Description:');
    
    // Verify examples were included
    expect(fallacyResults).toContain('Example of Fallacious Reasoning:');
    expect(fallacyResults).toContain('Improved Reasoning:');
  });

  it('should generate multiple perspectives on a policy issue', async () => {
    // Step 3: Generate alternative perspectives on the issue
    const perspectiveResults = await perspectiveShifter({
      problem: "Should we implement a carbon tax policy?",
      currentPerspective: "Environmental Activist",
      shiftType: 'stakeholder',
      numberOfPerspectives: 4,
      includeActionable: true
    });
    
    // Verify multiple perspectives were generated
    expect(perspectiveResults).toContain('Perspective Shift Analysis');
    expect(perspectiveResults).toContain('Current Perspective:');
    expect(perspectiveResults).toContain('Environmental Activist');
    
    // Check for multiple distinct perspectives
    expect(perspectiveResults).toContain('Perspective 1:');
    expect(perspectiveResults).toContain('Perspective 2:');
    expect(perspectiveResults).toContain('Perspective 3:');
    expect(perspectiveResults).toContain('Perspective 4:');
    
    // Verify perspectives are distinct and relevant
    const perspectives = perspectiveResults.match(/Perspective \d+: ([^\n]+)/g);
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
      Anyone opposing this tax clearly doesn't care about future generations.
      While there may be some short-term economic adjustments, businesses will adapt quickly.
      Many European countries have implemented similar policies with positive outcomes.
    `;
    
    // Step 1: Analyze argument structure
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: mixedArgument,
      analysisType: 'structure',
      includeRecommendations: true
    });
    
    // Step 2: Check for fallacies in the same argument
    const fallacyResults = await logicalFallacyDetector({
      text: mixedArgument,
      confidenceThreshold: 0.5
    });
    
    // Verify both analyses are consistent and complementary
    expect(argumentAnalysis).toContain('Argument Structure Analysis');
    expect(fallacyResults).toContain('Logical Fallacy Analysis');
    
    // If fallacies were found, they should correspond to weaknesses in argument
    if (fallacyResults.includes('Ad Hominem')) {
      expect(argumentAnalysis).toContain('opposing') && 
        expect(argumentAnalysis).toContain('future generations');
    }
    
    if (fallacyResults.includes('Appeal to Authority')) {
      expect(argumentAnalysis).toContain('Scientists agree');
    }
  });

  it('should generate useful perspectives based on argument analysis', async () => {
    // First analyze the argument
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: policyArgument,
      analysisType: 'comprehensive'
    });
    
    // Extract key elements from argument analysis to construct problem statement
    // (in a real integration, this would parse the analysis results)
    const problemStatement = "How should we balance environmental protection through carbon taxation with economic concerns?";
    
    // Use that to generate targeted perspectives
    const perspectiveResults = await perspectiveShifter({
      problem: problemStatement,
      currentPerspective: "Policy Maker",
      shiftType: 'stakeholder',
      numberOfPerspectives: 3,
      includeActionable: true
    });
    
    // Verify perspectives address the specific problem
    expect(perspectiveResults).toContain('Perspective Shift Analysis');
    expect(perspectiveResults).toContain('carbon') || 
      expect(perspectiveResults).toContain('environmental') ||
      expect(perspectiveResults).toContain('economic');
    
    // Verify actionable insights
    expect(perspectiveResults).toContain('Actionable Insights');
  });
});