/**
 * Cache Performance Demo
 * 
 * This script demonstrates the performance benefits of the caching system
 * by running the same research queries with and without caching.
 */

import dotenv from 'dotenv';
import { exaResearch } from '../build/utils/exa_research.js';
import { researchIntegration } from '../build/utils/research_integration.js';
import { cacheManager } from '../build/utils/cache_manager.js';
import { researchCache, ResearchCacheNamespace } from '../build/utils/research_cache.js';
import { config } from '../build/utils/config.js';

// Load environment variables
dotenv.config();

// Simple timing function
function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Run the demo
 */
async function runCacheDemo() {
  console.log("=== CACHE PERFORMANCE DEMONSTRATION ===\n");
  
  // Check if environment is properly configured
  if (!process.env.EXA_API_KEY) {
    console.error("❌ Error: EXA_API_KEY environment variable is required.");
    console.log("Please set up a valid API key in the .env file.");
    process.exit(1);
  }
  
  // Check if caching is enabled
  if (config.ENABLE_RESEARCH_CACHE !== 'true') {
    console.warn("⚠️ Warning: Research caching is disabled in the environment.");
    console.log("Setting ENABLE_RESEARCH_CACHE=true for this demo...");
    // Enable caching for this demo
    config.ENABLE_RESEARCH_CACHE = 'true';
  }
  
  // Initialize the cache (preload any existing cached data)
  console.log("🔄 Initializing cache...");
  const loadedEntries = await cacheManager.preload();
  console.log(`✅ Loaded ${loadedEntries} existing cache entries.`);
  
  // Display cache stats before the demo
  const beforeStats = researchCache.getStats();
  console.log("\nInitial Cache Statistics:");
  Object.entries(beforeStats).forEach(([namespace, stats]) => {
    console.log(`  ${namespace}: ${stats.size} entries, ${stats.hits} hits, ${stats.misses} misses`);
  });
  
  // Demo 1: Basic Web Search Caching
  console.log("\n\n🔍 DEMO 1: WEB SEARCH CACHING\n");
  
  // Define test search queries
  const searchQueries = [
    "Latest advancements in machine learning 2025",
    "Sustainable energy solutions for smart cities",
    "Quantum computing applications for business"
  ];
  
  // First run: No cache
  console.log("🔄 Running searches WITHOUT cache:");
  await cacheManager.clear(); // Clear cache to ensure first run is a cache miss
  
  const firstRunResults = [];
  for (const query of searchQueries) {
    console.log(`\nSearching for: "${query}"`);
    
    const start = Date.now();
    try {
      const results = await exaResearch.search({
        query,
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true
      });
      
      const duration = Date.now() - start;
      console.log(`  ✅ Found ${results.results.length} results in ${formatTime(duration)}`);
      
      // Extract a few facts
      const factsStart = Date.now();
      const facts = exaResearch.extractKeyFacts(results.results, 3);
      const factsDuration = Date.now() - factsStart;
      
      console.log(`  ✅ Extracted ${facts.length} facts in ${formatTime(factsDuration)}`);
      
      firstRunResults.push({
        query,
        searchDuration: duration,
        factsDuration,
        totalDuration: duration + factsDuration
      });
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Wait a bit to make the demo more understandable
  console.log("\nWaiting 2 seconds before cached runs...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Second run: With cache
  console.log("\n🔄 Running THE SAME searches WITH cache:");
  
  const secondRunResults = [];
  for (const query of searchQueries) {
    console.log(`\nSearching for: "${query}"`);
    
    const start = Date.now();
    try {
      const results = await exaResearch.search({
        query,
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true
      });
      
      const duration = Date.now() - start;
      console.log(`  ✅ Found ${results.results.length} results in ${formatTime(duration)}`);
      
      // Extract a few facts
      const factsStart = Date.now();
      const facts = exaResearch.extractKeyFacts(results.results, 3);
      const factsDuration = Date.now() - factsStart;
      
      console.log(`  ✅ Extracted ${facts.length} facts in ${formatTime(factsDuration)}`);
      
      secondRunResults.push({
        query,
        searchDuration: duration,
        factsDuration,
        totalDuration: duration + factsDuration
      });
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Demo 2: Cross-Domain Research Caching
  console.log("\n\n🔍 DEMO 2: CROSS-DOMAIN RESEARCH CACHING\n");
  
  // Define test problems
  const testProblems = [
    "How to improve customer retention in subscription services",
    "Reducing carbon footprint in manufacturing processes"
  ];
  
  // First run: No cache
  console.log("🔄 Running cross-domain research WITHOUT cache:");
  
  // Clear just the cross-domain cache
  researchCache.clear(ResearchCacheNamespace.CROSS_DOMAIN);
  
  const firstRunCrossDomain = [];
  for (const problem of testProblems) {
    console.log(`\nResearching: "${problem}"`);
    
    const start = Date.now();
    try {
      const results = await researchIntegration.findCrossdomainAnalogies(
        problem,
        ['business', 'technology', 'science'],
        {
          skipCache: true, // Force skip cache
          maxAnalogiesPerDomain: 2,
          maxSolutionsPerAnalogy: 1
        }
      );
      
      const duration = Date.now() - start;
      console.log(`  ✅ Found ${results.analogies.length} analogies and ${results.potentialSolutions.length} solutions in ${formatTime(duration)}`);
      
      firstRunCrossDomain.push({
        problem,
        duration,
        analogiesCount: results.analogies.length,
        solutionsCount: results.potentialSolutions.length
      });
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Wait a bit to make the demo more understandable
  console.log("\nWaiting 2 seconds before cached runs...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Second run: With cache
  console.log("\n🔄 Running THE SAME cross-domain research WITH cache:");
  
  const secondRunCrossDomain = [];
  for (const problem of testProblems) {
    console.log(`\nResearching: "${problem}"`);
    
    const start = Date.now();
    try {
      const results = await researchIntegration.findCrossdomainAnalogies(
        problem,
        ['business', 'technology', 'science'],
        {
          skipCache: false, // Use cache
          maxAnalogiesPerDomain: 2,
          maxSolutionsPerAnalogy: 1
        }
      );
      
      const duration = Date.now() - start;
      console.log(`  ✅ Found ${results.analogies.length} analogies and ${results.potentialSolutions.length} solutions in ${formatTime(duration)}`);
      
      secondRunCrossDomain.push({
        problem,
        duration,
        analogiesCount: results.analogies.length,
        solutionsCount: results.potentialSolutions.length,
        cacheHit: results.cacheHit
      });
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Performance summary
  console.log("\n\n=== PERFORMANCE SUMMARY ===\n");
  
  // Search performance
  console.log("Web Search Performance:");
  console.log("┌───────────────────────────────────────┬────────────┬────────────┬─────────────┐");
  console.log("│ Query                                 │ No Cache   │ With Cache │ Improvement │");
  console.log("├───────────────────────────────────────┼────────────┼────────────┼─────────────┤");
  
  let totalSearchImprovement = 0;
  
  for (let i = 0; i < searchQueries.length; i++) {
    const first = firstRunResults[i];
    const second = secondRunResults[i];
    const query = first.query.length > 30 ? first.query.substring(0, 27) + "..." : first.query.padEnd(35);
    
    const improvement = ((first.totalDuration - second.totalDuration) / first.totalDuration * 100).toFixed(1);
    totalSearchImprovement += parseFloat(improvement);
    
    console.log(`│ ${query} │ ${formatTime(first.totalDuration).padEnd(10)} │ ${formatTime(second.totalDuration).padEnd(10)} │ ${improvement}%      │`);
  }
  
  console.log("└───────────────────────────────────────┴────────────┴────────────┴─────────────┘");
  console.log(`Average search improvement: ${(totalSearchImprovement / searchQueries.length).toFixed(1)}%\n`);
  
  // Cross-domain research performance
  console.log("Cross-Domain Research Performance:");
  console.log("┌───────────────────────────────────────┬────────────┬────────────┬─────────────┐");
  console.log("│ Problem                               │ No Cache   │ With Cache │ Improvement │");
  console.log("├───────────────────────────────────────┼────────────┼────────────┼─────────────┤");
  
  let totalCrossDomainImprovement = 0;
  
  for (let i = 0; i < testProblems.length; i++) {
    const first = firstRunCrossDomain[i];
    const second = secondRunCrossDomain[i];
    const problem = first.problem.length > 30 ? first.problem.substring(0, 27) + "..." : first.problem.padEnd(35);
    
    const improvement = ((first.duration - second.duration) / first.duration * 100).toFixed(1);
    totalCrossDomainImprovement += parseFloat(improvement);
    
    console.log(`│ ${problem} │ ${formatTime(first.duration).padEnd(10)} │ ${formatTime(second.duration).padEnd(10)} │ ${improvement}%      │`);
  }
  
  console.log("└───────────────────────────────────────┴────────────┴────────────┴─────────────┘");
  console.log(`Average cross-domain improvement: ${(totalCrossDomainImprovement / testProblems.length).toFixed(1)}%\n`);
  
  // Final cache statistics
  const afterStats = researchCache.getStats();
  console.log("\nFinal Cache Statistics:");
  Object.entries(afterStats).forEach(([namespace, stats]) => {
    console.log(`  ${namespace}: ${stats.size} entries, ${stats.hits} hits, ${stats.misses} misses`);
  });
  
  // Print summary
  console.log("\n=== CACHE BENEFITS SUMMARY ===");
  console.log(`
  1. Speed: ${Math.round((totalSearchImprovement + totalCrossDomainImprovement) / (searchQueries.length + testProblems.length))}% average response time improvement
  2. Reliability: Cached results are available even if API services are down
  3. Cost Efficiency: Reduces API calls, lowering usage costs
  4. Reduced API Rate Limits: Caching helps avoid hitting rate limits
  5. Consistency: Same queries return the same results
  `);
  
  console.log("✅ Cache Performance Demo Completed");
}

// Run the demo if executed directly
if (process.argv[1].includes('cache_performance_demo.js')) {
  runCacheDemo()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("❌ Demo failed:", err);
      process.exit(1);
    });
}
