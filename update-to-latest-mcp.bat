@echo off
echo Updating analytical-mcp-server to latest MCP SDK patterns...

REM Backup original files
echo Creating backups...
mkdir src\backups 2>nul
copy /Y src\index.ts src\backups\index.ts.bak
copy /Y src\tools\index.ts src\backups\tools_index.ts.bak
copy /Y src\utils\tool-wrapper.ts src\backups\tool-wrapper.ts.bak
copy /Y tsconfig.json src\backups\tsconfig.json.bak

REM Copy updated files
echo Applying updates...
copy /Y src\index.updated.ts src\index.ts
copy /Y src\tools\index.updated.ts src\tools\index.ts
copy /Y src\utils\tool-wrapper.updated.ts src\utils\tool-wrapper.ts
copy /Y tsconfig.updated.json tsconfig.json

REM Update package.json to use latest SDK version
echo Updating package.json...
npx json -I -f package.json -e "this.dependencies['@modelcontextprotocol/sdk']='1.0.1'"

echo Update complete! Now run the following to rebuild:
echo npm install
echo npm run build
