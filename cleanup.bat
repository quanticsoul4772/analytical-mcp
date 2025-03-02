@echo off
echo Cleaning up troubleshooting files...

:: Create a directory to store backups
if not exist backups (
  echo Creating backups directory
  mkdir backups
)

:: Move all backup files to the backups directory
echo Moving backup files to backups directory
move build\index.js.bak* backups\ 2>nul

:: Move all test and troubleshooting files to the backups directory
echo Moving test and troubleshooting files to backups directory
move build\index.*.js backups\ 2>nul
move test-*.js backups\ 2>nul
move verify-*.js backups\ 2>nul
move *-fix.bat backups\ 2>nul
move install-*.bat backups\ 2>nul
move apply-*.bat backups\ 2>nul
move restart-*.bat backups\ 2>nul
move check-*.js backups\ 2>nul
move *debug*.js backups\ 2>nul
move test-*.txt backups\ 2>nul
move verification-*.txt backups\ 2>nul

:: Keep only the main files
echo Keeping only the main files:
echo - build/index.js (main server implementation)
echo - README.md (documentation)
echo - package.json (dependencies)
echo - tsconfig.json (TypeScript configuration)

echo.
echo Cleanup complete. All troubleshooting files have been moved to the backups directory.
echo If you need to restore any files, you can find them in the backups directory.
