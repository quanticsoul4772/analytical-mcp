/**
 * API Key Validation Utility
 * 
 * This script verifies that all required API keys are present in the system environment variables.
 * Run this before running tests to ensure the environment is properly configured.
 */

import { Logger } from '../build/utils/logger.js';

// Initialize Logger for CLI usage
Logger.configure({
  includeTimestamp: false, // CLI tools don't need timestamps
  includeStack: false,     // CLI tools don't need stack traces
});

// Check if EXA_API_KEY exists in environment
const EXA_API_KEY = process.env.EXA_API_KEY;

let hasError = false;

// Check EXA API key
if (!EXA_API_KEY) {
  Logger.error('⚠️ ERROR: EXA_API_KEY is not set in your system environment variables!');
  Logger.error('');
  Logger.error('This key is required for many tests to pass. You must set it before running tests.');
  Logger.error('The EXA_API_KEY is used for:');
  Logger.error('  • Research integration features');
  Logger.error('  • Advanced NLP capabilities (Named Entity Recognition, etc.)');
  hasError = true;
} else {
  Logger.info('✅ EXA_API_KEY is correctly set in your environment variables');
  
  // Check key format (basic validation)
  if (EXA_API_KEY.length < 10) {
    Logger.warn('⚠️ WARNING: Your EXA_API_KEY seems too short. Verify it is correct.');
  }
}

// Instructions for setting environment variables
if (hasError) {
  Logger.error('');
  Logger.error('To set environment variables:');
  Logger.error('');
  Logger.error('Windows (PowerShell):');
  Logger.error('   $env:EXA_API_KEY="your-api-key-here"');
  Logger.error('');
  Logger.error('Windows (Command Prompt):');
  Logger.error('   set EXA_API_KEY=your-api-key-here');
  Logger.error('');
  Logger.error('macOS/Linux:');
  Logger.error('   export EXA_API_KEY="your-api-key-here"');
  Logger.error('');
  Logger.error('For persistent configuration, add this to your system environment variables.');
  Logger.error('');
  Logger.error('Get an API key from: https://exa.ai');
  Logger.error('');
  process.exit(1);
} else {
  Logger.info('');
  Logger.info('All required API keys are present.');
  Logger.info('');
  process.exit(0);
}
