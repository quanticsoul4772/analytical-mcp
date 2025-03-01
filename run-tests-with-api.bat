@echo off
REM Script to run tests with real API access on Windows

REM Set environment variables for API testing
set VERIFY_API_CONFIG=true
set SKIP_API_TESTS=false

REM Check if .env.test exists
if exist .env.test (
  echo Using .env.test configuration
) else (
  echo Warning: .env.test file not found. Make sure you have API keys configured.
)

REM Run tests with increased memory allocation
set NODE_OPTIONS=--max-old-space-size=4096
node --experimental-vm-modules node_modules/jest/bin/jest.js %*

REM Exit with Jest's exit code
exit /b %ERRORLEVEL%
