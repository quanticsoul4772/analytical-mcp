/**
 * Multi-Perspective Problem Solving
 * 
 * This example demonstrates combining perspective shifting with cross-domain
 * research to generate innovative solutions to complex problems.
 * 
 * Use case: Tackling business challenges from multiple angles
 */

import dotenv from 'dotenv';
import { exaResearch } from '../build/utils/exa_research.js';
import { researchIntegration } from '../build/utils/research_integration.js';
import { perspectiveShifter } from '../build/tools/perspective_shifter.js';
import { decisionAnalysis } from '../build/tools/decision_analysis.js';
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
 * Run a multi-perspective problem solving analysis
 */
async function multiPerspectiveProblemSolving() {
  console.log("=== MULTI-PERSPECTIVE PROBLEM SOLVING ===\n");

  try {
    // Step 1: Define the problem
    console.log("🔍 Step 1: Defining the problem");
    
    const problem = "How can a tech company reduce customer churn in their subscription service?";
    const currentPerspective = "Business/Financial - Focus on pricing strategies and incentives";
    
    console.log(`Problem: ${problem}`);
    console.log(`Current Perspective: ${currentPerspective}`);
    
    // Step 2: Generate alternative perspectives
    console.log("\n🔍 Step 2: Generating alternative perspectives");
    
    const perspectiveTypes = ['stakeholder', 'temporal', 'systems', 'contrarian'];
    const perspectiveResult = await perspectiveShifter({
      problem,
      currentPerspective,
      shiftType: 'combined',
      perspectiveTypes,
      numberOfPerspectives: 4,
      includeActionable: true
    });
    
    // Extract perspectives
    const perspectives = [];
    const lines = perspectiveResult.split('\n');
    let currentPerspective = null;
    
    for (const line of lines) {
      if (line.match(/^###\s+Perspective \d+:/)) {
        const perspectiveName = line.split(':')[1].trim();
        currentPerspective = { name: perspectiveName, description: '', actions: [] };
        perspectives.push(currentPerspective);
      } else if (line.includes("Description:") && currentPerspective) {
        currentPerspective.description = line.split("Description:")[1].trim();
      } else if (line.match(/^- /) && currentPerspective) {
        currentPerspective.actions.push(line.substring(2).trim());
      }
    }
    
    console.log("Generated perspectives:");
    perspectives.forEach((perspective, i) => {
      console.log(`  ${i+1}. ${perspective.name}`);
      console.log(`     ${perspective.description.substring(0, 100)}...`);
    });
    
    // Step 3: Research cross-domain analogies
    console.log("\n🔍 Step 3: Researching cross-domain analogies");
    
    // Set up domains based on the perspectives
    const domains = [
      "customer psychology",
      "product design",
      "user experience",
      "community building"
    ];
    
    const analogiesResult = await researchIntegration.findCrossdomainAnalogies(
      problem,
      domains,
      {
        enhancedExtraction: true,
        maxAnalogiesPerDomain: 2,
        maxSolutionsPerAnalogy: 2,
        minConfidence: 0.6
      }
    );
    
    console.log(`Found ${analogiesResult.analogies.length} cross-domain analogies`);
    console.log(`Generated ${analogiesResult.potentialSolutions.length} potential solutions`);
    
    // Step 4: Integrate perspectives with analogical solutions
    console.log("\n🔍 Step 4: Integrating perspectives with analogical solutions");
    
    // Create integrated solutions by combining perspectives with analogies
    const integratedSolutions = [];
    
    for (let i = 0; i < perspectives.length; i++) {
      const perspective = perspectives[i];
      
      // Get corresponding analogy and solution if available
      const analogy = analogiesResult.analogies[i] || 
                    analogiesResult.analogies[analogiesResult.analogies.length - 1];
      
      const solutions = analogiesResult.potentialSolutions.filter((_, index) => 
        index % perspectives.length === i
      );
      
      // Build integrated solution
      const integratedSolution = {
        perspective: perspective.name,
        analogy: analogy,
        actions: perspective.actions,
        solutions: solutions,
        sourcePerspective: perspective
      };
      
      integratedSolutions.push(integratedSolution);
    }
    
    console.log("Integrated solutions created:", integratedSolutions.length);
    
    // Step 5: Score and rank solutions
    console.log("\n🔍 Step 5: Scoring and ranking solutions");
    
    // Define evaluation criteria
    const evaluationCriteria = [
      { id: "implementationEase", name: "Implementation Ease", weight: 0.2, type: "benefit" },
      { id: "timeToImpact", name: "Time to Impact", weight: 0.25, type: "cost" },
      { id: "customerImpact", name: "Customer Impact", weight: 0.3, type: "benefit" },
      { id: "resourceReqs", name: "Resource Requirements", weight: 0.15, type: "cost" },
      { id: "innovation", name: "Innovation Level", weight: 0.1, type: "benefit" }
    ];
    
    // Simulate scoring (in a real scenario, this might involve expert input)
    const evaluations = [];
    
    // Simulate scoring using integrated data
    integratedSolutions.forEach(solution => {
      // Heuristic: more actions + more solutions = higher scores on impact and innovation
      const actionCount = solution.actions.length;
      const solutionCount = solution.solutions.length;
      
      // Simple heuristic scoring algorithm
      evaluationCriteria.forEach(criterion => {
        let score = 5; // Default middle score
        
        if (criterion.id === "implementationEase") {
          // More complex solutions are harder to implement
          score = Math.max(1, 10 - (actionCount + solutionCount));
        } else if (criterion.id === "timeToImpact") {
          // More actions generally mean longer time to impact
          score = Math.max(1, 10 - actionCount);
        } else if (criterion.id === "customerImpact") {
          // More solutions usually mean higher customer impact
          score = Math.min(10, 5 + solutionCount);
        } else if (criterion.id === "resourceReqs") {
          // More actions require more resources
          score = Math.max(1, 10 - actionCount);
        } else if (criterion.id === "innovation") {
          // More diverse perspective + solutions = more innovative
          score = Math.min(10, 3 + solutionCount + Math.floor(analogiesResult.potentialSolutions.length / 3));
        }
        
        evaluations.push({
          option: solution.perspective,
          criterion: criterion.name,
          score: score
        });
      });
    });
    
    // Run decision analysis to rank solutions
    const decisionResult = await decisionAnalysis({
      options: integratedSolutions.map(solution => ({
        id: solution.perspective,
        name: solution.perspective
      })),
      criteria: evaluationCriteria,
      evaluations: evaluations,
      analysisType: "weighted-sum",
      sensitivityAnalysis: false
    });
    
    // Step 6: Generate action plan from top solution
    console.log("\n🔍 Step 6: Generating action plan from top solution");
    
    // Extract top solution from decision results
    const decisionLines = decisionResult.split('\n');
    let topPerspective = "";
    
    for (const line of decisionLines) {
      if (line.includes("Best Option:")) {
        topPerspective = line.split("Best Option:")[1].trim();
        break;
      }
    }
    
    const topSolution = integratedSolutions.find(
      solution => solution.perspective === topPerspective
    );
    
    console.log(`\nTop Recommended Perspective: ${topPerspective}`);
    
    // Build holistic action plan
    console.log("\n=== HOLISTIC ACTION PLAN ===\n");
    
    if (topSolution) {
      console.log(`From Perspective: ${topSolution.perspective}`);
      
      console.log("\nInsight from Cross-domain Analogy:");
      console.log(`  ${topSolution.analogy}`);
      
      console.log("\nRecommended Actions:");
      topSolution.actions.forEach((action, i) => {
        console.log(`  ${i+1}. ${action}`);
      });
      
      console.log("\nImplementation Insights:");
      topSolution.solutions.forEach((solution, i) => {
        console.log(`  ${i+1}. ${solution}`);
      });
      
      // Add secondary recommendations
      console.log("\nSupplementary Recommendations from Other Perspectives:");
      
      integratedSolutions
        .filter(solution => solution.perspective !== topPerspective)
        .slice(0, 2)  // Take top 2 secondary perspectives
        .forEach((solution, i) => {
          console.log(`\nFrom ${solution.perspective}:`);
          // Take just one key action from each secondary perspective
          const topAction = solution.actions[0] || "No specific action available";
          console.log(`  - ${topAction}`);
        });
    } else {
      console.log("No clear top solution identified.");
    }
    
    return {
      perspectives,
      analogies: analogiesResult,
      integratedSolutions,
      topSolution,
      evaluationResult: decisionResult
    };
  } catch (error) {
    console.error("Error in multi-perspective problem solving:", error);
    throw error;
  }
}

// Run the example if executed directly
if (process.argv[1].includes('multi_perspective_problem_solving.js')) {
  multiPerspectiveProblemSolving()
    .then(() => console.log("\n✅ Multi-Perspective Problem Solving Complete"))
    .catch(err => console.error("\n❌ Process failed:", err))
    .finally(() => process.exit());
}

export { multiPerspectiveProblemSolving };
