@echo off
echo Applying SDK-compatible fix to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak3 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak3
)

if not exist build\tools\index.js.bak2 (
  echo Creating backup of original tools\index.js
  copy build\tools\index.js build\tools\index.js.bak2
)

:: Replace index.js with our fixed version
echo Replacing index.js with fixed version
copy build\index.js.fix build\index.js

:: Replace tools\index.js with our compatible version
echo Replacing tools\index.js with compatible version
copy build\tools\index.compat.js build\tools\index.js

echo Fix applied - relaunch Claude to use the fixed server
