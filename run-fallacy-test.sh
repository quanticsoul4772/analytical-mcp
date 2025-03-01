#!/bin/bash
# Script to run the logical fallacy detector test in isolation

# Set Node options for increased memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Run only the logical fallacy detector test
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tools/__tests__/logical_fallacy_detector.test.ts --verbose

# Exit with the Jest exit code
exit $?
