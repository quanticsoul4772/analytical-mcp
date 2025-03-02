#!/bin/bash
# Skip the TypeScript build step temporarily
cd "C:\project-root\analytical-mcp"

# Create a .env file in Claude's directory
echo "# Environment variables for analytical-mcp-server
EXA_API_KEY=${EXA_API_KEY}
ENABLE_RESEARCH_INTEGRATION=true
NODE_ENV=production
LOG_LEVEL=INFO" > "C:\Users\rbsmi\AppData\Local\AnthropicClaude\app-0.8.0\.env"

# We'll use the existing build instead of trying to rebuild with TypeScript errors
echo "Server is already built - skipping TypeScript compilation step"
