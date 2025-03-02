@echo off
echo Applying MINIMAL working version to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak8 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak8
)

:: Replace index.js with our minimal working version
echo Replacing index.js with minimal working version
copy build\index.minimal.js build\index.js

echo Minimal working version applied - please completely close and restart Claude Desktop
echo.
echo IMPORTANT: This version contains just one tool (analyze_dataset) as a test
echo            Once this works, we can add back the remaining tools
echo.
echo TEST COMMAND: "Analyze this dataset: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
