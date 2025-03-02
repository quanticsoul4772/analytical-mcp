@echo off
echo Applying Notifications version to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak10 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak10
)

:: Replace index.js with our Notifications version
echo Replacing index.js with Notifications version
copy build\index.notifications.js build\index.js

echo Fix applied - please relaunch Claude to use the fixed server
echo.
echo IMPORTANT: This is a Notifications implementation with two tools:
echo - analyze_dataset: Analyze a dataset with statistical methods
echo - decision_analysis: Analyze decision options based on multiple criteria
echo.
echo Please restart the Claude Desktop App to apply the changes.
