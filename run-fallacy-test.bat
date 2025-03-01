@echo off
REM Script to run the logical fallacy detector test in isolation on Windows

REM Set Node options for increased memory
set NODE_OPTIONS=--max-old-space-size=4096

REM Run only the logical fallacy detector test
node --experimental-vm-modules node_modules/jest/bin/jest.js src/tools/__tests__/logical_fallacy_detector.test.ts --verbose

REM Exit with the Jest exit code
exit /b %ERRORLEVEL%
