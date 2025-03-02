@echo off
echo =====================================================================
echo IMPORTANT: Please restart the Claude Desktop App to apply the changes
echo =====================================================================
echo.
echo The analytical-mcp-server has been renamed to "analytical" and should
echo now be properly recognized by the Claude Desktop App.
echo.
echo After restarting, you should see two new tools available:
echo - analyze_dataset: Analyze a dataset with statistical methods
echo - decision_analysis: Analyze decision options based on multiple criteria
echo.
echo If the tools still don't appear, please check the logs at:
echo %APPDATA%\Claude\logs\mcp-server-analytical.log
echo.
echo Press any key to exit...
pause > nul
