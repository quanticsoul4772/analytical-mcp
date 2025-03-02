#!/bin/bash
# Script to run API Key validation tests

# Print information about the test
echo "==================================================" 
echo "Running API Key Validation Tests"
echo "==================================================" 

# Run the specific test
npm run test:api-keys

# Print test result status
if [ $? -eq 0 ]; then
  echo "✅ API Key validation tests completed successfully!"
else
  echo "❌ API Key validation tests failed!"
fi