@echo off
echo Applying fix to analytical-mcp-server...

:: Backup current index.js if not already backed up
if not exist build\index.js.bak (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak
)

:: Replace index.js with our fixed version
echo Replacing index.js with fixed version
copy build\index.js.fix build\index.js

echo Fix applied - relaunch Claude to use the fixed server
