#!/bin/bash
# Script to run tests with real API access

# Set environment variables for API testing
export VERIFY_API_CONFIG=true
export SKIP_API_TESTS=false

# Check if .env.test exists
if [ -f .env.test ]; then
  echo "Using .env.test configuration"
else
  echo "Warning: .env.test file not found. Make sure you have API keys configured."
fi

# Run tests with increased memory allocation
NODE_OPTIONS="--max-old-space-size=4096" node --experimental-vm-modules node_modules/jest/bin/jest.js "$@"

# Exit with Jest's exit code
exit $?
