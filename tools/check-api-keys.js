/**
 * API Key Validation Utility
 * 
 * This script verifies that all required API keys are present in the system environment variables.
 * Run this before running tests to ensure the environment is properly configured.
 */

// Check if EXA_API_KEY exists in environment
const EXA_API_KEY = process.env.EXA_API_KEY;

if (!EXA_API_KEY) {
  console.error('⚠️ ERROR: EXA_API_KEY is not set in your system environment variables!');
  console.error('');
  console.error('This key is required for many tests to pass. You must set it before running tests.');
  console.error('');
  console.error('To set this environment variable:');
  console.error('');
  console.error('Windows (PowerShell):');
  console.error('   $env:EXA_API_KEY="your-api-key-here"');
  console.error('');
  console.error('Windows (Command Prompt):');
  console.error('   set EXA_API_KEY=your-api-key-here');
  console.error('');
  console.error('macOS/Linux:');
  console.error('   export EXA_API_KEY="your-api-key-here"');
  console.error('');
  console.error('For persistent configuration, add this to your system environment variables.');
  console.error('');
  console.error('Get an API key from: https://exa.ai');
  console.error('');
  process.exit(1);
} else {
  console.log('✅ EXA_API_KEY is correctly set in your environment variables');
  
  // Check key format (basic validation)
  if (EXA_API_KEY.length < 10) {
    console.warn('⚠️ WARNING: Your EXA_API_KEY seems too short. Verify it is correct.');
  }
  
  console.log('');
  console.log('All required API keys are present.');
  console.log('');
  process.exit(0);
}
