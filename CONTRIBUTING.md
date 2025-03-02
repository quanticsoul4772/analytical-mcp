# Contributing to Analytical MCP Server

## Contributing to the Logical Fallacy Detector

### Adding New Fallacies

The Logical Fallacy Detector is designed to be extensible. You can contribute by:

1. Adding New Fallacy Definitions
   - Locate the `getFallacyDefinitions()` function in `src/tools/logical_fallacy_detector.ts`
   - Add a new fallacy object following this structure:

   ```typescript
   {
     name: "Unique Fallacy Name",
     category: "relevance" | "informal" | "formal" | "ambiguity",
     description: "Clear explanation of the fallacy",
     signals: [
       /regex pattern to detect/i,
       /another detection pattern/i
     ],
     confidence: 0.6,  // Confidence level (0-1)
     examples: {
       bad: "Example of fallacious reasoning",
       good: "Example of improved, logical reasoning"
     }
   }
   ```

2. Improving Signal Detection
   - Enhance existing regex patterns
   - Add more nuanced detection mechanisms
   - Consider context and language complexity

### Best Practices

- Test your fallacy definitions with a variety of examples
- Ensure your regex patterns are not too broad or too narrow
- Document your reasoning for confidence levels
- Include clear examples that demonstrate the fallacy
- Consider edge cases and potential false positives

## Contributing to Other Analytical Tools

### General Guidelines

1. **Code Style**
   - Follow TypeScript best practices
   - Use meaningful variable and function names
   - Include comprehensive JSDoc comments
   - Follow the existing code style in the project

2. **Testing**
   - Write unit tests for all new functionality
   - Include edge cases in your test suite
   - Ensure tests are deterministic and reliable
   - Aim for high test coverage

3. **Documentation**
   - Update relevant documentation
   - Add examples of how to use new features
   - Document any configuration options
   - Explain the reasoning behind complex algorithms

### Development Workflow

1. **Setting Up Development Environment**
   ```bash
   # Clone the repository
   git clone https://github.com/your-org/analytical-mcp.git
   cd analytical-mcp
   
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env.development
   # Edit .env.development with your local settings
   
   # Run tests to ensure everything is working
   npm test
   ```

2. **Making Changes**
   - Create a feature branch: `git checkout -b feature/your-feature-name`
   - Make your changes
   - Run linting: `npm run lint`
   - Run tests: `npm test`
   - Fix any issues

3. **Submitting Changes**
   - Push your changes to your fork
   - Create a pull request with a clear description
   - Address any feedback from reviewers
   - Ensure CI checks pass

## Tool-Specific Guidelines

### Advanced Regression Analysis

When contributing to the Advanced Regression Analysis tool:

- Ensure statistical methods are implemented correctly
- Document mathematical formulas and their implementations
- Include references to academic papers or resources
- Validate results against established statistical packages

### Decision Analysis

When contributing to the Decision Analysis tool:

- Follow decision theory best practices
- Document decision models clearly
- Consider different decision-making frameworks
- Include examples of how the tool can be applied

### Perspective Shifter

When contributing to the Perspective Shifter tool:

- Ensure diverse perspectives are represented
- Avoid bias in perspective generation
- Document the methodology for shifting perspectives
- Include examples of effective perspective shifts

## Code Review Process

1. All pull requests require at least one review from a maintainer
2. Automated tests must pass before merging
3. Documentation must be updated for new features
4. Breaking changes must be clearly documented

## Release Process

1. We follow semantic versioning (MAJOR.MINOR.PATCH)
2. Release notes are generated from commit messages
3. Major releases are announced in advance
4. Beta features are marked clearly in documentation

## Questions and Support

If you have questions about contributing:

- Open an issue with the "question" label
- Reach out to project maintainers
- Check existing documentation and discussions

Thank you for contributing to the Analytical MCP Server!
