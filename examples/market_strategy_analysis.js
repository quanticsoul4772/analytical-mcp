// Market Strategy Logical Reasoning and Perspective Analysis
import { logicalArgumentAnalyzer } from '../build/tools/logical_argument_analyzer.js';
import { logicalFallacyDetector } from '../build/tools/logical_fallacy_detector.js';
import { perspectiveShifter } from '../build/tools/perspective_shifter.js';
import { decisionAnalysis } from '../build/tools/decision_analysis.js';

async function performMarketStrategyAnalysis() {
  try {
    // Analyze a market strategy argument
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: "We should expand into the European market because our competitors are doing so. This will increase our global market share.",
      analysisType: 'structure',
      includeRecommendations: true
    });
    console.log("Argument Structure Analysis:", argumentAnalysis);

    // Detect potential logical fallacies
    const fallacyCheck = await logicalFallacyDetector({
      text: "We should expand into the European market because our competitors are doing so. This will guarantee our success.",
      confidenceThreshold: 0.7,
      includeExplanations: true
    });
    console.log("Logical Fallacy Detection:", fallacyCheck);

    // Generate alternative perspectives
    const strategicPerspectives = await perspectiveShifter({
      problem: "Should we expand into the European market?",
      currentPerspective: "Sales and Marketing Team",
      shiftType: 'stakeholder',
      numberOfPerspectives: 3,
      includeActionable: true
    });
    console.log("Alternative Strategy Perspectives:", strategicPerspectives);

    // Decision framework incorporating different perspectives
    // scores[i][j] rates option i against criterion j on a 0-10 scale, where a
    // higher score is always more favorable (e.g. for "Risk Level", a high
    // score means the option carries low risk).
    const strategyDecision = await decisionAnalysis({
      options: [
        'Immediate European Expansion',
        'Phased Market Entry',
        'Strategic Partnership',
        'Market Research First',
        'Defer Expansion'
      ],
      criteria: [
        'Market Potential',
        'Risk Level',
        'Resource Requirements',
        'Long-term Strategic Alignment',
        'Competitive Positioning'
      ],
      scores: [
        [9, 3, 3, 8, 8], // Immediate European Expansion
        [7, 6, 5, 7, 6], // Phased Market Entry
        [7, 7, 6, 6, 7], // Strategic Partnership
        [5, 9, 8, 5, 4], // Market Research First
        [2, 9, 9, 2, 2]  // Defer Expansion
      ],
      weights: [0.3, 0.2, 0.2, 0.15, 0.15]
    });
    console.log("Market Expansion Decision:", strategyDecision);

  } catch (error) {
    console.error("Market Strategy Analysis Error:", error);
  }
}

performMarketStrategyAnalysis();
