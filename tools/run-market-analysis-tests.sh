#!/bin/bash
# Script to run Market Analysis Workflow integration tests

# Print information about the test
echo "==================================================" 
echo "Running Market Analysis Workflow Integration Tests"
echo "==================================================" 

# Run the specific test
npm run test:market-analysis

# Print test result status
if [ $? -eq 0 ]; then
  echo "✅ Market Analysis Workflow tests completed successfully!"
else
  echo "❌ Market Analysis Workflow tests failed!"
fi