@echo off
echo Applying FINAL comprehensive fix to analytical-mcp-server...

:: Backup current files if not already backed up
if not exist build\index.js.bak4 (
  echo Creating backup of original index.js
  copy build\index.js build\index.js.bak4
)

if not exist build\tools\index.js.bak3 (
  echo Creating backup of original tools\index.js
  copy build\tools\index.js build\tools\index.js.bak3
)

:: Replace index.js with our final version
echo Replacing index.js with final version
copy build\index.final.js build\index.js

:: Replace tools\index.js with our final version
echo Replacing tools\index.js with final version
copy build\tools\index.final.js build\tools\index.js

echo Fix applied - please relaunch Claude to use the fixed server
