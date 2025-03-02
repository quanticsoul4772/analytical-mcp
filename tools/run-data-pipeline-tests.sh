#!/bin/bash
# Script to run Data Processing Pipeline integration tests

# Print information about the test
echo "==================================================" 
echo "Running Data Processing Pipeline Integration Tests"
echo "==================================================" 

# Run the specific test
npm run test:data-pipeline

# Print test result status
if [ $? -eq 0 ]; then
  echo "✅ Data Processing Pipeline tests completed successfully!"
else
  echo "❌ Data Processing Pipeline tests failed!"
fi