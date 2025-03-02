/**
 * Fact-Checked Logical Analysis
 * 
 * This example demonstrates integrating logical fallacy detection with 
 * research validation to create more robust argument analysis.
 * 
 * Use case: Analyzing and fact-checking policy arguments with evidence
 */

import dotenv from 'dotenv';
import { exaResearch } from '../build/utils/exa_research.js';
import { researchIntegration } from '../build/utils/research_integration.js';
import { logicalFallacyDetector } from '../build/tools/logical_fallacy_detector.js';
import { logicalArgumentAnalyzer } from '../build/tools/logical_argument_analyzer.js';
import { rateLimitManager } from '../build/utils/rate_limit_manager.js';

// Load environment variables
dotenv.config();

// Initialize rate limit management
if (process.env.EXA_API_KEY) {
  rateLimitManager.registerApiKeys('exa', [process.env.EXA_API_KEY]);
  rateLimitManager.configureEndpoint('exa/search', 10, 60 * 1000);
  rateLimitManager.configureEndpoint('exa/research-enrichment', 8, 60 * 1000);
  rateLimitManager.configureEndpoint('exa/cross-domain', 5, 60 * 1000);
}

/**
 * Run a fact-checked logical analysis
 */
async function factCheckedLogicalAnalysis() {
  console.log("=== FACT-CHECKED LOGICAL ANALYSIS ===\n");

  try {
    // Step 1: Define the argument to analyze
    console.log("🔍 Step 1: Defining argument to analyze");
    
    const argument = `
      Renewable energy must immediately replace all fossil fuels to solve climate change.
      The transition to 100% renewables is technically and economically feasible today.
      Countries that have invested heavily in renewables have all seen dramatic decreases in carbon emissions.
      Therefore, we should ban all fossil fuel use within the next five years.
    `;
    
    console.log("Argument to analyze:");
    console.log(argument);
    
    // Step 2: Perform logical structure analysis
    console.log("\n🔍 Step 2: Analyzing logical structure");
    
    const structureAnalysis = await logicalArgumentAnalyzer({
      argument,
      analysisType: 'structure',
      includeRecommendations: true
    });
    
    // Extract premises and conclusion
    const premises = [];
    const lines = structureAnalysis.split('\n');
    let conclusion = "";
    
    for (const line of lines) {
      if (line.includes("Premise") && line.includes(":")) {
        const premise = line.split(":")[1].trim();
        premises.push(premise);
      }
      
      if (line.includes("Conclusion") && line.includes(":")) {
        conclusion = line.split(":")[1].trim();
      }
    }
    
    console.log("Extracted premises:");
    premises.forEach((premise, i) => console.log(`  ${i+1}. ${premise}`));
    
    console.log("\nExtracted conclusion:");
    console.log(`  ${conclusion}`);
    
    // Step 3: Detect logical fallacies
    console.log("\n🔍 Step 3: Detecting logical fallacies");
    
    const fallacyAnalysis = await logicalFallacyDetector({
      text: argument,
      confidenceThreshold: 0.4,
      categories: ['all'],
      includeExplanations: true,
      includeExamples: true
    });
    
    // Extract detected fallacies
    const fallacies = [];
    const fallacyLines = fallacyAnalysis.split('\n');
    let currentFallacy = null;
    
    for (const line of fallacyLines) {
      if (line.match(/^####\s+([^(]+)\s+\(/)) {
        const fallacyName = line.match(/^####\s+([^(]+)\s+\(/)[1].trim();
        currentFallacy = { name: fallacyName, description: "" };
        fallacies.push(currentFallacy);
      } else if (line.includes("Description:") && currentFallacy) {
        currentFallacy.description = line.split("Description:")[1].trim();
      }
    }
    
    console.log("Detected fallacies:");
    if (fallacies.length > 0) {
      fallacies.forEach((fallacy, i) => {
        console.log(`  ${i+1}. ${fallacy.name}: ${fallacy.description}`);
      });
    } else {
      console.log("  No significant fallacies detected");
    }
    
    // Step 4: Fact check premises with research
    console.log("\n🔍 Step 4: Fact-checking premises");
    
    const factCheckResults = [];
    
    for (const premise of premises) {
      console.log(`\nFact-checking: "${premise}"`);
      
      try {
        // Use research integration to validate the premise
        const verificationContext = `Verify: ${premise}`;
        const verificationResult = await researchIntegration.enrichAnalyticalContext(
          [premise],
          verificationContext,
          {
            numResults: 4,
            timeRangeMonths: 12,
            includeNewsResults: true
          }
        );
        
        // Determine fact-check result based on confidence and insights
        let supportLevel = "Uncertain";
        if (verificationResult.confidence > 0.8) {
          supportLevel = "Strongly Supported";
        } else if (verificationResult.confidence > 0.6) {
          supportLevel = "Partially Supported";
        } else if (verificationResult.confidence > 0.4) {
          supportLevel = "Insufficient Evidence";
        } else {
          supportLevel = "Contradicted";
        }
        
        factCheckResults.push({
          premise,
          supportLevel,
          confidence: verificationResult.confidence,
          insights: verificationResult.researchInsights
        });
        
        console.log(`  Result: ${supportLevel} (${verificationResult.confidence.toFixed(2)})`);
        console.log("  Supporting evidence:");
        verificationResult.researchInsights.slice(0, 2).forEach((insight, i) => {
          console.log(`    - ${insight}`);
        });
      } catch (error) {
        console.error(`  Error fact-checking: ${error.message}`);
        factCheckResults.push({
          premise,
          supportLevel: "Verification Failed",
          confidence: 0,
          insights: []
        });
      }
    }
    
    // Step 5: Analyze argument strength based on fact-checking
    console.log("\n🔍 Step 5: Analyzing argument strength with fact-checking");
    
    // Calculate overall evidence strength
    const averageConfidence = factCheckResults.reduce(
      (sum, result) => sum + result.confidence, 0
    ) / factCheckResults.length;
    
    const weakPremises = factCheckResults.filter(
      r => r.confidence < 0.6
    );
    
    // Integrate research insights with logical analysis
    const fullAnalysis = await logicalArgumentAnalyzer({
      argument,
      analysisType: 'strength',
      includeRecommendations: true
    });
    
    // Step 6: Generate comprehensive report
    console.log("\n🔍 Step 6: Generating comprehensive report");
    
    // Determine overall assessment
    let overallAssessment;
    if (fallacies.length > 1 || weakPremises.length > Math.floor(premises.length / 2)) {
      overallAssessment = "Weak - Contains fallacies and/or insufficient evidence";
    } else if (fallacies.length === 1 || weakPremises.length > 0) {
      overallAssessment = "Moderate - Some issues with logic or evidence";
    } else {
      overallAssessment = "Strong - Logically sound with supporting evidence";
    }
    
    console.log("\n=== ARGUMENT ANALYSIS REPORT ===");
    console.log(`\nOverall Assessment: ${overallAssessment}`);
    console.log(`Evidence Strength: ${(averageConfidence * 100).toFixed(0)}%`);
    console.log(`Logical Issues: ${fallacies.length > 0 ? 'Yes' : 'None detected'}`);
    
    console.log("\nPremise Verification:");
    factCheckResults.forEach((result, i) => {
      console.log(`  ${i+1}. "${result.premise}"`);
      console.log(`     Status: ${result.supportLevel} (${(result.confidence * 100).toFixed(0)}%)`);
    });
    
    if (fallacies.length > 0) {
      console.log("\nLogical Fallacies Detected:");
      fallacies.forEach((fallacy, i) => {
        console.log(`  ${i+1}. ${fallacy.name}`);
      });
    }
    
    return {
      premises,
      conclusion,
      fallacies,
      factCheckResults,
      overallAssessment,
      averageConfidence
    };
  } catch (error) {
    console.error("Error in fact-checked logical analysis:", error);
    throw error;
  }
}

// Run the example if executed directly
if (process.argv[1].includes('fact_checked_logical_analysis.js')) {
  factCheckedLogicalAnalysis()
    .then(() => console.log("\n✅ Fact-Checked Logical Analysis Complete"))
    .catch(err => console.error("\n❌ Process failed:", err))
    .finally(() => process.exit());
}

export { factCheckedLogicalAnalysis };
