# Contributing to Analytical MCP Server

## Welcome Contributors!

We appreciate your interest in contributing to the Analytical MCP Server. This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites
- Node.js v20+
- npm

### Installation
```bash
git clone https://github.com/analytical-mcp/analytical-mcp.git
cd analytical-mcp
npm install
```

## Contribution Guidelines

### Code Style
- Follow TypeScript best practices as outlined in CLAUDE.md
- Use ES modules (import/export)
- Write clear, commented code with JSDoc for complex functions
- Use Zod for input validation and schema definitions
- Handle errors with try/catch blocks and provide descriptive error messages
- Maintain type safety with TypeScript's strict mode
- Include unit tests for new features when applicable

### Adding New Tools
When adding a new analytical tool:

1. Create a new file in the `src/tools` directory
2. Define a Zod schema for input validation
3. Implement the tool function with proper error handling
4. Register the tool in `src/tools/index.ts` (both in the tool list and handler)
5. Add documentation to the README.md
6. Update the development plan if applicable

### Reporting Issues
- Use GitHub Issues
- Provide detailed description
- Include steps to reproduce
- Share error logs or screenshots if applicable

### Pull Request Process
1. Ensure all tests pass
2. Update documentation as needed
3. Add a clear description of changes
4. Reference any related issues

## Code of Conduct
- Be respectful
- Collaborate constructively
- Prioritize project goals

## Questions?
Open an issue or contact the maintainers.