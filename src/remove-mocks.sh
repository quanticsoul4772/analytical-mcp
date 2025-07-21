#!/bin/bash
# Remove the mocks directory since we're using real API calls

# Remove the __mocks__ directory
rm -rf src/__mocks__

echo "Removed mock implementations. Tests will now use real API calls."
