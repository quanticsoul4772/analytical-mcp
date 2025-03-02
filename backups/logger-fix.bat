@echo off
echo Applying logger fix to analytical-mcp-server...

:: Backup current logger.js if not already backed up
if not exist build\utils\logger.js.bak (
  echo Creating backup of original logger.js
  copy build\utils\logger.js build\utils\logger.js.bak
)

:: Replace logger.js with our fixed version
echo Replacing logger.js with fixed version
copy build\utils\logger.fix.js build\utils\logger.js

echo Logger fix applied - please completely restart Claude Desktop to use the fixed server
