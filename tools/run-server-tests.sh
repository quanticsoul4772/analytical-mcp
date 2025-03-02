#!/bin/bash
# Script to run Server Tool Registration integration tests

# Print information about the test
echo "==================================================" 
echo "Running Server Tool Registration Integration Tests"
echo "==================================================" 

# Run the specific test
npm run test:server

# Print test result status
if [ $? -eq 0 ]; then
  echo "✅ Server Tool Registration tests completed successfully!"
else
  echo "❌ Server Tool Registration tests failed!"
fi