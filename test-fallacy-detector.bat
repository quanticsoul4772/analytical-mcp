@echo off
REM Script to test only the logical fallacy detector with optimized settings

echo Running logical fallacy detector test with optimized settings...

REM Set memory options for Node.js
set NODE_OPTIONS=--max-old-space-size=8192

REM Run only the specific test file with verbose output
node --expose-gc --experimental-vm-modules node_modules/jest/bin/jest.js src/tools/__tests__/logical_fallacy_detector.test.ts --verbose --runInBand --no-cache

REM Check exit code
if %ERRORLEVEL% EQU 0 (
  echo Test completed successfully!
) else (
  echo Test failed with exit code %ERRORLEVEL%
)

pause
