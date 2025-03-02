@echo off
echo Running tests with mock API keys...

:: Set environment variables for tests
set EXA_API_KEY=mock-exa-api-key-for-testing-only

:: Run the tests with environment variables
call npm test

:: Restore environment (optional)
set EXA_API_KEY=

echo Test run complete.
