/**
 * Cache-Aware Research Workflow
 * 
 * This example demonstrates how to implement a cache-aware research workflow
 * that intelligently refreshes stale data while still leveraging the speed of caching.
 */

import dotenv from 'dotenv';
import { exaResearch } from '../build/utils/exa_research.js';
import { researchIntegration } from '../build/utils/research_integration.js';
import { researchCache, ResearchCacheNamespace } from '../build/utils/research_cache.js';
import { cacheManager } from '../build/utils/cache_manager.js';
import { config } from '../build/utils/config.js';

// Load environment variables
dotenv.config();

// Simple timing function
function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Smart cache-aware function for getting data with stale-while-revalidate pattern
 */
async function smartCachedResearch(context, options = {}) {
  console.log(`🔍 Researching: "${context}"`);
  
  const start = Date.now();
  
  // First check - attempt to get cached data
  const cachedResult = await researchIntegration.enrichAnalyticalContext(
    [],  // Empty data array for this example
    context,
    {
      ...options,
      skipCache: false
    }
  );
  
  const duration = Date.now() - start;
  
  // Check if we got a cache hit
  if (cachedResult.cacheHit) {
    console.log(`  ✅ Cache hit: returned data in ${formatTime(duration)}`);
    
    // Check if the cache entry is "fresh enough"
    const cacheAge = Date.now() - (cachedResult.cacheTimestamp || Date.now());
    const refreshThreshold = options.refreshThreshold || (1000 * 60 * 10); // 10 minutes default
    
    // If older than our refresh threshold, trigger background refresh
    if (cacheAge > refreshThreshold) {
      console.log(`  ⚠️ Cache entry is stale (${formatTime(cacheAge)} old), initiating background refresh...`);
      
      // Trigger refresh in the background - don't await it
      setTimeout(async () => {
        const refreshStart = Date.now();
        
        try {
          // Force skip cache to get fresh data
          const freshResult = await researchIntegration.enrichAnalyticalContext(
            [],
            context,
            {
              ...options,
              skipCache: true
            }
          );
          
          const refreshDuration = Date.now() - refreshStart;
          console.log(`  ✅ Background refresh completed in ${formatTime(refreshDuration)}`);
          console.log(`  📊 Updated with ${freshResult.researchInsights.length} insights`);
        } catch (error) {
          console.error(`  ❌ Background refresh failed: ${error.message}`);
        }
      }, 100); // Small delay to not block the main thread
    }
    
    return cachedResult;
  } else {
    // Cache miss, so we already have fresh data
    console.log(`  ✅ Cache miss: retrieved fresh data in ${formatTime(duration)}`);
    
    // Add a fake timestamp for demonstration purposes
    cachedResult.cacheTimestamp = Date.now();
    
    return cachedResult;
  }
}

/**
 * Run the demo
 */
async function runCacheAwareWorkflow() {
  console.log("=== CACHE-AWARE WORKFLOW DEMONSTRATION ===\n");
  
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
  await cacheManager.preload();
  
  // Show initial stats
  const statsBefore = researchCache.getStats();
  console.log(`Cache entries: ${Object.values(statsBefore).reduce((sum, s) => sum + s.size, 0)}`);
  
  // Demo 1: Stale-While-Revalidate Pattern
  console.log("\n\n🔍 DEMO: STALE-WHILE-REVALIDATE PATTERN\n");
  
  // Define research contexts
  const researchContexts = [
    "Latest AI advancements in healthcare 2025",
    "Sustainable transportation innovations"
  ];
  
  // Process each context
  for (const context of researchContexts) {
    console.log(`\n=== Processing: "${context}" ===\n`);
    
    // First call - will be a cache miss the first time
    console.log("First call (initial):");
    const result1 = await smartCachedResearch(context, {
      refreshThreshold: 1000, // 1 second for demo purposes
      numResults: 3,
      includeNewsResults: true
    });
    
    console.log(`  Found ${result1.researchInsights.length} insights with confidence ${result1.confidence.toFixed(2)}`);
    
    // Slight delay to allow any background refresh to proceed
    console.log("\nWaiting 2 seconds...\n");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Second call - should be a cache hit
    console.log("Second call (should be cached):");
    const result2 = await smartCachedResearch(context, {
      refreshThreshold: 1000, // 1 second for demo purposes
      numResults: 3,
      includeNewsResults: true
    });
    
    console.log(`  Found ${result2.researchInsights.length} insights with confidence ${result2.confidence.toFixed(2)}`);
    
    // Slight delay to allow any background refresh to proceed
    console.log("\nWaiting 3 seconds for background refresh to complete...\n");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Third call - should be a cache hit with refreshed data
    console.log("Third call (should be cached with refreshed data):");
    const result3 = await smartCachedResearch(context, {
      refreshThreshold: 1000, // 1 second for demo purposes
      numResults: 3,
      includeNewsResults: true
    });
    
    console.log(`  Found ${result3.researchInsights.length} insights with confidence ${result3.confidence.toFixed(2)}`);
    
    // Compare results
    const insight1 = result1.researchInsights[0] || "No insight";
    const insight3 = result3.researchInsights[0] || "No insight";
    
    console.log("\nSample insights comparison:");
    console.log(`  Initial: "${insight1.substring(0, 80)}..."`);
    console.log(`  Refresh: "${insight3.substring(0, 80)}..."`);
    
    // Print if data was refreshed in the background
    if (result1.cacheTimestamp !== result3.cacheTimestamp) {
      console.log("\n✅ Data was successfully refreshed in the background!");
    } else {
      console.log("\n⚠️ Data refresh may not have completed yet.");
    }
  }
  
  // Show final cache stats
  const statsAfter = researchCache.getStats();
  console.log("\n\n=== FINAL CACHE STATISTICS ===\n");
  
  console.log("Cache Namespaces:");
  Object.entries(statsAfter).forEach(([namespace, stats]) => {
    console.log(`  ${namespace}: ${stats.size} entries, ${stats.hits} hits, ${stats.misses} misses`);
  });
  
  // Print benefits of stale-while-revalidate approach
  console.log("\n=== STALE-WHILE-REVALIDATE BENEFITS ===");
  console.log(`
  1. Instant Response: Always return data immediately from cache when available
  2. Background Refresh: Silently update stale cache entries without blocking the user
  3. Configurable Staleness: Adjust refresh thresholds for different types of data
  4. Graceful Degradation: Even if refresh fails, users still get cached data
  5. Improved User Experience: Eliminates waiting for fresh data while ensuring eventual consistency
  `);
  
  console.log("✅ Cache-Aware Workflow Demo Completed");
}

// Run the demo if executed directly
if (process.argv[1].includes('cache_aware_workflow.js')) {
  runCacheAwareWorkflow()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("❌ Demo failed:", err);
      process.exit(1);
    });
}

export { smartCachedResearch, runCacheAwareWorkflow };
