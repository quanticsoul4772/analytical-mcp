@echo off
echo Building fixed analytical-mcp-server...

:: Backup current index.ts if not already backed up
if not exist src\index.ts.bak (
  echo Creating backup of original index.ts
  copy src\index.ts src\index.ts.bak
)

:: Replace index.ts with our fixed version
echo Replacing index.ts with fixed version
copy src\index.ts.fix src\index.ts

:: Compile the TypeScript code
echo Compiling TypeScript...
call npx tsc

:: Check if build was successful
if %ERRORLEVEL% EQU 0 (
  echo Build successful - server ready to use
) else (
  echo TypeScript compilation failed - restoring original file
  copy src\index.ts.bak src\index.ts
)

echo Done
