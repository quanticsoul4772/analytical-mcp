/**
 * API Key Validation Utility
 *
 * Verifies that required API keys are present in the environment.
 *
 * Usage:
 *   node tools/check-api-keys.js          Strict: exit 1 if EXA_API_KEY is missing.
 *   node tools/check-api-keys.js --warn   Non-blocking: warn and exit 0 if missing
 *                                         (used as the pretest:integration hook so
 *                                         integration tests still run offline, with
 *                                         their live-API cases self-skipping).
 *
 * Standalone CLI preflight — uses console directly (no dependency on the compiled
 * server build), and writes to stderr so it never interferes with any stdout stream.
 */

const warnOnly = process.argv.includes('--warn');
const EXA_API_KEY = process.env.EXA_API_KEY;

if (!EXA_API_KEY) {
  if (warnOnly) {
    console.error('⚠️ EXA_API_KEY is not set — live-API integration tests will be skipped.');
    console.error('   Set EXA_API_KEY to run the full integration suite. Get a key: https://exa.ai');
    process.exit(0);
  }

  console.error('⚠️ ERROR: EXA_API_KEY is not set in your environment!');
  console.error('');
  console.error('This key is required for the integration/research features. Set it before running:');
  console.error('  • Research integration features');
  console.error('  • Advanced NLP capabilities (Named Entity Recognition, etc.)');
  console.error('');
  console.error('To set the environment variable:');
  console.error('');
  console.error('  Windows (PowerShell):   $env:EXA_API_KEY="your-api-key-here"');
  console.error('  Windows (cmd):          set EXA_API_KEY=your-api-key-here');
  console.error('  macOS/Linux:            export EXA_API_KEY="your-api-key-here"');
  console.error('');
  console.error('Get an API key from: https://exa.ai');
  console.error('');
  process.exit(1);
}

console.error('✅ EXA_API_KEY is set.');
if (EXA_API_KEY.length < 10) {
  console.error('⚠️ WARNING: Your EXA_API_KEY seems too short. Verify it is correct.');
}
process.exit(0);
