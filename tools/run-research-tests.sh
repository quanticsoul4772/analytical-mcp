#!/bin/bash
# Script to run Research Verification integration tests
# Manages environment variables and test execution

# Print information about the test
echo "==================================================" 
echo "Running Research Verification Integration Tests"
echo "==================================================" 

# Check if EXA_API_KEY is set, if not, use a mock key for testing
if [ -z "$EXA_API_KEY" ]; then
  echo "WARNING: EXA_API_KEY not found in environment, using a mock key for testing."
  export EXA_API_KEY="mock-exa-api-key-for-testing-only"
fi

# Run the specific test
npm run test:research

# Print test result status
if [ $? -eq 0 ]; then
  echo "✅ Research Verification tests completed successfully!"
else
  echo "❌ Research Verification tests failed!"
fi

# Cleanup - unset mock keys if we set them
if [ "$EXA_API_KEY" = "mock-exa-api-key-for-testing-only" ]; then
  unset EXA_API_KEY
fi