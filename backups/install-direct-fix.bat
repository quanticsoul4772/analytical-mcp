@echo off
echo Applying direct MCP SDK 1.0.1 compatibility fix to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak11 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak11
)

:: Replace index.js with our direct fixed version
echo Replacing index.js with direct fixed version
copy build\index.direct.fixed.js build\index.js

:: Update the Claude Desktop App configuration
echo.
echo Fix applied - please relaunch Claude to use the fixed server
echo.
echo IMPORTANT: This is a direct implementation with two tools:
echo - analyze_dataset: Analyze a dataset with statistical methods
echo - decision_analysis: Analyze decision options based on multiple criteria
echo.
echo IMPORTANT: API Key Configuration
echo The server requires an EXA_API_KEY environment variable to be set in your system.
echo This has been configured in the Claude Desktop App to use %%EXA_API_KEY%% which will
echo read the value from your system environment variables.
echo.
echo If you haven't already set this environment variable, you can do so by:
echo 1. Open System Properties (Win+Pause/Break or right-click on This PC and select Properties)
echo 2. Click on "Advanced system settings"
echo 3. Click on "Environment Variables"
echo 4. Under "User variables", click "New"
echo 5. Variable name: EXA_API_KEY
echo 6. Variable value: your_exa_api_key_here
echo 7. Click OK on all dialogs
echo.
echo If the server still fails to connect, please update the Claude Desktop App configuration:
echo 1. Open the Claude Desktop App
echo 2. Go to Settings -^> Developer
echo 3. Click "Edit Config" next to analytical-mcp-server
echo 4. Make sure the path is set to index.js (not index.final.js)
echo 5. Save and restart Claude
