@echo off
echo Restarting the analytical MCP server...

:: Find and kill any existing node processes running the analytical MCP server
for /f "tokens=1" %%p in ('tasklist /fi "imagename eq node.exe" /fo csv /nh') do (
  taskkill /f /im %%p
)

:: Wait a moment for processes to terminate
timeout /t 2 /nobreak > nul

:: Start the server manually
echo Starting the server manually...
start cmd /k "cd %~dp0 && node build\index.js"

echo Server restarted. Please restart the Claude Desktop App as well.
echo.
echo After restarting, you should see two new tools available:
echo - analyze_dataset: Analyze a dataset with statistical methods
echo - decision_analysis: Analyze decision options based on multiple criteria
echo.
echo Press any key to exit...
pause > nul
