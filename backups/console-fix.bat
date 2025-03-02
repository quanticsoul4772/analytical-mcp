@echo off
echo Applying FINAL console output fix to analytical-mcp-server...

:: Backup current index.js if not already backed up
if not exist build\index.js.bak6 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak6
)

:: Replace index.js with our console fixed version
echo Replacing index.js with console fixed version
copy build\index.console.js build\index.js

echo Fix applied - please completely close and restart Claude Desktop to use the fixed server
echo.
echo IMPORTANT: This version ensures all logging goes to stderr instead of stdout
echo            to prevent JSON communication issues with the Claude client.
