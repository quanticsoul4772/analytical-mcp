@echo off
echo Installing fixed files for analytical-mcp-server...

REM Create .env file in Claude's directory
echo # Environment variables for analytical-mcp-server > "C:\Users\rbsmi\AppData\Local\AnthropicClaude\app-0.8.0\.env"
echo NODE_ENV=production >> "C:\Users\rbsmi\AppData\Local\AnthropicClaude\app-0.8.0\.env"
echo LOG_LEVEL=INFO >> "C:\Users\rbsmi\AppData\Local\AnthropicClaude\app-0.8.0\.env"
echo ENABLE_RESEARCH_INTEGRATION=true >> "C:\Users\rbsmi\AppData\Local\AnthropicClaude\app-0.8.0\.env"

REM Replace files with fixed versions
copy /Y "C:\project-root\analytical-mcp\build\tools\index.js.fixed" "C:\project-root\analytical-mcp\build\tools\index.js"
copy /Y "C:\project-root\analytical-mcp\build\index.js.fixed" "C:\project-root\analytical-mcp\build\index.js"

echo Fixed files installed successfully.
