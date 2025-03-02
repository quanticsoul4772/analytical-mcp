@echo off
REM Script to run all integration tests on Windows
REM Provides a summary of test results

echo ================================================================
echo        Running All Integration Tests - %date% %time%
echo ================================================================

REM Check if EXA_API_KEY is set, if not, use a mock key for testing
if "%EXA_API_KEY%"=="" (
  echo WARNING: EXA_API_KEY not found in environment, using a mock key for testing.
  set EXA_API_KEY=mock-exa-api-key-for-testing-only
)

REM Initialize counters
set total_tests=0
set passed_tests=0

REM Run each test
echo Starting test execution...
echo.

REM Server tests
echo Running server tests...
call npm run test:server
if %ERRORLEVEL% EQU 0 (
  set /a passed_tests+=1
  set server_status=PASS
) else (
  set server_status=FAIL
)
set /a total_tests+=1

REM Data pipeline tests
echo Running data pipeline tests...
call npm run test:data-pipeline
if %ERRORLEVEL% EQU 0 (
  set /a passed_tests+=1
  set data_pipeline_status=PASS
) else (
  set data_pipeline_status=FAIL
)
set /a total_tests+=1

REM Market analysis tests
echo Running market analysis tests...
call npm run test:market-analysis
if %ERRORLEVEL% EQU 0 (
  set /a passed_tests+=1
  set market_analysis_status=PASS
) else (
  set market_analysis_status=FAIL
)
set /a total_tests+=1

REM API key tests
echo Running API key tests...
call npm run test:api-keys
if %ERRORLEVEL% EQU 0 (
  set /a passed_tests+=1
  set api_keys_status=PASS
) else (
  set api_keys_status=FAIL
)
set /a total_tests+=1

REM Exa tests
echo Running Exa tests...
call npm run test:exa
if %ERRORLEVEL% EQU 0 (
  set /a passed_tests+=1
  set exa_status=PASS
) else (
  set exa_status=FAIL
)
set /a total_tests+=1

REM Research tests
echo Running Research tests...
call npm run test:research
if %ERRORLEVEL% EQU 0 (
  set /a passed_tests+=1
  set research_status=PASS
) else (
  set research_status=FAIL
)
set /a total_tests+=1

REM Print results table
echo.
echo ================================================================
echo                 Integration Tests Summary
echo ================================================================
echo Test               ^| Status    
echo ------------------ ^| ---------
echo server             ^| %server_status%
echo data-pipeline      ^| %data_pipeline_status%
echo market-analysis    ^| %market_analysis_status%
echo api-keys           ^| %api_keys_status% 
echo exa                ^| %exa_status%
echo research           ^| %research_status%
echo ----------------------------------------------------------------
echo Total: %passed_tests%/%total_tests% passed

REM Cleanup - unset mock keys if we set them
if "%EXA_API_KEY%"=="mock-exa-api-key-for-testing-only" (
  set EXA_API_KEY=
)

REM Return overall status
if %passed_tests% EQU %total_tests% (
  echo All tests passed! 
  exit /b 0
) else (
  echo Some tests failed. Check logs for details.
  exit /b 1
)