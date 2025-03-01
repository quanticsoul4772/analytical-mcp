// Market Strategy Analysis with Exa Research Integration
import { exaResearch } from '../src/utils/exa_research.js';
import { logicalArgumentAnalyzer } from '../build/tools/logical_argument_analyzer.js';
import { logicalFallacyDetector } from '../build/tools/logical_fallacy_detector.js';
import { perspectiveShifter } from '../build/tools/perspective_shifter.js';
import { decisionAnalysis } from '../build/tools/decision_analysis.js';

async function performEnhancedMarketStrategyAnalysis() {
  try {
    // Step 1: Initial Research Context
    const marketResearch = await exaResearch.search({
      query: "Current market trends in technology sector 2024",
      numResults: 5,
      timeRangeMonths: 6,
      useWebResults: true,
      useNewsResults: true,
      includeContents: true
    });

    // Extract key research insights
    const marketInsights = exaResearch.extractKeyFacts(marketResearch);
    console.log("Market Research Insights:", marketInsights);

    // Step 2: Validate Market Expansion Argument
    const argumentAnalysis = await logicalArgumentAnalyzer({
      argument: `We should expand into emerging markets because our current market is saturated. 
                 The research suggests significant growth opportunities in regions with increasing digital adoption.`,
      analysisType: 'structure',
      includeRecommendations: true
    });
    console.log("Argument Structure Analysis:", argumentAnalysis);

    // Step 3: Cross-reference with Fact Checking
    const factValidation = await exaResearch.validateData(
      marketResearch, 
      "Technology market expansion strategies for 2024"
    );
    console.log("Research Validation Context:", factValidation.researchContext);

    // Step 4: Detect Potential Logical Fallacies
    const fallacyCheck = await logicalFallacyDetector({
      text: "We should expand into emerging markets because they're new and untapped. 
             This will guarantee our success and market leadership.",
      confidenceThreshold: 0.7,
      includeExplanations: true
    });
    console.log("Logical Fallacy Detection:", fallacyCheck);

    // Step 5: Generate Alternative Perspectives with Research Context
    const strategicPerspectives = await perspectiveShifter({
      problem: "Should we expand into emerging technology markets?",
      currentPerspective: "Executive Management",
      shiftType: 'stakeholder',
      numberOfPerspectives: 3,
      includeActionable: true
    });
    console.log("Alternative Strategy Perspectives:", strategicPerspectives);

    // Step 6: Decision Framework with Enriched Context
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
    console.log("Enriched Market Expansion Decision:", strategyDecision);

  } catch (error) {
    console.error("Enhanced Market Strategy Analysis Error:", error);
  }
}

performEnhancedMarketStrategyAnalysis();
