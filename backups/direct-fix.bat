@echo off
echo Applying DIRECT FIX to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak7 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak7
)

if not exist build\tools\index.js.bak4 (
  echo Creating backup of original tools\index.js
  copy build\tools\index.js build\tools\index.js.bak4
)

:: Replace index.js with our direct fix version
echo Replacing index.js with direct fix version
copy build\index.direct.js build\index.js

:: Replace tools\index.js with our direct fix version
echo Replacing tools\index.js with direct fix version
copy build\tools\index.direct.js build\tools\index.js

echo Direct fix applied - please completely close and restart Claude Desktop to use the fixed server
echo.
echo IMPORTANT: This version implements a compatible direct tool registration method for MCP SDK 1.0.1
echo            It monkey-patches the server to ensure proper tool registration and handling.
