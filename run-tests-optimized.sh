#!/bin/bash
# Script to run tests with optimized settings for API access

echo "Running tests with optimized settings for API integration..."

# Set memory options for Node.js to avoid out-of-memory issues
export NODE_OPTIONS="--max-old-space-size=4096"

# Run Jest with additional performance flags
node --expose-gc --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --detectOpenHandles

# Check exit code
if [ $? -eq 0 ]; then
  echo "Tests completed successfully!"
else
  echo "Tests failed with exit code $?"
  exit $?
fi
