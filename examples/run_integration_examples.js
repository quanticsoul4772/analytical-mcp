/**
 * Integration Examples Test Suite
 * 
 * This script runs all the integration examples to demonstrate the
 * combined power of the analytical tools.
 */

import dotenv from 'dotenv';
import { researchEnhancedDecisionAnalysis } from './research_enhanced_decision_analysis.js';
import { factCheckedLogicalAnalysis } from './fact_checked_logical_analysis.js';
import { multiPerspectiveProblemSolving } from './multi_perspective_problem_solving.js';
import { dataDrivernMLEvaluation } from './data_driven_ml_evaluation.js';
import { rateLimitManager } from '../build/utils/rate_limit_manager.js';

// Load environment variables
dotenv.config();

/**
 * Print a section header
 */
function printHeader(text) {
  const line = "=".repeat(text.length + 10);
  console.log(`\n${line}`);
  console.log(`===== ${text} =====`);
  console.log(`${line}\n`);
}

/**
 * Run all integration examples
 */
async function runAllExamples() {
  printHeader("ANALYTICAL MCP INTEGRATION EXAMPLES");
  
  console.log("This script demonstrates the integration of multiple analytical tools");
  console.log("to solve complex problems with enhanced research capabilities.\n");
  
  // Setup rate limiting
  if (process.env.EXA_API_KEY) {
    rateLimitManager.registerApiKeys('exa', [process.env.EXA_API_KEY]);
    rateLimitManager.configureEndpoint('exa/search', 10, 60 * 1000);
    rateLimitManager.configureEndpoint('exa/validate', 50, 60 * 60 * 1000);
    console.log("✅ Configured rate limiting for API usage\n");
  } else {
    console.warn("⚠️ No EXA_API_KEY found in environment. Examples requiring research will fail.\n");
  }
  
  const examples = [
    { name: "Research-Enhanced Decision Analysis", fn: researchEnhancedDecisionAnalysis },
    { name: "Fact-Checked Logical Analysis", fn: factCheckedLogicalAnalysis },
    { name: "Multi-Perspective Problem Solving", fn: multiPerspectiveProblemSolving },
    { name: "Data-Driven ML Evaluation", fn: dataDrivernMLEvaluation }
  ];
  
  const results = {};
  const failures = [];
  
  // Option to run specific examples via command line args
  const specificExamples = process.argv.slice(2);
  const exampleFilter = specificExamples.length > 0 
    ? examples.filter(e => specificExamples.some(arg => e.name.toLowerCase().includes(arg.toLowerCase())))
    : examples;
  
  if (exampleFilter.length === 0) {
    console.log("No matching examples found. Available examples:");
    examples.forEach(e => console.log(`  - ${e.name}`));
    process.exit(1);
  }
  
  // Run selected examples
  for (const example of exampleFilter) {
    printHeader(example.name);
    
    console.log(`Running example: ${example.name}...\n`);
    const startTime = Date.now();
    
    try {
      const result = await example.fn();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      results[example.name] = { 
        success: true, 
        duration,
        result
      };
      
      console.log(`\n✅ Example completed successfully in ${duration}s`);
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      results[example.name] = { 
        success: false, 
        duration,
        error: error.message
      };
      
      failures.push(example.name);
      console.error(`\n❌ Example failed after ${duration}s:`, error.message);
    }
    
    // Add some spacing between examples
    console.log("\n" + "-".repeat(80) + "\n");
  }
  
  // Print final summary
  printHeader("EXECUTION SUMMARY");
  
  console.log(`Total examples run: ${exampleFilter.length}`);
  console.log(`Successful: ${exampleFilter.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);
  
  if (failures.length > 0) {
    console.log("\nFailed examples:");
    failures.forEach(name => console.log(`  - ${name}: ${results[name].error}`));
  }
  
  // Print execution times
  console.log("\nExecution times:");
  Object.entries(results).forEach(([name, data]) => {
    console.log(`  - ${name}: ${data.duration}s (${data.success ? 'success' : 'failed'})`);
  });
  
  return results;
}

// Run all examples if executed directly
if (process.argv[1].includes('run_integration_examples.js')) {
  runAllExamples()
    .then(() => {
      console.log("\n✅ All examples processed");
      process.exit(0);
    })
    .catch(err => {
      console.error("\n❌ Execution failed:", err);
      process.exit(1);
    });
}
