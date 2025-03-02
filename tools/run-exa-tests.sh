#!/bin/bash
# Script to run Exa Research integration tests
# Manages environment variables and test execution

# Print information about the test
echo "===========================================" 
echo "Running Exa Research API Integration Tests"
echo "===========================================" 

# Check if EXA_API_KEY is set, if not, use a mock key for testing
if [ -z "$EXA_API_KEY" ]; then
  echo "WARNING: EXA_API_KEY not found in environment, using a mock key for testing."
  export EXA_API_KEY="mock-exa-api-key-for-testing-only"
fi

# Run the specific test
npm run test:exa

# Print test result status
if [ $? -eq 0 ]; then
  echo "✅ Exa Research API tests completed successfully!"
else
  echo "❌ Exa Research API tests failed!"
fi

# Cleanup - unset mock keys if we set them
if [ "$EXA_API_KEY" = "mock-exa-api-key-for-testing-only" ]; then
  unset EXA_API_KEY
fi