/**
 * Advanced NLP Demo
 * 
 * This example demonstrates the advanced NLP capabilities of the Analytical MCP Server,
 * including named entity recognition, coreference resolution, and relationship extraction.
 */

import { advancedNER } from '../build/utils/advanced_ner.js';
import { coreferenceResolver } from '../build/utils/coreference_resolver.js';
import { relationshipExtractor } from '../build/utils/relationship_extractor.js';
import { enhancedFactExtractor } from '../build/utils/enhanced_fact_extraction.js';
import { config, isFeatureEnabled } from '../build/utils/config.js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Check that required environment variables are set
 */
function validateEnvironment() {
  if (!config.EXA_API_KEY) {
    console.error(`${colors.red}Error: EXA_API_KEY is not set in your environment variables.${colors.reset}`);
    console.error('Please set this variable to use advanced NLP features.');
    process.exit(1);
  }

  console.log(`${colors.green}✓ Environment validated. API keys are configured.${colors.reset}`);
}

/**
 * Demonstrate named entity recognition
 */
async function demonstrateNER() {
  console.log(`\n${colors.bright}${colors.blue}=== Named Entity Recognition ====${colors.reset}\n`);
  
  const text = `
    Apple Inc. is planning to open a new headquarters in Austin, Texas by January 2025. 
    Tim Cook, the CEO of Apple, announced this decision last week. 
    The company will invest $1 billion in the new campus.
    The project will create thousands of jobs in the region.
  `;
  
  console.log(`${colors.cyan}Text:${colors.reset}\n${text}\n`);
  console.log(`${colors.yellow}Extracting entities...${colors.reset}`);
  
  try {
    const entities = await advancedNER.recognizeEntities(text);
    
    console.log(`\n${colors.green}Found ${entities.length} entities:${colors.reset}\n`);
    
    // Group entities by type
    const groupedEntities = {};
    for (const entity of entities) {
      if (!groupedEntities[entity.type]) {
        groupedEntities[entity.type] = [];
      }
      groupedEntities[entity.type].push(entity);
    }
    
    // Print entities grouped by type
    for (const [type, entityList] of Object.entries(groupedEntities)) {
      console.log(`${colors.magenta}${type}:${colors.reset}`);
      for (const entity of entityList) {
        console.log(`  • ${entity.text} (confidence: ${entity.confidence.toFixed(2)})`);
      }
      console.log();
    }
  } catch (error) {
    console.error(`${colors.red}Error in entity recognition:${colors.reset}`, error.message);
  }
}

/**
 * Demonstrate fact extraction
 */
async function demonstrateFactExtraction() {
  console.log(`\n${colors.bright}${colors.blue}=== Enhanced Fact Extraction ====${colors.reset}\n`);
  
  const text = `
    The latest climate report shows global temperatures increased by 1.5°C since pre-industrial times.
    Scientists warn that urgent action is needed to prevent catastrophic effects.
    The Paris Agreement aims to limit warming to well below 2°C compared to pre-industrial levels.
    Many countries have pledged to achieve carbon neutrality by 2050.
    Renewable energy capacity has grown significantly, with solar power installation costs decreasing by 85% since 2010.
  `;
  
  console.log(`${colors.cyan}Text:${colors.reset}\n${text}\n`);
  console.log(`${colors.yellow}Extracting facts...${colors.reset}`);
  
  try {
    const result = await enhancedFactExtractor.extractFacts(text, {
      enableCoreference: true,
      enableRelationships: true,
      maxFacts: 10,
      minConfidence: 0.5,
    });
    
    console.log(`\n${colors.green}Found ${result.facts.length} facts with overall confidence ${result.confidence.toFixed(2)}:${colors.reset}\n`);
    
    // Print facts grouped by type
    const groupedFacts = {};
    for (const fact of result.facts) {
      if (!groupedFacts[fact.type]) {
        groupedFacts[fact.type] = [];
      }
      groupedFacts[fact.type].push(fact);
    }
    
    for (const [type, factList] of Object.entries(groupedFacts)) {
      console.log(`${colors.magenta}${type} FACTS:${colors.reset}`);
      for (const fact of factList) {
        console.log(`  • ${fact.text.substring(0, 100)}${fact.text.length > 100 ? '...' : ''}`);
        console.log(`    (confidence: ${fact.confidence.toFixed(2)})`);
        if (fact.entities && fact.entities.length > 0) {
          console.log(`    Entities: ${fact.entities.map(e => e.text).join(', ')}`);
        }
        console.log();
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error in fact extraction:${colors.reset}`, error.message);
  }
}

/**
 * Main demonstration function
 */
async function runDemo() {
  console.log(`${colors.bright}${colors.green}Analytical MCP Server - Advanced NLP Demo${colors.reset}\n`);
  
  // Validate environment
  validateEnvironment();
  
  // Display configuration
  console.log(`\n${colors.bright}Configuration:${colors.reset}`);
  console.log(`• Research Integration: ${isFeatureEnabled('researchIntegration') ? 'Enabled' : 'Disabled'}`);
  console.log(`• Caching: ${isFeatureEnabled('caching') ? 'Enabled' : 'Disabled'}`);
  console.log(`• Advanced NLP: ${isFeatureEnabled('advancedNlp') ? 'Enabled' : 'Disabled'}`);
  console.log(`• Using Exa for NER: ${config.NLP_USE_EXA === 'true' ? 'Enabled' : 'Disabled'}`);
  
  // Run demonstrations
  await demonstrateNER();
  await demonstrateFactExtraction();
  
  console.log(`\n${colors.bright}${colors.green}Demo completed!${colors.reset}\n`);
}

// Run the demo
runDemo().catch(error => {
  console.error(`${colors.red}Demo failed with error:${colors.reset}`, error);
  process.exit(1);
});
