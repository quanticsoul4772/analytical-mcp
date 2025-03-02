@echo off
echo Applying enhanced version to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak13 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak13
)

:: Replace index.js with our enhanced version
echo Replacing index.js with enhanced version
copy build\index.enhanced.js build\index.js

echo Fix applied - please relaunch Claude to use the enhanced server
echo.
echo IMPORTANT: This is an enhanced implementation with six tools:
echo - analyze_dataset: Analyze a dataset with statistical methods
echo - decision_analysis: Analyze decision options based on multiple criteria
echo - correlation_analysis: Analyze correlation between two datasets
echo - regression_analysis: Perform linear regression analysis on a dataset
echo - time_series_analysis: Analyze time series data for trends and patterns
echo - hypothesis_testing: Perform statistical hypothesis testing
echo.
echo Please restart the Claude Desktop App to apply the changes.
