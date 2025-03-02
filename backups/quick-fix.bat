@echo off
echo Applying comprehensive fix to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak2 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak2
)

if not exist build\tools\index.js.bak (
  echo Creating backup of original tools\index.js
  copy build\tools\index.js build\tools\index.js.bak
)

:: Replace index.js with our fixed version
echo Replacing index.js with fixed version
copy build\index.js.fix build\index.js

:: Replace tools\index.js with our fixed version
echo Replacing tools\index.js with fixed version
copy build\tools\index.fixed.js build\tools\index.js

echo Fix applied - relaunch Claude to use the fixed server
