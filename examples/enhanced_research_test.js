/**
 * Enhanced Research Integration Test Example
 * 
 * This script demonstrates the advanced fact extraction and rate limit handling
 * capabilities of the Analytical MCP Server.
 * 
 * Usage:
 * 1. Ensure your .env file contains the necessary API keys 
 * 2. Run with: node examples/enhanced_research_test.js
 */

// Import necessary modules
import dotenv from 'dotenv';
import { exaResearch } from '../build/utils/exa_research.js';
import { researchIntegration } from '../build/utils/research_integration.js';
import { factExtractor } from '../build/utils/advanced_fact_extraction.js';
import { rateLimitManager } from '../build/utils/rate_limit_manager.js';

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONTEXTS = [
  "AI adoption trends in enterprise software 2024",
  "Machine learning deployment challenges in healthcare",
  "Data privacy regulations impact on AI development"
];

const TEST_DOMAINS = [
  "technology", 
  "business", 
  "healthcare", 
  "education"
];

/**
 * Main test function
 */
async function runEnhancedResearchTest() {
  console.log("=== ENHANCED RESEARCH INTEGRATION TEST ===");
  
  try {
    // Register API key with rate limit manager
    if (process.env.EXA_API_KEY) {
      rateLimitManager.registerApiKeys('exa', [process.env.EXA_API_KEY]);
      console.log("✅ Registered API key with rate limit manager");
    } else {
      console.error("❌ No EXA_API_KEY found in environment");
      process.exit(1);
    }
    
    // Configure rate limits
    rateLimitManager.configureEndpoint('exa/search', 10, 60 * 1000); // 10 requests per minute
    rateLimitManager.configureEndpoint('exa/validate', 50, 60 * 60 * 1000); // 50 requests per hour
    rateLimitManager.configureEndpoint('exa/research-enrichment', 8, 60 * 1000); // 8 requests per minute
    rateLimitManager.configureEndpoint('exa/cross-domain', 5, 60 * 1000); // 5 requests per minute

    console.log("✅ Configured rate limits for endpoints");
    
    // Test 1: Advanced Fact Extraction
    console.log("\n🔍 TEST 1: ADVANCED FACT EXTRACTION");
    const testData = "Artificial intelligence adoption grew by 45% in healthcare during 2023, with natural language processing and diagnostic imaging as key applications. Machine learning models achieved 87% accuracy in early disease detection trials, according to recent studies. Healthcare providers report a 32% reduction in diagnostic time when using AI-assisted tools. Data privacy concerns remain a significant barrier, with 68% of executives citing regulatory compliance as their top challenge.";
    
    console.log("📄 Test Data:");
    console.log(testData);
    
    const extractedFacts = factExtractor.extractFacts(testData, {
      maxFacts: 3,
      requireVerbs: true,
      filterBoilerplate: true
    });
    
    console.log("\n📊 Extracted Facts:");
    extractedFacts.forEach((fact, index) => {
      console.log(`  ${index + 1}. "${fact.text}" (Score: ${fact.score.toFixed(2)})`);
    });
    
    // Test 2: Research Enrichment with Rate Limiting
    console.log("\n🔍 TEST 2: RESEARCH ENRICHMENT WITH RATE LIMITING");
    const testContext = TEST_CONTEXTS[0];
    console.log(`📄 Test Context: "${testContext}"`);
    
    const sampleData = [
      "Enterprise software adoption",
      "Cloud infrastructure",
      "Machine learning operations",
      "Natural language processing"
    ];
    
    const enrichmentResult = await researchIntegration.enrichAnalyticalContext(
      sampleData,
      testContext,
      {
        numResults: 3,
        timeRangeMonths: 6,
        includeNewsResults: true,
        enhancedExtraction: true
      }
    );
    
    console.log("\n📊 Research Insights:");
    enrichmentResult.researchInsights.forEach((insight, index) => {
      console.log(`  ${index + 1}. ${insight}`);
    });
    
    console.log(`\n🔢 Confidence Score: ${enrichmentResult.confidence.toFixed(2)}`);
    console.log(`📚 Sources: ${enrichmentResult.sources.length}`);
    
    // Test 3: Cross-Domain Research with Advanced Extraction
    console.log("\n🔍 TEST 3: CROSS-DOMAIN RESEARCH WITH ADVANCED EXTRACTION");
    const testProblem = "How to improve data quality for machine learning models";
    console.log(`📄 Test Problem: "${testProblem}"`);
    
    const analogiesResult = await researchIntegration.findCrossdomainAnalogies(
      testProblem,
      TEST_DOMAINS.slice(0, 2), // Use first two domains
      {
        enhancedExtraction: true,
        maxAnalogiesPerDomain: 2,
        maxSolutionsPerAnalogy: 1
      }
    );
    
    console.log("\n📊 Cross-Domain Analogies:");
    analogiesResult.analogies.forEach((analogy, index) => {
      console.log(`  ${index + 1}. ${analogy}`);
    });
    
    console.log("\n💡 Potential Solutions:");
    analogiesResult.potentialSolutions.forEach((solution, index) => {
      console.log(`  ${index + 1}. ${solution}`);
    });
    
    console.log(`\n📚 Sources: ${analogiesResult.sources.length}`);
    
    console.log("\n✅ Enhanced Research Integration Test Complete");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
runEnhancedResearchTest().catch(console.error);
