/**
 * Research-Enhanced Decision Analysis
 * 
 * This example demonstrates how to integrate research capabilities with
 * decision analysis to create data-driven, well-informed decisions.
 * 
 * Use case: Evaluating technology investment opportunities with real-time research
 */

import dotenv from 'dotenv';
import { exaResearch } from '../build/utils/exa_research.js';
import { researchIntegration } from '../build/utils/research_integration.js';
import { decisionAnalysis } from '../build/tools/decision_analysis.js';
import { rateLimitManager } from '../build/utils/rate_limit_manager.js';
import { Logger } from '../build/utils/logger.js';

// Load environment variables
dotenv.config();

// Initialize rate limit management
if (process.env.EXA_API_KEY) {
  rateLimitManager.registerApiKeys('exa', [process.env.EXA_API_KEY]);
  rateLimitManager.configureEndpoint('exa/search', 10, 60 * 1000);
  rateLimitManager.configureEndpoint('exa/research-enrichment', 8, 60 * 1000);
}

/**
 * Run a research-enhanced decision analysis
 */
async function researchEnhancedDecisionAnalysis() {
  console.log("=== RESEARCH-ENHANCED DECISION ANALYSIS ===\n");

  try {
    // Step 1: Define the decision problem (investment opportunities)
    console.log("🔍 Step 1: Defining decision problem");
    
    const investmentOptions = [
      "Generative AI Infrastructure",
      "Edge Computing Technology",
      "Quantum Computing Research",
      "Blockchain Supply Chain Solutions"
    ];
    
    const decisionCriteria = [
      {
        name: "Market Growth Potential",
        weight: 0.25,
        type: "benefit"
      },
      {
        name: "Implementation Complexity",
        weight: 0.20,
        type: "cost"
      },
      {
        name: "ROI Timeline",
        weight: 0.20,
        type: "cost"
      },
      {
        name: "Competitive Advantage",
        weight: 0.20,
        type: "benefit"
      },
      {
        name: "Regulatory Risk",
        weight: 0.15,
        type: "cost"
      }
    ];
    
    console.log("Investment Options:");
    investmentOptions.forEach(option => console.log(`  - ${option}`));
    
    console.log("\nDecision Criteria:");
    decisionCriteria.forEach(criterion => 
      console.log(`  - ${criterion.name} (Weight: ${criterion.weight}, Type: ${criterion.type})`)
    );
    
    // Step 2: Enhance each option with research
    console.log("\n🔍 Step 2: Enhancing options with research");
    
    const enhancedOptions = [];
    const researchInsights = {};
    const optionScores = {};
    
    // Process each option with research
    for (const option of investmentOptions) {
      console.log(`\nResearching: ${option}`);
      
      try {
        // Use the research integration to gather market insights
        const researchContext = `${option} investment opportunity analysis 2024`;
        const researchResult = await researchIntegration.enrichAnalyticalContext(
          [option],
          researchContext,
          {
            numResults: 4,
            timeRangeMonths: 6,
            includeNewsResults: true,
            prioritizeRecent: true
          }
        );
        
        // Store the enhanced data
        enhancedOptions.push({
          name: option,
          confidence: researchResult.confidence,
          insights: researchResult.researchInsights
        });
        
        // Store insights for later use
        researchInsights[option] = researchResult.researchInsights;
        
        console.log(`  Found ${researchResult.researchInsights.length} insights`);
        console.log(`  Confidence: ${researchResult.confidence.toFixed(2)}`);
        
        // Create initial scores based on research confidence
        optionScores[option] = {};
        decisionCriteria.forEach(criterion => {
          // This is a simplified scoring approach
          // In a real implementation, you would use more sophisticated 
          // NLP to score each criterion based on the research
          optionScores[option][criterion.name] = 
            criterion.type === "benefit" 
              ? Math.min(9, Math.round(researchResult.confidence * 10))
              : Math.max(1, 10 - Math.round(researchResult.confidence * 10));
        });
      } catch (error) {
        console.error(`  Error researching ${option}:`, error.message);
        // Add with neutral scores if research fails
        enhancedOptions.push({
          name: option,
          confidence: 0.5,
          insights: []
        });
        
        optionScores[option] = {};
        decisionCriteria.forEach(criterion => {
          optionScores[option][criterion.name] = 5; // Neutral score
        });
      }
    }
    
    // Step 3: Prepare decision analysis input
    console.log("\n🔍 Step 3: Preparing decision analysis");
    
    // Format evaluations for decision analysis
    const evaluations = [];
    
    investmentOptions.forEach(option => {
      decisionCriteria.forEach(criterion => {
        evaluations.push({
          option: option,
          criterion: criterion.name,
          score: optionScores[option][criterion.name]
        });
      });
    });
    
    // Step 4: Perform decision analysis
    console.log("\n🔍 Step 4: Performing decision analysis");
    
    const decisionResult = await decisionAnalysis({
      options: investmentOptions.map(option => ({
        id: option,
        name: option
      })),
      criteria: decisionCriteria.map(c => ({
        id: c.name,
        name: c.name,
        weight: c.weight,
        type: c.type
      })),
      evaluations: evaluations,
      analysisType: "weighted-sum",
      sensitivityAnalysis: true,
      confidenceScores: enhancedOptions.reduce((obj, option) => {
        obj[option.name] = option.confidence;
        return obj;
      }, {})
    });
    
    // Step 5: Output enhanced decision results
    console.log("\n🔍 Step 5: Enhanced decision results");
    
    // Get top option
    const decisionLines = decisionResult.split('\n');
    let topOption = "";
    
    for (const line of decisionLines) {
      if (line.includes("Best Option:")) {
        topOption = line.split("Best Option:")[1].trim();
        break;
      }
    }
    
    console.log(`\nDecision Result: ${topOption}`);
    
    // Show research insights for top option
    if (topOption && researchInsights[topOption]) {
      console.log("\nKey Research Insights for Top Option:");
      researchInsights[topOption].forEach((insight, i) => {
        console.log(`  ${i+1}. ${insight}`);
      });
    }
    
    // Calculate confidence adjusted score
    const topOptionData = enhancedOptions.find(o => o.name === topOption);
    if (topOptionData) {
      const confidenceAdjustedRecommendation = 
        topOptionData.confidence > 0.8 ? "Strong recommendation" :
        topOptionData.confidence > 0.6 ? "Moderate recommendation" :
        "Tentative recommendation - further research advised";
      
      console.log(`\nConfidence: ${topOptionData.confidence.toFixed(2)}`);
      console.log(`Recommendation: ${confidenceAdjustedRecommendation}`);
    }
    
    return {
      topOption,
      enhancedOptions,
      decisionResult
    };
  } catch (error) {
    console.error("Error in research-enhanced decision analysis:", error);
    throw error;
  }
}

// Run the example if executed directly
if (process.argv[1].includes('research_enhanced_decision_analysis.js')) {
  researchEnhancedDecisionAnalysis()
    .then(() => console.log("\n✅ Research-Enhanced Decision Analysis Complete"))
    .catch(err => console.error("\n❌ Process failed:", err))
    .finally(() => process.exit());
}

export { researchEnhancedDecisionAnalysis };
