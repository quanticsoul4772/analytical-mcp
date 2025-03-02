@echo off
echo Applying FINAL MCP SDK 1.0.1 fix to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak5 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak5
)

:: Replace index.js with our MCP 1.0.1 compatible version
echo Replacing index.js with MCP 1.0.1 compatible version
copy build\index.mcp101.js build\index.js

echo Fix applied - please completely restart Claude Desktop to use the fixed server
echo.
echo NOTE: After restarting, try using the tools with a test prompt like:
echo "Analyze this dataset: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
