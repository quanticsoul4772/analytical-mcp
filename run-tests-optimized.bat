@echo off
REM Script to run tests with optimized settings for API access

echo Running tests with optimized settings for API integration...

REM Set memory options for Node.js to avoid out-of-memory issues
set NODE_OPTIONS=--max-old-space-size=4096

REM Run Jest with additional performance flags
node --expose-gc --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --detectOpenHandles

REM Check exit code
if %ERRORLEVEL% EQU 0 (
  echo Tests completed successfully!
) else (
  echo Tests failed with exit code %ERRORLEVEL%
)

exit /b %ERRORLEVEL%
