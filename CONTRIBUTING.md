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

-